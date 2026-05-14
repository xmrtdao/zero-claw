-- Workflow Template Manager Tables
-- Pre-built workflow templates library
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('revenue', 'marketing', 'financial', 'optimization')),
  description TEXT NOT NULL,
  steps JSONB NOT NULL,
  estimated_duration_seconds INTEGER DEFAULT 30,
  success_rate NUMERIC(5,2) DEFAULT 0.00,
  times_executed INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Template execution history and analytics
CREATE TABLE IF NOT EXISTS workflow_template_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  execution_id TEXT,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'cancelled')) DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  steps_completed INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  execution_params JSONB DEFAULT '{}'::JSONB,
  execution_results JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_success_rate ON workflow_templates(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_template_executions_template_id ON workflow_template_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_template_executions_status ON workflow_template_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_template_executions_started ON workflow_template_executions(started_at DESC);

-- Enable Row Level Security
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read, service role manages
CREATE POLICY workflow_templates_select_all ON workflow_templates FOR SELECT USING (true);
CREATE POLICY workflow_templates_insert_all ON workflow_templates FOR INSERT WITH CHECK (true);
CREATE POLICY workflow_templates_update_all ON workflow_templates FOR UPDATE USING (true);
CREATE POLICY workflow_templates_delete_all ON workflow_templates FOR DELETE USING (true);

CREATE POLICY workflow_template_executions_select_all ON workflow_template_executions FOR SELECT USING (true);
CREATE POLICY workflow_template_executions_insert_all ON workflow_template_executions FOR INSERT WITH CHECK (true);
CREATE POLICY workflow_template_executions_update_all ON workflow_template_executions FOR UPDATE USING (true);
CREATE POLICY workflow_template_executions_delete_all ON workflow_template_executions FOR DELETE USING (true);

-- Insert pre-built workflow templates

-- 1. Revenue: Acquire New Customer
INSERT INTO workflow_templates (template_name, category, description, steps, estimated_duration_seconds, tags) VALUES (
  'acquire_new_customer',
  'revenue',
  'Complete customer onboarding: lead qualification → API key generation → welcome email → setup guide',
  '[
    {
      "name": "Validate Customer Email",
      "type": "validation",
      "description": "Check email format and domain validity"
    },
    {
      "name": "Generate API Key",
      "type": "api_call",
      "function": "service-monetization-engine",
      "action": "generate_api_key",
      "params_template": {
        "service_name": "{service_name}",
        "tier": "{tier}",
        "owner_email": "{email}",
        "owner_name": "{name}"
      }
    },
    {
      "name": "Log New Customer",
      "type": "database",
      "table": "activity_feed",
      "operation": "insert",
      "description": "Record new customer acquisition"
    },
    {
      "name": "Welcome Notification",
      "type": "notification",
      "description": "Send welcome message with API key and getting started guide"
    }
  ]'::JSONB,
  45,
  ARRAY['onboarding', 'customer', 'api-key']
);

-- 2. Revenue: Upsell Existing Customer
INSERT INTO workflow_templates (template_name, category, description, steps, estimated_duration_seconds, tags) VALUES (
  'upsell_existing_customer',
  'revenue',
  'Analyze usage → identify upsell opportunity → recommend tier upgrade → execute upgrade',
  '[
    {
      "name": "Get Usage Stats",
      "type": "api_call",
      "function": "service-monetization-engine",
      "action": "get_usage_stats",
      "params_template": {
        "api_key": "{api_key}"
      }
    },
    {
      "name": "Analyze Upsell Opportunity",
      "type": "decision",
      "condition": "usage_percentage > 80",
      "description": "Recommend upgrade if customer is using >80% of quota"
    },
    {
      "name": "Upgrade Tier",
      "type": "api_call",
      "function": "service-monetization-engine",
      "action": "upgrade_tier",
      "params_template": {
        "api_key": "{api_key}",
        "new_tier": "{new_tier}"
      }
    },
    {
      "name": "Send Upgrade Confirmation",
      "type": "notification",
      "description": "Notify customer of tier upgrade and new quota"
    }
  ]'::JSONB,
  30,
  ARRAY['upsell', 'upgrade', 'revenue-optimization']
);

