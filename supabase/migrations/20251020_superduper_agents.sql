-- SuperDuper Agent Registry System
-- Created: 2025-10-20
-- Purpose: Manage Eliza's 10 SuperDuper agents with complete capability tracking

-- ============================================
-- 1. SUPERDUPER AGENT REGISTRY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS superduper_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  category TEXT NOT NULL,
  combined_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  core_functions JSONB NOT NULL DEFAULT '[]'::jsonb,
  use_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  edge_function_name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  execution_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  avg_execution_time_ms NUMERIC,
  last_execution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_superduper_agents_status ON superduper_agents(status);
CREATE INDEX idx_superduper_agents_category ON superduper_agents(category);
CREATE INDEX idx_superduper_agents_priority ON superduper_agents(priority DESC);
CREATE INDEX idx_superduper_agents_name ON superduper_agents(agent_name);

-- ============================================
-- 2. SUPERDUPER EXECUTION LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS superduper_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES superduper_agents(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  input_params JSONB,
  output_result JSONB,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'timeout')),
  execution_time_ms INTEGER,
  error_message TEXT,
  triggered_by TEXT, -- 'user', 'eliza', 'autonomous', 'scheduled'
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_execution_log_agent_id ON superduper_execution_log(agent_id);
CREATE INDEX idx_execution_log_agent_name ON superduper_execution_log(agent_name);
CREATE INDEX idx_execution_log_status ON superduper_execution_log(status);
CREATE INDEX idx_execution_log_created_at ON superduper_execution_log(created_at DESC);

-- ============================================
-- 3. AGENT CAPABILITY MAPPING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS superduper_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES superduper_agents(id) ON DELETE CASCADE,
  capability_name TEXT NOT NULL,
  capability_description TEXT NOT NULL,
  source_agent TEXT NOT NULL, -- Original Genspark agent name
  function_signature TEXT,
  example_usage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_capabilities_agent_id ON superduper_capabilities(agent_id);
CREATE INDEX idx_capabilities_name ON superduper_capabilities(capability_name);

-- ============================================
-- 4. AUTO-UPDATE TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_superduper_agent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_superduper_agent_timestamp
  BEFORE UPDATE ON superduper_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_superduper_agent_timestamp();

-- ============================================
-- 5. INSERT THE 10 SUPERDUPER AGENTS
-- ============================================

-- Agent 1: Social Intelligence & Viral Content Engine
INSERT INTO superduper_agents (
  agent_name,
  display_name,
  description,
  category,
  combined_capabilities,
  core_functions,
  use_cases,
  edge_function_name,
  priority
) VALUES (
  'superduper-social-viral',
  'Social Intelligence & Viral Content Engine',
  'Finds trending content, creates viral posts, repurposes content across platforms, generates memes and video scripts',
  'social_media',
  '["Social Media Comment Finder", "Content Repurposing Master", "ViralPost.AI", "TrendVoice AI", "StoryWeaver", "Shotlist Magician", "ClipSmith", "Meme Master"]'::jsonb,
  '["findTrendingComments", "repurposeContent", "generateViralPost", "createVideoScript", "generateMeme", "analyzeEngagement"]'::jsonb,
  '["Find trending Monero/crypto discussions", "Repurpose XMRT content across Twitter/Reddit/TikTok", "Create viral memes for community growth", "Generate video scripts for mobile mining tutorials"]'::jsonb,
  'superduper-social-viral',
  10
);

-- Agent 2: Financial Intelligence & Investment Advisor
INSERT INTO superduper_agents (
  agent_name,
  display_name,
  description,
  category,
  combined_capabilities,
  core_functions,
  use_cases,
  edge_function_name,
  priority
) VALUES (
  'superduper-finance-investment',
  'Financial Intelligence & Investment Advisor',
  'Analyzes treasury performance, calculates compound returns, performs credit analysis, optimizes tokenomics',
  'finance',
  '["Compound Interest Investment Agent", "Corporate Finance & DCM Expert", "LatAm Fintech Credit Analyst", "Structured Credit Counsel", "ABL Borrowing Base Analyst", "IC Chief-of-Staff", "Super Finance Ops Agent"]'::jsonb,
  '["analyzeTreasuryPerformance", "calculateCompoundReturns", "generateInvestmentMemo", "performCreditAnalysis", "createBorrowingBaseReport", "optimizeTokenomics", "generateICPack"]'::jsonb,
  '["Optimize XMRT treasury allocation", "Analyze mining ROI and compound returns", "Create investor materials for DAO fundraising", "Model token economics and staking rewards"]'::jsonb,
  'superduper-finance-investment',
  10
);

