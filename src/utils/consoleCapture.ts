// Console Log Capture Utility
// Captures console logs for bug reports

interface CapturedLog {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: string;
}

class ConsoleCapture {
  private logs: CapturedLog[] = [];
  private maxLogs = 100; // Keep last 100 logs
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
    debug: typeof console.debug;
  };
  private isCapturing = false;

  constructor() {
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    };
  }

  private formatArgs(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  }

  private addLog(type: CapturedLog['type'], args: unknown[]) {
    const log: CapturedLog = {
      type,
      message: this.formatArgs(args),
      timestamp: new Date().toISOString(),
    };
    
    this.logs.push(log);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  start() {
    if (this.isCapturing) return;
    this.isCapturing = true;

    console.log = (...args: unknown[]) => {
      this.addLog('log', args);
      this.originalConsole.log(...args);
    };

    console.warn = (...args: unknown[]) => {
      this.addLog('warn', args);
      this.originalConsole.warn(...args);
    };

    console.error = (...args: unknown[]) => {
      this.addLog('error', args);
      this.originalConsole.error(...args);
    };

    console.info = (...args: unknown[]) => {
      this.addLog('info', args);
      this.originalConsole.info(...args);
    };

    console.debug = (...args: unknown[]) => {
      this.addLog('debug', args);
      this.originalConsole.debug(...args);
    };
  }

  stop() {
    if (!this.isCapturing) return;
    this.isCapturing = false;

    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  getLogs(): CapturedLog[] {
    return [...this.logs];
  }

  getLogsAsString(): string {
    return this.logs
      .map((log) => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`)
      .join('\n');
  }

  getErrorsOnly(): CapturedLog[] {
    return this.logs.filter((log) => log.type === 'error' || log.type === 'warn');
  }

  clear() {
    this.logs = [];
  }
}

// Singleton instance
export const consoleCapture = new ConsoleCapture();

// Auto-start capturing when module loads
consoleCapture.start();
