const patterns = require('../models/sensitivePatterns.json');

class PatternMatcher {
  constructor(config = {}) {
    this.config = config;
    this.patterns = this.compilePatterns(patterns);
    this.stats = {
      totalMatches: 0,
      byCategory: {},
      byRisk: { high: 0, medium: 0, low: 0 }
    };
  }

  compilePatterns(patternConfig) {
    const compiled = {};
    
    for (const [category, categoryData] of Object.entries(patternConfig)) {
      compiled[category] = {
        name: categoryData.name,
        risk: categoryData.risk,
        patterns: categoryData.patterns.map(pattern => ({
          name: pattern.name,
          regex: new RegExp(pattern.regex, 'gi'),
          description: pattern.description,
          risk: pattern.risk
        }))
      };
    }
    
    return compiled;
  }

  findMatches(content, fileInfo = {}) {
    const findings = [];
    this.stats = {
      totalMatches: 0,
      byCategory: {},
      byRisk: { high: 0, medium: 0, low: 0 }
    };
    
    for (const [category, categoryData] of Object.entries(this.patterns)) {
      const categoryFindings = this.findInCategory(content, category, categoryData);
      
      if (categoryFindings.length > 0) {
        this.stats.byCategory[category] = (this.stats.byCategory[category] || 0) + categoryFindings.length;
        findings.push(...categoryFindings);
      }
    }
    
    // Update risk stats
    findings.forEach(f => {
      this.stats.byRisk[f.risk] = (this.stats.byRisk[f.risk] || 0) + 1;
    });
    
    this.stats.totalMatches = findings.length;
    
    return {
      findings,
      stats: this.stats,
      fileInfo
    };
  }

  findInCategory(content, category, categoryData) {
    const findings = [];
    
    for (const pattern of categoryData.patterns) {
      // Reset regex lastIndex
      pattern.regex.lastIndex = 0;
      
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        // Avoid infinite loops with zero-width matches
        if (match.index === pattern.regex.lastIndex) {
          pattern.regex.lastIndex++;
        }
        
        findings.push({
          category,
          categoryName: categoryData.name,
          type: pattern.name,
          value: match[0].substring(0, 100), // Limit value length
          fullMatch: match[0],
          index: match.index,
          risk: pattern.risk,
          description: pattern.description,
          context: this.getContext(content, match.index),
          timestamp: new Date().toISOString(),
          validated: this.validateMatch(match[0], pattern.name)
        });
      }
    }
    
    return findings;
  }

  getContext(content, index, contextLength = 50) {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + contextLength);
    let context = content.substring(start, end);
    
    // Clean context for display
    context = context.replace(/\n/g, ' ').replace(/\r/g, '');
    
    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';
    
    return context;
  }

  validateMatch(match, type) {
    // Additional validation for specific types
    switch(type) {
      case 'credit_card':
        return this.validateCreditCard(match);
      case 'email':
        return this.validateEmail(match);
      case 'ssn':
        return this.validateSSN(match);
      default:
        return true;
    }
  }

  validateCreditCard(cardNumber) {
    // Luhn algorithm for credit card validation
    const digits = cardNumber.replace(/\D/g, '').split('').map(Number);
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateSSN(ssn) {
    const ssnDigits = ssn.replace(/\D/g, '');
    // Check if it's a valid SSN format (not all zeros in any group)
    if (ssnDigits.length !== 9) return false;
    
    const area = parseInt(ssnDigits.substring(0, 3));
    const group = parseInt(ssnDigits.substring(3, 5));
    const serial = parseInt(ssnDigits.substring(5, 9));
    
    return area !== 0 && group !== 0 && serial !== 0;
  }

  getStats() {
    return this.stats;
  }

  resetStats() {
    this.stats = {
      totalMatches: 0,
      byCategory: {},
      byRisk: { high: 0, medium: 0, low: 0 }
    };
  }
  // Add this method to patternMatcher.js to handle different file types
    preprocessContent(content, fileExtension) {
    let processedContent = content;
    
    // Handle JSON files - stringify to make values searchable
    if (fileExtension === '.json') {
        try {
        const jsonObj = JSON.parse(content);
        // Recursively flatten JSON to key=value pairs
        const flatten = (obj, prefix = '') => {
            let result = '';
            for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
                result += flatten(value, `${prefix}${key}.`);
            } else {
                result += `${prefix}${key}=${value}\n`;
            }
            }
            return result;
        };
        processedContent = flatten(jsonObj);
        } catch (e) {
        // If JSON parsing fails, use original content
        console.log('JSON parse error:', e.message);
        }
    }
    
    // Handle ENV files - ensure consistent format
    if (fileExtension === '.env' || fileExtension === '.txt') {
        // Convert any format to key=value lines
        processedContent = content
        .split('\n')
        .map(line => {
            // Skip comments
            if (line.trim().startsWith('#')) return '';
            // Extract key=value pairs
            const match = line.match(/([A-Za-z0-9_]+)[\s]*[=:][\s]*(.+)/);
            return match ? `${match[1]}=${match[2]}` : line;
        })
        .filter(line => line.trim())
        .join('\n');
    }
    
    return processedContent;
    }
}

module.exports = PatternMatcher;