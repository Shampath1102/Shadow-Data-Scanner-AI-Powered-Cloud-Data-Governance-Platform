const fs = require('fs').promises;
const path = require('path');
const { createReadStream } = require('fs');
const readline = require('readline');
const logger = require('../utils/logger');

class FileScanner {
  constructor(config) {
    this.config = config;
    this.scannedFiles = [];
    this.errors = [];
  }

  async scanDirectory(dirPath) {
    logger.info(`📁 Scanning directory: ${dirPath}`);
    this.scannedFiles = [];
    this.errors = [];
    
    try {
      const files = await this.getFilesRecursively(dirPath);
      logger.info(`Found ${files.length} files to scan`);
      
      for (const file of files) {
        if (await this.shouldScanFile(file)) {
          const fileData = await this.readFile(file);
          this.scannedFiles.push(fileData);
          logger.success(`✅ Scanned: ${path.basename(file)} (${this.formatFileSize(fileData.size)})`);
        }
      }
      
      logger.info(`Successfully scanned ${this.scannedFiles.length} files`);
      
    } catch (error) {
      logger.error(`Directory scan error: ${error.message}`);
      this.errors.push({ type: 'directory_scan', error: error.message });
    }
    
    return {
      files: this.scannedFiles,
      errors: this.errors
    };
  }

  async getFilesRecursively(dirPath) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip excluded directories
        if (entry.isDirectory()) {
          if (!this.isExcludedDirectory(entry.name)) {
            const subFiles = await this.getFilesRecursively(fullPath);
            files.push(...subFiles);
          } else {
            logger.debug(`Skipping excluded directory: ${entry.name}`);
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.error(`Error reading directory ${dirPath}: ${error.message}`);
      this.errors.push({ type: 'directory_read', path: dirPath, error: error.message });
    }
    
    return files;
  }

  isExcludedDirectory(dirName) {
    return this.config.excludeDirectories.includes(dirName);
  }

  async shouldScanFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    // Check if file is excluded
    if (this.config.excludeFiles.includes(fileName)) {
      return false;
    }
    
    // Check if extension is supported
    const isSupported = this.config.supportedExtensions.includes(ext);
    
    if (!isSupported) {
      logger.debug(`Skipping unsupported file type: ${filePath}`);
      return false;
    }
    
    // Check file size
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.config.maxFileSize) {
        logger.debug(`Skipping large file (${this.formatFileSize(stats.size)}): ${filePath}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error checking file ${filePath}: ${error.message}`);
      return false;
    }
    
    return true;
  }

  async readFile(filePath) {
    const stats = await fs.stat(filePath);
    let content = '';
    
    try {
      // Try to read as text
      content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      // If binary file, just note it
      logger.debug(`Binary or unreadable file: ${filePath}`);
      content = `[Binary file - content not displayed]`;
    }
    
    return {
      path: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath),
      size: stats.size,
      lastModified: stats.mtime,
      created: stats.birthtime,
      content: content,
      findings: []
    };
  }

  async scanSingleFile(filePath) {
    try {
      if (await this.shouldScanFile(filePath)) {
        const fileData = await this.readFile(filePath);
        logger.success(`✅ Scanned single file: ${path.basename(filePath)}`);
        return {
          files: [fileData],
          errors: []
        };
      } else {
        return {
          files: [],
          errors: [{ type: 'skipped', path: filePath, reason: 'File type not supported or excluded' }]
        };
      }
    } catch (error) {
      logger.error(`Error scanning file ${filePath}: ${error.message}`);
      return {
        files: [],
        errors: [{ type: 'file_scan', path: filePath, error: error.message }]
      };
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStats() {
    return {
      totalFiles: this.scannedFiles.length,
      totalSize: this.scannedFiles.reduce((acc, file) => acc + file.size, 0),
      errors: this.errors.length,
      fileTypes: this.getFileTypeStats()
    };
  }

  getFileTypeStats() {
    const stats = {};
    this.scannedFiles.forEach(file => {
      const ext = file.extension || 'unknown';
      stats[ext] = (stats[ext] || 0) + 1;
    });
    return stats;
  }
}

module.exports = FileScanner;