-- 3. Revenue: Monthly Billing Cycle
INSERT INTO workflow_templates (template_name, category, description, steps, estimated_duration_seconds, tags) VALUES (
  'monthly_billing_cycle',
  'revenue',
  'Automated monthly billing: calculate usage → generate invoices → send emails → update revenue metrics',
  '[
    {
      "name": "Calculate Monthly Revenue",
      "type": "api_call",
      "function": "service-monetization-engine",
      "action": "calculate_revenue",
      "description": "Get MRR and customer breakdown"
    },
    {
      "name": "Generate Invoices",
      "type": "batch_operation",
      "description": "Create invoices for all active customers",
      "for_each": "active_customers"
    },
    {
      "name": "Send Invoice Emails",
      "type": "notification_batch",
      "description": "Email invoices to all customers"
    },
    {
      "name": "Update Revenue Metrics",
      "type": "database",
      "table": "revenue_metrics",
      "operation": "upsert",
      "description": "Log monthly revenue data"
    },
    {
      "name": "Generate Revenue Report",
      "type": "reporting",
      "description": "Create monthly revenue dashboard and insights"
    }
  ]'::JSONB,
  120,
  ARRAY['billing', 'automation', 'monthly', 'finance']
);

-- 4. Revenue: Churn Prevention
INSERT INTO workflow_templates (template_name, category, description, steps, estimated_duration_seconds, tags) VALUES (
  'churn_prevention',
  'revenue',
  'Identify at-risk customers → send retention offer → apply discount → track outcome',
  '[
    {
      "name": "Identify At-Risk Customers",
      "type": "analytics",
      "description": "Find customers with declining usage or approaching tier downgrade"
    },
    {
      "name": "Analyze Churn Risk",
      "type": "decision",
      "description": "Score churn probability based on usage patterns"
    },
    {
      "name": "Create Retention Offer",
      "type": "logic",
      "description": "Generate personalized discount or feature upgrade offer"
    },
    {
      "name": "Send Retention Email",
      "type": "notification",
      "description": "Reach out with retention offer before they churn"
    },
    {
      "name": "Track Response",
      "type": "monitoring",
      "description": "Monitor customer response and usage changes"
    }
  ]'::JSONB,
  60,
  ARRAY['retention', 'churn', 'customer-success']
);

-- 5. Marketing: Content Campaign
INSERT INTO workflow_templates (template_name, category, description, steps, estimated_duration_seconds, tags) VALUES (
  'content_campaign',
  'marketing',
  'Generate blog post → optimize for SEO → publish → share on social media → track engagement',
  '[
    {
      "name": "Generate Content",
      "type": "ai_generation",
      "description": "Use AI to create blog post or article based on topic"
    },
    {
      "name": "SEO Optimization",
      "type": "optimization",
      "description": "Add meta tags, keywords, and optimize for search engines"
    },
    {
      "name": "Publish Content",
      "type": "api_call",
      "description": "Publish to blog or content platform"
    },
    {
      "name": "Share on Social Media",
      "type": "multi_channel",
      "channels": ["twitter", "discord", "telegram"],
      "description": "Cross-post to all social channels"
    },
    {
      "name": "Track Engagement",
      "type": "analytics",
      "description": "Monitor views, shares, and engagement metrics"
    }
  ]'::JSONB,
  90,
  ARRAY['content', 'marketing', 'seo', 'social-media']
);

-- 6. Marketing: Influencer Outreach
INSERT INTO workflow_templates (template_name, category, description, steps, estimated_duration_seconds, tags) VALUES (
  'influencer_outreach',
  'marketing',
  'Identify influencers → draft personalized pitch → send DM → track responses → onboard partners',
  '[
    {
      "name": "Identify Target Influencers",
      "type": "research",
      "description": "Find influencers in crypto/Web3/DAO space with relevant audience"
    },
    {
      "name": "Analyze Influencer Fit",
      "type": "scoring",
      "description": "Score influencers by reach, engagement, and audience alignment"
    },
    {
      "name": "Draft Personalized Pitch",
      "type": "ai_generation",
      "description": "Create customized outreach message for each influencer"
    },
    {
      "name": "Send Outreach Messages",
      "type": "notification_batch",
      "description": "Send DMs via Twitter, Discord, or email"
    },
    {
      "name": "Track Responses",
      "type": "monitoring",
      "description": "Monitor reply rates and schedule follow-ups"
    },
    {
      "name": "Onboard Partners",
      "type": "process",
      "description": "Set up partnership agreements for interested influencers"
    }
  ]'::JSONB,
  180,
  ARRAY['influencer', 'outreach', 'partnerships', 'growth']
);

