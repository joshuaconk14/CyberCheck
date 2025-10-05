const OpenAI = require('openai');
const logger = require('../utils/logger');

/**
 * AI-Powered Anomaly Detection Service
 * Uses OpenAI's GPT models to analyze log entries for unusual patterns
 * Provides confidence scores and explanations for detected anomalies
 */
class AnomalyDetectionService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Anomaly detection patterns
    this.patterns = {
      suspiciousIPs: new Set(),
      unusualUserAgents: new Set(),
      highFrequencyIPs: new Map(),
      statusCodePatterns: new Map(),
      timeBasedPatterns: new Map()
    };
  }

  /**
   * Analyze log entries for anomalies using AI
   * @param {Array} entries - Parsed log entries
   * @returns {Object} Analysis results with anomalies and insights
   */
  async analyzeAnomalies(entries) {
    try {
      if (!entries || entries.length === 0) {
        return {
          anomalies: [],
          summary: 'No entries to analyze',
          confidence: 0,
          patterns: {}
        };
      }

      logger.info(`Starting AI anomaly detection for ${entries.length} entries`);

      // First, do statistical analysis to identify potential anomalies
      const statisticalAnomalies = this.performStatisticalAnalysis(entries);
      
      // Then use AI to analyze suspicious entries
      const aiAnalysis = await this.performAIAnalysis(entries, statisticalAnomalies);
      
      // Combine results
      const result = {
        anomalies: aiAnalysis.anomalies,
        summary: aiAnalysis.summary,
        confidence: aiAnalysis.confidence,
        patterns: statisticalAnomalies.patterns,
        timeline: this.generateTimeline(entries),
        recommendations: aiAnalysis.recommendations
      };

      logger.info(`Anomaly detection complete: ${result.anomalies.length} anomalies found`);
      return result;
    } catch (error) {
      logger.error('Anomaly detection failed:', error);
      throw new Error('Failed to perform anomaly detection');
    }
  }

  /**
   * Perform statistical analysis to identify potential anomalies
   * @param {Array} entries - Log entries to analyze
   * @returns {Object} Statistical analysis results
   */
  performStatisticalAnalysis(entries) {
    const patterns = {
      ipFrequency: new Map(),
      statusCodes: new Map(),
      userAgents: new Map(),
      timePatterns: new Map(),
      urlPatterns: new Map()
    };

    // Analyze patterns
    entries.forEach(entry => {
      // IP frequency
      if (entry.source_ip) {
        const count = patterns.ipFrequency.get(entry.source_ip) || 0;
        patterns.ipFrequency.set(entry.source_ip, count + 1);
      }

      // Status codes
      if (entry.status_code) {
        const count = patterns.statusCodes.get(entry.status_code) || 0;
        patterns.statusCodes.set(entry.status_code, count + 1);
      }

      // User agents
      if (entry.user_agent) {
        const count = patterns.userAgents.get(entry.user_agent) || 0;
        patterns.userAgents.set(entry.user_agent, count + 1);
      }

      // Time patterns (hour of day)
      if (entry.timestamp) {
        const hour = new Date(entry.timestamp).getHours();
        const count = patterns.timePatterns.get(hour) || 0;
        patterns.timePatterns.set(hour, count + 1);
      }

      // URL patterns
      if (entry.url) {
        const domain = this.extractDomain(entry.url);
        if (domain) {
          const count = patterns.urlPatterns.get(domain) || 0;
          patterns.urlPatterns.set(domain, count + 1);
        }
      }
    });

    // Identify statistical anomalies
    const anomalies = [];
    const totalEntries = entries.length;

    // High frequency IPs (more than 10% of total requests)
    const highFreqThreshold = Math.max(10, totalEntries * 0.1);
    for (const [ip, count] of patterns.ipFrequency) {
      if (count > highFreqThreshold) {
        anomalies.push({
          type: 'high_frequency_ip',
          ip: ip,
          count: count,
          percentage: (count / totalEntries * 100).toFixed(2),
          confidence: Math.min(0.9, count / totalEntries),
          reason: `IP ${ip} made ${count} requests (${(count / totalEntries * 100).toFixed(2)}% of total traffic)`
        });
      }
    }

    // Unusual status codes
    const commonStatusCodes = [200, 301, 302, 304, 404];
    for (const [status, count] of patterns.statusCodes) {
      if (!commonStatusCodes.includes(status) && count > totalEntries * 0.05) {
        anomalies.push({
          type: 'unusual_status_code',
          status_code: status,
          count: count,
          confidence: Math.min(0.8, count / totalEntries * 2),
          reason: `Unusual status code ${status} appeared ${count} times`
        });
      }
    }

    // Suspicious user agents
    for (const [userAgent, count] of patterns.userAgents) {
      if (this.isSuspiciousUserAgent(userAgent)) {
        anomalies.push({
          type: 'suspicious_user_agent',
          user_agent: userAgent,
          count: count,
          confidence: 0.85,
          reason: `Suspicious user agent detected: ${userAgent}`
        });
      }
    }

    return {
      patterns: patterns,
      anomalies: anomalies
    };
  }

  /**
   * Perform AI analysis on suspicious entries
   * @param {Array} entries - All log entries
   * @param {Object} statisticalAnomalies - Statistical analysis results
   * @returns {Object} AI analysis results
   */
  async performAIAnalysis(entries, statisticalAnomalies) {
    try {
      // Prepare data for AI analysis
      const sampleEntries = this.selectSampleEntries(entries, statisticalAnomalies.anomalies);
      
      if (sampleEntries.length === 0) {
        return {
          anomalies: statisticalAnomalies.anomalies,
          summary: 'No suspicious patterns detected by AI analysis',
          confidence: 0.3,
          recommendations: ['Continue monitoring for unusual patterns']
        };
      }

      const prompt = this.buildAnalysisPrompt(sampleEntries, statisticalAnomalies.patterns);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert analyzing web proxy logs. Identify potential security threats, anomalies, and suspicious activities. Provide confidence scores (0-1) and clear explanations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const aiResponse = completion.choices[0].message.content;
      const parsedResponse = this.parseAIResponse(aiResponse);
      
      // Merge AI anomalies with statistical anomalies
      const allAnomalies = [...statisticalAnomalies.anomalies, ...parsedResponse.anomalies];
      
      return {
        anomalies: allAnomalies,
        summary: parsedResponse.summary || 'AI analysis completed',
        confidence: parsedResponse.confidence || 0.7,
        recommendations: parsedResponse.recommendations || []
      };
    } catch (error) {
      logger.error('AI analysis failed:', error);
      // Fallback to statistical analysis only
      return {
        anomalies: statisticalAnomalies.anomalies,
        summary: 'AI analysis unavailable, using statistical analysis only',
        confidence: 0.5,
        recommendations: ['Enable AI analysis for enhanced threat detection']
      };
    }
  }

  /**
   * Select sample entries for AI analysis
   * @param {Array} entries - All entries
   * @param {Array} anomalies - Detected anomalies
   * @returns {Array} Selected entries for AI analysis
   */
  selectSampleEntries(entries, anomalies) {
    const sampleSize = Math.min(50, entries.length);
    const suspiciousIPs = new Set(anomalies.filter(a => a.type === 'high_frequency_ip').map(a => a.ip));
    
    // Prioritize entries from suspicious IPs
    const suspiciousEntries = entries.filter(entry => 
      entry.source_ip && suspiciousIPs.has(entry.source_ip)
    );
    
    const normalEntries = entries.filter(entry => 
      !entry.source_ip || !suspiciousIPs.has(entry.source_ip)
    );
    
    // Take up to 30 suspicious entries and fill the rest with normal entries
    const selectedSuspicious = suspiciousEntries.slice(0, 30);
    const remainingSlots = sampleSize - selectedSuspicious.length;
    const selectedNormal = normalEntries.slice(0, remainingSlots);
    
    return [...selectedSuspicious, ...selectedNormal];
  }

  /**
   * Build prompt for AI analysis
   * @param {Array} entries - Sample entries to analyze
   * @param {Object} patterns - Statistical patterns
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(entries, patterns) {
    const entrySummaries = entries.slice(0, 20).map(entry => ({
      timestamp: entry.timestamp,
      source_ip: entry.source_ip,
      url: entry.url,
      status_code: entry.status_code,
      user_agent: entry.user_agent,
      method: entry.method
    }));

    return `
Analyze these web proxy log entries for security threats and anomalies:

Log Entries (${entries.length} total, showing first 20):
${JSON.stringify(entrySummaries, null, 2)}

Statistical Patterns:
- IP Frequency: ${Array.from(patterns.ipFrequency.entries()).slice(0, 10).map(([ip, count]) => `${ip}: ${count}`).join(', ')}
- Status Codes: ${Array.from(patterns.statusCodes.entries()).map(([code, count]) => `${code}: ${count}`).join(', ')}
- Time Distribution: ${Array.from(patterns.timePatterns.entries()).map(([hour, count]) => `${hour}h: ${count}`).join(', ')}

Please identify:
1. Potential security threats (DDoS, scanning, data exfiltration, etc.)
2. Unusual patterns or behaviors
3. Suspicious IP addresses or user agents
4. Anomalous request patterns

Provide your response in JSON format:
{
  "summary": "Brief summary of findings",
  "anomalies": [
    {
      "type": "anomaly_type",
      "description": "Description of the anomaly",
      "confidence": 0.85,
      "reason": "Explanation of why this is anomalous",
      "severity": "high|medium|low",
      "affected_ips": ["ip1", "ip2"],
      "recommendations": ["action1", "action2"]
    }
  ],
  "confidence": 0.8,
  "recommendations": ["general recommendations"]
}
`;
  }

  /**
   * Parse AI response
   * @param {string} response - Raw AI response
   * @returns {Object} Parsed response
   */
  parseAIResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      return {
        summary: response.substring(0, 200) + '...',
        anomalies: [],
        confidence: 0.5,
        recommendations: ['Manual review recommended']
      };
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      return {
        summary: 'AI analysis completed but response parsing failed',
        anomalies: [],
        confidence: 0.3,
        recommendations: ['Manual review of logs recommended']
      };
    }
  }

  /**
   * Generate timeline of events
   * @param {Array} entries - Log entries
   * @returns {Array} Timeline events
   */
  generateTimeline(entries) {
    const timeline = [];
    const timeBuckets = new Map();
    
    // Group entries by hour
    entries.forEach(entry => {
      if (entry.timestamp) {
        const hour = new Date(entry.timestamp).toISOString().slice(0, 13) + ':00:00Z';
        const bucket = timeBuckets.get(hour) || { timestamp: hour, count: 0, anomalies: 0 };
        bucket.count++;
        
        // Count anomalies (placeholder - would be based on actual anomaly detection)
        if (entry.is_anomaly) {
          bucket.anomalies++;
        }
        
        timeBuckets.set(hour, bucket);
      }
    });
    
    return Array.from(timeBuckets.values()).sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  /**
   * Extract domain from URL
   * @param {string} url - Full URL
   * @returns {string|null} Domain name
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user agent is suspicious
   * @param {string} userAgent - User agent string
   * @returns {boolean} True if suspicious
   */
  isSuspiciousUserAgent(userAgent) {
    if (!userAgent) return false;
    
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /python/i,
      /curl/i,
      /wget/i,
      /nikto/i,
      /sqlmap/i,
      /nmap/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}

module.exports = AnomalyDetectionService;
