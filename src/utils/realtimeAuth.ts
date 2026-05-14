import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensure Realtime has proper authentication
 * Call this once during app bootstrap before subscribing to any channels
 */
export async function ensureRealtimeAuth(supabase: SupabaseClient) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    await supabase.realtime.setAuth(session.access_token);
    console.log('✅ Realtime authenticated with session token');
  }
  
  // Update auth on session changes
  supabase.auth.onAuthStateChange(async (_event, session) => {
    await supabase.realtime.setAuth(session?.access_token ?? '');
    console.log('🔄 Realtime auth updated:', session ? 'authenticated' : 'unauthenticated');
  });
}
