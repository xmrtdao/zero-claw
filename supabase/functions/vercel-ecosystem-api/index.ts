import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERCEL_SERVICES = {
  io: { url: 'https://xmrt-io.vercel.app', repo: 'XMRT.io' },
  ecosystem: { url: 'https://xmrt-ecosystem.vercel.app', repo: 'XMRT-Ecosystem' },
  dao: { url: 'https://xmrt-dao-ecosystem.vercel.app', repo: 'XMRT-DAO-Ecosystem' }
};

console.log('🔧 Vercel Ecosystem API starting...');

async function checkServiceHealth(serviceName: string, serviceUrl: string) {
  const startTime = Date.now();
  try {
    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    
    const responseTime = Date.now() - startTime;
    const data = response.ok ? await response.json() : null;
    
    return {
      service: serviceName,
      status: response.ok ? 'online' : 'degraded',
      statusCode: response.status,
      responseTimeMs: responseTime,
      data,
      error: null
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: serviceName,
      status: 'offline',
      statusCode: 0,
      responseTimeMs: responseTime,
      data: null,
      error: error.message
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    console.log(`📊 Vercel API action: ${action}`);

    switch(action) {
      case 'get_deployment_info': {
        const ecosystemHealth = await checkServiceHealth('ecosystem', VERCEL_SERVICES.ecosystem.url);
        
        return new Response(
          JSON.stringify({
            success: true,
            systemVersion: {
              version: ecosystemHealth.data?.version || 'unknown',
              deploymentId: ecosystemHealth.data?.deployment_id || 'unknown',
              commitHash: ecosystemHealth.data?.commit_hash || 'unknown',
              commitMessage: ecosystemHealth.data?.commit_message || 'No commit message',
              deployedAt: ecosystemHealth.data?.deployed_at || new Date().toISOString(),
              status: ecosystemHealth.status,
              serviceUrl: VERCEL_SERVICES.ecosystem.url
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_service_status': {
        const healthChecks = await Promise.all(
          Object.entries(VERCEL_SERVICES).map(([name, { url }]) => 
            checkServiceHealth(name, url)
          )
        );

        const allOnline = healthChecks.every(h => h.status === 'online');
        
        return new Response(
          JSON.stringify({
            success: true,
            service: {
              overall_status: allOnline ? 'online' : 'degraded',
              services: healthChecks,
              checked_at: new Date().toISOString()
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_deployments': {
        // For Vercel, we return the current deployment status for each service
        const healthChecks = await Promise.all(
          Object.entries(VERCEL_SERVICES).map(([name, { url, repo }]) => 
            checkServiceHealth(name, url)
          )
        );

        const deployments = healthChecks.map(health => ({
          id: health.data?.deployment_id || 'current',
          service: health.service,
          repository: VERCEL_SERVICES[health.service as keyof typeof VERCEL_SERVICES].repo,
          status: health.status,
          deployedAt: health.data?.deployed_at || new Date().toISOString(),
          commitHash: health.data?.commit_hash || 'unknown',
          commitMessage: health.data?.commit_message || 'Current deployment'
        }));

        return new Response(
          JSON.stringify({
            success: true,
            deployments
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Vercel API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
