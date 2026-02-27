const ScannerEngine = require('./src/scanner/engine');
const path = require('path');

async function testAllFiles() {
  console.log('🔍 Testing scanner with all file types...\n');
  
  const scanner = new ScannerEngine({
    ml: { enabled: true, confidenceThreshold: 0.5 },
    patterns: { enabled: true }
  });
  
  // Test each file individually
  const files = [
    'sample.env',
    'config.json', 
    'credentials.txt',
    'readme.txt'
  ];
  
  for (const file of files) {
    console.log(`\n📄 Testing: ${file}`);
    console.log('─'.repeat(40));
    
    const filePath = path.join(__dirname, 'test-data', file);
    const result = await scanner.scanSingleFile(filePath);
    
    if (result.success) {
      const findings = result.results.findings;
      const byRisk = result.results.summary.byRisk;
      
      console.log(`Findings: ${findings.length}`);
      console.log(`  High: ${byRisk.high || 0}`);
      console.log(`  Medium: ${byRisk.medium || 0}`);
      console.log(`  Low: ${byRisk.low || 0}`);
      
      // Show first 3 findings as examples
      if (findings.length > 0) {
        console.log('\nSample findings:');
        findings.slice(0, 3).forEach((f, i) => {
          console.log(`  ${i+1}. ${f.type} (${f.risk})`);
        });
      }
    } else {
      console.log(`Error: ${result.error}`);
    }
  }
}

testAllFiles().catch(console.error);