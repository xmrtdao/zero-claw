import { supabase } from '@/integrations/supabase/client';

export interface DeviceConnection {
  session_id: string;
  session_key: string;
  device_id: string;
  connected_at: string;
  battery_level: number;
}

export interface EngagementCommand {
  id: string;
  command_type: string;
  command_payload: any;
  priority: number;
  issued_at: string;
  expires_at: string;
}

export interface PopEvent {
  id: string;
  event_type: string;
  pop_points: number;
  event_timestamp: string;
  is_validated: boolean;
  confidence_score: number;
}

export interface DeviceMetrics {
  summary_date: string;
  summary_hour?: number;
  active_devices_count: number;
  total_connections: number;
  avg_session_duration_seconds: number;
  total_pop_points_earned: number;
  total_anomalies_detected: number;
  total_commands_issued: number;
  total_commands_executed: number;
  top_device_ids: string[];
  top_event_types: string[];
}

export const xmrtChargerService = {
  // ===== Device Connection Management =====
  
  async connectDevice(deviceFingerprint: string, batteryLevel: number, deviceInfo: {
    device_type?: string;
    ip_address?: string;
    user_agent?: string;
  } = {}) {
    const { data, error } = await supabase.functions.invoke('monitor-device-connections', {
      body: { 
        action: 'connect',
        device_fingerprint: deviceFingerprint,
        battery_level: batteryLevel,
        ...deviceInfo
      }
    });
    
    if (error) throw error;
    return data as DeviceConnection;
  },

  async sendHeartbeat(sessionId: string, batteryLevel: number, commandsReceived = 0) {
    const { data, error } = await supabase.functions.invoke('monitor-device-connections', {
      body: { 
        action: 'heartbeat',
        session_id: sessionId,
        battery_level: batteryLevel,
        commands_received: commandsReceived
      }
    });
    
    if (error) throw error;
    return data;
  },

  async disconnectDevice(sessionId: string, batteryLevelEnd: number) {
    const { data, error } = await supabase.functions.invoke('monitor-device-connections', {
      body: { 
        action: 'disconnect',
        session_id: sessionId,
        battery_level_end: batteryLevelEnd
      }
    });
    
    if (error) throw error;
    return data;
  },

  async getSessionStatus(sessionId: string) {
    const { data, error } = await supabase.functions.invoke('monitor-device-connections', {
      body: { 
        action: 'status',
        session_id: sessionId
      }
    });
    
    if (error) throw error;
    return data;
  },

  // ===== Command Management =====

  async issueCommand(commandType: 'notification' | 'config_update' | 'mining_start' | 'mining_stop' | 'pop_reward', 
    commandPayload: any, 
    options: {
      device_id?: string;
      session_id?: string;
      target_all?: boolean;
      priority?: number;
      expires_in_minutes?: number;
    } = {}) {
    const { data, error } = await supabase.functions.invoke('issue-engagement-command', {
      body: { 
        action: 'command',
        command_type: commandType,
        command_payload: commandPayload,
        ...options
      }
    });
    
    if (error) throw error;
    return data;
  },

  async getPendingCommands(deviceId?: string, sessionId?: string) {
    const { data, error } = await supabase.functions.invoke('issue-engagement-command', {
      body: { 
        action: 'pending',
        device_id: deviceId,
        session_id: sessionId
      }
    });
    
    if (error) throw error;
    return data as { success: boolean; commands: EngagementCommand[]; count: number };
  },

  async acknowledgeCommand(commandId: string) {
    const { data, error } = await supabase.functions.invoke('issue-engagement-command', {
      body: { 
        action: 'acknowledge',
        command_id: commandId
      }
    });
    
    if (error) throw error;
    return data;
  },

  async completeCommand(commandId: string, executionResult: any) {
    const { data, error } = await supabase.functions.invoke('issue-engagement-command', {
      body: { 
        action: 'complete',
        command_id: commandId,
        execution_result: executionResult
      }
    });
    
    if (error) throw error;
    return data;
  },

  // ===== PoP Event Validation =====

  async validatePopEvent(
    walletAddress: string, 
    deviceId: string, 
    eventType: 'charging_session' | 'mining_session' | 'device_connection' | 'task_completion',
    eventData: any,
    options: {
      session_id?: string;
      validation_method?: 'device_attestation' | 'pool_verification' | 'manual_review' | 'automated';
    } = {}
  ) {
    const { data, error } = await supabase.functions.invoke('validate-pop-event', {
      body: { 
        action: 'validate',
        wallet_address: walletAddress,
        device_id: deviceId,
        event_type: eventType,
        event_data: eventData,
        validation_method: options.validation_method || 'automated',
        session_id: options.session_id
      }
    });
    
    if (error) throw error;
    return data as PopEvent;
  },

  async getPopHistory(walletAddress: string, options: {
    limit?: number;
    event_type?: string;
    start_date?: string;
    end_date?: string;
  } = {}) {
    const { data, error } = await supabase.functions.invoke('validate-pop-event', {
      body: { 
        action: 'events',
        wallet_address: walletAddress,
        limit: options.limit || 50,
        event_type: options.event_type,
        start_date: options.start_date,
        end_date: options.end_date
      }
    });
    
    if (error) throw error;
    return data as { success: boolean; events: PopEvent[]; count: number; total_points: number };
  },

  async getLeaderboard(limit = 100) {
    const { data, error } = await supabase.functions.invoke('validate-pop-event', {
      body: { 
        action: 'leaderboard',
        limit
      }
    });
    
    if (error) throw error;
    return data;
  },

  async markPayout(eventId: string, transactionHash: string) {
    const { data, error } = await supabase.functions.invoke('validate-pop-event', {
      body: { 
        action: 'payout',
        event_id: eventId,
        transaction_hash: transactionHash
      }
    });
    
    if (error) throw error;
    return data;
  },

  // ===== Dashboard Metrics =====

  async aggregateMetrics(date?: string, hour?: number) {
    const { data, error } = await supabase.functions.invoke('aggregate-device-metrics', {
      body: { 
        action: 'aggregate',
        date,
        hour
      }
    });
    
    if (error) throw error;
    return data;
  },

  async getMetrics(timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily', options: {
    start_date?: string;
    end_date?: string;
  } = {}) {
    const { data, error } = await supabase.functions.invoke('aggregate-device-metrics', {
      body: { 
        action: 'metrics',
        timeframe,
        start_date: options.start_date,
        end_date: options.end_date
      }
    });
    
    if (error) throw error;
    return data as { success: boolean; timeframe: string; metrics: DeviceMetrics[]; count: number };
  },

  async getHourlyMetrics(date: string) {
    const { data, error } = await supabase.functions.invoke('aggregate-device-metrics', {
      body: { 
        action: 'hourly',
        date
      }
    });
    
    if (error) throw error;
    return data as { success: boolean; date: string; hourly_metrics: DeviceMetrics[]; count: number };
  },

  async getDailyMetrics(startDate: string, endDate: string) {
    const { data, error } = await supabase.functions.invoke('aggregate-device-metrics', {
      body: { 
        action: 'daily',
        start_date: startDate,
        end_date: endDate
      }
    });
    
    if (error) throw error;
    return data as { success: boolean; daily_metrics: DeviceMetrics[]; count: number };
  }
};
