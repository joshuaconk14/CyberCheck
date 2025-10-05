const express = require('express');
const { getPool } = require('../config/database');
const { authenticateToken } = require('./auth');
const AnomalyDetectionService = require('../services/AnomalyDetectionService');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication to all analysis routes
router.use(authenticateToken);

// Analyze log file for anomalies
router.post('/analyze/:fileId', async (req, res) => {
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

    // Check if analysis already exists
    const existingAnalysis = await pool.query(
      'SELECT * FROM analysis_sessions WHERE log_file_id = $1 ORDER BY analysis_date DESC LIMIT 1',
      [fileId]
    );

    // Get log entries for analysis
    const entriesResult = await pool.query(
      `SELECT timestamp, source_ip, destination_ip, url, user_agent, 
              status_code, bytes_sent, method, raw_data
       FROM log_entries 
       WHERE log_file_id = $1 
       ORDER BY timestamp ASC`,
      [fileId]
    );

    if (entriesResult.rows.length === 0) {
      return res.status(400).json({ error: 'No log entries found for analysis' });
    }

    const entries = entriesResult.rows.map(entry => ({
      timestamp: entry.timestamp,
      source_ip: entry.source_ip,
      destination_ip: entry.destination_ip,
      url: entry.url,
      user_agent: entry.user_agent,
      status_code: entry.status_code,
      bytes_sent: entry.bytes_sent,
      method: entry.method,
      raw_data: entry.raw_data
    }));

    logger.info(`Starting anomaly analysis for file ${fileId} with ${entries.length} entries`);

    // Perform anomaly detection
    const anomalyService = new AnomalyDetectionService();
    const analysisResult = await anomalyService.analyzeAnomalies(entries);

    // Save analysis session to database
    const analysisSession = await pool.query(
      `INSERT INTO analysis_sessions (
        log_file_id, user_id, summary, total_entries, anomaly_count, 
        time_range_start, time_range_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id`,
      [
        fileId,
        userId,
        analysisResult.summary,
        entries.length,
        analysisResult.anomalies.length,
        entries.length > 0 ? entries[0].timestamp : null,
        entries.length > 0 ? entries[entries.length - 1].timestamp : null
      ]
    );

    const sessionId = analysisSession.rows[0].id;

    // Update log entries with anomaly information
    if (analysisResult.anomalies.length > 0) {
      const updatePromises = analysisResult.anomalies.map(async (anomaly) => {
        // Find matching entries and mark them as anomalies
        const affectedIPs = anomaly.affected_ips || [anomaly.ip];
        
        for (const ip of affectedIPs) {
          if (ip && anomaly.type === 'high_frequency_ip') {
            await pool.query(
              `UPDATE log_entries 
               SET is_anomaly = true, anomaly_score = $1, anomaly_reason = $2
               WHERE log_file_id = $3 AND source_ip = $4`,
              [anomaly.confidence, anomaly.reason, fileId, ip]
            );
          }
        }
      });

      await Promise.all(updatePromises);
    }

    logger.info(`Anomaly analysis completed for file ${fileId}: ${analysisResult.anomalies.length} anomalies found`);

    res.json({
      sessionId,
      analysis: analysisResult,
      fileInfo: {
        id: file.id,
        originalName: file.original_name,
        logType: file.log_type,
        uploadDate: file.upload_date
      },
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to perform analysis',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get analysis results for a file
router.get('/results/:fileId', async (req, res) => {
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

    // Get analysis sessions
    const analysisResult = await pool.query(
      `SELECT * FROM analysis_sessions 
       WHERE log_file_id = $1 
       ORDER BY analysis_date DESC`,
      [fileId]
    );

    // Get anomaly entries
    const anomalyResult = await pool.query(
      `SELECT timestamp, source_ip, destination_ip, url, user_agent, 
              status_code, bytes_sent, method, anomaly_score, anomaly_reason
       FROM log_entries 
       WHERE log_file_id = $1 AND is_anomaly = true 
       ORDER BY timestamp ASC`,
      [fileId]
    );

    // Get timeline data
    const timelineResult = await pool.query(
      `SELECT 
         DATE_TRUNC('hour', timestamp) as hour,
         COUNT(*) as total_requests,
         COUNT(CASE WHEN is_anomaly = true THEN 1 END) as anomaly_count
       FROM log_entries 
       WHERE log_file_id = $1 
       GROUP BY DATE_TRUNC('hour', timestamp)
       ORDER BY hour ASC`,
      [fileId]
    );

    res.json({
      fileId,
      analyses: analysisResult.rows,
      anomalies: anomalyResult.rows,
      timeline: timelineResult.rows.map(row => ({
        hour: row.hour,
        totalRequests: parseInt(row.total_requests),
        anomalyCount: parseInt(row.anomaly_count)
      }))
    });
  } catch (error) {
    logger.error('Failed to fetch analysis results:', error);
    res.status(500).json({ error: 'Failed to fetch analysis results' });
  }
});

// Get summary statistics for a file
router.get('/summary/:fileId', async (req, res) => {
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

    // Get comprehensive statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN is_anomaly = true THEN 1 END) as anomaly_count,
        COUNT(DISTINCT source_ip) as unique_ips,
        COUNT(DISTINCT url) as unique_urls,
        MIN(timestamp) as earliest_time,
        MAX(timestamp) as latest_time,
        AVG(CASE WHEN bytes_sent IS NOT NULL THEN bytes_sent END) as avg_bytes_sent,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
      FROM log_entries 
      WHERE log_file_id = $1
    `, [fileId]);

    // Get top IPs
    const topIPs = await pool.query(`
      SELECT source_ip, COUNT(*) as request_count
      FROM log_entries 
      WHERE log_file_id = $1 AND source_ip IS NOT NULL
      GROUP BY source_ip 
      ORDER BY request_count DESC 
      LIMIT 10
    `, [fileId]);

    // Get status code distribution
    const statusCodes = await pool.query(`
      SELECT status_code, COUNT(*) as count
      FROM log_entries 
      WHERE log_file_id = $1 AND status_code IS NOT NULL
      GROUP BY status_code 
      ORDER BY count DESC
    `, [fileId]);

    // Get top URLs
    const topURLs = await pool.query(`
      SELECT url, COUNT(*) as request_count
      FROM log_entries 
      WHERE log_file_id = $1 AND url IS NOT NULL
      GROUP BY url 
      ORDER BY request_count DESC 
      LIMIT 10
    `, [fileId]);

    const summary = {
      fileId,
      statistics: {
        totalEntries: parseInt(stats.rows[0].total_entries),
        anomalyCount: parseInt(stats.rows[0].anomaly_count),
        uniqueIPs: parseInt(stats.rows[0].unique_ips),
        uniqueURLs: parseInt(stats.rows[0].unique_urls),
        timeRange: {
          start: stats.rows[0].earliest_time,
          end: stats.rows[0].latest_time
        },
        averageBytesSent: stats.rows[0].avg_bytes_sent ? parseFloat(stats.rows[0].avg_bytes_sent) : 0,
        errorCount: parseInt(stats.rows[0].error_count)
      },
      topIPs: topIPs.rows.map(row => ({
        ip: row.source_ip,
        requestCount: parseInt(row.request_count)
      })),
      statusCodes: statusCodes.rows.map(row => ({
        code: row.status_code,
        count: parseInt(row.count)
      })),
      topURLs: topURLs.rows.map(row => ({
        url: row.url,
        requestCount: parseInt(row.request_count)
      }))
    };

    res.json(summary);
  } catch (error) {
    logger.error('Failed to fetch summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Get all analysis sessions for user
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const pool = getPool();

    const result = await pool.query(`
      SELECT 
        s.id,
        s.summary,
        s.total_entries,
        s.anomaly_count,
        s.analysis_date,
        f.original_name as filename,
        f.log_type
      FROM analysis_sessions s
      JOIN log_files f ON s.log_file_id = f.id
      WHERE s.user_id = $1
      ORDER BY s.analysis_date DESC
    `, [userId]);

    const sessions = result.rows.map(session => ({
      id: session.id,
      summary: session.summary,
      totalEntries: session.total_entries,
      anomalyCount: session.anomaly_count,
      analysisDate: session.analysis_date,
      filename: session.filename,
      logType: session.log_type
    }));

    res.json({ sessions });
  } catch (error) {
    logger.error('Failed to fetch analysis sessions:', error);
    res.status(500).json({ error: 'Failed to fetch analysis sessions' });
  }
});

module.exports = router;
