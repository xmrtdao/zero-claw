import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProxyRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { method, url, headers: customHeaders, body, timeout = 30000 }: ProxyRequest = await req.json();

    console.log(`🌐 Python Network Proxy: ${method} ${url}`);

    // Security: Whitelist allowed domains
    const allowedDomains = [
      'api.github.com',
      'github.com',
      'supabase.co',
      'supportxmr.com',
      'api.coingecko.com',
      'blockchain.info',
      'getmonero.org'
    ];

    const urlObj = new URL(url);
    const isAllowed = allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      throw new Error(`Domain not whitelisted: ${urlObj.hostname}`);
    }

    // Build request
    const requestOptions: RequestInit = {
      method,
      headers: {
        'User-Agent': 'XMRT-Eliza-Python-Proxy/1.0',
        ...customHeaders
      },
      signal: AbortSignal.timeout(timeout)
    };

    if (body && method !== 'GET' && method !== 'DELETE') {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!customHeaders?.['Content-Type']) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Content-Type': 'application/json'
        };
      }
    }

    // Make request
    const response = await fetch(url, requestOptions);
    
    // Get response body
    const contentType = response.headers.get('content-type');
    let responseBody;
    
    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    console.log(`✅ Proxy response: ${response.status}`);

    return new Response(JSON.stringify({
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Proxy error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      type: error.name
    }), {
      status: error.name === 'TimeoutError' ? 504 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
