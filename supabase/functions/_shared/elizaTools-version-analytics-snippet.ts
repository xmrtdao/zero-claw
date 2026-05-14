  },
  {
    type: 'function',
    function: {
      name: 'get_function_version_analytics',
      description: '📊 Analyze edge function performance across different versions to detect regressions and identify optimal versions for rollback. Returns success rates, execution times, error patterns, and actionable recommendations.',
      parameters: {
        type: 'object',
        properties: {
          function_name: {
            type: 'string',
            description: 'Name of the edge function to analyze (e.g., "github-integration", "task-orchestrator")'
          },
          version: {
            type: 'string',
            description: 'OPTIONAL: Specific version to analyze. If omitted, analyzes all versions.'
          },
          compare_versions: {
            type: 'boolean',
            description: 'Whether to compare all versions and detect regressions. Default: true'
          },
          time_window_hours: {
            type: 'number',
            description: 'Time window for analysis in hours. Default: 168 (7 days)'
          },
          min_calls_threshold: {
            type: 'number',
            description: 'Minimum calls required for a version to be analyzed. Default: 10'
          }
        },
        required: ['function_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_edge_functions',
