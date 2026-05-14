import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { extractUserContext, getGoogleAccessToken, isGoogleConfigured, UserTokenInfo } from "../_shared/googleAuthHelper.ts";

// ============= USAGE LOGGER TYPES =============

export type ExecutionSource = 'supabase_native' | 'pg_cron' | 'github_actions' | 'vercel_cron' | 'api' | 'tool_call';

interface UsageLogEntry {
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
}

// ============= USAGE LOGGER IMPLEMENTATION =============

/**
 * Detect execution source from request headers and body
 */
function detectExecutionSource(req: Request, body?: any): ExecutionSource {
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

/**
 * Get or create a Supabase client for logging
 */
function getLoggingClient() {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('⚠️ Missing Supabase credentials for usage logging');
      return null;
    }
    
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  } catch (e) {
    console.error('❌ Failed to create logging client:', e);
    return null;
  }
}

/**
 * Categorize function for analytics grouping
 */
function categorizeFunction(functionName: string): string {
  const categories: Record<string, string[]> = {
    'ai_executive': ['gemini-chat', 'deepseek-chat', 'openai-chat', 'lovable-chat', 'kimi-chat', 'vercel-ai-chat', 'vercel-ai-chat-stream', 'ai-chat'],
    'system': ['system-status', 'system-health', 'system-diagnostics', 'ecosystem-monitor', 'list-available-functions', 'get-edge-function-logs', 'prometheus-metrics', 'api-key-health-monitor', 'check-frontend-health', 'sync-function-logs', 'get-cron-registry'],
    'agent': ['agent-manager', 'task-orchestrator', 'task-auto-advance', 'suite-task-automation-engine', 'eliza-self-evaluation', 'eliza-intelligence-coordinator'],
    'workflow': ['workflow-template-manager', 'multi-step-orchestrator', 'workflow-optimizer', 'diagnose-workflow-failure', 'n8n-workflow-generator', 'execute-scheduled-actions'],
    'github': ['github-integration', 'sync-github-contributions', 'ingest-github-contribution', 'validate-github-contribution', 'morning-discussion-post', 'daily-discussion-post', 'evening-summary-post', 'weekly-retrospective-post', 'community-spotlight-post', 'progress-update-post'],
    'governance': ['vote-on-proposal', 'governance-phase-manager', 'list-function-proposals', 'propose-new-edge-function', 'execute-approved-proposal', 'handle-rejected-proposal', 'request-executive-votes', 'deploy-approved-edge-function', 'evaluate-community-idea'],
    'analytics': ['function-usage-analytics', 'get-my-feedback', 'get-function-version-analytics', 'tool-usage-analytics', 'query-edge-analytics', 'debug-analytics-data-flow', 'get-code-execution-lessons', 'get-function-actions'],
    'integration': ['vsco-workspace', 'vsco-webhook-handler', 'create-suite-quote', 'stripe-payment-webhook', 'vercel-ecosystem-api', 'vercel-manager', 'hume-access-token', 'hume-tts', 'hume-expression-measurement', 'google-gmail', 'google-drive', 'google-sheets', 'google-calendar', 'google-cloud-auth'],
    'mining': ['mining-proxy', 'mobile-miner-config', 'mobile-miner-register', 'mobile-miner-script', 'aggregate-device-metrics', 'monitor-device-connections', 'validate-pop-event'],
    'business': ['identify-service-interest', 'qualify-lead', 'process-license-application', 'generate-stripe-link', 'service-monetization-engine', 'usage-monitor', 'convert-session-to-user', 'correlate-user-identity'],
    'knowledge': ['knowledge-manager', 'extract-knowledge', 'vectorize-memory', 'get-embedding', 'system-knowledge-builder', 'summarize-conversation'],
    'python': ['python-executor', 'python-db-bridge', 'python-network-proxy', 'eliza-python-runtime', 'enhanced-learning', 'predictive-analytics'],
    'autonomous': ['autonomous-code-fixer', 'autonomous-decision-maker', 'code-monitor-daemon', 'agent-deployment-coordinator', 'self-optimizing-agent-architecture'],
    'superduper': ['superduper-router', 'superduper-integration', 'superduper-business-growth', 'superduper-code-architect', 'superduper-communication-outreach', 'superduper-content-media', 'superduper-design-brand', 'superduper-development-coach', 'superduper-domain-experts', 'superduper-finance-investment', 'superduper-research-intelligence', 'superduper-social-viral'],
    'mcp': ['xmrt-mcp-server', 'uspto-patent-mcp']
  };

  for (const [category, functions] of Object.entries(categories)) {
    if (functions.includes(functionName)) {
      return category;
    }
  }

  return 'general';
}

