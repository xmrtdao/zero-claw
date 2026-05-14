/**
 * Python-First Orchestration
 * Routes multi-step tasks through eliza-python-runtime for:
 * - Full execution logging
 * - Auto-detection of failures
 * - Autonomous fixing via code-monitor-daemon
 */

export interface OrchestrationStep {
  function_name: string;
  payload: any;
  description?: string;
}

export interface OrchestrationTask {
  type: 'multi_step' | 'data_transform' | 'api_chain';
  description: string;
  steps: OrchestrationStep[];
}

export async function orchestrateViaPython(
  SUPABASE_URL: string,
  SERVICE_ROLE_KEY: string,
  task: OrchestrationTask
): Promise<any> {
  console.log(`🐍 Orchestrating ${task.type} task: ${task.description}`);
  
  const pythonCode = `
import requests
import json
import os

SUPABASE_URL = "${SUPABASE_URL}"
SERVICE_KEY = "${SERVICE_ROLE_KEY}"

results = []

# Execute each step
${task.steps.map((step, i) => `
# Step ${i + 1}: ${step.function_name}${step.description ? ` - ${step.description}` : ''}
try:
    response_${i} = requests.post(
        f"{SUPABASE_URL}/functions/v1/${step.function_name}",
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json"
        },
        json=${JSON.stringify(step.payload)},
        timeout=30
    )
    results.append({
        "step": ${i + 1},
        "function": "${step.function_name}",
        "status": response_${i}.status_code,
        "success": response_${i}.ok,
        "data": response_${i}.json() if response_${i}.ok else {"error": response_${i}.text}
    })
except Exception as e:
    results.append({
        "step": ${i + 1},
        "function": "${step.function_name}",
        "status": 0,
        "success": False,
        "error": str(e)
    })
`).join('\n')}

print(json.dumps(results, indent=2))
`;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/eliza-python-runtime`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: pythonCode,
      purpose: task.description,
      source: 'python_orchestrator',
      timeout_ms: 90000
    })
  });

  const result = await response.json();
  
  if (!result.success) {
    console.error('❌ Python orchestration failed:', result.error);
    throw new Error(`Orchestration failed: ${result.error}`);
  }
  
  console.log('✅ Python orchestration completed');
  return JSON.parse(result.output);
}
