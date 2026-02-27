const chalk = require('chalk');
const logger = require('../utils/logger');

class ConsoleReporter {
  constructor() {
    this.output = [];
  }

  generateReport(scanResults) {
    this.clear();
    this.addHeader('SHADOW DATA SCANNER REPORT');
    this.addLine();
    
    // Summary
    this.addSummary(scanResults);
    this.addLine();
    
    // Detailed findings
    this.addDetailedFindings(scanResults);
    this.addLine();
    
    // Recommendations
    this.addRecommendations(scanResults);
    
    // Print to console
    this.output.forEach(line => console.log(line));
    
    return this.output.join('\n');
  }

  addHeader(text) {
    this.output.push(chalk.cyan.bold('\n' + '='.repeat(60)));
    this.output.push(chalk.cyan.bold(text.padStart(30 + text.length/2, ' ')));
    this.output.push(chalk.cyan.bold('='.repeat(60)));
  }

  addLine() {
    this.output.push('');
  }

  addSummary(results) {
    const { summary, findings } = results;
    
    this.output.push(chalk.yellow.bold('📊 SCAN SUMMARY'));
    this.output.push(chalk.gray('─'.repeat(40)));
    
    this.output.push(`📁 Files Scanned: ${chalk.white.bold(summary.totalFiles)}`);
    this.output.push(`🔍 Total Findings: ${chalk.white.bold(summary.totalFindings)}`);
    this.output.push(`⚠️  Files with Issues: ${chalk.white.bold(summary.filesWithIssues)}`);
    
    this.output.push(chalk.yellow('\n📈 RISK BREAKDOWN'));
    this.output.push(chalk.gray('─'.repeat(40)));
    
    this.output.push(`🔴 High Risk: ${chalk.red.bold(summary.byRisk.high || 0)}`);
    this.output.push(`🟡 Medium Risk: ${chalk.yellow.bold(summary.byRisk.medium || 0)}`);
    this.output.push(`🟢 Low Risk: ${chalk.green.bold(summary.byRisk.low || 0)}`);
    
    if (summary.byCategory && Object.keys(summary.byCategory).length > 0) {
      this.output.push(chalk.yellow('\n📑 FINDINGS BY CATEGORY'));
      this.output.push(chalk.gray('─'.repeat(40)));
      
      Object.entries(summary.byCategory).forEach(([category, count]) => {
        this.output.push(`${category}: ${chalk.white.bold(count)}`);
      });
    }
  }

  addDetailedFindings(results) {
    const { findings } = results;
    
    if (findings.length === 0) {
      this.output.push(chalk.green.bold('\n✨ No sensitive data found!'));
      return;
    }
    
    this.output.push(chalk.yellow.bold('\n🔍 DETAILED FINDINGS'));
    this.output.push(chalk.gray('═'.repeat(60)));
    
    // Group findings by file
    const byFile = {};
    findings.forEach(finding => {
      const file = finding.file || 'unknown';
      if (!byFile[file]) byFile[file] = [];
      byFile[file].push(finding);
    });
    
    Object.entries(byFile).forEach(([file, fileFindings]) => {
      this.output.push(chalk.cyan.bold(`\n📄 ${file}`));
      this.output.push(chalk.gray('─'.repeat(40)));
      
      fileFindings.forEach((f, index) => {
        const riskColor = f.risk === 'high' ? chalk.red : 
                         f.risk === 'medium' ? chalk.yellow : 
                         chalk.green;
        
        this.output.push(
          `  ${index + 1}. ${chalk.bold(f.type)} - ${riskColor(f.risk.toUpperCase())}`
        );
        this.output.push(`     ${chalk.gray('Context:')} ${f.context || 'N/A'}`);
        
        if (f.value) {
          const maskedValue = this.maskSensitiveValue(f.value, f.risk);
          this.output.push(`     ${chalk.gray('Value:')} ${maskedValue}`);
        }
        
        if (f.confidence) {
          this.output.push(`     ${chalk.gray('Confidence:')} ${(f.confidence * 100).toFixed(1)}%`);
        }
        
        this.output.push('');
      });
    });
  }

  addRecommendations(results) {
    const highRiskCount = results.summary.byRisk.high || 0;
    
    this.output.push(chalk.yellow.bold('💡 RECOMMENDATIONS'));
    this.output.push(chalk.gray('═'.repeat(60)));
    
    if (highRiskCount > 0) {
      this.output.push(chalk.red.bold(`⚠️  Found ${highRiskCount} high-risk items that need immediate attention:`));
      this.output.push('   • Encrypt sensitive data at rest');
      this.output.push('   • Remove hardcoded credentials');
      this.output.push('   • Use environment variables or secret managers');
      this.output.push('   • Implement proper access controls');
    } else {
      this.output.push(chalk.green('✓ No high-risk items found, but consider:'));
      this.output.push('   • Regular security scans');
      this.output.push('   • Data classification policies');
      this.output.push('   • Encryption for sensitive data');
    }
    
    this.output.push(chalk.gray('\n' + '─'.repeat(60)));
    this.output.push(chalk.gray(`Report generated: ${new Date().toLocaleString()}`));
  }

  maskSensitiveValue(value, risk) {
    if (!value) return '';
    
    if (risk === 'high') {
      if (value.length > 8) {
        return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
      }
      return '*'.repeat(value.length);
    }
    
    return value;
  }

  clear() {
    this.output = [];
  }
}

module.exports = ConsoleReporter;