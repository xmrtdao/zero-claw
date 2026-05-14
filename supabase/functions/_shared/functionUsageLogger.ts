import { SupabaseClient, createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

export interface FunctionUsageLog {
  function_name: string;
  executive_name?: string;
  invoked_by?: string;
  success: boolean;
  execution_time_ms: number;
  user_context?: string;
  parameters?: any;
  error_message?: string;
  result_summary?: string;
  metadata?: any;
  // Version tracking fields
  deployment_version?: string;
  function_hash?: string;
  deployment_id?: string;
  git_commit_hash?: string;
  // Enhanced tracking fields
  session_id?: string;
  user_id?: string;
  tool_category?: string;
  execution_source?: string;
}

export type ExecutionSource =
  | 'supabase_native'
  | 'pg_cron'
  | 'github_actions'
  | 'vercel_cron'
  | 'api'
  | 'tool_call';

export interface EdgeFunctionUsageLog {
  function_name: string;
  executive_name?: string;
  success: boolean;
  execution_time_ms: number;
  error_message?: string;
  parameters?: any;
  result_summary?: string;
  provider?: string;
  model?: string;
  tool_calls?: number;
  fallback?: string;
  status_code?: number;
  execution_source?: ExecutionSource;
  user_id?: string;
  user_email?: string;
}

const TOOL_CATEGORY_MAP: Record<string, string> = {
  execute_python: 'python',
  run_code: 'python',
  createGitHubIssue: 'github',
  createGitHubDiscussion: 'github',
  listGitHubIssues: 'github',
  'github-integration': 'github',
  list_agents: 'agent',
  spawn_agent: 'agent',
  assign_task: 'agent',
  list_tasks: 'agent',
  update_agent_status: 'agent',
  update_task_status: 'agent',
  delete_task: 'agent',
  get_agent_workload: 'agent',
  auto_assign_tasks: 'agent',
  rebalance_workload: 'agent',
  identify_blockers: 'agent',
  clear_blocked_tasks: 'agent',
  bulk_update_task_status: 'agent',
  get_task_performance_report: 'agent',
  get_agent_by_name: 'agent',
  get_agent_stats: 'agent',
  batch_spawn_agents: 'agent',
  archive_agent: 'agent',
  check_system_status: 'system',
  check_ecosystem_health: 'system',
  generate_health_report: 'system',
  'system-status': 'system',
  'system-health': 'system',
  'ecosystem-monitor': 'system',
  'system-diagnostics': 'system',
  propose_new_edge_function: 'governance',
  vote_on_function_proposal: 'governance',
  list_function_proposals: 'governance',
  get_function_usage_analytics: 'analytics',
  get_edge_function_logs: 'analytics',
  get_function_version_analytics: 'analytics',
  get_tool_usage_analytics: 'analytics',
  qualify_lead: 'acquisition',
  identify_service_interest: 'acquisition',
  generate_stripe_payment_link: 'acquisition',
  create_user_profile_from_session: 'acquisition',
  suggest_tier_based_on_needs: 'acquisition',
  check_onboarding_progress: 'acquisition',
  send_usage_alert: 'acquisition',
  link_api_key_to_conversation: 'acquisition',
  apply_retention_discount: 'acquisition',
  invoke_edge_function: 'edge_function',
  call_edge_function: 'edge_function',
  list_workflow_templates: 'workflow',
  execute_workflow_template: 'workflow',
  'workflow-template-manager': 'workflow',
  get_my_feedback: 'feedback',
  search_uspto_patents: 'mcp',
  'uspto-patent-mcp': 'mcp',
  'xmrt-mcp-server': 'mcp',
};

function getToolCategory(toolName: string): string {
  if (TOOL_CATEGORY_MAP[toolName]) {
    return TOOL_CATEGORY_MAP[toolName];
  }
  if (toolName.startsWith('consult_') || toolName.startsWith('superduper')) {
    return 'superduper';
  }
  if (toolName.includes('task') || toolName.includes('orchestrat')) {
    return 'agent';
  }
  if (toolName.toLowerCase().includes('github')) {
    return 'github';
  }
  if (toolName.includes('health') || toolName.includes('status') || toolName.includes('diagnostic')) {
    return 'system';
  }
  return 'general';
}

async function calculateFunctionHash(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

function getVersionInfo(): {
  deployment_version?: string;
  deployment_id?: string;
  git_commit_hash?: string;
} {
  return {
    deployment_version:
      Deno.env.get('DEPLOYMENT_VERSION') || Deno.env.get('VERCEL_GIT_COMMIT_REF') || new Date().toISOString().split('T')[0],
    deployment_id: Deno.env.get('DEPLOYMENT_ID') || Deno.env.get('VERCEL_DEPLOYMENT_ID'),
    git_commit_hash: Deno.env.get('GIT_COMMIT_SHA') || Deno.env.get('VERCEL_GIT_COMMIT_SHA'),
  };
}

function getLoggingClient(): SupabaseClient | null {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('⚠️ Missing Supabase credentials for usage logging');
      return null;
    }

    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (e) {
    console.error('❌ Failed to create logging client:', e);
    return null;
  }
}

export function detectExecutionSource(req: Request, body?: any): ExecutionSource {
  const schedulerHeader = req.headers.get('x-supabase-scheduler');
  if (schedulerHeader === 'true' || schedulerHeader === '1') {
    return 'supabase_native';
  }

  const vercelCron = req.headers.get('x-vercel-cron');
  if (vercelCron === '1' || vercelCron === 'true') {
    return 'vercel_cron';
  }

  if (body?.source === 'github_actions' || body?.source === 'github_action') {
    return 'github_actions';
  }

  const githubHeader = req.headers.get('x-github-action');
  if (githubHeader) {
    return 'github_actions';
  }

  const userAgent = req.headers.get('user-agent') || '';
  if (userAgent.includes('pg_net') || userAgent.includes('PostgreSQL')) {
    return 'pg_cron';
  }

  if (body?.invoked_by === 'tool_call' || body?.source === 'tool_call') {
    return 'tool_call';
  }

  return 'api';
}

export async function logFunctionUsage(
  supabase: SupabaseClient,
  log: FunctionUsageLog,
): Promise<void> {
  try {
    const versionInfo = getVersionInfo();
    const toolCategory = log.tool_category || getToolCategory(log.function_name);

    const { error } = await supabase.from('eliza_function_usage').insert({
      function_name: log.function_name,
      executive_name: log.executive_name,
      invoked_by: log.invoked_by || 'system',
      success: log.success,
      execution_time_ms: log.execution_time_ms,
      user_context: log.user_context,
      parameters: log.parameters || {},
      error_message: log.error_message,
      result_summary: log.result_summary,
      metadata: log.metadata || {},
      deployment_version: log.deployment_version || versionInfo.deployment_version,
      function_hash: log.function_hash,
      deployment_id: log.deployment_id || versionInfo.deployment_id,
      git_commit_hash: log.git_commit_hash || versionInfo.git_commit_hash,
      session_id: log.session_id,
      user_id: log.user_id,
      tool_category: toolCategory,
      execution_source: log.execution_source,
    });

    if (error) {
      console.error('Failed to log function usage:', error);
    }
  } catch (err) {
    console.error('Exception logging function usage:', err);
  }
}

export async function logEdgeFunctionUsage(entry: EdgeFunctionUsageLog): Promise<void> {
  const supabase = getLoggingClient();
  if (!supabase) return;

  await logFunctionUsage(supabase, {
    function_name: entry.function_name,
    executive_name: entry.executive_name,
    success: entry.success,
    execution_time_ms: entry.execution_time_ms,
    error_message: entry.error_message,
    parameters: entry.parameters || {},
    result_summary: entry.result_summary,
    execution_source: entry.execution_source || 'api',
    deployment_version: new Date().toISOString().split('T')[0],
    user_id: entry.user_id,
    metadata: {
      provider: entry.provider,
      model: entry.model,
      tool_calls: entry.tool_calls,
      fallback: entry.fallback,
      status_code: entry.status_code,
      user_id: entry.user_id,
      user_email: entry.user_email,
      logged_at: new Date().toISOString(),
    },
  });
}

export async function withUsageLogging<T>(
  supabase: SupabaseClient,
  functionName: string,
  executiveName: string | undefined,
  userContext: string | undefined,
  parameters: any,
  fn: () => Promise<T>,
  options?: {
    functionCode?: string;
    sessionId?: string;
    userId?: string;
  },
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;
  let result: T;
  let functionHash: string | undefined;

  if (options?.functionCode) {
    try {
      functionHash = await calculateFunctionHash(options.functionCode);
    } catch (e) {
      console.warn('Failed to calculate function hash:', e);
    }
  }

  try {
    result = await fn();
    success = true;
    return result;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    const executionTime = Date.now() - startTime;

    await logFunctionUsage(supabase, {
      function_name: functionName,
      executive_name: executiveName,
      success,
      execution_time_ms: executionTime,
      user_context: userContext,
      parameters,
      error_message: errorMessage,
      function_hash: functionHash,
      session_id: options?.sessionId,
      user_id: options?.userId,
      tool_category: getToolCategory(functionName),
    });
  }
}

export class UsageTracker {
  private functionName: string;
  private executiveName?: string;
  private startTime: number;
  private parameters?: any;
  private executionSource: ExecutionSource;
  private userId?: string;
  private userEmail?: string;

  constructor(functionName: string, executiveName?: string, parameters?: any, executionSource: ExecutionSource = 'api') {
    this.functionName = functionName;
    this.executiveName = executiveName;
    this.startTime = Date.now();
    this.parameters = parameters;
    this.executionSource = executionSource;
  }

  setExecutionSource(source: ExecutionSource): void {
    this.executionSource = source;
  }

  setUserInfo(userEmail: string, userId?: string): void {
    this.userEmail = userEmail;
    this.userId = userId;
  }

  async success(details?: {
    result_summary?: string;
    provider?: string;
    model?: string;
    tool_calls?: number;
    fallback?: string;
  }): Promise<void> {
    await logEdgeFunctionUsage({
      function_name: this.functionName,
      executive_name: this.executiveName,
      success: true,
      execution_time_ms: Date.now() - this.startTime,
      parameters: this.parameters,
      execution_source: this.executionSource,
      user_id: this.userId,
      user_email: this.userEmail,
      ...details,
    });
  }

  async failure(error_message: string, status_code?: number): Promise<void> {
    await logEdgeFunctionUsage({
      function_name: this.functionName,
      executive_name: this.executiveName,
      success: false,
      execution_time_ms: Date.now() - this.startTime,
      error_message,
      parameters: this.parameters,
      execution_source: this.executionSource,
      user_id: this.userId,
      user_email: this.userEmail,
      status_code,
    });
  }
}

export function startUsageTracking(functionName: string, executiveName?: string, parameters?: any): UsageTracker {
  return new UsageTracker(functionName, executiveName, parameters);
}

export function startUsageTrackingWithRequest(
  functionName: string,
  req: Request,
  body?: any,
  executiveName?: string,
): UsageTracker {
  const executionSource = detectExecutionSource(req, body);
  return new UsageTracker(functionName, executiveName, body, executionSource);
}

export { getToolCategory };