-- Agent 3: Code Architect & Quality Guardian
INSERT INTO superduper_agents (
  agent_name,
  display_name,
  description,
  category,
  combined_capabilities,
  core_functions,
  use_cases,
  edge_function_name,
  priority
) VALUES (
  'superduper-code-architect',
  'Code Architect & Quality Guardian',
  'Reviews code, designs architecture, generates full-stack apps, scans security, creates workflows',
  'development',
  '["Code Review Concierge", "CodePilot X", "Project Builder Pro", "Coding Assistant Pro", "n8n Atlas", "Full-Stack SaaS Launch Architect"]'::jsonb,
  '["reviewCode", "architectApplication", "generateFullStackApp", "scanSecurityVulnerabilities", "createN8nWorkflow", "optimizePerformance", "generateTests"]'::jsonb,
  '["Review PRs for xmrtassistant and XMRT-Ecosystem repos", "Architect new DAO governance features", "Generate automated workflows", "Security audit smart contracts"]'::jsonb,
  'superduper-code-architect',
  9
);

-- Agent 4: Communication & Outreach Maestro
INSERT INTO superduper_agents (
  agent_name,
  display_name,
  description,
  category,
  combined_capabilities,
  core_functions,
  use_cases,
  edge_function_name,
  priority
) VALUES (
  'superduper-communication-outreach',
  'Communication & Outreach Maestro',
  'Drafts emails, optimizes LinkedIn profiles, creates customer personas, generates investor outreach',
  'communication',
  '["Email Concierge", "LinkedIn Profile Optimizer", "LinkedIn Career Catalyst", "Customer Persona Pro", "Investor Outreach Engine", "Serendipity Engine"]'::jsonb,
  '["draftEmail", "optimizeLinkedInProfile", "createCustomerPersona", "generateInvestorOutreach", "planNetworkingSession", "createFollowUpSequence"]'::jsonb,
  '["Draft emails to potential DAO partners", "Create personas for mobile miners", "Outreach to crypto investors and VCs", "Network with Monero community leaders"]'::jsonb,
  'superduper-communication-outreach',
  8
);

-- Agent 5: Content Production & Media Studio
INSERT INTO superduper_agents (
  agent_name,
  display_name,
  description,
  category,
  combined_capabilities,
  core_functions,
  use_cases,
  edge_function_name,
  priority
) VALUES (
  'superduper-content-media',
  'Content Production & Media Studio',
  'Summarizes videos and articles, generates video prompts, creates podcast episodes, optimizes newsletters',
  'content_production',
  '["YouTube Summarizer", "Video Content Analyzer Pro", "Article Summarizer", "15sec SORA2 Video Prompt Generator", "Podcast Studio OS", "Newsletter Growth Engine"]'::jsonb,
  '["summarizeYouTubeVideo", "analyzeVideoContent", "summarizeArticle", "generateVideoPrompt", "createPodcastEpisode", "optimizeNewsletter"]'::jsonb,
  '["Summarize crypto news and Monero updates", "Create video prompts for XMRT explainers", "Generate podcast episodes about mobile mining", "Produce XMRT DAO weekly newsletter"]'::jsonb,
  'superduper-content-media',
  8
);

-- Agent 6: Business Strategy & Growth Engine
INSERT INTO superduper_agents (
  agent_name,
  display_name,
  description,
  category,
  combined_capabilities,
  core_functions,
  use_cases,
  edge_function_name,
  priority
) VALUES (
  'superduper-business-growth',
  'Business Strategy & Growth Engine',
  'Analyzes growth opportunities, prepares meetings, plans events, creates launch plans and proposals',
  'business_strategy',
  '["Business GrowthPilot", "Meeting Maestro", "Event Planner Pro", "Event & Webinar Producer Pro", "Launch Speedrunner", "Close-The-Deal Proposal Forge"]'::jsonb,
  '["analyzeGrowthOpportunities", "prepareMeeting", "planEvent", "createWebinarAssets", "generateLaunchPlan", "createProposal"]'::jsonb,
  '["Analyze DAO growth metrics", "Plan XMRT community events and AMAs", "Launch new features", "Create partnership proposals"]'::jsonb,
  'superduper-business-growth',
  7
);

-- Agent 7: Research & Intelligence Synthesizer
INSERT INTO superduper_agents (
  agent_name,
  display_name,
  description,
  category,
  combined_capabilities,
  core_functions,
  use_cases,
  edge_function_name,
  priority
) VALUES (
  'superduper-research-intelligence',
  'Research & Intelligence Synthesizer',
  'Conducts deep research, performs literature reviews, compares evidence, multi-perspective analysis',
  'research',
  '["DeepResearch 360", "Advanced Academic Research", "Evidence Duelist", "The 13-in-1 System", "AI Visibility Audit Pro", "MedGap Bridge Agent"]'::jsonb,
  '["conductDeepResearch", "literatureReview", "compareEvidence", "multiPerspectiveAnalysis", "auditAIVisibility", "identifyKnowledgeGaps"]'::jsonb,
  '["Deep research on mesh networking technologies", "Academic research on DAO governance models", "Compare evidence for mobile mining efficiency", "Audit XMRT visibility in AI search engines"]'::jsonb,
  'superduper-research-intelligence',
  9
);