/**
 * Log edge function usage directly to eliza_function_usage table
 */
async function logEdgeFunctionUsage(entry: UsageLogEntry): Promise<void> {
  try {
    const supabase = getLoggingClient();
    if (!supabase) return;

    const { error } = await supabase
      .from('eliza_function_usage')
      .insert({
        function_name: entry.function_name,
        executive_name: entry.executive_name,
        success: entry.success,
        execution_time_ms: entry.execution_time_ms,
        error_message: entry.error_message,
        parameters: entry.parameters || {},
        result_summary: entry.result_summary,
        execution_source: entry.execution_source || 'api',
        metadata: {
          provider: entry.provider,
          model: entry.model,
          tool_calls: entry.tool_calls,
          fallback: entry.fallback,
          status_code: entry.status_code,
          logged_at: new Date().toISOString()
        },
        tool_category: categorizeFunction(entry.function_name),
        deployment_version: new Date().toISOString().split('T')[0]
      });

    if (error) {
      console.error(`⚠️ Failed to log usage for ${entry.function_name}:`, error.message);
    } else {
      console.log(`📊 Logged usage: ${entry.function_name} [${entry.execution_source || 'api'}] (${entry.success ? 'success' : 'failure'})`);
    }
  } catch (e) {
    console.error('❌ Usage logging exception:', e);
  }
}

/**
 * Usage tracker class
 */
class UsageTracker {
  private functionName: string;
  private executiveName?: string;
  private startTime: number;
  private parameters?: any;
  private executionSource: ExecutionSource;

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

  setUserInfo(userEmail?: string, userId?: string): void {
    this.parameters = {
      ...(this.parameters || {}),
      authenticated_user_email: userEmail || null,
      authenticated_user_id: userId || null
    };
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
      ...details
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
      status_code
    });
  }
}

/**
 * Create a usage tracker with request-based source detection
 */
