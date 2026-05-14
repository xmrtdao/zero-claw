# Frontend-Backend Integration: Vercel ↔ Supabase

## Architecture Overview

```mermaid
graph TB
    A[User Browser] -->|HTTPS| B[Vercel CDN]
    B -->|Static Assets| A
    B -->|API Request| C[Vercel Edge Function]
    C -->|Read/Write| D[Supabase Database]
    C -->|Invoke| E[Supabase Edge Function]
    E -->|Process| F[Eliza AI]
    F -->|GitHub API| G[GitHub]
    F -->|Mining API| H[Pool]
    F -->|Deploy| I[Render]
    E -->|Webhook| C
    D -->|Realtime| A
```

## Project Configuration

### Frontend (Vercel)
- **Project ID**: `prj_64pcUv0bTn3aGLXvhUNqCI1YPKTt`
- **Domain**: `https://xmrtdao.vercel.app`
- **Webhook Endpoint**: `https://xmrtdao.vercel.app/webhooks`
- **Runtime**: Node.js 20.x + Edge Functions
- **Framework**: React + Vite

### Backend (Supabase)
- **Project**: `vawouugtzwmejxqkeqqj`
- **URL**: `https://vawouugtzwmejxqkeqqj.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd291dWd0endtZWp4cWtlcXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Njk3MTIsImV4cCI6MjA2ODM0NTcxMn0.qtZk3zk5RMqzlPNhxCkTM6fyVQX5ULGt7nna_XOUr00`
- **Region**: US East
- **Database**: PostgreSQL 15

## Communication Patterns

### Pattern 1: Frontend → Backend (Standard)
```typescript
// In Vercel edge function
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vawouugtzwmejxqkeqqj.supabase.co',
  process.env.SUPABASE_ANON_KEY!
);

// Query data
const { data } = await supabase
  .from('dao_members')
  .select('*')
  .limit(10);
```

### Pattern 2: Backend → Frontend (Webhooks)
```typescript
// In Supabase edge function
await supabase.functions.invoke('vercel-manager', {
  body: {
    action: 'send_webhook',
    data: {
      event_type: 'agent_completed_task',
      task_id: '123',
      result: { success: true }
    }
  }
});
```