-- Agent 8: Design & Brand Creator
INSERT INTO superduper_agents (
  agent_name,
  display_name,
  description,
  category,
  combined_capabilities,
  core_functions,
  use_cases,
  edge_function_name,
  priority
) VALUES (
  'superduper-design-brand',
  'Design & Brand Creator',
  'Generates logos, creates brand identity, writes creative content, designs surveys',
  'design',
  '["Logo Design Pro", "Digital Media Creative Director", "Dark Comedy Ghostwriter", "Survey Generator Pro"]'::jsonb,
  '["generateLogo", "createBrandIdentity", "writeCreativeContent", "designSurvey", "createVisualAssets"]'::jsonb,
  '["Design logos for XMRT sub-projects", "Create consistent brand identity", "Write engaging content for community", "Generate user satisfaction surveys"]'::jsonb,
  'superduper-design-brand',
  6
);

-- Agent 9: Personal & Professional Development Coach
INSERT INTO superduper_agents (
  agent_name,
  display_name,
  description,
  category,
  combined_capabilities,
  core_functions,
  use_cases,
  edge_function_name,
  priority
) VALUES (
  'superduper-development-coach',
  'Personal & Professional Development Coach',
  'Coaches job search, plans travel, analyzes performance, finds opportunities, provides guidance and motivation',
  'coaching',
  '["Job Search & Interview Coach OS", "Travel Planning Expert", "CycleCoach AI", "Campus Money Maker", "Reflective-Depth Psychologist", "Agent Motivator", "MillionaireAI"]'::jsonb,
  '["coachJobSearch", "planTravel", "analyzePerformance", "findMoneyOpportunities", "provideReflectiveGuidance", "motivateAction", "developWealthStrategy"]'::jsonb,
  '["Help community members find crypto jobs", "Plan DAO meetups and conferences", "Coach mobile miners on performance", "Motivate community participation"]'::jsonb,
  'superduper-development-coach',
  5
);

-- Agent 10: Specialized Domain Expert Hub
INSERT INTO superduper_agents (
  agent_name,
  display_name,
  description,
  category,
  combined_capabilities,
  core_functions,
  use_cases,
  edge_function_name,
  priority
) VALUES (
  'superduper-domain-experts',
  'Specialized Domain Expert Hub',
  'Translates documents, creates grant proposals, manages bots, processes receipts, recommends media, moderates content',
  'specialized',
  '["Professional Medical-Legal Translator", "Grant & Impact Design Partner", "Telegram Bot Manager", "ReceiptLens CN", "Movie Finder AI", "DJ Music Selector", "Grok Image Moderation Assistant", "Manus Genius"]'::jsonb,
  '["translateDocument", "createGrantProposal", "manageTelegramBot", "processReceipts", "recommendMedia", "moderateContent", "provideGuidance"]'::jsonb,
  '["Translate whitepapers and documentation", "Write grant proposals for DAO projects", "Manage XMRT Telegram community bots", "Process mining expense receipts", "Moderate community content"]'::jsonb,
  'superduper-domain-experts',
  6
);

-- ============================================
-- 6. CREATE VIEWS FOR EASY QUERYING
-- ============================================

CREATE OR REPLACE VIEW superduper_agent_stats AS
SELECT 
  agent_name,
  display_name,
  category,
  status,
  priority,
  execution_count,
  success_count,
  failure_count,
  CASE 
    WHEN execution_count > 0 THEN ROUND((success_count::NUMERIC / execution_count::NUMERIC) * 100, 2)
    ELSE 0 
  END as success_rate_percent,
  avg_execution_time_ms,
  last_execution_at,
  ARRAY_LENGTH(combined_capabilities, 1) as capability_count,
  ARRAY_LENGTH(core_functions, 1) as function_count
FROM superduper_agents
ORDER BY priority DESC, execution_count DESC;

CREATE OR REPLACE VIEW superduper_recent_activity AS
SELECT 
  l.id,
  a.display_name as agent_name,
  l.action,
  l.status,
  l.execution_time_ms,
  l.triggered_by,
  l.created_at
FROM superduper_execution_log l
JOIN superduper_agents a ON l.agent_id = a.id
ORDER BY l.created_at DESC
LIMIT 100;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON superduper_agents TO authenticated;
GRANT ALL ON superduper_agents TO service_role;
GRANT ALL ON superduper_execution_log TO authenticated;
GRANT ALL ON superduper_execution_log TO service_role;
GRANT ALL ON superduper_capabilities TO authenticated;
GRANT ALL ON superduper_capabilities TO service_role;
GRANT SELECT ON superduper_agent_stats TO authenticated;
GRANT SELECT ON superduper_agent_stats TO service_role;
GRANT SELECT ON superduper_recent_activity TO authenticated;
GRANT SELECT ON superduper_recent_activity TO service_role;

-- ============================================
-- 8. COMMENT DOCUMENTATION
-- ============================================

COMMENT ON TABLE superduper_agents IS 'Registry of all 10 SuperDuper agents with their capabilities and statistics';
COMMENT ON TABLE superduper_execution_log IS 'Complete execution history for all SuperDuper agent calls';
COMMENT ON TABLE superduper_capabilities IS 'Detailed capability mapping showing which Genspark agents are combined in each SuperDuper agent';
COMMENT ON VIEW superduper_agent_stats IS 'Statistical overview of agent performance and usage';
COMMENT ON VIEW superduper_recent_activity IS 'Recent 100 agent executions for monitoring';
