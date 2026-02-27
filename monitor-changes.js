const fs = require('fs');
const ScannerEngine = require('./src/scanner/engine');

const scanner = new ScannerEngine();
const baselineFile = './reports/baseline.json';
const currentScan = './reports/current.json';

async function monitor() {
  // Load baseline if exists
  let baseline = {};
  try {
    baseline = JSON.parse(fs.readFileSync(baselineFile));
  } catch {
    console.log('No baseline found, creating new baseline...');
  }
  
  // Run current scan
  const result = await scanner.scan('./test-data');
  
  // Save current scan
  fs.writeFileSync(currentScan, JSON.stringify(result.results, null, 2));
  
  // Compare with baseline
  if (baseline.summary) {
    const newFindings = result.results.summary.totalFindings - baseline.summary.totalFindings;
    if (newFindings > 0) {
      console.log(`⚠️  WARNING: ${newFindings} new findings detected!`);
    } else {
      console.log('✅ No new findings detected');
    }
  }
  
  // Update baseline
  fs.writeFileSync(baselineFile, JSON.stringify(result.results, null, 2));
}

monitor();