### Pattern 3: Real-time Subscriptions
```typescript
// In frontend React component
useEffect(() => {
  const channel = supabase
    .channel('dao-updates')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'dao_members'
    }, (payload) => {
      console.log('New member:', payload.new);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

## Deployment Workflows

### Frontend Deployment (Automatic)
1. Push to GitHub `main` branch
2. Vercel detects change
3. Builds React app
4. Deploys to CDN
5. Notifies Supabase webhook (optional)

### Backend Deployment (Automatic)
1. Code changes to `supabase/functions/*`
2. Lovable auto-deploys edge functions
3. Supabase edge functions updated
4. Frontend can use new functions immediately

## Security Considerations

### Environment Variables
**Vercel**:
```env
SUPABASE_URL=https://vawouugtzwmejxqkeqqj.supabase.co
SUPABASE_ANON_KEY=eyJhbGci... (public, safe to expose)
VERCEL_WEBHOOK_SECRET=xxx (optional, for webhook auth)
```

**Supabase**:
```env
VERCEL_PROJECT_ID=prj_64pcUv0bTn3aGLXvhUNqCI1YPKTt
VERCEL_WEBHOOK_SECRET=xxx (must match Vercel)
```

### RLS Policies
All Supabase tables use Row Level Security to protect data:
- Anon key can only access data allowed by RLS policies
- Service role key bypasses RLS (only in edge functions)
- Frontend never sees service role key

## Eliza's Capabilities

### What Eliza Can Do
✅ Monitor frontend health via `vercel-manager`  
✅ Send webhooks to frontend for notifications  
✅ Query Supabase database that frontend uses  
✅ Coordinate agent tasks that affect frontend data  
✅ Log frontend events in `webhook_logs` table  

### What Eliza Cannot Do (Yet)
❌ Directly deploy Vercel edge functions  
❌ Access Vercel API (no API key configured)  
❌ Modify frontend React components  
❌ Trigger Vercel builds manually  

## Vercel Manager Edge Function

### Available Actions

#### 1. Send Webhook
```typescript
await supabase.functions.invoke('vercel-manager', {
  body: {
    action: 'send_webhook',
    data: {
      event_type: 'notification',
      message: 'Agent completed task',
      metadata: { task_id: '123' }
    }
  }
});
```

#### 2. Check Frontend Health
```typescript
const { data } = await supabase.functions.invoke('vercel-manager', {
  body: { action: 'get_frontend_status' }
});
// Returns: { success: true, status: 'online', statusCode: 200 }
```

#### 3. Notify Deployment
```typescript
await supabase.functions.invoke('vercel-manager', {
  body: {
    action: 'notify_deployment',
    data: {
      changes: ['Added new feature', 'Fixed bug'],
      version: '1.2.3'
    }
  }
});
```

#### 4. Get Project Info
```typescript
const { data } = await supabase.functions.invoke('vercel-manager', {
  body: { action: 'get_project_info' }
});
// Returns project ID, URLs, integration details
```

## Frontend Webhook Handler (User Must Deploy)

To receive webhooks from Eliza, add this to your Vercel project at `/api/webhooks/index.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const supabase = createClient(
  'https://vawouugtzwmejxqkeqqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Anon key
);

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const payload = await req.json();
    const { event_type, data } = payload;

    console.log(`📥 Webhook received: ${event_type}`);

    // Log webhook to Supabase
    await supabase.from('webhook_logs').insert({
      webhook_name: 'vercel_frontend',
      trigger_table: 'frontend_events',
      trigger_operation: event_type,
      payload: data,
      status: 'received'
    });

    // Handle different event types
    switch (event_type) {
      case 'form_submission':
        // Process form submission
        await supabase.from('user_submissions').insert(data);
        break;
      
      case 'user_action':
        // Track user action
        await supabase.from('user_actions').insert({
          action: data.action,
          user_id: data.user_id,
          metadata: data.metadata
        });
        break;
      
      case 'backend_updated':
        // Frontend received notification of backend update
        console.log('Backend update notification:', data);
        break;
      
      default:
        console.log('Unknown event type:', event_type);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

## Troubleshooting

### Frontend Can't Connect to Supabase
1. Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars
2. Verify RLS policies allow anon access
3. Check browser console for CORS errors
4. Ensure Supabase project is not paused

### Webhooks Not Arriving
1. Verify webhook endpoint is deployed: `https://xmrtdao.vercel.app/webhooks`
2. Check `webhook_logs` table for error messages
3. Test webhook manually with curl:
   ```bash
   curl -X POST https://xmrtdao.vercel.app/webhooks \
     -H "Content-Type: application/json" \
     -d '{"event_type":"test","data":{}}'
   ```

### Eliza Not Aware of Frontend
1. Restart chat session to reload system prompt
2. Ask Eliza: "What's your frontend URL?"
3. Check system prompt includes Vercel project info

## Testing Commands

```typescript
// Test 1: Get Vercel project info
await supabase.functions.invoke('vercel-manager', {
  body: { action: 'get_project_info' }
});

// Test 2: Check frontend health
await supabase.functions.invoke('vercel-manager', {
  body: { action: 'get_frontend_status' }
});

// Test 3: Send test webhook
await supabase.functions.invoke('vercel-manager', {
  body: {
    action: 'send_webhook',
    data: {
      event_type: 'test',
      message: 'Hello from Eliza!'
    }
  }
});
```

## Integration Checklist

- [x] Eliza system prompt updated with Vercel awareness
- [x] `vercel-manager` edge function created
- [x] Knowledge base updated with frontend info
- [x] Edge function registry includes vercel-manager
- [x] Documentation created
- [ ] Frontend webhook handler deployed to Vercel
- [ ] Frontend health endpoint created at `/api/health`
- [ ] Real-time subscriptions configured
- [ ] Integration tested end-to-end

## Next Steps

1. **Deploy Frontend Webhook Handler**: Add `/api/webhooks/index.ts` to Vercel project
2. **Create Health Endpoint**: Add `/api/health` endpoint for status checks
3. **Test Integration**: Run test commands to verify communication
4. **Set Up Monitoring**: Track webhook delivery and frontend health
5. **Document Use Cases**: Add specific examples of backend-frontend coordination

## Resources

- [Vercel Edge Functions Docs](https://vercel.com/docs/functions/edge-functions)
- [Supabase Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)
