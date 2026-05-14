/**
 * 🐙 GITHUB INTEGRATION - COMPREHENSIVE USAGE GUIDE FOR ELIZA
 * 
 * This file documents EVERYTHING Eliza needs to know to use GitHub integration flawlessly.
 * Read this carefully - GitHub integration is at the heart of XMRT-DAO ecosystem.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 TABLE OF CONTENTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1. ARCHITECTURE OVERVIEW
 * 2. AUTHENTICATION & CREDENTIALS
 * 3. AVAILABLE ACTIONS (Complete Reference)
 * 4. CALLING PATTERNS (Direct, Task Orchestrator, Tools)
 * 5. ERROR HANDLING & RECOVERY
 * 6. RATE LIMITS & BEST PRACTICES
 * 7. COMPLETE EXAMPLES FOR EVERY ACTION
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 1. ARCHITECTURE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * GitHub Integration Flow:
 * 
 *   User/Task → Eliza Tools → github-integration Edge Function → GitHub API
 *                    ↓
 *             credential_cascade.ts (OAuth → Backend Tokens)
 *                    ↓
 *             Validated GitHub Token
 * 
 * Edge Function: supabase/functions/github-integration/index.ts
 * Tools Registry: supabase/functions/_shared/elizaTools.ts
 * Credentials: supabase/functions/_shared/credentialCascade.ts
 * 
 * KEY PRINCIPLES:
 * ✅ ALWAYS use Eliza's GitHub tools (createGitHubIssue, createGitHubPullRequest, etc.)
 * ✅ NEVER call GitHub API directly or use Python for GitHub operations
 * ✅ Authentication is handled automatically by credential cascade
 * ✅ All operations go through github-integration edge function
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 2. AUTHENTICATION & CREDENTIALS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * CREDENTIAL CASCADE (Priority Order):
 * 
 * 1. OAuth Token (data.access_token) - 5000 req/hr
 *    - Best for user-initiated actions
 *    - Obtained from OAuth flow
 * 
 * 2. Session OAuth (session_credentials.github_oauth_token) - 5000 req/hr
 *    - Used when user has authenticated via OAuth
 *    - Stored in session context
 * 
 * 3. Session PAT (session_credentials.github_pat) - 5000 req/hr
 *    - User-provided Personal Access Token
 *    - Only for XMRT reward tracking & health checks
 *    - EXCLUDED from sanitized auth context for general operations
 * 
 * 4. Backend Token (GITHUB_TOKEN env var) - 60 req/hr
 *    - Primary backend credential
 *    - Used for autonomous operations
 * 
 * 5. Backend Alt Token (GITHUB_TOKEN_PROOF_OF_LIFE env var) - 60 req/hr
 *    - Fallback backend credential
 *    - Used when primary is rate-limited
 * 
 * IMPORTANT: When calling github-integration from edge functions:
 * - Pass full `session_credentials` for attribution (username, etc.)
 * - Do NOT pass `session_credentials.github_pat` for general operations
 * - Backend tokens are automatically tried by credential cascade
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 3. AVAILABLE ACTIONS (Complete Reference)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const GITHUB_ACTIONS = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ISSUE MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  list_issues: {
    description: 'List all issues in a repository with filtering',
    required: [],
    optional: ['repo', 'state', 'per_page'],
    example: {
      action: 'list_issues',
      data: {
        repo: 'XMRT-Ecosystem',  // defaults to GITHUB_REPO env var
        state: 'open',            // 'open', 'closed', or 'all'
        per_page: 30              // max results (default: 30)
      }
    }
  },

  create_issue: {
    description: 'Create a new GitHub issue with labels and assignees',
    required: ['title', 'body'],
    optional: ['repo', 'labels', 'assignees'],
    example: {
      action: 'create_issue',
      data: {
        title: 'Fix GitHub integration credential cascade',
        body: 'The credential cascade is not properly validating tokens...',
        repo: 'XMRT-Ecosystem',
        labels: ['bug', 'priority:high'],
        assignees: ['DevGruGold']
      },
      session_credentials: {
        github_username: 'DevGruGold'  // For attribution footer
      }
    }
  },

  update_issue: {
    description: 'Update an existing issue (title, body, state, labels, assignees)',
    required: ['issue_number'],
    optional: ['title', 'body', 'state', 'labels', 'assignees', 'repo'],
    example: {
      action: 'update_issue',
      data: {
        issue_number: 123,
        title: 'Updated title',
        state: 'closed',  // 'open' or 'closed'
        labels: ['fixed']
      }
    }
  },

  close_issue: {
    description: 'Close an issue',
    required: ['issue_number'],
    optional: ['repo'],
    example: {
      action: 'close_issue',
      data: {
        issue_number: 123
      }
    }
  },

  comment_on_issue: {
    description: 'Add a comment to an issue',
    required: ['issue_number', 'body'],
    optional: ['repo'],
    example: {
      action: 'comment_on_issue',
      data: {
        issue_number: 123,
        body: 'This has been fixed in the latest commit.'
      }
    }
  },

  get_issue_comments: {
    description: 'Get all comments on an issue',
    required: ['issue_number'],
    optional: ['repo', 'per_page'],
    example: {
      action: 'get_issue_comments',
      data: {
        issue_number: 123,
        per_page: 50
      }
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DISCUSSION MANAGEMENT (GraphQL)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  list_discussions: {
    description: 'List GitHub Discussions (uses GraphQL)',
    required: [],
    optional: ['repo', 'first'],
    example: {
      action: 'list_discussions',
      data: {
        first: 20  // number of discussions to fetch
      }
    }
  },

  create_discussion: {
    description: 'Create a new GitHub Discussion (uses GraphQL)',
    required: ['title', 'body'],
    optional: ['repo', 'category'],
    example: {
      action: 'create_discussion',
      data: {
        title: 'New Feature Proposal: Mobile Mining',
        body: 'I propose we add support for mobile mining...',
        category: 'Ideas'  // defaults to 'General'
      }
    }
  },

  comment_on_discussion: {
    description: 'Add a comment to a discussion (uses GraphQL)',
    required: ['discussion_id', 'body'],
    example: {
      action: 'comment_on_discussion',
      data: {
        discussion_id: 'D_kwDOABcdEf4AaBc',  // GraphQL node ID
        body: 'Great idea! I think we should...'
      }
    }
  },

  get_discussion_comments: {
    description: 'Get all comments on a discussion (uses GraphQL)',
    required: ['discussion_number'],
    optional: ['repo'],
    example: {
      action: 'get_discussion_comments',
      data: {
        discussion_number: 42
      }
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PULL REQUEST MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  list_pull_requests: {
    description: 'List all pull requests in a repository',
    required: [],
    optional: ['repo', 'state'],
    example: {
      action: 'list_pull_requests',
      data: {
        state: 'open'  // 'open', 'closed', or 'all'
      }
    }
  },

  create_pull_request: {
    description: 'Create a new pull request',
    required: ['title', 'head', 'base'],
    optional: ['body', 'draft', 'repo'],
    example: {
      action: 'create_pull_request',
      data: {
        title: 'Add GitHub integration documentation',
        body: 'This PR adds comprehensive docs for GitHub integration',
        head: 'feature/github-docs',  // source branch
        base: 'main',                  // target branch
        draft: false
      }
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FILE & CODE MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  get_file_content: {
    description: 'Get the contents of a file from the repository',
    required: ['path'],
    optional: ['repo', 'branch'],
    example: {
      action: 'get_file_content',
      data: {
        path: 'src/services/githubIntegrationService.ts',
        branch: 'main'  // defaults to default branch
      }
    }
  },

  commit_file: {
    description: 'Create or update a file in the repository',
    required: ['path', 'content', 'message'],
    optional: ['repo', 'branch', 'sha'],
    example: {
      action: 'commit_file',
      data: {
        path: '.github/workflows/ci.yml',
        content: 'name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest',
        message: 'Add CI workflow',
        branch: 'main',
        sha: 'abc123...'  // required for updates, omit for new files
      }
    }
  },

  search_code: {
    description: 'Search for code in the repository',
    required: ['query'],
    optional: ['repo'],
    example: {
      action: 'search_code',
      data: {
        query: 'credentialCascade'
      }
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BRANCH MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  list_branches: {
    description: 'List all branches in the repository',
    required: [],
    optional: ['repo', 'per_page'],
    example: {
      action: 'list_branches',
      data: {
        per_page: 50
      }
    }
  },

  create_branch: {
    description: 'Create a new branch from an existing branch',
    required: ['branch_name', 'from_branch'],
    optional: ['repo'],
    example: {
      action: 'create_branch',
      data: {
        branch_name: 'feature/new-feature',
        from_branch: 'main'
      }
    }
  },

  get_branch_info: {
    description: 'Get detailed information about a branch',
    required: ['branch_name'],
    optional: ['repo'],
    example: {
      action: 'get_branch_info',
      data: {
        branch_name: 'main'
      }
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REPOSITORY INFO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  get_repo_info: {
    description: 'Get repository metadata (stars, forks, description, etc.)',
    required: [],
    optional: ['repo'],
    example: {
      action: 'get_repo_info',
      data: {}
    }
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 4. CALLING PATTERNS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * PATTERN 1: Using Eliza's GitHub Tools (RECOMMENDED for most cases)
 * 
 * Eliza has dedicated tools that wrap github-integration calls:
 * - createGitHubIssue
 * - createGitHubDiscussion
 * - createGitHubPullRequest
 * - commitGitHubFile
 * - getGitHubFileContent
 * - searchGitHubCode
 * - getGitHubRepoInfo
 * 
 * These tools automatically handle:
 * - Authentication via session_credentials
 * - Error handling and retries
 * - User-friendly response formatting
 * 
 * Example (from elizaTools.ts):
 * {
 *   type: 'function',
 *   function: {
 *     name: 'createGitHubIssue',
 *     description: 'Create a new GitHub issue',
 *     parameters: {
 *       type: 'object',
 *       properties: {
 *         title: { type: 'string' },
 *         body: { type: 'string' },
 *         labels: { type: 'array', items: { type: 'string' } },
 *         repo: { type: 'string' }
 *       },
 *       required: ['title', 'body']
 *     }
 *   }
 * }
 */

