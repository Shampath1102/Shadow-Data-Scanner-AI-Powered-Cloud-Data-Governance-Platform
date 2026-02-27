const winston = require('winston');

// Safely require chalk with fallback
let chalk;
try {
  chalk = require('chalk');
} catch (e) {
  chalk = {
    red: (text) => text,
    yellow: (text) => text,
    green: (text) => text,
    cyan: (text) => text,
    gray: (text) => text,
    bold: (text) => text
  };
}

// Define custom levels including 'success'
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'cyan',
    success: 'green',
    debug: 'gray'
  }
};

// Add colors
winston.addColors(customLevels.colors);

const logger = winston.createLogger({
  levels: customLevels.levels,
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      let coloredMessage = message;
      const timestampColored = chalk.gray(`[${timestamp}]`);
      
      // Add colors based on level
      if (level === 'error') {
        coloredMessage = chalk.red(message);
      } else if (level === 'warn') {
        coloredMessage = chalk.yellow(message);
      } else if (level === 'info') {
        coloredMessage = chalk.cyan(message);
      } else if (level === 'success') {
        coloredMessage = chalk.green(message);
      } else if (level === 'debug') {
        coloredMessage = chalk.gray(message);
      }
      
      return `${timestampColored} ${coloredMessage}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'scanner.log',
      format: winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
      })
    })
  ]
});

module.exports = logger;