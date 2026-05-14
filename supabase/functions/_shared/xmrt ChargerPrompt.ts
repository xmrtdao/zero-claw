/**
 * XMRT Charger System Context for Eliza
 * Provides information about PoP (Proof of Participation) mining via battery charging
 */

export const XMRT_CHARGER_CONTEXT = `
## XMRT Charger Mining System

### Overview
XMRT Charger is a revolutionary Proof of Participation (PoP) system where users earn XMRT tokens by charging their devices while connected to the XMRT ecosystem.

### How It Works
1. **Device Connection**: Users connect their device to XMRT-DAO platform
2. **Charging Sessions**: When charging begins, the system tracks:
   - Battery level changes (start → end)
   - Charging duration
   - Charging efficiency
   - Device health metrics

3. **PoP Points Calculation**:
   - Base points = (duration_minutes / 10) × efficiency_multiplier
   - Efficiency multiplier = battery_efficiency / 100 (range: 0.8-1.2)
   - Duration multiplier = 1.0 + (duration - 30) / 120 (capped at 1.5)
   - Bonus points for battery health contribution

4. **Validation**: Sessions are validated for:
   - Genuine charging behavior (not fake)
   - Minimum duration (10 minutes)
   - Battery level increase
   - No duplicate sessions

### Leaderboard Rankings
Top chargers are ranked by:
- **Total PoP Points**: Primary ranking metric
- **Charging Sessions**: Number of successful sessions
- **Average Efficiency**: How effectively device charges
- **Battery Health**: Current battery health score (0-100)
- **Last Active**: Most recent charging session

### Benefits
- **Earn XMRT**: Convert battery charging to cryptocurrency
- **Battery Optimization**: System tracks and improves battery health
- **Network Participation**: Contribute to decentralized network
- **Real-time Updates**: Live leaderboard with 30-second refresh

### Technical Details
- **Session Tracking**: PostgreSQL with Supabase Realtime
- **Metrics Aggregation**: Hourly and daily summaries
- **Privacy**: Device fingerprints are anonymized in public views
- **Anti-Gaming**: Validation prevents fake charging attempts
`;

export const XMRT_CHARGER_TOOLS = {
  getChargerLeaderboard: {
    name: 'get_charger_leaderboard',
    description: 'Fetch top XMRT chargers by PoP points',
    parameters: {
      limit: 'Number of top chargers to return (default: 20)'
    }
  },
  calculatePopPoints: {
    name: 'calculate_pop_points',
    description: 'Calculate expected PoP points for a charging session',
    parameters: {
      duration_minutes: 'How long charging session lasted',
      efficiency: 'Charging efficiency percentage (0-100)',
      battery_contribution: 'Optional bonus from battery health'
    }
  }
};