-- 7. Financial: Treasury Health Check
INSERT INTO workflow_templates (template_name, category, description, steps, estimated_duration_seconds, tags) VALUES (
  'treasury_health_check',
  'financial',
  'Check balances → analyze cash flow → identify risks → generate comprehensive report',
  '[
    {
      "name": "Query Treasury Balances",
      "type": "database",
      "description": "Get current XMRT, XMR, USDT, ETH balances across all wallets"
    },
    {
      "name": "Calculate Total Value",
      "type": "calculation",
      "description": "Convert all assets to USD for total portfolio value"
    },
    {
      "name": "Analyze Cash Flow",
      "type": "analytics",
      "description": "Review 30-day inflows/outflows and trend analysis"
    },
    {
      "name": "Identify Risks",
      "type": "risk_analysis",
      "description": "Flag concentration risk, low liquidity, or exposure issues"
    },
    {
      "name": "Generate Health Report",
      "type": "reporting",
      "description": "Create comprehensive treasury health dashboard"
    },
    {
      "name": "Send to Council",
      "type": "notification",
      "description": "Share report with Executive Council for review"
    }
  ]'::JSONB,
  75,
  ARRAY['treasury', 'finance', 'reporting', 'health-check']
);

-- 8. Financial: Execute Buyback
INSERT INTO workflow_templates (template_name, category, description, steps, estimated_duration_seconds, tags) VALUES (
  'execute_buyback',
  'financial',
  'Check XMRT price → calculate buyback amount → propose trade → get approval → execute → log transaction',
  '[
    {
      "name": "Get Current XMRT Price",
      "type": "api_call",
      "description": "Query DEX APIs for current XMRT/USDT price"
    },
    {
      "name": "Check Market Conditions",
      "type": "decision",
      "condition": "price < target_price",
      "description": "Only execute buyback if price is below target threshold"
    },
    {
      "name": "Calculate Buyback Amount",
      "type": "calculation",
      "description": "Determine optimal buyback size based on treasury balance and market depth"
    },
    {
      "name": "Propose Trade",
      "type": "api_call",
      "function": "autonomous-treasury-manager",
      "action": "propose_trade",
      "description": "Create buyback proposal requiring multi-sig approval"
    },
    {
      "name": "Wait for Approval",
      "type": "approval_gate",
      "required_approvals": 2,
      "timeout_hours": 24,
      "description": "Wait for 2 council members to approve trade"
    },
    {
      "name": "Execute Trade",
      "type": "blockchain_tx",
      "description": "Execute USDT → XMRT swap on approved DEX"
    },
    {
      "name": "Log Transaction",
      "type": "database",
      "table": "activity_feed",
      "description": "Record buyback details for transparency"
    }
  ]'::JSONB,
  86400,
  ARRAY['buyback', 'treasury', 'trading', 'price-support']
);

-- 9. Optimization: Learn From Failures
INSERT INTO workflow_templates (template_name, category, description, steps, estimated_duration_seconds, tags) VALUES (
  'learn_from_failures',
  'optimization',
  'Analyze recent errors → identify patterns → update knowledge base → propose code fixes',
  '[
    {
      "name": "Fetch Failed Executions",
      "type": "database",
      "table": "eliza_python_executions",
      "filter": "status = failed",
      "description": "Get recent code execution failures"
    },
    {
      "name": "Analyze Error Patterns",
      "type": "ai_analysis",
      "description": "Use AI to identify common error types and root causes"
    },
    {
      "name": "Extract Learnings",
      "type": "knowledge_extraction",
      "description": "Create knowledge entries for each failure pattern"
    },
    {
      "name": "Update Knowledge Base",
      "type": "api_call",
      "function": "knowledge-manager",
      "action": "store_knowledge",
      "description": "Store learnings for future reference"
    },
    {
      "name": "Generate Fix Proposals",
      "type": "ai_generation",
      "description": "Create code fix suggestions for recurring errors"
    },
    {
      "name": "Apply Auto-Fixes",
      "type": "api_call",
      "function": "autonomous-code-fixer",
      "description": "Automatically fix simple errors"
    }
  ]'::JSONB,
  90,
  ARRAY['learning', 'optimization', 'debugging', 'self-improvement']
);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_workflow_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_templates_update_timestamp
BEFORE UPDATE ON workflow_templates
FOR EACH ROW
EXECUTE FUNCTION update_workflow_templates_timestamp();