function startUsageTrackingWithRequest(
  functionName: string,
  req: Request,
  body?: any,
  executiveName?: string
): UsageTracker {
  const executionSource = detectExecutionSource(req, body);
  return new UsageTracker(functionName, executiveName, body, executionSource);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-executive-name, x-source',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

// ============= GMAIL FUNCTION CONSTANTS =============

const FUNCTION_NAME = 'google-gmail';
const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1';

// ============= TYPES =============

interface InlineImage {
  cid: string;
  data: string;
  mimeType: string;
}

interface VideoEmbed {
  url: string;
  thumbnailUrl?: string;
  title?: string;
}

// ============= MIME BUILDER =============

function makeBoundary(): string {
  return `boundary_${crypto.randomUUID().replace(/-/g, '')}`;
}

function toBase64Url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function wrapBase64(data: string): string {
  return data.replace(/(.{76})/g, '$1\r\n');
}

function buildVideoBlock(video: VideoEmbed): string {
  const title = video.title ?? 'Click to play video';
  if (video.thumbnailUrl) {
    return `
<table align="center" cellpadding="0" cellspacing="0" style="margin:20px auto;border-radius:8px;overflow:hidden;max-width:560px;">
  <tr>
    <td style="position:relative;">
      <a href="${video.url}" target="_blank" style="display:block;text-decoration:none;">
        <img src="${video.thumbnailUrl}" alt="${title}"
             style="display:block;width:100%;max-width:560px;border:0;" />
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                    width:72px;height:72px;border-radius:50%;
                    background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;">
          <div style="width:0;height:0;border-style:solid;border-width:18px 0 18px 36px;
                      border-color:transparent transparent transparent #ffffff;margin-left:6px;"></div>
        </div>
      </a>
    </td>
  </tr>
  <tr>
    <td align="center"
        style="background:#f4f4f4;padding:10px 16px;font-family:Arial,sans-serif;font-size:14px;color:#555;">
      <a href="${video.url}" target="_blank" style="color:#0077cc;text-decoration:none;">▶ ${title}</a>
    </td>
  </tr>
</table>`;
  }

  return `
<table align="center" cellpadding="0" cellspacing="0" style="margin:20px auto;">
  <tr>
    <td align="center" style="border-radius:6px;background:#0077cc;">
      <a href="${video.url}" target="_blank"
         style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;
                font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">
        ▶ ${title}
      </a>
    </td>
  </tr>
</table>`;
}

function buildMimeMessage(
  to: string,
  subject: string,
  body: string,
  options: {
    isHtml?: boolean;
    images?: InlineImage[];
    video?: VideoEmbed;
    plainFallback?: string;
    cc?: string;
  } = {}
): string {
  const { isHtml = false, images = [], video, cc } = options;
  const needsMultipart = images.length > 0;
  const needsHtml = isHtml || !!video || needsMultipart;

  if (!needsHtml) {
    const msg = [
      `To: ${to}`,
      ...(cc ? [`Cc: ${cc}`] : []),
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      body
    ].join('\r\n');
    return toBase64Url(msg);
  }

  let htmlBody = body;
  if (video) {
    htmlBody += buildVideoBlock(video);
  }

  if (!needsMultipart) {
    const htmlEncoded = wrapBase64(btoa(unescape(encodeURIComponent(htmlBody))));
    const msg = [
      `To: ${to}`,
      ...(cc ? [`Cc: ${cc}`] : []),
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      htmlEncoded
    ].join('\r\n');
    return toBase64Url(msg);
  }

  const boundaryRelated = makeBoundary();

  const lines: string[] = [];

  lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  lines.push(`Subject: ${subject}`);
  lines.push('MIME-Version: 1.0');
  lines.push(`Content-Type: multipart/related; boundary="${boundaryRelated}"`);
  lines.push('');

  if (images.length > 0) {
    lines.push(`--${boundaryRelated}`);
    lines.push('Content-Type: text/html; charset=utf-8');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(wrapBase64(btoa(unescape(encodeURIComponent(htmlBody)))));

    for (const img of images) {
      lines.push(`--${boundaryRelated}`);
      lines.push(`Content-Type: ${img.mimeType}; name="${img.cid}"`);
      lines.push('Content-Transfer-Encoding: base64');
      lines.push(`Content-Disposition: inline; filename="${img.cid}"`);
      lines.push(`Content-ID: <${img.cid}>`);
      lines.push('X-Attachment-Id: ' + img.cid);
      lines.push('');
      lines.push(wrapBase64(img.data));
    }

    lines.push(`--${boundaryRelated}--`);
  }

  const rawMessage = lines.join('\r\n');
  return toBase64Url(rawMessage);
}

// ============= GMAIL ACTIONS =============

async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  isHtml = false,
  images: InlineImage[] = [],
  video?: VideoEmbed,
  cc?: string
) {
  const encodedMessage = buildMimeMessage(to, subject, body, { isHtml, images, video, cc });

  const response = await fetch(`${GMAIL_API_URL}/users/me/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  return response.json();
}

async function listEmails(accessToken: string, query = '', maxResults = 20) {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (query) params.set('q', query);

  const response = await fetch(`${GMAIL_API_URL}/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const data = await response.json();
  if (!data.messages) return { messages: [], count: 0 };

  const previews = await Promise.all(
    data.messages.slice(0, 5).map(async (msg: any) => {
      const detailResponse = await fetch(`${GMAIL_API_URL}/users/me/messages/${msg.id}?format=metadata`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const detail = await detailResponse.json();
      const headers = detail.payload?.headers || [];
      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: headers.find((h: any) => h.name === 'Subject')?.value || '(no subject)',
        from: headers.find((h: any) => h.name === 'From')?.value || 'unknown',
        date: headers.find((h: any) => h.name === 'Date')?.value || ''
      };
    })
  );

  return { messages: previews, total: data.resultSizeEstimate || data.messages.length };
}

async function modifyMessage(accessToken: string, messageId: string, addLabelIds: string[] = [], removeLabelIds: string[] = []) {
  const response = await fetch(`${GMAIL_API_URL}/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      addLabelIds,
      removeLabelIds
    })
  });
  return response.json();
}

async function getEmail(accessToken: string, messageId: string) {
  console.log(`🔍 Fetching email with ID: ${messageId}`);
  
  if (!messageId || typeof messageId !== 'string') {
    throw new Error(`Invalid message ID: ${messageId} - must be a non-empty string`);
  }
  
  const cleanMessageId = messageId.trim();
  
  if (cleanMessageId !== messageId) {
    console.log(`⚠️ Message ID had whitespace, cleaned from "${messageId}" to "${cleanMessageId}"`);
  }
  
  try {
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Accept': 'application/json'
    };

    const readJson = async (url: string) => {
      const response = await fetch(url, { headers: authHeaders });
      const responseText = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(responseText);
      } catch (_) {
        console.error(`❌ Failed to parse Gmail API response as JSON:`, responseText.substring(0, 200));
        throw new Error(`Invalid JSON response from Gmail API: ${response.status}`);
      }

      return { response, data };
    };

    const messageUrl = `${GMAIL_API_URL}/users/me/messages/${encodeURIComponent(cleanMessageId)}?format=full`;
    console.log(`📡 Gmail API URL: ${messageUrl}`);

    const { response: messageResponse, data: messageData } = await readJson(messageUrl);
    console.log(`📥 Gmail message response status: ${messageResponse.status}`);

    if (messageResponse.ok) {
      console.log(`✅ Successfully retrieved email ${cleanMessageId}`);
      return messageData;
    }

    const messageError = messageData?.error?.message || messageData?.error || `HTTP ${messageResponse.status}`;
    console.error(`❌ Gmail message API error:`, messageData);

    // Some tool callers accidentally pass threadId instead of message id.
    // Try thread lookup so get_email is resilient to that common mismatch.
    if (messageResponse.status === 400 || messageResponse.status === 404) {
      const threadUrl = `${GMAIL_API_URL}/users/me/threads/${encodeURIComponent(cleanMessageId)}?format=full`;
      console.log(`🔁 Retrying as thread lookup: ${threadUrl}`);

      const { response: threadResponse, data: threadData } = await readJson(threadUrl);
      console.log(`📥 Gmail thread response status: ${threadResponse.status}`);

      if (threadResponse.ok && Array.isArray(threadData?.messages) && threadData.messages.length > 0) {
        const newestMessage = threadData.messages[threadData.messages.length - 1];
        console.log(`✅ Resolved thread ${cleanMessageId} to message ${newestMessage?.id}`);
        return {
          ...newestMessage,
          _resolved_from_thread_id: cleanMessageId,
          _thread_message_count: threadData.messages.length
        };
      }
    }

    if (messageResponse.status === 404) {
      const err = new Error(`Message not found with ID: ${cleanMessageId}. It may have been deleted or moved.`);
      (err as any).status = 404;
      throw err;
    }
    if (messageResponse.status === 400 && `${messageError}`.includes('Invalid id')) {
      const err = new Error(`Invalid message_id "${cleanMessageId}". Use the "id" field from list_emails (not threadId).`);
      (err as any).status = 400;
      throw err;
    }
    if (messageResponse.status === 401 || messageResponse.status === 403) {
      const err = new Error(`Authentication failed. Token may be expired or missing gmail.readonly scope required for full message content.`);
      (err as any).status = messageResponse.status;
      throw err;
    }

    const err = new Error(`Gmail API error: ${messageError}`);
    (err as any).status = messageResponse.status;
    throw err;
  } catch (error) {
    console.error(`❌ Error in get_email for ID ${messageId}:`, error);
    throw error;
  }
}

async function createDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  isHtml = false,
  images: InlineImage[] = [],
  video?: VideoEmbed,
  cc?: string
) {
  const encodedMessage = buildMimeMessage(to, subject, body, { isHtml, images, video, cc });

  const response = await fetch(`${GMAIL_API_URL}/users/me/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: { raw: encodedMessage } })
  });

  return response.json();
}

