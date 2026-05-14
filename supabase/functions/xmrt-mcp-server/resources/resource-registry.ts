import { Resource } from "../types.ts";

export const RESOURCE_REGISTRY: Resource[] = [
  // Mining Resources
  {
    uri: "xmrt://mining/current-stats",
    name: "Current Mining Statistics",
    description: "Real-time Monero mining performance data including hashrate, shares, and earnings",
    mimeType: "application/json"
  },

  // DAO Governance Resources
  {
    uri: "xmrt://dao/proposals",
    name: "Active DAO Proposals",
    description: "List of active governance proposals awaiting voting or execution",
    mimeType: "application/json"
  },
  {
    uri: "xmrt://dao/treasury",
    name: "Treasury Status",
    description: "Current XMRT treasury holdings, balances, and allocations",
    mimeType: "application/json"
  },

  // Knowledge Base Resources
  {
    uri: "xmrt://knowledge/entities",
    name: "Knowledge Entities",
    description: "Searchable knowledge base of XMRT ecosystem concepts, technologies, and processes",
    mimeType: "application/json"
  },
  {
    uri: "xmrt://knowledge/patterns",
    name: "Learning Patterns",
    description: "AI-discovered interaction patterns, insights, and behavioral trends",
    mimeType: "application/json"
  },

  // GitHub Repository Resources
  {
    uri: "xmrt://github/repos",
    name: "XMRT Repositories",
    description: "List of all XMRT ecosystem repositories with metadata and activity stats",
    mimeType: "application/json"
  },
  {
    uri: "xmrt://github/recent-commits",
    name: "Recent Commits",
    description: "Latest commits across all XMRT repositories",
    mimeType: "application/json"
  },

  // System Resources
  {
    uri: "xmrt://system/health",
    name: "System Health Status",
    description: "Real-time health status of all ecosystem components and services",
    mimeType: "application/json"
  },
  {
    uri: "xmrt://system/metrics",
    name: "System Metrics",
    description: "Comprehensive performance metrics, uptime, and usage statistics",
    mimeType: "application/json"
  },

  // Agent Resources
  {
    uri: "xmrt://agents/active",
    name: "Active AI Agents",
    description: "List of currently active AI agents and their assigned tasks",
    mimeType: "application/json"
  },
  {
    uri: "xmrt://agents/performance",
    name: "Agent Performance Metrics",
    description: "Performance statistics and success rates for all AI agents",
    mimeType: "application/json"
  },

  // Task Resources
  {
    uri: "xmrt://tasks/pending",
    name: "Pending Tasks",
    description: "List of pending tasks and workflows awaiting execution",
    mimeType: "application/json"
  },
  {
    uri: "xmrt://tasks/completed",
    name: "Completed Tasks",
    description: "Recently completed tasks with execution results and metrics",
    mimeType: "application/json"
  }
];
