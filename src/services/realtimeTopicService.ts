import { SupabaseClient } from '@supabase/supabase-js';
import { ensureRealtimeAuth } from '@/utils/realtimeAuth';

export interface TopicSubscriptionOptions {
  onMessage?: (message: any) => void;
  onStatus?: (status: string) => void;
}

/**
 * Realtime Topic Subscription Service
 * Manages subscriptions to ecosystem-wide broadcast channels
 */
export class RealtimeTopicService {
  private static authInitialized = false;

  /**
   * Subscribe to a topic and listen for broadcast messages
   * @param supabase - Supabase client
   * @param topic - Topic name (e.g., 'xmrtnet', 'xmrtdao', 'room:{thread_id}:messages')
   * @param options - Callback options
   * @returns Cleanup function to unsubscribe
   */
  static async subscribeToTopic(
    supabase: SupabaseClient,
    topic: string,
    options: TopicSubscriptionOptions = {}
  ): Promise<() => void> {
    // Ensure realtime auth is set up (only once)
    if (!this.authInitialized) {
      await ensureRealtimeAuth(supabase);
      this.authInitialized = true;
    }

    console.log(`📡 Subscribing to topic: ${topic}`);

    const channel = supabase.channel(topic, {
      config: { 
        private: true, 
        broadcast: { self: true, ack: true } 
      }
    });

    channel
      .on('broadcast', { event: 'message_created' }, (payload) => {
        console.log(`📨 Message received on ${topic}:`, payload);
        // Extract the actual record from DB trigger payload or use direct payload
        const message = payload?.payload?.record ?? payload?.payload ?? payload;
        options.onMessage?.(message);
      })
      .subscribe((status) => {
        console.log(`📊 Topic ${topic} status:`, status);
        options.onStatus?.(status);
      });

    // Return cleanup function
    return () => {
      console.log(`📡 Unsubscribing from topic: ${topic}`);
      supabase.removeChannel(channel);
    };
  }

  /**
   * Send a broadcast message to a topic
   * @param supabase - Supabase client
   * @param topic - Topic name
   * @param content - Message content (string or object)
   */
  static async sendBroadcast(
    supabase: SupabaseClient,
    topic: string,
    content: string | Record<string, any>
  ): Promise<void> {
    console.log(`📤 Sending broadcast to ${topic}:`, content);

    const channel = supabase.channel(topic, { 
      config: { private: true } 
    });
    
    await channel.subscribe();
    
    await channel.send({
      type: 'broadcast',
      event: 'message_created',
      payload: typeof content === 'string' 
        ? { content, sent_at: new Date().toISOString() }
        : { ...content, sent_at: new Date().toISOString() }
    });

    console.log(`✅ Broadcast sent to ${topic}`);
  }

  /**
   * Subscribe to multiple topics at once
   * @param supabase - Supabase client
   * @param topics - Array of topic names
   * @param onMessage - Unified message handler
   * @returns Cleanup function to unsubscribe from all
   */
  static async subscribeToMultipleTopics(
    supabase: SupabaseClient,
    topics: string[],
    onMessage: (topic: string, message: any) => void
  ): Promise<() => void> {
    console.log(`📡 Subscribing to ${topics.length} topics:`, topics);

    const cleanupFunctions = await Promise.all(
      topics.map(topic =>
        this.subscribeToTopic(supabase, topic, {
          onMessage: (msg) => onMessage(topic, msg)
        })
      )
    );

    // Return combined cleanup function
    return () => {
      console.log(`📡 Unsubscribing from ${topics.length} topics`);
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }
}

// Export singleton instance
export const realtimeTopicService = RealtimeTopicService;