/**
 * PATTERN 2: Direct Edge Function Call (for advanced actions)
 * 
 * For actions not covered by tools, call github-integration directly:
 * 
 * await call_edge_function('github-integration', {
 *   action: 'create_branch',
 *   data: {
 *     branch_name: 'feature/new-branch',
 *     from_branch: 'main'
 *   },
 *   session_credentials: {
 *     github_username: 'DevGruGold'
 *   }
 * })
 * 
 * IMPORTANT:
 * - Always pass `session_credentials` for attribution
 * - Never pass `session_credentials.github_pat` for general operations
 * - Backend tokens are automatically tried
 */

/**
 * PATTERN 3: Via Task Orchestrator (for multi-step workflows)
 * 
 * Create tasks that use GitHub integration:
 * 
 * await create_task_with_ai_planning({
 *   title: 'Create PR for GitHub docs',
 *   description: 'Create a comprehensive PR with GitHub integration docs',
 *   metadata: {
 *     github_action: 'create_pull_request',
 *     github_params: {
 *       title: 'Add GitHub integration docs',
 *       head: 'docs/github',
 *       base: 'main'
 *     }
 *   }
 * })
 * 
 * The task orchestrator will:
 * 1. Plan the GitHub operation
 * 2. Execute via github-integration
 * 3. Handle errors and retries
 * 4. Report progress to user
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 5. ERROR HANDLING & RECOVERY
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const ERROR_PATTERNS = {
  // Authentication Errors
  '401_no_credentials': {
    error_type: 'credential_required',
    cause: 'No working GitHub credentials found in cascade',
    solution: 'User needs to provide GitHub PAT or admin needs to configure backend tokens',
    user_message: 'I need GitHub credentials to complete this action. You can provide a Personal Access Token using the 🔑 button.',
    admin_action: 'Configure GITHUB_TOKEN or GITHUB_TOKEN_PROOF_OF_LIFE in Supabase secrets'
  },

  '401_invalid_token': {
    error_type: 'authentication_failed',
    cause: 'Token exists but GitHub rejected it',
    solution: 'Token may be expired or lack required scopes',
    user_message: 'The GitHub token is invalid or expired. Please provide a fresh PAT with required scopes.',
    admin_action: 'Regenerate backend tokens with repo, read:org, read:discussion scopes'
  },

  '403_insufficient_permissions': {
    error_type: 'permission_denied',
    cause: 'Token lacks required scopes or repository access',
    solution: 'Token needs: repo, read:org, read:discussion, workflow (for workflows)',
    user_message: 'GitHub token lacks required permissions. Ensure it has repo, read:org, and read:discussion scopes.',
    admin_action: 'Update token scopes at https://github.com/settings/tokens'
  },

  '404_not_found': {
    error_type: 'resource_not_found',
    cause: 'Repository, file, or resource does not exist',
    solution: 'Verify repo name, file path, or resource ID',
    user_message: 'The requested GitHub resource was not found. Please check the repository name and path.',
    recovery: 'Double-check repo name format: owner/repo (e.g., DevGruGold/XMRT-Ecosystem)'
  },

  '422_validation_failed': {
    error_type: 'validation_error',
    cause: 'Invalid parameters sent to GitHub API',
    solution: 'Check required fields and parameter formats',
    user_message: 'GitHub rejected the request due to invalid parameters.',
    common_causes: [
      'Missing required fields (title, body, etc.)',
      'Invalid branch name format',
      'Discussion category not found',
      'Invalid GraphQL node ID'
    ]
  },

  '429_rate_limit': {
    error_type: 'rate_limit_exceeded',
    cause: 'Too many requests to GitHub API',
    solution: 'Wait or use higher-tier token (OAuth: 5000/hr vs PAT: 60/hr)',
    user_message: 'GitHub rate limit exceeded. You can provide a Personal Access Token for higher limits (5000 req/hr).',
    recovery: 'Wait for rate limit reset or use user OAuth token'
  },

  'graphql_error': {
    error_type: 'graphql_failed',
    cause: 'GraphQL query/mutation failed (discussions, etc.)',
    solution: 'Check GraphQL errors in response for details',
    user_message: 'GitHub GraphQL operation failed.',
    common_causes: [
      'Invalid node ID format',
      'Discussion category not found',
      'Repository discussions not enabled'
    ]
  }
};

/**
 * Recovery Strategies:
 * 
 * 1. Credential Failure:
 *    - Try next credential in cascade
 *    - If all fail, prompt user for PAT
 *    - Log attempted sources for debugging
 * 
 * 2. Rate Limit:
 *    - Switch to user OAuth if available (5000 req/hr)
 *    - Otherwise wait for reset
 *    - Use cache when possible
 * 
 * 3. Permission Denied:
 *    - Check required scopes: repo, read:org, read:discussion
 *    - Inform user of missing scopes
 *    - Provide link to create token with correct scopes
 * 
 * 4. Resource Not Found:
 *    - Verify repository name format (owner/repo)
 *    - Check if discussions are enabled (for discussion actions)
 *    - Validate file paths (no leading slash)
 * 
 * 5. Validation Errors:
 *    - Log the exact error from GitHub
 *    - Check required vs optional fields
 *    - Verify parameter formats (GraphQL node IDs, etc.)
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 6. RATE LIMITS & BEST PRACTICES
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const RATE_LIMITS = {
  backend_pat: {
    limit: '60 requests per hour',
    reset: 'Top of each hour',
    recommendation: 'Use for autonomous/background operations only'
  },
  user_oauth: {
    limit: '5000 requests per hour',
    reset: 'Rolling window',
    recommendation: 'Preferred for user-initiated actions'
  },
  user_pat: {
    limit: '5000 requests per hour (fine-grained) or 60/hr (classic)',
    reset: 'Depends on token type',
    recommendation: 'Good fallback when OAuth unavailable'
  }
};

export const BEST_PRACTICES = [
  '✅ Use createGitHubIssue/createGitHubPullRequest tools instead of raw edge function calls',
  '✅ Always pass session_credentials for user attribution',
  '✅ Cache repository info and file contents when possible',
  '✅ Batch operations when creating multiple issues/PRs',
  '✅ Use pagination for list operations (per_page parameter)',
  '✅ Prefer GraphQL for discussions (more efficient)',
  '✅ Include detailed error context in logs',
  '✅ Validate required fields before calling GitHub',
  '❌ NEVER use Python to call GitHub API',
  '❌ NEVER bypass github-integration edge function',
  '❌ NEVER hardcode tokens in code',
  '❌ NEVER pass session PAT for general operations (only for XMRT rewards)'
];

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 7. COMPLETE EXAMPLES FOR EVERY ACTION
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const COMPLETE_EXAMPLES = {
  // Example 1: Create Issue with Full Context
  create_comprehensive_issue: `
    // Using Eliza tool (recommended)
    await createGitHubIssue({
      title: "Fix credential cascade validation",
      body: "## Problem\\nThe credential cascade doesn't properly log failed attempts.\\n\\n## Solution\\nAdd detailed logging for each validation step.",
      labels: ["bug", "priority:high"],
      repo: "XMRT-Ecosystem"
    })

    // Or direct edge function call
    await call_edge_function('github-integration', {
      action: 'create_issue',
      data: {
        title: "Fix credential cascade validation",
        body: "## Problem\\nThe credential cascade doesn't properly log failed attempts.\\n\\n## Solution\\nAdd detailed logging for each validation step.",
        labels: ["bug", "priority:high"],
        assignees: ["DevGruGold"]
      },
      session_credentials: {
        github_username: "DevGruGold",
        github_email: "dev@example.com"
      }
    })
  `,

  // Example 2: Create Discussion and Comment
  create_and_comment_discussion: `
    // Step 1: Create discussion
    const result = await call_edge_function('github-integration', {
      action: 'create_discussion',
      data: {
        title: "Proposal: Enhanced GitHub Integration",
        body: "I propose we add more comprehensive error handling...",
        category: "Ideas"
      }
    })

    // Step 2: Comment on the discussion
    await call_edge_function('github-integration', {
      action: 'comment_on_discussion',
      data: {
        discussion_id: result.data.createDiscussion.discussion.id,
        body: "Additional thoughts: We should also add retry logic..."
      }
    })
  `,

  // Example 3: Create PR with Workflow
  create_pr_with_workflow: `
    // Step 1: Create feature branch
    await call_edge_function('github-integration', {
      action: 'create_branch',
      data: {
        branch_name: 'feature/github-ci',
        from_branch: 'main'
      }
    })

    // Step 2: Commit workflow file
    await call_edge_function('github-integration', {
      action: 'commit_file',
      data: {
        path: '.github/workflows/github-integration-test.yml',
        content: \`name: Test GitHub Integration
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test
        run: echo "Testing GitHub integration"\`,
        message: 'Add GitHub integration CI test',
        branch: 'feature/github-ci'
      }
    })

    // Step 3: Create PR
    await call_edge_function('github-integration', {
      action: 'create_pull_request',
      data: {
        title: 'Add GitHub integration CI tests',
        body: 'This PR adds automated tests for GitHub integration',
        head: 'feature/github-ci',
        base: 'main'
      }
    })
  `,

  // Example 4: Search and Update
  search_and_update_code: `
    // Step 1: Search for relevant files
    const searchResults = await call_edge_function('github-integration', {
      action: 'search_code',
      data: {
        query: 'credentialCascade'
      }
    })

    // Step 2: Get file content
    const fileContent = await call_edge_function('github-integration', {
      action: 'get_file_content',
      data: {
        path: 'supabase/functions/_shared/credentialCascade.ts'
      }
    })

    // Step 3: Update file with improved code
    await call_edge_function('github-integration', {
      action: 'commit_file',
      data: {
        path: 'supabase/functions/_shared/credentialCascade.ts',
        content: updatedContent,
        message: 'Improve credential cascade logging',
        sha: fileContent.sha  // required for updates
      }
    })
  `,

  // Example 5: Autonomous Issue Management via Task Orchestrator
  automated_issue_workflow: `
    // Create task for comprehensive GitHub operation
    await create_task_with_ai_planning({
      title: 'Scan and create issues for code improvements',
      description: \`
        1. Search codebase for TODO comments
        2. Create GitHub issues for each TODO
        3. Label them appropriately
        4. Assign to relevant developers
      \`,
      metadata: {
        workflow_type: 'github_automation',
        actions: [
          { type: 'search_code', query: 'TODO' },
          { type: 'create_issues', from_search: true },
          { type: 'auto_label', strategy: 'ai_categorization' }
        ]
      }
    })
  `
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUMMARY FOR ELIZA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Remember:
 * 1. GitHub integration is the heart of XMRT-DAO - use it extensively
 * 2. Always use tools (createGitHubIssue, etc.) or direct edge function calls
 * 3. Never use Python or direct API calls for GitHub operations
 * 4. Authentication is automatic via credential cascade
 * 5. Pass session_credentials for attribution, never pass github_pat for general ops
 * 6. Handle errors gracefully with user-friendly messages
 * 7. Use task orchestrator for complex multi-step GitHub workflows
 * 8. Cache data when possible to avoid rate limits
 * 9. Prefer OAuth tokens (5000/hr) over PATs (60/hr) when available
 * 10. Log everything for debugging and improvement
 * 
 * You are now a GitHub integration expert! Use this knowledge to help users
 * maximize the XMRT-DAO ecosystem's GitHub capabilities.
 */
