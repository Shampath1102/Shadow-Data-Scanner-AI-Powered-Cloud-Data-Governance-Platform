const fs = require('fs').promises;
const path = require('path');

async function generateEnhancedReport() {
  try {
    // Read the summary report
    const summaryPath = path.join(__dirname, 'reports', 'summary.json');
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    
    // Read the full scan results (if available)
    let fullResults;
    try {
      fullResults = JSON.parse(await fs.readFile(path.join(__dirname, 'reports', 'full-scan.json'), 'utf8'));
    } catch {
      fullResults = { findings: [] };
    }
    
    // Generate markdown report
    const markdown = generateMarkdownReport(summary, fullResults);
    await fs.writeFile(path.join(__dirname, 'reports', 'scan-report.md'), markdown);
    
    // Generate HTML report
    const html = generateHTMLReport(summary, fullResults);
    await fs.writeFile(path.join(__dirname, 'reports', 'scan-report.html'), html);
    
    // Generate CSV report
    const csv = generateCSVReport(fullResults);
    await fs.writeFile(path.join(__dirname, 'reports', 'scan-report.csv'), csv);
    
    console.log('✅ Enhanced reports generated:');
    console.log('   - reports/scan-report.md');
    console.log('   - reports/scan-report.html');
    console.log('   - reports/scan-report.csv');
    
  } catch (error) {
    console.error('Error generating reports:', error);
  }
}

function generateMarkdownReport(summary, fullResults) {
  let markdown = `# 🔒 Shadow Data Scanner Report\n\n`;
  markdown += `**Scan Time:** ${summary.scanTime}\n\n`;
  
  markdown += `## 📊 Summary\n\n`;
  markdown += `- **Files Scanned:** ${summary.totalFiles}\n`;
  markdown += `- **Total Findings:** ${summary.totalFindings}\n`;
  markdown += `- **Files with Issues:** ${summary.filesWithIssues}\n\n`;
  
  markdown += `### Risk Breakdown\n\n`;
  markdown += `- 🔴 High: ${summary.riskBreakdown.high || 0}\n`;
  markdown += `- 🟡 Medium: ${summary.riskBreakdown.medium || 0}\n`;
  markdown += `- 🟢 Low: ${summary.riskBreakdown.low || 0}\n\n`;
  
  markdown += `### Category Breakdown\n\n`;
  Object.entries(summary.categoryBreakdown || {}).forEach(([category, count]) => {
    markdown += `- **${category}:** ${count}\n`;
  });
  
  markdown += `\n## 💡 Recommendations\n\n`;
  summary.recommendations.forEach(rec => {
    markdown += `### ${rec.priority.toUpperCase()}\n`;
    markdown += `- **Issue:** ${rec.message}\n`;
    markdown += `- **Action:** ${rec.action}\n\n`;
  });
  
  return markdown;
}

function generateHTMLReport(summary, fullResults) {
  return `<!DOCTYPE html>
<html>
<head>
    <title>Security Scan Report</title>
    <style>
        body { font-family: Arial; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .high { color: #e74c3c; }
        .medium { color: #f39c12; }
        .low { color: #27ae60; }
        .rec { background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Shadow Data Scanner Report</h1>
            <p>Generated: ${summary.scanTime}</p>
        </div>
        
        <div class="stats">
            <div class="card">
                <h3>Files Scanned</h3>
                <div style="font-size: 32px;">${summary.totalFiles}</div>
            </div>
            <div class="card">
                <h3>Total Findings</h3>
                <div style="font-size: 32px;">${summary.totalFindings}</div>
            </div>
            <div class="card">
                <h3>Files with Issues</h3>
                <div style="font-size: 32px;">${summary.filesWithIssues}</div>
            </div>
            <div class="card">
                <h3>Risk Levels</h3>
                <div class="high">🔴 High: ${summary.riskBreakdown.high || 0}</div>
                <div class="medium">🟡 Medium: ${summary.riskBreakdown.medium || 0}</div>
                <div class="low">🟢 Low: ${summary.riskBreakdown.low || 0}</div>
            </div>
        </div>
        
        <div class="card">
            <h2>💡 Recommendations</h2>
            ${summary.recommendations.map(rec => `
                <div class="rec">
                    <strong style="color: ${rec.priority === 'high' ? '#e74c3c' : '#f39c12'}">
                        ${rec.priority.toUpperCase()}
                    </strong>
                    <p>${rec.message}</p>
                    <p><em>Action: ${rec.action}</em></p>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
}

function generateCSVReport(fullResults) {
  let csv = 'File,Type,Risk,Value,Context\n';
  
  (fullResults.findings || []).forEach(f => {
    const value = (f.value || '').replace(/,/g, ';').replace(/\n/g, ' ');
    const context = (f.context || '').replace(/,/g, ';').replace(/\n/g, ' ');
    csv += `${f.file || 'unknown'},${f.type},${f.risk},${value},${context}\n`;
  });
  
  return csv;
}

generateEnhancedReport();