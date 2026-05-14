import { supabase } from '@/integrations/supabase/client';

export interface PythonExecution {
  id: string;
  code: string;
  output: string;
  error: string;
  timestamp: Date;
  source: 'eliza' | 'user';
}

export interface TaskUpdate {
  id: string;
  title: string;
  description: string;
  status: string;
  stage: string;
  assigned_to: string;
  updated_at: Date;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  name: string;
  description?: string;
  status: 'running' | 'completed' | 'failed';
  current_step_index: number;
  total_steps: number;
  final_result?: any;
  failed_step?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Service to monitor Eliza's autonomous work across Python execution and task management
 */
export class AutonomousWorkMonitor {
  private static pythonExecutionCallbacks: ((execution: PythonExecution) => void)[] = [];
  private static taskUpdateCallbacks: ((task: TaskUpdate) => void)[] = [];
  private static workflowCallbacks: ((workflow: WorkflowExecution) => void)[] = [];
  private static pythonChannel: any = null;
  private static taskChannel: any = null;
  private static workflowChannel: any = null;

  /**
   * Subscribe to Python execution events from Eliza
   */
  static onPythonExecution(callback: (execution: PythonExecution) => void) {
    this.pythonExecutionCallbacks.push(callback);
    
    // Set up realtime subscription if not already active
    if (!this.pythonChannel) {
      this.setupPythonMonitoring();
    }
    
    return () => {
      this.pythonExecutionCallbacks = this.pythonExecutionCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to task updates from Eliza's agent management
   */
  static onTaskUpdate(callback: (task: TaskUpdate) => void) {
    this.taskUpdateCallbacks.push(callback);
    
    // Set up realtime subscription if not already active
    if (!this.taskChannel) {
      this.setupTaskMonitoring();
    }
    
    return () => {
      this.taskUpdateCallbacks = this.taskUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to workflow execution updates
   */
  static onWorkflowUpdate(callback: (workflow: WorkflowExecution) => void) {
    this.workflowCallbacks.push(callback);
    
    // Set up realtime subscription if not already active
    if (!this.workflowChannel) {
      this.setupWorkflowMonitoring();
    }
    
    return () => {
      this.workflowCallbacks = this.workflowCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Check GitHub token health before attempting GitHub operations
   */
  static async checkGitHubHealth(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const { data, error } = await supabase
        .from('api_key_health')
        .select('*')
        .or('service_name.eq.github,service_name.eq.github_session')
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) {
        console.error('Error checking GitHub health:', error);
        return { healthy: false, message: 'Could not check token health' };
      }

      // Check if either backend or session token is healthy
      const hasHealthyToken = data?.some(h => h.is_healthy);
      
      if (!hasHealthyToken) {
        return { 
          healthy: false, 
          message: '⏸️ No valid GitHub token available. Pausing GitHub operations.'
        };
      }

      return { healthy: true };
    } catch (error) {
      console.error('Unexpected error checking GitHub health:', error);
      return { healthy: false, message: 'Error checking token health' };
    }
  }

  /**
   * Monitor Python executions from edge function logs
   */
  private static setupPythonMonitoring() {
    console.log('🔍 Setting up Python execution monitoring...');
    
    // Poll edge function logs for Python executions
    const pollInterval = setInterval(async () => {
      try {
        // This would ideally come from a dedicated table, but for now we'll emit synthetic events
        // when the user manually executes code (Eliza's executions happen server-side)
      } catch (error) {
        console.error('Error polling Python executions:', error);
      }
    }, 2000);

    this.pythonChannel = { unsubscribe: () => clearInterval(pollInterval) };
  }

  /**
   * Monitor task changes in real-time
   */
  private static setupTaskMonitoring() {
    console.log('🔍 Setting up task monitoring...');
    
    const channel = supabase
      .channel('task-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('📋 Task change detected:', payload);
          
          const newData = payload.new as Record<string, any>;
          if (newData && Object.keys(newData).length > 0) {
            const task: TaskUpdate = {
              id: newData.id as string,
              title: newData.title as string,
              description: newData.description as string,
              status: newData.status as string,
              stage: newData.stage as string,
              assigned_to: (newData.assignee_agent_id as string) || 'Unknown',
              updated_at: new Date(newData.updated_at as string)
            };
            
            this.taskUpdateCallbacks.forEach(callback => callback(task));
          }
        }
      )
      .subscribe();

    this.taskChannel = channel;
  }

  /**
   * Monitor workflow executions in real-time
   */
  private static setupWorkflowMonitoring() {
    console.log('🔍 Setting up workflow monitoring...');
    
    const channel = supabase
      .channel('workflow-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_executions'
        },
        (payload) => {
          console.log('🔄 Workflow change detected:', payload);
          
          const newData = payload.new as Record<string, any>;
          if (newData && Object.keys(newData).length > 0) {
            const workflow: WorkflowExecution = {
              id: newData.id as string,
              workflow_id: newData.workflow_id as string,
              name: newData.name as string,
              description: newData.description as string,
              status: newData.status as 'running' | 'completed' | 'failed',
              current_step_index: newData.current_step_index as number,
              total_steps: newData.total_steps as number,
              final_result: newData.final_result,
              failed_step: newData.failed_step as string,
              created_at: new Date(newData.created_at as string),
              updated_at: new Date(newData.updated_at as string)
            };
            
            this.workflowCallbacks.forEach(callback => callback(workflow));
          }
        }
      )
      .subscribe();

    this.workflowChannel = channel;
  }

  /**
   * Broadcast a Python execution (called from Python Shell component)
   */
  static broadcastPythonExecution(execution: Omit<PythonExecution, 'timestamp'>) {
    const fullExecution: PythonExecution = {
      ...execution,
      timestamp: new Date()
    };
    
    this.pythonExecutionCallbacks.forEach(callback => callback(fullExecution));
  }

  /**
   * Cleanup subscriptions
   */
  static cleanup() {
    if (this.pythonChannel) {
      this.pythonChannel.unsubscribe?.();
      this.pythonChannel = null;
    }
    
    if (this.taskChannel) {
      supabase.removeChannel(this.taskChannel);
      this.taskChannel = null;
    }

    if (this.workflowChannel) {
      supabase.removeChannel(this.workflowChannel);
      this.workflowChannel = null;
    }
    
    this.pythonExecutionCallbacks = [];
    this.taskUpdateCallbacks = [];
    this.workflowCallbacks = [];
  }
}
