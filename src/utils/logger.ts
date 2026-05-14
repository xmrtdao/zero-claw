/**
 * Production-safe logging utility
 * 
 * In development: All logs are output to console
 * In production: Only errors are logged, info/debug suppressed
 * 
 * Usage:
 * import { logger } from '@/utils/logger';
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to fetch data', error);
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

interface LogMetadata {
  [key: string]: any;
}

class Logger {
  private formatMessage(level: string, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  /**
   * Debug-level logging (development only)
   * Use for detailed troubleshooting information
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (isDevelopment) {
      console.log(this.formatMessage('DEBUG', message, metadata));
    }
  }

  /**
   * Info-level logging (development only)
   * Use for general informational messages
   */
  info(message: string, metadata?: LogMetadata): void {
    if (isDevelopment) {
      console.log(this.formatMessage('INFO', message, metadata));
    }
  }

  /**
   * Warning-level logging (all environments)
   * Use for potentially harmful situations
   */
  warn(message: string, metadata?: LogMetadata): void {
    console.warn(this.formatMessage('WARN', message, metadata));
    
    // In production, send to monitoring service
    if (isProduction) {
      this.sendToMonitoring('warn', message, metadata);
    }
  }

  /**
   * Error-level logging (all environments)
   * Use for error events that might still allow the application to continue
   */
  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    const errorMeta = error instanceof Error 
      ? { ...metadata, error: error.message, stack: error.stack }
      : { ...metadata, error };
    
    console.error(this.formatMessage('ERROR', message, errorMeta));
    
    // In production, send to monitoring service (Sentry, etc.)
    if (isProduction) {
      this.sendToMonitoring('error', message, errorMeta);
    }
  }

  /**
   * Critical-level logging (all environments)
   * Use for severe error events that might cause the application to abort
   */
  critical(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    const errorMeta = error instanceof Error 
      ? { ...metadata, error: error.message, stack: error.stack }
      : { ...metadata, error };
    
    console.error(this.formatMessage('CRITICAL', message, errorMeta));
    
    // Always send critical errors to monitoring
    this.sendToMonitoring('critical', message, errorMeta);
  }

  /**
   * Send logs to external monitoring service
   * TODO: Integrate with Sentry, LogRocket, or similar service
   */
  private sendToMonitoring(level: string, message: string, metadata?: LogMetadata): void {
    // Placeholder for external monitoring integration
    // Example: Sentry.captureMessage(message, { level, extra: metadata });
    
    // For now, we could send to a Supabase edge function for logging
    if (typeof window !== 'undefined' && isProduction) {
      // Client-side: send to backend logging endpoint
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, metadata, timestamp: new Date().toISOString() })
      }).catch(() => {
        // Silent fail - don't want logging to break the app
      });
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or advanced usage
export { Logger };
