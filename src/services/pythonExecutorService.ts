import { supabase } from '@/integrations/supabase/client';

export interface PythonExecutionResult {
  success: boolean;
  output: string;
  error: string;
  exitCode: number;
  estimatedTime?: string;
}

export interface PythonExecutionOptions {
  code: string;
  stdin?: string;
  args?: string[];
  silent?: boolean; // If true, don't show code in chat
}

/**
 * Service for executing Python code with full network access
 * Uses eliza-python-runtime to enable Eliza to call all 84 edge functions
 * Provides full access to Supabase backend capabilities
 */
export class PythonExecutorService {
  private static executionHistory: Array<{
    code: string;
    result: PythonExecutionResult;
    timestamp: Date;
  }> = [];

  /**
   * Execute Python code with time estimation
   */
  static async executeCode(options: PythonExecutionOptions): Promise<PythonExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🐍 Eliza Python Runtime - Starting execution with network access:', {
        codeLength: options.code.length,
        silent: options.silent,
        estimatedTime: this.estimateExecutionTime(options.code),
        runtime: 'eliza-python-runtime',
        networkEnabled: true
      });

      const { data, error } = await supabase.functions.invoke('eliza-python-runtime', {
        body: {
          code: options.code,
          stdin: options.stdin || '',
          args: options.args || [],
          purpose: 'Eliza code execution',
          source: 'eliza'
        }
      });

      const executionTime = Date.now() - startTime;

      if (error) {
        const result: PythonExecutionResult = {
          success: false,
          output: '',
          error: error.message,
          exitCode: 1,
          estimatedTime: `${executionTime}ms`
        };
        
        this.addToHistory(options.code, result);
        console.error('❌ Python execution failed:', error);
        return result;
      }

      const result: PythonExecutionResult = {
        success: data.success,
        output: data.output || '',
        error: data.error || '',
        exitCode: data.exitCode || 0,
        estimatedTime: `${executionTime}ms`
      };

      this.addToHistory(options.code, result);
      console.log('✅ Python execution completed:', {
        success: result.success,
        executionTime: `${executionTime}ms`,
        outputLength: result.output.length
      });

      return result;

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const result: PythonExecutionResult = {
        success: false,
        output: '',
        error: error.message || 'Unknown error',
        exitCode: 1,
        estimatedTime: `${executionTime}ms`
      };

      this.addToHistory(options.code, result);
      console.error('❌ Python executor service error:', error);
      return result;
    }
  }

  /**
   * Estimate execution time based on code complexity
   * This helps Eliza inform users how long to wait
   */
  private static estimateExecutionTime(code: string): string {
    const lines = code.split('\n').filter(line => line.trim()).length;
    const hasLoops = /\b(for|while)\b/.test(code);
    const hasRequests = /\brequests\b/.test(code);
    const hasDataProcessing = /\b(pandas|numpy)\b/.test(code);
    const hasFileIO = /\b(open|read|write)\b/.test(code);

    let estimatedSeconds = 1; // Base time

    if (lines > 20) estimatedSeconds += 2;
    if (lines > 50) estimatedSeconds += 5;
    if (hasLoops) estimatedSeconds += 3;
    if (hasRequests) estimatedSeconds += 10; // Network calls are slow
    if (hasDataProcessing) estimatedSeconds += 5;
    if (hasFileIO) estimatedSeconds += 2;

    if (estimatedSeconds < 5) return '~5 seconds';
    if (estimatedSeconds < 15) return '~15 seconds';
    if (estimatedSeconds < 30) return '~30 seconds';
    if (estimatedSeconds < 60) return '~1 minute';
    return '~2 minutes';
  }

  /**
   * Add execution to history for context
   */
  private static addToHistory(code: string, result: PythonExecutionResult): void {
    this.executionHistory.push({
      code,
      result,
      timestamp: new Date()
    });

    // Keep only last 50 executions
    if (this.executionHistory.length > 50) {
      this.executionHistory.shift();
    }
  }

  /**
   * Get execution history (for Eliza's context)
   */
  static getHistory(limit: number = 10): typeof this.executionHistory {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Clear execution history
   */
  static clearHistory(): void {
    this.executionHistory = [];
    console.log('🧹 Python execution history cleared');
  }

  /**
   * Get available Python packages and edge function access
   * With eliza-python-runtime, Eliza has access to:
   * - All standard Python libraries (urllib, json, etc.)
   * - Full network access to call all 84 edge functions
   * - Auto-injected SUPABASE_URL and SUPABASE_SERVICE_KEY
   */
  static getAvailablePackages(): string[] {
    return [
      'Built-in: urllib, json, base64, datetime, math, statistics, re, random',
      'Network: Full outbound HTTP/HTTPS access',
      'Edge Functions: All 84 Supabase edge functions accessible',
      'Environment: SUPABASE_URL and SUPABASE_SERVICE_KEY pre-configured'
    ];
  }
}

// Export singleton-like interface
export const pythonExecutor = PythonExecutorService;
