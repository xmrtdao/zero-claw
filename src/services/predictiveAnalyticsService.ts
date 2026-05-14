import { supabase } from "@/integrations/supabase/client";

export interface PredictiveInsight {
  id: string;
  analysis_type: 'anomaly' | 'forecast' | 'pattern' | 'alert';
  data_source: 'mining' | 'dao' | 'bridge' | 'agents' | 'blockchain' | 'smart_contract';
  insight_data: any;
  confidence_score?: number;
  severity?: 'critical' | 'warning' | 'info' | 'success';
  forecast_horizon?: string;
  status?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export class PredictiveAnalyticsService {
  private static instance: PredictiveAnalyticsService;

  private constructor() {}

  static getInstance(): PredictiveAnalyticsService {
    if (!PredictiveAnalyticsService.instance) {
      PredictiveAnalyticsService.instance = new PredictiveAnalyticsService();
    }
    return PredictiveAnalyticsService.instance;
  }

  /**
   * Run predictive analytics on a data source
   */
  async analyzeDataSource(
    dataSource: string,
    action: 'analyze_current' | 'forecast_24h' | 'forecast_72h' | 'detect_patterns',
    customData?: any[]
  ): Promise<{ result: any; action: string; data_source: string }> {
    const { data, error } = await supabase.functions.invoke('predictive-analytics', {
      body: {
        data_source: dataSource,
        action,
        custom_data: customData
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Get recent predictive insights
   */
  async getRecentInsights(
    limit: number = 10,
    severity?: string
  ): Promise<PredictiveInsight[]> {
    let query = supabase
      .from('predictive_insights')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as PredictiveInsight[];
  }

  /**
   * Get insights by data source
   */
  async getInsightsBySource(
    dataSource: string,
    analysisType?: string
  ): Promise<PredictiveInsight[]> {
    let query = supabase
      .from('predictive_insights')
      .select('*')
      .eq('data_source', dataSource)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    if (analysisType) {
      query = query.eq('analysis_type', analysisType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as PredictiveInsight[];
  }

  /**
   * Resolve an insight (mark as handled)
   */
  async resolveInsight(insightId: string): Promise<void> {
    const { error } = await supabase
      .from('predictive_insights')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', insightId);

    if (error) throw error;
  }

  /**
   * Get critical alerts
   */
  async getCriticalAlerts(): Promise<PredictiveInsight[]> {
    return this.getRecentInsights(5, 'critical');
  }
}

export const predictiveAnalyticsService = PredictiveAnalyticsService.getInstance();
