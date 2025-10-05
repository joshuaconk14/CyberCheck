const BaseLogParser = require('./BaseLogParser');

/**
 * Cloudflare One Log Parser
 * Parses Cloudflare One (Zero Trust) web proxy logs
 * Format: JSON lines with comprehensive web proxy data
 */
class CloudflareOneParser extends BaseLogParser {
  constructor() {
    super();
    this.logType = 'cloudflare_one';
    this.supportedFormats = ['json', 'jsonl'];
  }

  /**
   * Validate if the content is Cloudflare One format
   * @param {string} content - File content to validate
   * @returns {boolean} True if format is supported
   */
  validateFormat(content) {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) return false;

      // Check first few lines to validate format
      const sampleSize = Math.min(5, lines.length);
      let validCount = 0;

      for (let i = 0; i < sampleSize; i++) {
        try {
          const parsed = JSON.parse(lines[i]);
          if (this.isCloudflareOneEntry(parsed)) {
            validCount++;
          }
        } catch (e) {
          // Not valid JSON, skip
        }
      }

      // At least 60% of sample lines should be valid Cloudflare One entries
      return (validCount / sampleSize) >= 0.6;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a parsed JSON object is a Cloudflare One entry
   * @param {Object} entry - Parsed JSON object
   * @returns {boolean} True if it's a Cloudflare One entry
   */
  isCloudflareOneEntry(entry) {
    // Cloudflare One logs typically have these fields
    const requiredFields = ['EdgeStartTimestamp', 'ClientIP', 'ClientRequestHost'];
    const optionalFields = ['ClientRequestURI', 'ClientRequestMethod', 'OriginResponseStatus'];
    
    // Check for required fields
    const hasRequired = requiredFields.every(field => entry.hasOwnProperty(field));
    
    // Check for at least some optional fields
    const hasOptional = optionalFields.some(field => entry.hasOwnProperty(field));
    
    return hasRequired && hasOptional;
  }

  /**
   * Parse a single log line
   * @param {string} line - Raw log line
   * @param {number} lineNumber - Line number for error tracking
   * @returns {Object|null} Parsed log entry or null if invalid
   */
  parseLine(line, lineNumber) {
    try {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;

      const parsed = JSON.parse(trimmedLine);
      
      if (!this.isCloudflareOneEntry(parsed)) {
        return null;
      }

      return {
        lineNumber,
        timestamp: this.extractTimestamp(parsed),
        source_ip: this.extractSourceIP(parsed),
        destination_ip: this.extractDestinationIP(parsed),
        url: this.extractURL(parsed),
        user_agent: this.extractUserAgent(parsed),
        status_code: this.extractStatusCode(parsed),
        bytes_sent: this.extractBytesSent(parsed),
        method: this.extractMethod(parsed),
        country: this.extractCountry(parsed),
        asn: this.extractASN(parsed),
        action: this.extractAction(parsed),
        policy_name: this.extractPolicyName(parsed),
        raw_data: trimmedLine,
        original_entry: parsed
      };
    } catch (error) {
      console.warn(`Failed to parse line ${lineNumber}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract timestamp from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {Date|null} Parsed timestamp
   */
  extractTimestamp(entry) {
    try {
      // Cloudflare One uses EdgeStartTimestamp in RFC3339 format
      const timestamp = entry.EdgeStartTimestamp;
      if (timestamp) {
        return new Date(timestamp);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract source IP from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {string|null} Source IP address
   */
  extractSourceIP(entry) {
    return entry.ClientIP || null;
  }

  /**
   * Extract destination IP from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {string|null} Destination IP address
   */
  extractDestinationIP(entry) {
    return entry.OriginIP || null;
  }

  /**
   * Extract URL from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {string|null} Full URL
   */
  extractURL(entry) {
    const host = entry.ClientRequestHost;
    const uri = entry.ClientRequestURI;
    
    if (host && uri) {
      const protocol = entry.ClientRequestProtocol || 'https';
      return `${protocol}://${host}${uri}`;
    }
    
    return null;
  }

  /**
   * Extract user agent from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {string|null} User agent string
   */
  extractUserAgent(entry) {
    return entry.UserAgent || null;
  }

  /**
   * Extract HTTP status code from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {number|null} HTTP status code
   */
  extractStatusCode(entry) {
    const status = entry.OriginResponseStatus || entry.EdgeResponseStatus;
    return status ? parseInt(status, 10) : null;
  }

  /**
   * Extract bytes sent from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {number|null} Bytes sent
   */
  extractBytesSent(entry) {
    const bytes = entry.EdgeResponseBytes || entry.OriginResponseBytes;
    return bytes ? parseInt(bytes, 10) : null;
  }

  /**
   * Extract HTTP method from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {string|null} HTTP method
   */
  extractMethod(entry) {
    return entry.ClientRequestMethod || null;
  }

  /**
   * Extract country from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {string|null} Country code
   */
  extractCountry(entry) {
    return entry.ClientCountry || null;
  }

  /**
   * Extract ASN from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {string|null} ASN information
   */
  extractASN(entry) {
    return entry.ClientASN || null;
  }

  /**
   * Extract action from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {string|null} Action taken
   */
  extractAction(entry) {
    return entry.Action || null;
  }

  /**
   * Extract policy name from Cloudflare One entry
   * @param {Object} entry - Parsed log entry
   * @returns {string|null} Policy name
   */
  extractPolicyName(entry) {
    return entry.PolicyName || null;
  }

  /**
   * Get fields specific to Cloudflare One for anomaly detection
   * @returns {Array} List of field names for anomaly detection
   */
  getAnomalyDetectionFields() {
    return [
      'source_ip',
      'destination_ip', 
      'url',
      'status_code',
      'bytes_sent',
      'country',
      'asn',
      'action',
      'policy_name'
    ];
  }

  /**
   * Extract destination information
   * @param {Object} entry - Parsed log entry
   * @returns {Object} Destination information
   */
  extractDestination(entry) {
    return {
      ip: this.extractDestinationIP(entry),
      host: entry.ClientRequestHost,
      uri: entry.ClientRequestURI,
      url: this.extractURL(entry)
    };
  }
}

module.exports = CloudflareOneParser;
