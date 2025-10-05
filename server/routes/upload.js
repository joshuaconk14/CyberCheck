const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { getPool } = require('../config/database');
const { authenticateToken } = require('./auth');
const LogParserFactory = require('../parsers/LogParserFactory');
const AnomalyDetectionService = require('../services/AnomalyDetectionService');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication to all upload routes
router.use(authenticateToken);

// Upload and process log file
router.post('/', async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const filePath = req.file.path;
    const fileSize = req.file.size;

    logger.info(`Processing upload: ${originalName} (${fileSize} bytes) for user ${userId}`);

    // Read file content
    const content = await fs.readFile(filePath, 'utf8');
    
    // Initialize parser factory
    const parserFactory = new LogParserFactory();
    
    // Parse the log file
    const parseResult = await parserFactory.parseLogFile(content, originalName);
    
    if (parseResult.entries.length === 0) {
      return res.status(400).json({ 
        error: 'No valid log entries found in the uploaded file' 
      });
    }

    const pool = getPool();

    // Save log file metadata to database
    const fileResult = await pool.query(
      `INSERT INTO log_files (user_id, filename, original_name, file_path, file_size, log_type, processing_status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'processing') 
       RETURNING id`,
      [userId, filename, originalName, filePath, fileSize, parseResult.metadata.logType]
    );

    const logFileId = fileResult.rows[0].id;

    // Save log entries to database
    const insertPromises = parseResult.entries.map(async (entry) => {
      const query = `
        INSERT INTO log_entries (
          log_file_id, timestamp, source_ip, destination_ip, url, user_agent, 
          status_code, bytes_sent, method, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      
      const values = [
        logFileId,
        entry.timestamp,
        entry.source_ip,
        entry.destination_ip,
        entry.url,
        entry.user_agent,
        entry.status_code,
        entry.bytes_sent,
        entry.method,
        entry.raw_data
      ];

      return pool.query(query, values);
    });

    await Promise.all(insertPromises);

    // Update processing status
    await pool.query(
      'UPDATE log_files SET processing_status = $1 WHERE id = $2',
      ['completed', logFileId]
    );

    logger.info(`Successfully processed ${parseResult.entries.length} log entries for file ${logFileId}`);

    // Prepare response
    const response = {
      message: 'File uploaded and processed successfully',
      fileId: logFileId,
      metadata: {
        ...parseResult.metadata,
        fileSize,
        processedAt: new Date().toISOString()
      },
      summary: {
        totalEntries: parseResult.entries.length,
        validEntries: parseResult.metadata.validEntries,
        invalidEntries: parseResult.metadata.invalidEntries,
        logType: parseResult.metadata.logType
      }
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Upload processing error:', error);
    
    // Clean up file if processing failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Failed to clean up file:', unlinkError);
      }
    }

    res.status(500).json({ 
      error: 'Failed to process uploaded file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's uploaded files
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, filename, original_name, file_size, log_type, upload_date, processing_status
       FROM log_files 
       WHERE user_id = $1 
       ORDER BY upload_date DESC`,
      [userId]
    );

    const files = result.rows.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.original_name,
      fileSize: file.file_size,
      logType: file.log_type,
      uploadDate: file.upload_date,
      processingStatus: file.processing_status
    }));

    res.json({ files });
  } catch (error) {
    logger.error('Failed to fetch user files:', error);
    res.status(500).json({ error: 'Failed to fetch uploaded files' });
  }
});

// Get specific file details
router.get('/:fileId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const fileId = req.params.fileId;
    const pool = getPool();

    // Verify file ownership
    const fileResult = await pool.query(
      'SELECT * FROM log_files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Get entry count
    const entryCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM log_entries WHERE log_file_id = $1',
      [fileId]
    );

    const entryCount = parseInt(entryCountResult.rows[0].count);

    res.json({
      id: file.id,
      filename: file.filename,
      originalName: file.original_name,
      fileSize: file.file_size,
      logType: file.log_type,
      uploadDate: file.upload_date,
      processingStatus: file.processing_status,
      entryCount
    });
  } catch (error) {
    logger.error('Failed to fetch file details:', error);
    res.status(500).json({ error: 'Failed to fetch file details' });
  }
});

// Delete uploaded file
router.delete('/:fileId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const fileId = req.params.fileId;
    const pool = getPool();

    // Verify file ownership and get file path
    const fileResult = await pool.query(
      'SELECT file_path FROM log_files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = fileResult.rows[0].file_path;

    // Delete from database (cascade will delete log entries)
    await pool.query('DELETE FROM log_files WHERE id = $1', [fileId]);

    // Delete physical file
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      logger.warn('Failed to delete physical file:', unlinkError);
    }

    logger.info(`File deleted: ${fileId} by user ${userId}`);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Get available log parsers
router.get('/parsers/info', (req, res) => {
  try {
    const parserFactory = new LogParserFactory();
    const parserStats = parserFactory.getParserStats();
    
    res.json(parserStats);
  } catch (error) {
    logger.error('Failed to get parser info:', error);
    res.status(500).json({ error: 'Failed to get parser information' });
  }
});

module.exports = router;
