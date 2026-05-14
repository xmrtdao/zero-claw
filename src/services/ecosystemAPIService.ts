interface EcosystemHealth {
  deployment: string;
  message: string;
  mode: string;
  response_time_ms: number;
  status: string;
  system_health: {
    agents: {
      list: string[];
      operational: number;
      total: number;
    };
    analytics: {
      agent_interactions: number;
      requests_count: number;
      startup_time: number;
      uptime_checks: number;
    };
    memory_optimized: boolean;
  };
  timestamp: string;
  uptime_formatted: string;
  uptime_seconds: number;
  version: string;
}

interface EcosystemResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class EcosystemAPIService {
  private services = {
    io: 'https://xmrt-io.vercel.app',
    ecosystem: 'https://xmrt-ecosystem.vercel.app',
    dao: 'https://xmrt-dao-ecosystem.vercel.app'
  };
  private baseUrl = this.services.ecosystem;

  async getSystemHealth(): Promise<EcosystemResponse<EcosystemHealth>> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch ecosystem health:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getDetailedSystemStatus(): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch detailed system status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAgentsList(): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents/list`);
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch agents list:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAgentStats(agentId?: string): Promise<EcosystemResponse<any>> {
    try {
      const endpoint = agentId ? `/api/agents/${agentId}/stats` : '/api/agents/stats';
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch agent stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSystemLogs(limit?: number): Promise<EcosystemResponse<any>> {
    try {
      const params = limit ? `?limit=${limit}` : '';
      const response = await fetch(`${this.baseUrl}/api/logs${params}`);
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch system logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSystemMetrics(): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics`);
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getDetailedHealthCheck(): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health/detailed`);
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch detailed health check:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async queryAgent(agentType: 'core_agent' | 'web_agent' | 'lead_coordinator' | 'governance' | 'financial' | 'security' | 'community', query: string): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents/${agentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Agent query failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`Failed to query ${agentType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAnalytics(): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics`);
      
      if (!response.ok) {
        throw new Error(`Analytics fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch ecosystem analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executeEcosystemCommand(command: string, parameters?: any): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command, parameters })
      });

      if (!response.ok) {
        throw new Error(`Command execution failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to execute ecosystem command:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getWebhookStatus(): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/webhooks/status`);
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch webhook status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAgentActivity(agentType?: string): Promise<EcosystemResponse<any>> {
    try {
      const endpoint = agentType ? `/api/agents/${agentType}/activity` : '/api/agents/activity';
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch agent activity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  formatHealthReport(health: EcosystemHealth): string {
    return `🚀 XMRT Ecosystem Status Report:
    
Deployment: ${health.deployment} (${health.mode})
Version: ${health.version}
Status: ${health.status}
Uptime: ${health.uptime_formatted}
Response Time: ${health.response_time_ms}ms

Agents Status:
• Total Agents: ${health.system_health.agents.total}
• Operational: ${health.system_health.agents.operational}
• Active: ${health.system_health.agents.list.join(', ')}

Analytics:
• Total Requests: ${health.system_health.analytics.requests_count}
• Agent Interactions: ${health.system_health.analytics.agent_interactions}
• Memory Optimized: ${health.system_health.memory_optimized ? 'Yes' : 'No'}

Last Update: ${new Date(health.timestamp).toLocaleString()}`;
  }

  formatSystemMetrics(metrics: any): string {
    return `📊 XMRT System Metrics:

Performance:
• CPU Usage: ${metrics.cpu_usage || 'N/A'}%
• Memory Usage: ${metrics.memory_usage || 'N/A'}%
• Active Connections: ${metrics.active_connections || 'N/A'}
• Request Rate: ${metrics.request_rate || 'N/A'}/min

Agent Performance:
• Avg Response Time: ${metrics.avg_response_time || 'N/A'}ms
• Success Rate: ${metrics.success_rate || 'N/A'}%
• Error Rate: ${metrics.error_rate || 'N/A'}%
• Active Agents: ${metrics.active_agents || 'N/A'}

System Health:
• Database Status: ${metrics.database_status || 'Unknown'}
• Cache Status: ${metrics.cache_status || 'Unknown'}
• Queue Status: ${metrics.queue_status || 'Unknown'}`;
  }

  formatAgentActivity(activity: any): string {
    if (!activity || !activity.agents) return 'No agent activity data available';
    
    let report = `🤖 Agent Activity Report:\n\n`;
    
    activity.agents.forEach((agent: any) => {
      report += `**${agent.name}** (${agent.type})\n`;
      report += `• Status: ${agent.status}\n`;
      report += `• Operations: ${agent.operations || 0}\n`;
      report += `• Last Activity: ${agent.last_activity || 'N/A'}\n`;
      if (agent.recent_actions && agent.recent_actions.length > 0) {
        report += `• Recent Actions:\n`;
        agent.recent_actions.slice(0, 3).forEach((action: any) => {
          report += `  - ${action.timestamp}: ${action.description}\n`;
        });
      }
      report += `\n`;
    });
    
    return report;
  }
}

export const ecosystemAPI = new EcosystemAPIService();
export type { EcosystemHealth, EcosystemResponse };