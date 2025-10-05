const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { getPool } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Invalid token attempt:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, email, password } = value;
    const pool = getPool();

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    logger.info(`New user registered: ${username} (${email})`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;
    const pool = getPool();

    // Find user
    const result = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${user.username} (${user.email})`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.userId,
      username: req.user.username,
      email: req.user.email
    }
  });
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updateSchema = Joi.object({
      username: Joi.string().alphanum().min(3).max(30),
      email: Joi.string().email()
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const pool = getPool();
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (value.username) {
      updates.push(`username = $${paramCount++}`);
      values.push(value.username);
    }

    if (value.email) {
      updates.push(`email = $${paramCount++}`);
      values.push(value.email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING id, username, email, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User profile updated: ${req.user.username}`);

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = { router, authenticateToken };
