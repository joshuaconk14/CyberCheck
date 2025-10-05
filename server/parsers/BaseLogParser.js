/**
 * Base Log Parser Class
 * Provides a foundation for parsing different types of log files
 * Designed to support multiple log formats (Cloudflare One, Palo Alto, Cisco Umbrella, etc.)
 */
class BaseLogParser {
  constructor() {
    this.logType = 'base';
    this.supportedFormats = [];
  }

  /**
   * Parse a single log line
   * @param {string} line - Raw log line
   * @param {number} lineNumber - Line number for error tracking
   * @returns {Object|null} Parsed log entry or null if invalid
   */
  parseLine(line, lineNumber) {
    throw new Error('parseLine method must be implemented by subclass');
  }

  /**
   * Validate if the log file format is supported by this parser
   * @param {string} content - File content to validate
   * @returns {boolean} True if format is supported
   */
  validateFormat(content) {
    throw new Error('validateFormat method must be implemented by subclass');
  }

  /**
   * Get parser metadata
   * @returns {Object} Parser information
   */
  getParserInfo() {
    return {
      logType: this.logType,
      supportedFormats: this.supportedFormats,
      version: '1.0.0'
    };
  }

  /**
   * Extract timestamp from parsed entry
   * @param {Object} entry - Parsed log entry
   * @returns {Date|null} Parsed timestamp
   */
  extractTimestamp(entry) {
    throw new Error('extractTimestamp method must be implemented by subclass');
  }

  /**
   * Extract source IP from parsed entry
   * @param {Object} entry - Parsed log entry
   * @returns {string|null} Source IP address
   */
  extractSourceIP(entry) {
    throw new Error('extractSourceIP method must be implemented by subclass');
  }

  /**
   * Extract destination information from parsed entry
   * @param {Object} entry - Parsed log entry
   * @returns {Object} Destination information
   */
  extractDestination(entry) {
    throw new Error('extractDestination method must be implemented by subclass');
  }

  /**
   * Get fields that should be indexed for anomaly detection
   * @returns {Array} List of field names for anomaly detection
   */
  getAnomalyDetectionFields() {
    return ['source_ip', 'destination_ip', 'url', 'status_code', 'bytes_sent'];
  }

  /**
   * Normalize parsed entry to common format
   * @param {Object} entry - Parsed log entry
   * @returns {Object} Normalized entry
   */
  normalizeEntry(entry) {
    return {
      timestamp: this.extractTimestamp(entry),
      source_ip: this.extractSourceIP(entry),
      destination: this.extractDestination(entry),
      raw_data: JSON.stringify(entry),
      original_entry: entry
    };
  }
}

module.exports = BaseLogParser;
