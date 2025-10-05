const CloudflareOneParser = require('./CloudflareOneParser');
// Future parsers can be imported here
// const PaloAltoParser = require('./PaloAltoParser');
// const CiscoUmbrellaParser = require('./CiscoUmbrellaParser');

/**
 * Log Parser Factory
 * Manages different log parsers and determines which one to use
 * Supports multiple log formats with extensible architecture
 */
class LogParserFactory {
  constructor() {
    this.parsers = new Map();
    this.initializeParsers();
  }

  /**
   * Initialize available parsers
   */
  initializeParsers() {
    const cloudflareParser = new CloudflareOneParser();
    this.parsers.set('cloudflare_one', cloudflareParser);
    
    // Future parsers can be added here
    // this.parsers.set('palo_alto', new PaloAltoParser());
    // this.parsers.set('cisco_umbrella', new CiscoUmbrellaParser());
  }

  /**
   * Get parser by type
   * @param {string} logType - Type of log parser to retrieve
   * @returns {BaseLogParser|null} Parser instance or null if not found
   */
  getParser(logType) {
    return this.parsers.get(logType) || null;
  }

  /**
   * Get all available parsers
   * @returns {Array} List of available parser types
   */
  getAvailableParsers() {
    return Array.from(this.parsers.keys());
  }

  /**
   * Auto-detect log format and return appropriate parser
   * @param {string} content - File content to analyze
   * @returns {BaseLogParser|null} Detected parser or null if no match
   */
  autoDetectParser(content) {
    for (const [logType, parser] of this.parsers) {
      try {
        if (parser.validateFormat(content)) {
          console.log(`Auto-detected log format: ${logType}`);
          return parser;
        }
      } catch (error) {
        console.warn(`Parser ${logType} validation failed:`, error.message);
      }
    }
    
    console.warn('No suitable parser found for the provided log format');
    return null;
  }

  /**
   * Parse log file with auto-detection
   * @param {string} content - File content
   * @param {string} filename - Original filename
   * @returns {Object} Parse result with entries and metadata
   */
  async parseLogFile(content, filename) {
    const parser = this.autoDetectParser(content);
    
    if (!parser) {
      throw new Error('Unable to detect log format. Please ensure the file is in a supported format.');
    }

    const lines = content.split('\n');
    const entries = [];
    let validEntries = 0;
    let invalidEntries = 0;

    console.log(`Parsing ${lines.length} lines with ${parser.logType} parser`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const entry = parser.parseLine(line, i + 1);
        if (entry) {
          entries.push(entry);
          validEntries++;
        } else {
          invalidEntries++;
        }
      } catch (error) {
        console.warn(`Failed to parse line ${i + 1}: ${error.message}`);
        invalidEntries++;
      }
    }

    const result = {
      parser: parser.getParserInfo(),
      entries,
      metadata: {
        totalLines: lines.length,
        validEntries,
        invalidEntries,
        filename,
        parseDate: new Date().toISOString(),
        logType: parser.logType
      }
    };

    console.log(`Parsing complete: ${validEntries} valid entries, ${invalidEntries} invalid entries`);
    return result;
  }

  /**
   * Parse log file with specific parser
   * @param {string} content - File content
   * @param {string} logType - Specific log type to use
   * @param {string} filename - Original filename
   * @returns {Object} Parse result with entries and metadata
   */
  async parseLogFileWithParser(content, logType, filename) {
    const parser = this.getParser(logType);
    
    if (!parser) {
      throw new Error(`Parser for log type '${logType}' not found. Available types: ${this.getAvailableParsers().join(', ')}`);
    }

    const lines = content.split('\n');
    const entries = [];
    let validEntries = 0;
    let invalidEntries = 0;

    console.log(`Parsing ${lines.length} lines with ${logType} parser`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const entry = parser.parseLine(line, i + 1);
        if (entry) {
          entries.push(entry);
          validEntries++;
        } else {
          invalidEntries++;
        }
      } catch (error) {
        console.warn(`Failed to parse line ${i + 1}: ${error.message}`);
        invalidEntries++;
      }
    }

    const result = {
      parser: parser.getParserInfo(),
      entries,
      metadata: {
        totalLines: lines.length,
        validEntries,
        invalidEntries,
        filename,
        parseDate: new Date().toISOString(),
        logType: parser.logType
      }
    };

    console.log(`Parsing complete: ${validEntries} valid entries, ${invalidEntries} invalid entries`);
    return result;
  }

  /**
   * Get parser statistics
   * @returns {Object} Statistics about available parsers
   */
  getParserStats() {
    const stats = {
      totalParsers: this.parsers.size,
      availableTypes: this.getAvailableParsers(),
      parsers: {}
    };

    for (const [logType, parser] of this.parsers) {
      stats.parsers[logType] = parser.getParserInfo();
    }

    return stats;
  }
}

module.exports = LogParserFactory;
