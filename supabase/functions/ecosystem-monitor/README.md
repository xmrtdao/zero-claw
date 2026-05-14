# GitHub Ecosystem Engagement Function

**Function Name:** `ecosystem-monitor` (folder) / `github-ecosystem-engagement` (logical name)  
**Schedule:** Daily at 11:00 AM UTC via cron job  
**Category:** GitHub Automation & Community Engagement

## Purpose

This function serves as the XMRT DAO's autonomous GitHub engagement system. It monitors all repositories in the DevGruGold ecosystem, evaluates their activity, and proactively engages with high-priority issues and discussions.

## Key Responsibilities

### 1. **Repository Activity Evaluation**
- Monitors all XMRT ecosystem repositories
- Calculates activity scores based on:
  - Recent commits (last 7 days)
  - Open issues
  - Active discussions
  - Pull request activity
  - Time since last update

### 2. **Intelligent Engagement**
- Identifies high-priority content (activity score >= 70)
- Generates context-aware technical responses
- Posts helpful comments on:
  - GitHub Issues (that haven't been responded to in 24h)
  - GitHub Discussions
  - Pull Requests

### 3. **Resilient GitHub Access**
- Uses multiple GitHub tokens for failover
- Primary: `GITHUB_TOKEN`
- Backup: `GITHUB_TOKEN_PROOF_OF_LIFE`
- Gracefully handles token failures and rate limits

## Activity Scoring Algorithm

```typescript
Activity Score = 
  (recentCommits × 5) +      // Recent development activity
  (openIssues × 2) +         // Community engagement
  (discussions × 3) +        // Discussion activity
  (openPRs × 4) +           // Active development
  (recencyBonus)            // Bonus for recent updates
```

**Score Thresholds:**
- **High Priority (70+)**: Active engagement triggered
- **Medium Priority (40-69)**: Monitoring only
- **Low Priority (<40)**: Passive observation

## AI Response Generation

When engaging with issues/discussions, the function:
1. Extracts issue/discussion context (title, body, author)
2. Gathers repository metadata
3. Calls Lovable AI Gateway (Google Gemini) to generate:
   - Technical, helpful responses
   - Relevant to XMRT ecosystem context
   - Professional and supportive tone
   - Actionable suggestions when applicable

## Monitoring & Logging

All engagement is logged to the `webhook_logs` table:
- Monitoring results (repos evaluated, scores)
- Engagement summaries (issues/discussions responded to)
- Token failures and fallback actions
- AI-generated response metadata

## Why "ecosystem-monitor" folder name?

The function folder is named `ecosystem-monitor` for historical reasons and to maintain Supabase deployment compatibility. However, its **actual purpose** is GitHub-specific engagement, so it's referred to as `github-ecosystem-engagement` in:
- Eliza's system prompt
- Edge function registry
- Documentation
- Cron job naming

## Related Functions

- **Discussion Post Functions**: Generate scheduled community content (morning, evening, weekly)
- **github-integration**: OAuth-based GitHub operations (issues, PRs, commits)
- **lovable-chat**: Provides AI capabilities for response generation

## Usage

This function runs automatically via cron. To manually trigger:

```bash
curl -X POST \
  https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/ecosystem-monitor \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Maintenance Notes

- **Token Rotation**: Ensure both GitHub tokens are valid and have sufficient rate limits
- **Score Tuning**: Adjust scoring weights if engagement becomes too aggressive/passive
- **AI Model**: Currently uses `google/gemini-2.5-flash` via Lovable AI Gateway
- **Engagement Cooldown**: Only responds to issues/discussions with no activity in last 24h

## Future Enhancements

- [ ] Sentiment analysis for prioritization
- [ ] Multi-language support for international repos
- [ ] Code review suggestions on PRs
- [ ] Automated issue labeling and triage
- [ ] Community health metrics dashboard
