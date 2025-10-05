const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

const connectDB = async () => {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false // Disable SSL for Docker containers
    });

    // Test connection
    const client = await pool.connect();
    logger.info('Connected to PostgreSQL database');
    
    // Initialize database tables
    await initializeTables();
    
    client.release();
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const initializeTables = async () => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createLogFilesTable = `
    CREATE TABLE IF NOT EXISTS log_files (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size INTEGER NOT NULL,
      log_type VARCHAR(50) NOT NULL,
      upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processing_status VARCHAR(20) DEFAULT 'pending'
    )
  `;

  const createLogEntriesTable = `
    CREATE TABLE IF NOT EXISTS log_entries (
      id SERIAL PRIMARY KEY,
      log_file_id INTEGER REFERENCES log_files(id) ON DELETE CASCADE,
      timestamp TIMESTAMP NOT NULL,
      source_ip VARCHAR(45),
      destination_ip VARCHAR(45),
      url TEXT,
      user_agent TEXT,
      status_code INTEGER,
      bytes_sent INTEGER,
      method VARCHAR(10),
      raw_data TEXT,
      is_anomaly BOOLEAN DEFAULT FALSE,
      anomaly_score DECIMAL(3,2),
      anomaly_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createAnalysisSessionsTable = `
    CREATE TABLE IF NOT EXISTS analysis_sessions (
      id SERIAL PRIMARY KEY,
      log_file_id INTEGER REFERENCES log_files(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      summary TEXT,
      total_entries INTEGER,
      anomaly_count INTEGER,
      time_range_start TIMESTAMP,
      time_range_end TIMESTAMP,
      analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await pool.query(createUsersTable);
    await pool.query(createLogFilesTable);
    await pool.query(createLogEntriesTable);
    await pool.query(createAnalysisSessionsTable);
    logger.info('Database tables initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database tables:', error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return pool;
};

module.exports = {
  connectDB,
  getPool
};
