const fs = require('fs').promises;
const path = require('path');

class SummaryReporter {
  async generateReport(results, outputPath = './reports/summary.json') {
    const summary = {
      scanTime: results.scanTime,
      totalFiles: results.summary.totalFiles,
      totalFindings: results.summary.totalFindings,
      filesWithIssues: results.summary.filesWithIssues,
      riskBreakdown: results.summary.byRisk,
      categoryBreakdown: results.summary.byCategory,
      topFindings: this.getTopFindings(results.findings, 10),
      recommendations: this.generateRecommendations(results)
    };
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Write summary
    await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
    
    // Also create a CSV report
    await this.generateCSV(results, outputPath.replace('.json', '.csv'));
    
    return outputPath;
  }
  
  getTopFindings(findings, limit) {
    // Group by type and count
    const typeCount = {};
    findings.forEach(f => {
      typeCount[f.type] = (typeCount[f.type] || 0) + 1;
    });
    
    // Sort by count and return top
    return Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([type, count]) => ({ type, count }));
  }
  
  generateRecommendations(results) {
    const recommendations = [];
    const highRisk = results.summary.byRisk.high || 0;
    
    if (highRisk > 0) {
      recommendations.push({
        priority: 'high',
        message: `Remove ${highRisk} hardcoded credentials found in your files`,
        action: 'Move secrets to environment variables or a secret manager'
      });
    }
    
    if (results.summary.byCategory.credentials > 0) {
      recommendations.push({
        priority: 'high',
        message: 'Credentials detected in plain text',
        action: 'Use a secrets manager like HashiCorp Vault or AWS Secrets Manager'
      });
    }
    
    if (results.summary.byCategory.financial > 0) {
      recommendations.push({
        priority: 'high',
        message: 'Financial data (credit cards, IBANs) detected',
        action: 'Encrypt financial data and restrict access'
      });
    }
    
    return recommendations;
  }
  
  async generateCSV(results, outputPath) {
    let csv = 'File,Type,Risk,Value\n';
    
    results.findings.forEach(f => {
      // Escape commas in value
      const value = (f.value || '').replace(/,/g, ';');
      csv += `${f.file},${f.type},${f.risk},${value}\n`;
    });
    
    await fs.writeFile(outputPath, csv);
  }
}

module.exports = SummaryReporter;