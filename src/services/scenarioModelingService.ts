import { supabase } from "@/integrations/supabase/client";

export interface ScenarioSimulation {
  id: string;
  scenario_type: 'economic' | 'technical' | 'security' | 'governance' | 'market';
  scenario_name: string;
  input_parameters: Record<string, any>;
  simulation_results: Record<string, any>;
  confidence_level?: number;
  recommendations?: string[];
  risk_assessment?: Record<string, any>;
  created_at: string;
  created_by?: string;
  execution_time_ms?: number;
  metadata?: Record<string, any>;
}

export class ScenarioModelingService {
  private static instance: ScenarioModelingService;

  private constructor() {}

  static getInstance(): ScenarioModelingService {
    if (!ScenarioModelingService.instance) {
      ScenarioModelingService.instance = new ScenarioModelingService();
    }
    return ScenarioModelingService.instance;
  }

  /**
   * Run a scenario simulation
   */
  async runSimulation(
    scenarioType: 'economic' | 'technical' | 'security' | 'governance' | 'market',
    scenarioName: string,
    parameters: Record<string, any>
  ): Promise<ScenarioSimulation> {
    const { data, error } = await supabase.functions.invoke('scenario-modeler', {
      body: {
        scenario_type: scenarioType,
        scenario_name: scenarioName,
        parameters
      }
    });

    if (error) throw error;
    return data as ScenarioSimulation;
  }

  /**
   * Get recent simulations
   */
  async getRecentSimulations(limit: number = 10): Promise<ScenarioSimulation[]> {
    const { data, error } = await supabase
      .from('scenario_simulations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ScenarioSimulation[];
  }

  /**
   * Get simulations by type
   */
  async getSimulationsByType(
    scenarioType: string,
    limit: number = 20
  ): Promise<ScenarioSimulation[]> {
    const { data, error } = await supabase
      .from('scenario_simulations')
      .select('*')
      .eq('scenario_type', scenarioType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ScenarioSimulation[];
  }

  /**
   * Get a specific simulation by ID
   */
  async getSimulation(simulationId: string): Promise<ScenarioSimulation | null> {
    const { data, error } = await supabase
      .from('scenario_simulations')
      .select('*')
      .eq('id', simulationId)
      .single();

    if (error) throw error;
    return data as ScenarioSimulation;
  }

  /**
   * Common scenario templates
   */
  getScenarioTemplates() {
    return {
      economic: {
        'Token Exchange Listing': {
          current_market_cap: 1000000,
          current_daily_volume: 50000,
          expected_volume_increase: 500,
          time_horizon_days: 90
        },
        'Staking Dynamics': {
          total_supply: 1000000,
          current_staked: 200000,
          target_staked: 500000,
          base_apr: 12.5
        },
        'Mining Profitability': {
          difficulty: 1.0,
          avg_tx_fee: 0.00015,
          electricity_cost_kwh: 0.12,
          hardware_hashrate: 1000,
          power_consumption_watts: 100
        }
      },
      technical: {
        'Fee Impact Analysis': {
          current_avg_fee: 0.00015,
          fee_multiplier: 2.0,
          bridge_tx_volume_monthly: 1000
        },
        'Network Congestion': {
          tx_rate: 10,
          block_size_kb: 300,
          block_time_sec: 120
        }
      },
      security: {
        '51% Attack Simulation': {
          attack_type: '51_percent',
          attacker_hashrate_percentage: 51,
          network_total_hashrate_hs: 2.5e9,
          attack_duration_hours: 24
        }
      }
    };
  }
}

export const scenarioModelingService = ScenarioModelingService.getInstance();
