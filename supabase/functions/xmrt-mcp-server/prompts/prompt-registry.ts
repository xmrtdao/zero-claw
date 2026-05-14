import { Prompt } from "../types.ts";

export const PROMPT_REGISTRY: Prompt[] = [
  // Governance Prompts
  {
    name: "xmrt_create_proposal",
    description: "Create a new DAO governance proposal with proper formatting",
    arguments: [
      { name: "topic", description: "Topic or title of the proposal", required: true },
      { name: "description", description: "Detailed description of the proposal", required: true },
      { name: "budget", description: "Budget requirement (if applicable)", required: false }
    ]
  },
  {
    name: "xmrt_analyze_proposal",
    description: "Analyze a governance proposal for impact and feasibility",
    arguments: [
      { name: "proposal_id", description: "Proposal identifier", required: true }
    ]
  },

  // Development Prompts
  {
    name: "xmrt_code_review",
    description: "Review code changes in XMRT repositories",
    arguments: [
      { name: "repo", description: "Repository name", required: true },
      { name: "pr_number", description: "Pull request number", required: true }
    ]
  },
  {
    name: "xmrt_debug_issue",
    description: "Debug and analyze system issues with root cause analysis",
    arguments: [
      { name: "issue_description", description: "Description of the issue", required: true },
      { name: "logs", description: "Relevant log data", required: false }
    ]
  },
  {
    name: "xmrt_optimize_code",
    description: "Analyze and suggest optimizations for code performance",
    arguments: [
      { name: "code", description: "Code to optimize", required: true },
      { name: "language", description: "Programming language", required: true }
    ]
  },

  // Analysis Prompts
  {
    name: "xmrt_mining_analysis",
    description: "Analyze mining performance and profitability",
    arguments: [
      { name: "timeframe", description: "Analysis timeframe", required: false, default: "7d" }
    ]
  },
  {
    name: "xmrt_ecosystem_health",
    description: "Comprehensive ecosystem health analysis",
    arguments: []
  },
  {
    name: "xmrt_security_audit",
    description: "Perform security audit on code or systems",
    arguments: [
      { name: "target", description: "Target to audit (repo, contract, etc.)", required: true },
      { name: "scope", description: "Audit scope", required: false }
    ]
  },

  // Task Planning Prompts
  {
    name: "xmrt_plan_workflow",
    description: "Plan a multi-step workflow with dependencies",
    arguments: [
      { name: "goal", description: "Overall goal of the workflow", required: true },
      { name: "constraints", description: "Constraints or requirements", required: false }
    ]
  },
  {
    name: "xmrt_estimate_effort",
    description: "Estimate effort and resources for a task",
    arguments: [
      { name: "task_description", description: "Description of the task", required: true }
    ]
  },

  // Knowledge Management Prompts
  {
    name: "xmrt_summarize_knowledge",
    description: "Summarize knowledge entities on a specific topic",
    arguments: [
      { name: "topic", description: "Topic to summarize", required: true }
    ]
  },
  {
    name: "xmrt_extract_insights",
    description: "Extract insights from conversation history or data",
    arguments: [
      { name: "source", description: "Data source to analyze", required: true },
      { name: "focus", description: "Specific focus area", required: false }
    ]
  }
];
