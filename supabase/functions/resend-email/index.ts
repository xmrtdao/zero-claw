/**
 * resend-email v1.0 — Send emails via Resend API
 *
 * Uses RESEND_API_KEY from Supabase secrets (set by Joe for pfpattendants@gmail.com).
 * JWT verification: DISABLED — accessible to all fleet agents.
 *
 * Usage:
 *   POST /functions/v1/resend-email
 *   { "to": "recipient@example.com", "subject": "Hello", "body": "Text body" }
 *
 * Optional:
 *   { "from": "custom@partyfavorphoto.com", "html": "<h1>HTML</h1>" }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body, html, from } = await req.json();

    // Validate required fields
    if (!to || !subject || (!body && !html)) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Missing required fields: to, subject, and body or html are required',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'RESEND_API_KEY not configured in Supabase secrets',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default from address for Party Favor Photo
    const fromAddr = from || 'Party Favor Photo <onboarding@resend.dev>';

    // Build the email payload
    const emailPayload: Record<string, unknown> = {
      from: fromAddr,
      to: Array.isArray(to) ? to : [to],
      subject,
    };

    if (html) {
      emailPayload.html = html;
    } else {
      emailPayload.text = body;
    }

    console.log(`Sending email to ${JSON.stringify(emailPayload.to)}: "${subject}"`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`Resend API error: ${res.status} — ${JSON.stringify(data)}`);
      return new Response(JSON.stringify({
        status: 'error',
        code: res.status,
        message: data.message || data.error || 'Resend API rejected the request',
        details: data,
      }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Email sent successfully: ${data.id}`);

    return new Response(JSON.stringify({
      status: 'sent',
      id: data.id,
      to: emailPayload.to,
      subject,
      from: fromAddr,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(`Unexpected error: ${err.message}`);
    return new Response(JSON.stringify({
      status: 'error',
      message: err.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
