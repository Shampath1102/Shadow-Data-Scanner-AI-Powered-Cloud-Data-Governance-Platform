const path = require('path');

module.exports = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedExtensions: [
    '.txt', '.json', '.env', '.yml', '.yaml', 
    '.conf', '.config', '.properties', '.ini',
    '.xml', '.csv', '.js', '.ts', '.py', '.rb',
    '.sh', '.bat', '.ps1', '.cfg', '.cnf'
  ],
  excludeDirectories: [
    'node_modules', '.git', 'dist', 'build', 
    'venv', '__pycache__', '.idea', '.vscode'
  ],
  excludeFiles: [
    'package-lock.json', 'yarn.lock', 'composer.lock'
  ],
  patterns: {
    enabled: true,
    customPatternsPath: './custom-patterns.json'
  },
  ml: {
    enabled: true,
    confidenceThreshold: 0.6,
    modelPath: './models'
  },
  reporting: {
    formats: ['console', 'html', 'json'],
    outputDir: path.join(process.cwd(), 'reports'),
    includeContext: true,
    contextLength: 50
  }
};