const FileScanner = require('./fileScanner');
const PatternMatcher = require('./patternMatcher');
const MLDetector = require('./mlDetector');
const ConsoleReporter = require('../reporters/consoleReporter');
const logger = require('../utils/logger');
const config = require('../../config/scannerConfig');

class ScannerEngine {
  constructor(customConfig = {}) {
    this.config = { ...config, ...customConfig };
    this.fileScanner = new FileScanner(this.config);
    this.patternMatcher = new PatternMatcher(this.config);
    this.mlDetector = new MLDetector(this.config.ml);
    this.reporter = new ConsoleReporter();
    this.results = {
      summary: {
        totalFiles: 0,
        totalFindings: 0,
        filesWithIssues: 0,
        byRisk: { high: 0, medium: 0, low: 0 },
        byCategory: {}
      },
      findings: [],
      scanTime: null,
      config: this.config
    };
  }

  async scan(targetPath) {
    const startTime = Date.now();
    logger.info(`🚀 Starting shadow data scan on: ${targetPath}`);
    
    try {
      // Step 1: Scan files
      logger.info('📁 Phase 1: Scanning files...');
      const scanResult = await this.fileScanner.scanDirectory(targetPath);
      
      if (scanResult.files.length === 0) {
        logger.warn('No files found to scan');
        return this.getEmptyResults(targetPath);
      }
      
      // Step 2: Analyze each file
      logger.info('🔍 Phase 2: Analyzing files for sensitive data...');
      
      for (const file of scanResult.files) {
        const fileFindings = await this.analyzeFile(file);
        
        if (fileFindings.length > 0) {
          this.results.findings.push(...fileFindings);
          this.results.summary.filesWithIssues++;
        }
      }
      
      // Step 3: Compile statistics
      this.compileStatistics();
      
      const scanTime = Date.now() - startTime;
      this.results.scanTime = this.formatScanTime(scanTime);
      
      // Step 4: Generate report
      logger.info('📊 Phase 3: Generating report...');
      const report = this.reporter.generateReport(this.results);
      
      logger.success(`✅ Scan completed in ${this.results.scanTime}`);
      logger.info(`📈 Summary: ${this.results.summary.totalFindings} findings in ${this.results.summary.totalFiles} files`);
      
      return {
        success: true,
        results: this.results,
        report
      };
      
    } catch (error) {
      logger.error(`Scan failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // In src/scanner/engine.js, update the analyzeFile method:
async analyzeFile(file) {
  const findings = [];
  
  // Preprocess content based on file type
  const processedContent = this.patternMatcher.preprocessContent(
    file.content, 
    file.extension
  );
  
  // Pattern matching analysis
  if (this.config.patterns.enabled) {
    const patternResults = this.patternMatcher.findMatches(processedContent, file);
    patternResults.findings.forEach(f => {
      findings.push({
        ...f,
        file: file.name,
        filePath: file.path,
        detectionMethod: 'pattern'
      });
    });
  }
  
  // ML analysis (use original content for ML)
  if (this.config.ml.enabled) {
    const mlResults = await this.mlDetector.analyzeContent(file.content, file);
    mlResults.findings.forEach(f => {
      findings.push({
        ...f,
        file: file.name,
        filePath: file.path,
        detectionMethod: 'ml'
      });
    });
  }
  
  // Update file with findings
  file.findings = findings;
  
  return findings;
}

  compileStatistics() {
    // Update total files
    this.results.summary.totalFiles = this.fileScanner.scannedFiles.length;
    this.results.summary.totalFindings = this.results.findings.length;
    
    // Compile risk statistics
    this.results.findings.forEach(finding => {
      const risk = finding.risk || 'unknown';
      this.results.summary.byRisk[risk] = (this.results.summary.byRisk[risk] || 0) + 1;
      
      const category = finding.category || 'uncategorized';
      this.results.summary.byCategory[category] = 
        (this.results.summary.byCategory[category] || 0) + 1;
    });
  }

  formatScanTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  getEmptyResults(targetPath) {
    return {
      success: true,
      results: {
        summary: {
          totalFiles: 0,
          totalFindings: 0,
          filesWithIssues: 0,
          byRisk: { high: 0, medium: 0, low: 0 },
          byCategory: {}
        },
        findings: [],
        scanTime: '0s',
        config: this.config
      },
      report: 'No files found to scan'
    };
  }

  async scanSingleFile(filePath) {
    const startTime = Date.now();
    logger.info(`🚀 Scanning single file: ${filePath}`);
    
    try {
      const scanResult = await this.fileScanner.scanSingleFile(filePath);
      
      if (scanResult.files.length === 0) {
        return {
          success: false,
          error: 'File not supported or accessible'
        };
      }
      
      const file = scanResult.files[0];
      const findings = await this.analyzeFile(file);
      
      this.results.findings = findings;
      this.results.summary.totalFiles = 1;
      this.results.summary.totalFindings = findings.length;
      this.results.summary.filesWithIssues = findings.length > 0 ? 1 : 0;
      
      this.compileStatistics();
      
      const report = this.reporter.generateReport(this.results);
      
      logger.success(`✅ File scan completed in ${this.formatScanTime(Date.now() - startTime)}`);
      
      return {
        success: true,
        results: this.results,
        report
      };
      
    } catch (error) {
      logger.error(`File scan failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ScannerEngine;