// ============= HANDLER =============


function normalizeAction(action: unknown): string {
  const normalized = String(action || '').toLowerCase().trim();
  const aliases: Record<string, string> = {
    list_messages: 'list_emails',
    list: 'list_emails',
    get_message: 'get_email'
  };

  return aliases[normalized] || normalized;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any = {};
  let usageTracker: UsageTracker;

  try {
    body = await req.json();
    usageTracker = startUsageTrackingWithRequest(FUNCTION_NAME, req, body);
  } catch (e) {
    usageTracker = startUsageTrackingWithRequest(FUNCTION_NAME, req, {});
    body = {};
  }

  try {
    const userContext = extractUserContext(req, body);

    if (!(await isGoogleConfigured(userContext))) {
      await usageTracker.failure('Google Cloud not configured - no refresh token found', 401);
      return new Response(JSON.stringify({
        success: false,
        error: 'Google Cloud not configured',
        credential_required: true,
        message: 'Please authorize your Google account for this user in Credentials to use Gmail edge functions.'
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const action = normalizeAction(body.action);
    console.log(`📧 google-gmail: action=${action}`);

    const tokenOrErr = await getGoogleAccessToken(userContext);
    if ('error' in tokenOrErr) {
      await usageTracker.failure(tokenOrErr.error, tokenOrErr.code);
      return new Response(JSON.stringify({
        success: false,
        error: tokenOrErr.error,
        reason: tokenOrErr.reason,
        credential_required: true,
        message: 'Unable to obtain a valid Google access token for this user. Please reconnect your Google account.'
      }), { status: tokenOrErr.code, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const tokenInfo = tokenOrErr as UserTokenInfo;
    usageTracker.setUserInfo(tokenInfo.userEmail, tokenInfo.userId);
    const accessToken = tokenInfo.accessToken;

    let result;

    switch (action) {
      case 'send_email':
        result = await sendEmail(
          accessToken,
          body.to,
          body.subject,
          body.body,
          body.is_html ?? false,
          body.images ?? [],
          body.video,
          body.cc
        );
        break;

      case 'list_emails':
        result = await listEmails(accessToken, body.query ?? body.q, body.max_results);
        break;

      case 'get_email':
        result = await getEmail(accessToken, body.message_id ?? body.id);
        break;

      case 'create_draft':
        result = await createDraft(
          accessToken,
          body.to,
          body.subject,
          body.body,
          body.is_html ?? false,
          body.images ?? [],
          body.video,
          body.cc
        );
        break;

      case 'modify_message':
        result = await modifyMessage(
          accessToken,
          body.message_id ?? body.id,
          body.add_labels ?? body.addLabelIds ?? [],
          body.remove_labels ?? body.removeLabelIds ?? []
        );
        break;

      case 'list_actions':
        result = {
          service: 'google-gmail',
          actions: [
            {
              name: 'send_email',
              params: [
                'to',
                'subject',
                'body',
                'is_html?',
                'images? [{cid, data (base64), mimeType}]',
                'video? {url, thumbnailUrl?, title?}',
                'cc?'
              ],
              description: 'Send an email. Supports plain text, HTML, inline embedded images (via CID), and video thumbnail blocks.'
            },
            {
              name: 'list_emails',
              params: ['query?', 'max_results?'],
              description: 'List emails with optional search. Returns preview of first 5 messages with IDs you can use for get_email.'
            },
            {
              name: 'get_email',
              params: ['message_id'],
              description: 'Get full email content including body, attachments, and headers. Use message IDs from list_emails.'
            },
            {
              name: 'create_draft',
              params: [
                'to',
                'subject',
                'body',
                'is_html?',
                'images? [{cid, data (base64), mimeType}]',
                'video? {url, thumbnailUrl?, title?}',
                'cc?'
              ],
              description: 'Create an email draft. Supports the same rich media options as send_email.'
            },
            {
              name: 'modify_message',
              params: ['message_id', 'add_labels?', 'remove_labels?'],
              description: 'Add or remove labels from a message (e.g., mark as read/unread, add to inbox/archive)'
            }
          ]
        };
        break;

      default:
        await usageTracker.failure(`Unknown action: ${body.action}`, 400);
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${body.action}`,
          available_actions: ['send_email', 'list_emails', 'get_email', 'create_draft', 'modify_message', 'list_actions']
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await usageTracker.success({ result_summary: `${action} completed` });
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ google-gmail error:', error);
    
    const errorMessage = error.message || 'Unknown error occurred';
    const statusCode = error.status || 500;
    
    await usageTracker.failure(errorMessage, statusCode);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      details: {
        action: body.action,
        message_id: body.message_id
      }
    }), { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
