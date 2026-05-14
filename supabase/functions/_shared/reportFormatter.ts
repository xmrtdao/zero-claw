/**
 * Unified System Report Formatter
 * 
 * Provides stylized, ASCII-formatted health reports for all monitoring functions
 */

export interface SystemReport {
  timestamp: string;
  overall_health: {
    score: number;
    status: 'healthy' | 'warning' | 'degraded' | 'critical';
    issues: Array<{ severity: string; message: string; details?: any }>;
  };
  components: {
    agents?: any;
    tasks?: any;
    python_executions?: any;
    api_keys?: any;
    xmrt_charger?: any;
    github_ecosystem?: any;
    recent_activity?: any;
    skill_gaps?: any;
    learning?: any;
    workflows?: any;
    conversations?: any;
  };
  recommendations: Array<{
    priority: string;
    action: string;
    details: string;
  }>;
}

export function formatSystemReport(report: SystemReport): string {
  const emoji = {
    healthy: '✅',
    warning: '⚠️',
    degraded: '🔶',
    critical: '🔴'
  };

  const priorityEmoji = {
    critical: '🔴',
    high: '🔶',
    medium: '⚠️',
    low: 'ℹ️'
  };

  let output = `
╔═══════════════════════════════════════════════════════════════╗
║           XMRT ECOSYSTEM SYSTEM HEALTH REPORT                 ║
╚═══════════════════════════════════════════════════════════════╝

📊 OVERALL STATUS: ${emoji[report.overall_health.status]} ${report.overall_health.status.toUpperCase()}
📈 Health Score: ${report.overall_health.score}/100
🕐 Generated: ${new Date(report.timestamp).toLocaleString('en-US', { timeZone: 'UTC' })} UTC

`;

  // Agents Section
  if (report.components.agents) {
    const a = report.components.agents;
    output += `
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AGENTS                                                    │
└─────────────────────────────────────────────────────────────┘
  Total: ${a.total || 0}
  Active: ${a.BUSY || 0} busy, ${a.IDLE || 0} idle
  Issues: ${a.BLOCKED || 0} blocked, ${a.LEARNING || 0} learning
`;
  }

  // Tasks Section
  if (report.components.tasks) {
    const t = report.components.tasks;
    output += `
┌─────────────────────────────────────────────────────────────┐
│ 📋 TASKS                                                     │
└─────────────────────────────────────────────────────────────┘
  Total: ${t.total || 0}
  Pending: ${t.PENDING || 0}
  In Progress: ${t.IN_PROGRESS || 0}
  Completed: ${t.COMPLETED || 0}
  Blocked: ${t.BLOCKED || 0}
  High Priority: ${t.high_priority || 0}
`;
  }

  // Python Executions Section
  if (report.components.python_executions) {
    const p = report.components.python_executions;
    output += `
┌─────────────────────────────────────────────────────────────┐
│ 🐍 PYTHON EXECUTIONS (Last 24h)                              │
└─────────────────────────────────────────────────────────────┘
  Total: ${p.total || 0}
  Successful: ${p.success || 0}
  Failed: ${p.failed || 0}
  Success Rate: ${p.total > 0 ? Math.round((p.success / p.total) * 100) : 100}%
`;
  }

  // XMRTCharger Infrastructure Section
  if (report.components.xmrt_charger) {
    const xmrt = report.components.xmrt_charger;
    output += `
┌─────────────────────────────────────────────────────────────┐
│ 🔌 XMRTCHARGER INFRASTRUCTURE                                │
└─────────────────────────────────────────────────────────────┘
  
  📱 DEVICES
    Total Registered: ${xmrt.devices?.total || 0}
    Currently Active: ${xmrt.devices?.active || 0}`;
    
    if (xmrt.devices?.by_type) {
      Object.entries(xmrt.devices.by_type).forEach(([type, count]) => {
        output += `\n    ${type}: ${count}`;
      });
    }
  
    if (xmrt.charging_24h) {
      output += `
  
  ⚡ CHARGING (Last 24h)
    Total Sessions: ${xmrt.charging_24h.total || 0}
    Avg Efficiency: ${xmrt.charging_24h.avg_efficiency || 0}%
    Avg Duration: ${xmrt.charging_24h.avg_duration_min || 0} minutes`;
    }
  
    if (xmrt.pop_events_24h) {
      output += `
  
  🏆 PoP EVENTS (Last 24h)
    Total Events: ${xmrt.pop_events_24h.total || 0}
    Validated: ${xmrt.pop_events_24h.validated || 0}
    Paid Out: ${xmrt.pop_events_24h.paid_out || 0}
    Total Points: ${xmrt.pop_events_24h.total_points || 0}`;
    }
  
    if (xmrt.commands_1h) {
      output += `
  
  📡 ENGAGEMENT COMMANDS (Last Hour)
    Total Issued: ${xmrt.commands_1h.total || 0}
    Pending: ${xmrt.commands_1h.pending || 0}
    Executed: ${xmrt.commands_1h.executed || 0}
    Failed: ${xmrt.commands_1h.failed || 0}`;
    }
    
    output += '\n';
  }

  // GitHub Ecosystem Section
  if (report.components.github_ecosystem) {
    const gh = report.components.github_ecosystem;
    output += `
┌─────────────────────────────────────────────────────────────┐
│ 🐙 GITHUB ECOSYSTEM                                          │
└─────────────────────────────────────────────────────────────┘
  Repos Evaluated: ${gh.repos_evaluated || 0}
  Infrastructure Health: ${gh.infrastructure_score || 0}/100
  Top Repos: ${gh.top_repos?.map((r: any) => r.repo_name).join(', ') || 'None'}
  Total Engagements: ${gh.engagement_summary?.total || 0}
    - Issues Responded: ${gh.engagement_summary?.issues || 0}
    - Discussions Replied: ${gh.engagement_summary?.discussions || 0}
    - Comments Added: ${gh.engagement_summary?.comments || 0}
`;
  }

  // API Keys Section
  if (report.components.api_keys) {
    const api = report.components.api_keys;
    output += `
┌─────────────────────────────────────────────────────────────┐
│ 🔑 API KEYS                                                  │
└─────────────────────────────────────────────────────────────┘
  Total: ${api.total || 0}
  Healthy: ${api.healthy || 0}
  Unhealthy: ${api.unhealthy || 0}
`;
    if (api.critical_issues?.length > 0) {
      output += `  Critical Issues:\n`;
      api.critical_issues.forEach((issue: string) => {
        output += `    - ${issue}\n`;
      });
    }
  }

  // Issues Section
  if (report.overall_health.issues.length > 0) {
    output += `
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  ISSUES DETECTED                                          │
└─────────────────────────────────────────────────────────────┘
`;
    report.overall_health.issues.forEach((issue, i) => {
      output += `  ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.message}\n`;
      if (issue.details && typeof issue.details === 'object') {
        output += `     Details: ${JSON.stringify(issue.details)}\n`;
      } else if (issue.details) {
        output += `     Details: ${issue.details}\n`;
      }
    });
  }

  // Recommendations Section
  if (report.recommendations.length > 0) {
    output += `
┌─────────────────────────────────────────────────────────────┐
│ 💡 RECOMMENDATIONS                                           │
└─────────────────────────────────────────────────────────────┘
`;
    report.recommendations.forEach((rec, i) => {
      output += `  ${i + 1}. ${priorityEmoji[rec.priority as keyof typeof priorityEmoji] || 'ℹ️'} [${rec.priority.toUpperCase()}] ${rec.action}\n`;
      output += `     ${rec.details}\n\n`;
    });
  }

  output += `
╚═══════════════════════════════════════════════════════════════╝
  Report generated by Eliza autonomous monitoring system
  For more details, check Supabase logs or Grafana dashboards
╚═══════════════════════════════════════════════════════════════╝
`;

  return output;
}
