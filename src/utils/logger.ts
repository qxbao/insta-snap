/* eslint-disable @typescript-eslint/no-explicit-any */
// Định nghĩa các level để quản lý log chặt chẽ
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export class Logger {
  private prefix: string;
  private isDev: boolean;

  constructor(scope: string) {
    this.prefix = `[InstaSnap:${scope}]`;
    this.isDev = import.meta.env.MODE === 'development';
  }

  private format(level: LogLevel, message: string) {
    const timestamp = new Date().toLocaleTimeString();
    return `${this.prefix} [${timestamp}] ${message}`;
  }

  info(message: string, ...args: any[]) {
    if (this.isDev) {
      console.log(`%c${this.format('info', message)}`, 'color: #3b82f6; font-weight: bold', ...args);
    }
  }

  error(message: string, ...args: any[]) {
    console.error(`%c${this.format('error', message)}`, 'color: #ef4444; font-weight: bold', ...args);
  }

  debug(message: string, ...args: any[]) {
    if (this.isDev) {
      console.debug(`%c${this.format('debug', message)}`, 'color: #8b5cf6', ...args);
    }
  }
}

export const createLogger = (scope: string) => new Logger(scope);