const natural = require('natural');
const compromise = require('compromise');
const logger = require('../utils/logger');

class MLDetector {
  constructor(config = {}) {
    this.config = config;
    this.classifier = new natural.BayesClassifier();
    this.nlp = compromise;
    this.initializeClassifier();
    this.stats = {
      totalDetections: 0,
      byType: {},
      averageConfidence: 0
    };
  }

  initializeClassifier() {
    logger.info('Initializing ML classifier...');
    
    // Train with sensitive data patterns
    const trainingData = [
      // Credit cards
      { text: '4111111111111111', label: 'credit_card' },
      { text: '5555555555554444', label: 'credit_card' },
      { text: '378282246310005', label: 'credit_card' },
      
      // SSNs
      { text: '123-45-6789', label: 'ssn' },
      { text: '987-65-4321', label: 'ssn' },
      
      // API Keys
      { text: 'sk_live_4eC39HqLyjWDarjtT1zdp7dc', label: 'api_key' },
      { text: 'ghp_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s', label: 'api_key' },
      
      // Passwords
      { text: 'password123', label: 'password' },
      { text: 'P@ssw0rd!2024', label: 'password' },
      { text: 'mySecretPassword!', label: 'password' },
      
      // Email addresses
      { text: 'user@example.com', label: 'email' },
      { text: 'john.doe@company.co.uk', label: 'email' },
      
      // Phone numbers
      { text: '555-123-4567', label: 'phone' },
      { text: '(555) 123-4567', label: 'phone' },
      { text: '+1-555-123-4567', label: 'phone' },
      
      // Normal text (non-sensitive)
      { text: 'The quick brown fox jumps over the lazy dog', label: 'normal' },
      { text: 'Hello world, this is a test message', label: 'normal' },
      { text: 'Meeting at 3pm tomorrow', label: 'normal' },
      { text: 'Please find attached the document', label: 'normal' }
    ];
    
    trainingData.forEach(item => {
      this.classifier.addDocument(item.text, item.label);
    });
    
    this.classifier.train();
    logger.success('ML classifier initialized successfully');
  }

  async analyzeContent(content, fileInfo = {}) {
    const findings = [];
    let totalConfidence = 0;
    
    try {
      // Split content into sentences for better analysis
      const sentences = this.splitIntoSentences(content);
      
      for (const sentence of sentences) {
        const sentenceFindings = await this.analyzeSentence(sentence);
        
        if (sentenceFindings.length > 0) {
          findings.push(...sentenceFindings);
          totalConfidence += sentenceFindings.reduce((acc, f) => acc + f.confidence, 0);
        }
      }
      
      // Extract entities using NLP
      const entityFindings = this.extractEntities(content);
      findings.push(...entityFindings);
      
      // Update stats
      this.updateStats(findings);
      
    } catch (error) {
      logger.error(`ML analysis error: ${error.message}`);
    }
    
    return {
      findings,
      stats: this.stats,
      fileInfo
    };
  }

  splitIntoSentences(text) {
    // Simple sentence splitting
    return text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  }

  async analyzeSentence(sentence) {
    const findings = [];
    
    // Get classification
    const classifications = this.classifier.getClassifications(sentence);
    const topMatch = classifications[0];
    
    // Check if confident enough and not normal
    if (topMatch && 
        topMatch.label !== 'normal' && 
        topMatch.value > (this.config.confidenceThreshold || 0.6)) {
      
      findings.push({
        type: topMatch.label,
        confidence: topMatch.value,
        value: sentence.substring(0, 100),
        context: sentence,
        method: 'classification',
        risk: this.calculateRisk(topMatch.label),
        timestamp: new Date().toISOString()
      });
    }
    
    return findings;
  }

  extractEntities(text) {
    const findings = [];
    const doc = this.nlp(text);
    
    // Extract emails
    const emails = doc.match('#Email').out('array');
    emails.forEach(email => {
      if (this.isValidEmail(email)) {
        findings.push({
          type: 'email',
          value: email,
          context: this.getContext(text, email),
          method: 'nlp',
          risk: 'medium',
          confidence: 0.85
        });
      }
    });
    
    // Extract phone numbers
    const phones = doc.match('#PhoneNumber').out('array');
    phones.forEach(phone => {
      findings.push({
        type: 'phone',
        value: phone,
        context: this.getContext(text, phone),
        method: 'nlp',
        risk: 'low',
        confidence: 0.75
      });
    });
    
    // Extract money amounts
    const money = doc.match('#Money').out('array');
    money.forEach(amount => {
      findings.push({
        type: 'financial_amount',
        value: amount,
        context: this.getContext(text, amount),
        method: 'nlp',
        risk: 'medium',
        confidence: 0.7
      });
    });
    
    return findings;
  }

  getContext(text, value, contextLength = 50) {
    const index = text.indexOf(value);
    if (index === -1) return '';
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + value.length + contextLength);
    let context = text.substring(start, end).replace(/\n/g, ' ');
    
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  calculateRisk(type) {
    const riskMap = {
      'credit_card': 'high',
      'ssn': 'high',
      'api_key': 'high',
      'password': 'high',
      'email': 'medium',
      'phone': 'low',
      'financial_amount': 'medium'
    };
    
    return riskMap[type] || 'unknown';
  }

  updateStats(findings) {
    this.stats.totalDetections += findings.length;
    
    findings.forEach(f => {
      this.stats.byType[f.type] = (this.stats.byType[f.type] || 0) + 1;
    });
    
    // Update average confidence
    if (findings.length > 0) {
      const totalConfidence = findings.reduce((acc, f) => acc + (f.confidence || 0), 0);
      this.stats.averageConfidence = 
        (this.stats.averageConfidence + totalConfidence / findings.length) / 2;
    }
  }

  resetStats() {
    this.stats = {
      totalDetections: 0,
      byType: {},
      averageConfidence: 0
    };
  }
}

module.exports = MLDetector;