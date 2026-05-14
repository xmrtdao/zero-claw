import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken, isGoogleConfigured, corsHeaders, extractUserContext, UserTokenInfo } from "../_shared/googleAuthHelper.ts";
import { startUsageTrackingWithRequest } from "../_shared/functionUsageLogger.ts";

const FUNCTION_NAME = 'google-sheets';

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// ============= SHEETS ACTIONS =============

async function createSpreadsheet(accessToken: string, title: string, sheetName = 'Sheet1') {
  const response = await fetch(SHEETS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: sheetName } }]
    })
  });

  return response.json();
}

async function readSheet(accessToken: string, spreadsheetId: string, range: string) {
  const response = await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.json();
}

async function writeSheet(accessToken: string, spreadsheetId: string, range: string, values: any[][]) {
  const response = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );
  return response.json();
}

async function appendSheet(accessToken: string, spreadsheetId: string, range: string, values: any[][]) {
  const response = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );
  return response.json();
}

async function getSpreadsheetInfo(accessToken: string, spreadsheetId: string) {
  const response = await fetch(`${SHEETS_API_URL}/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch { body = {}; }

  const usageTracker = startUsageTrackingWithRequest(FUNCTION_NAME, req, body);

  try {
    const userContext = extractUserContext(req, body);

    if (!(await isGoogleConfigured(userContext))) {
      await usageTracker.failure('Google Cloud not configured', 401);
      return new Response(JSON.stringify({
        success: false,
        error: 'Google Cloud not configured',
        credential_required: true,
        message: 'Please configure Google OAuth credentials and authorize via OAuth flow for your user account.'
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const action = body.action;

    console.log(`📊 google-sheets: action=${action}`);

    const tokenOrErr = await getGoogleAccessToken(userContext);
    if ('error' in tokenOrErr) {
      await usageTracker.failure(tokenOrErr.error, tokenOrErr.code);
      return new Response(JSON.stringify({
        success: false,
        error: tokenOrErr.error,
        reason: tokenOrErr.reason,
        credential_required: true
      }), { status: tokenOrErr.code, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const tokenInfo = tokenOrErr as UserTokenInfo;
    usageTracker.setUserInfo(tokenInfo.userEmail, tokenInfo.userId);
    const accessToken = tokenInfo.accessToken;

    let result;

    switch (action) {
      case 'create_spreadsheet':
        result = await createSpreadsheet(accessToken, body.title, body.sheet_name);
        break;

      case 'read_sheet':
        result = await readSheet(accessToken, body.spreadsheet_id, body.range);
        break;

      case 'write_sheet':
        result = await writeSheet(accessToken, body.spreadsheet_id, body.range, body.values);
        break;

      case 'append_sheet':
        result = await appendSheet(accessToken, body.spreadsheet_id, body.range, body.values);
        break;

      case 'get_spreadsheet_info':
        result = await getSpreadsheetInfo(accessToken, body.spreadsheet_id);
        break;

      case 'status':
        result = {
          service: 'google-sheets',
          status: 'available',
          configured: true,
          actions: [
            { name: 'create_spreadsheet', params: ['title', 'sheet_name?'], description: 'Create new spreadsheet' },
            { name: 'read_sheet', params: ['spreadsheet_id', 'range'], description: 'Read data from sheet range' },
            { name: 'write_sheet', params: ['spreadsheet_id', 'range', 'values'], description: 'Write data to sheet range' },
            { name: 'append_sheet', params: ['spreadsheet_id', 'range', 'values'], description: 'Append rows to sheet' },
            { name: 'get_spreadsheet_info', params: ['spreadsheet_id'], description: 'Get spreadsheet metadata' }
          ]
        };
        break;

      case 'list_actions':
        result = {
          service: 'google-sheets',
          actions: [
            { name: 'create_spreadsheet', params: ['title', 'sheet_name?'], description: 'Create new spreadsheet' },
            { name: 'read_sheet', params: ['spreadsheet_id', 'range'], description: 'Read data from sheet range' },
            { name: 'write_sheet', params: ['spreadsheet_id', 'range', 'values'], description: 'Write data to sheet range' },
            { name: 'append_sheet', params: ['spreadsheet_id', 'range', 'values'], description: 'Append rows to sheet' },
            { name: 'get_spreadsheet_info', params: ['spreadsheet_id'], description: 'Get spreadsheet metadata' }
          ]
        };
        break;

      default:
        await usageTracker.failure(`Unknown action: ${action}`, 400);
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}`,
          available_actions: ['create_spreadsheet', 'read_sheet', 'write_sheet', 'append_sheet', 'get_spreadsheet_info', 'list_actions']
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await usageTracker.success({ result_summary: `${action} completed` });
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('google-sheets error:', error);
    await usageTracker.failure(error.message, 500);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
