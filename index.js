#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const ScannerEngine = require('./src/scanner/engine');
const logger = require('./src/utils/logger');
const packageJson = require('./package.json');

// Configure CLI
program
  .name('shadow-scanner')
  .description('AI-based scanner for detecting sensitive/unencrypted data')
  .version(packageJson.version);

program
  .command('scan <path>')
  .description('Scan a directory or file for sensitive data')
  .option('-o, --output <format>', 'Output format (console, json, html)', 'console')
  .option('-c, --config <path>', 'Custom config file path')
  .option('--no-ml', 'Disable ML detection')
  .option('--no-patterns', 'Disable pattern matching')
  .option('--exclude <dirs>', 'Additional directories to exclude (comma-separated)')
  .action(async (targetPath, options) => {
    try {
      // Resolve path
      const resolvedPath = path.resolve(targetPath);
      
      if (!fs.existsSync(resolvedPath)) {
        logger.error(`Path does not exist: ${resolvedPath}`);
        process.exit(1);
      }
      
      // Load custom config if provided
      let customConfig = {};
      if (options.config) {
        const configPath = path.resolve(options.config);
        if (fs.existsSync(configPath)) {
          customConfig = require(configPath);
          logger.info(`Loaded custom config from: ${configPath}`);
        }
      }
      
      // Apply CLI options to config
      if (options.ml === false) {
        customConfig.ml = customConfig.ml || {};
        customConfig.ml.enabled = false;
      }
      
      if (options.patterns === false) {
        customConfig.patterns = customConfig.patterns || {};
        customConfig.patterns.enabled = false;
      }
      
      if (options.exclude) {
        const extraExcludes = options.exclude.split(',').map(d => d.trim());
        customConfig.excludeDirectories = [
          ...(customConfig.excludeDirectories || []),
          ...extraExcludes
        ];
      }
      
      // Create scanner and run
      const scanner = new ScannerEngine(customConfig);
      
      // Check if path is file or directory
      const stats = fs.statSync(resolvedPath);
      let result;
      
      if (stats.isFile()) {
        result = await scanner.scanSingleFile(resolvedPath);
      } else {
        result = await scanner.scan(resolvedPath);
      }
      
      // Handle output format
      if (options.output === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else if (options.output === 'html') {
        // TODO: Implement HTML reporter
        console.log('HTML output coming soon...');
      } else {
        // Console output already handled by scanner
        if (!result.success) {
          process.exit(1);
        }
      }
      
    } catch (error) {
      logger.error(`Scanner error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('list-patterns')
  .description('List all available detection patterns')
  .action(() => {
    const patterns = require('./src/models/sensitivePatterns.json');
    console.log('\n📋 Available Detection Patterns:\n');
    
    Object.entries(patterns).forEach(([category, data]) => {
      console.log(chalk.yellow.bold(`\n${category.toUpperCase()} (${data.risk} risk)`));
      console.log(chalk.gray('─'.repeat(40)));
      
      data.patterns.forEach(pattern => {
        console.log(`  • ${pattern.name}: ${pattern.description}`);
      });
    });
  });

program
  .command('init-config')
  .description('Create a default configuration file')
  .action(() => {
    const defaultConfig = require('./config/scannerConfig');
    const configPath = path.join(process.cwd(), 'scanner-config.json');
    
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    logger.success(`Default config created at: ${configPath}`);
  });

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}