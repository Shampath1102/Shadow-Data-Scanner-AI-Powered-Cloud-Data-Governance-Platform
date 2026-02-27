const path = require('path');

module.exports = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedExtensions: [
    '.txt', '.json', '.env', '.yml', '.yaml', 
    '.conf', '.config', '.properties', '.ini',
    '.xml', '.csv', '.js', '.ts', '.py', '.rb',
    '.sh', '.bat', '.ps1', '.cfg', '.cnf', '.log',
    '.md', '.rst', '.html', '.htm', '.php', '.asp',
    '.java', '.c', '.cpp', '.h', '.hpp', '.go', '.rs'
  ],
  excludeDirectories: [
    'node_modules', '.git', 'dist', 'build', 
    'venv', '__pycache__', '.idea', '.vscode',
    'coverage', '.nyc_output', 'tmp', 'temp',
    'logs', 'cache', '.cache', 'vendor', 'bower_components'
  ],
  excludeFiles: [
    'package-lock.json', 'yarn.lock', 'composer.lock',
    'Gemfile.lock', 'poetry.lock', 'Pipfile.lock'
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
    formats: ['console', 'json', 'html'],
    outputDir: path.join(process.cwd(), 'reports'),
    includeContext: true,
    contextLength: 50,
    maskSensitiveValues: true
  },
  scan: {
    followSymlinks: false,
    maxDepth: 10,
    timeout: 30000, // 30 seconds per file
    parallelScans: 5
  }
};