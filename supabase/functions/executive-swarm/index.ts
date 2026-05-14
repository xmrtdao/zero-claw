import { startUsageTracking } from '../_shared/functionUsageLogger.ts';

const FUNCTION_NAME = 'executive-swarm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ExecutiveKey = 'cto' | 'cfo' | 'cmo' | 'coo' | 'cpo';
type ExecutiveDomain =
  | 'technical'
  | 'business'
  | 'financial'
  | 'risk'
  | 'market'
  | 'user'
  | 'operational'
  | 'efficiency'
  | 'people'
  | 'culture';

type ExecutiveAgent = {
  id: ExecutiveKey;
  name: string;
  role: string;
  domainWeights: Record<ExecutiveDomain, number>;
  baselineConfidence: number;
};

type DecisionPerspective = {
  executive_id: ExecutiveKey;
  support_score: number;
  confidence: number;
  rationale: string;
  domain_influence: number;
};

type ScenarioInput = {
  name: string;
  impacts: Partial<Record<ExecutiveDomain, number>>;
};

type HistoricalDecision = {
  decision_id?: string;
  predicted_score?: number;
  actual_score?: number;
  confidence?: number;
  domain?: ExecutiveDomain;
  executive_accuracy?: Partial<Record<ExecutiveKey, number>>;
};

type ExecutiveSwarmRequest = {
  action?:
    | 'analyze_decision'
    | 'generate_consensus'
    | 'weight_executives'
    | 'track_decision_outcomes'
    | 'optimize_weights'
    | 'simulate_scenarios'
    | 'health';
  decision_id?: string;
  title?: string;
  summary?: string;
  decision_score?: number;
  decision_type?: ExecutiveDomain;
  decision_vector?: Partial<Record<ExecutiveDomain, number>>;
  scenarios?: ScenarioInput[];
  historical_decisions?: HistoricalDecision[];
  participation?: Partial<Record<ExecutiveKey, string>>;
  metadata?: Record<string, unknown>;
};

const EXECUTIVE_SWARM: ExecutiveAgent[] = [
  {
    id: 'cto',
    name: 'Dr. Anya Sharma',
    role: 'CTO',
    baselineConfidence: 0.82,
    domainWeights: {
      technical: 0.9,
      business: 0.3,
      financial: 0.2,
      risk: 0.45,
      market: 0.35,
      user: 0.45,
      operational: 0.4,
      efficiency: 0.5,
      people: 0.25,
      culture: 0.3,
    },
  },
  {
    id: 'cfo',
    name: 'Mr. Omar Al-Farsi',
    role: 'CFO',
    baselineConfidence: 0.84,
    domainWeights: {
      technical: 0.2,
      business: 0.5,
      financial: 0.9,
      risk: 0.8,
      market: 0.45,
      user: 0.25,
      operational: 0.45,
      efficiency: 0.6,
      people: 0.25,
      culture: 0.2,
    },
  },
  {
    id: 'cmo',
    name: 'Ms. Isabella Rodriguez',
    role: 'CMO',
    baselineConfidence: 0.8,
    domainWeights: {
      technical: 0.25,
      business: 0.6,
      financial: 0.3,
      risk: 0.35,
      market: 0.9,
      user: 0.7,
      operational: 0.35,
      efficiency: 0.4,
      people: 0.45,
      culture: 0.4,
    },
  },
  {
    id: 'coo',
    name: 'Mr. Klaus Richter',
    role: 'COO',
    baselineConfidence: 0.83,
    domainWeights: {
      technical: 0.45,
      business: 0.6,
      financial: 0.5,
      risk: 0.65,
      market: 0.35,
      user: 0.4,
      operational: 0.9,
      efficiency: 0.8,
      people: 0.55,
      culture: 0.45,
    },
  },
  {
    id: 'cpo',
    name: 'Ms. Akari Tanaka',
    role: 'CPO',
    baselineConfidence: 0.81,
    domainWeights: {
      technical: 0.5,
      business: 0.5,
      financial: 0.25,
      risk: 0.4,
      market: 0.5,
      user: 0.65,
      operational: 0.45,
      efficiency: 0.5,
      people: 0.9,
      culture: 0.7,
    },
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stdDev(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function normalizeUserId(raw: string | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return normalized.length ? normalized : null;
}

function defaultDecisionVector(
  decisionType: ExecutiveDomain | undefined,
  rawVector: Partial<Record<ExecutiveDomain, number>> | undefined,
): Record<ExecutiveDomain, number> {
  const base: Record<ExecutiveDomain, number> = {
    technical: 0.5,
    business: 0.5,
    financial: 0.5,
    risk: 0.5,
    market: 0.5,
    user: 0.5,
    operational: 0.5,
    efficiency: 0.5,
    people: 0.5,
    culture: 0.5,
  };

  if (decisionType && base[decisionType] !== undefined) {
    base[decisionType] = 0.95;
  }

  if (rawVector) {
    for (const [domain, value] of Object.entries(rawVector)) {
      if (domain in base && Number.isFinite(Number(value))) {
        base[domain as ExecutiveDomain] = clamp(Number(value), 0, 1);
      }
    }
  }

  return base;
}

function computeAccuracyBoost(
  executiveId: ExecutiveKey,
  historical: HistoricalDecision[],
): number {
  if (!historical.length) return 1;

  const directScores = historical
    .map((record) => record.executive_accuracy?.[executiveId])
    .filter((v): v is number => Number.isFinite(Number(v)))
    .map((v) => clamp(Number(v), 0, 1));

  if (directScores.length) {
    return clamp(0.7 + directScores.reduce((s, v) => s + v, 0) / directScores.length, 0.6, 1.7);
  }

  const residuals = historical
    .map((record) => {
      const predicted = Number(record.predicted_score);
      const actual = Number(record.actual_score);
      return Number.isFinite(predicted) && Number.isFinite(actual)
        ? Math.abs(actual - predicted)
        : null;
    })
    .filter((v): v is number => v !== null);

  if (!residuals.length) return 1;

  const meanResidual = residuals.reduce((sum, v) => sum + v, 0) / residuals.length;
  return clamp(1.3 - meanResidual, 0.6, 1.4);
}

function buildExecutivePerspectives(
  decisionVector: Record<ExecutiveDomain, number>,
  decisionScore: number,
  historical: HistoricalDecision[],
): DecisionPerspective[] {
  return EXECUTIVE_SWARM.map((executive) => {
    const weightedInfluence = Object.entries(decisionVector).reduce((sum, [domain, signal]) => {
      const domainWeight = executive.domainWeights[domain as ExecutiveDomain] ?? 0;
      return sum + domainWeight * signal;
    }, 0);

    const normalizedInfluence = clamp(weightedInfluence / Object.keys(decisionVector).length, 0, 1);
    const accuracyBoost = computeAccuracyBoost(executive.id, historical);
    const supportScore = clamp(
      (decisionScore * 0.55 + normalizedInfluence * 0.45) * accuracyBoost,
      0,
      1,
    );

    const confidence = clamp(
      executive.baselineConfidence * 0.6 + normalizedInfluence * 0.25 + accuracyBoost * 0.15,
      0.1,
      0.99,
    );

    return {
      executive_id: executive.id,
      support_score: supportScore,
      confidence,
      rationale: `${executive.role} signal from domain-weighted swarm influence`,
      domain_influence: normalizedInfluence,
    };
  });
}

function consensusFromPerspectives(perspectives: DecisionPerspective[]) {
  const weights = perspectives.map((p) => p.confidence);
  const weightedDenominator = weights.reduce((sum, w) => sum + w, 0) || 1;

  const consensusScore = clamp(
    perspectives.reduce((sum, p, i) => sum + p.support_score * weights[i], 0) / weightedDenominator,
    0,
    1,
  );

  const supportScores = perspectives.map((p) => p.support_score);
  const disagreement = stdDev(supportScores);
  const agreementLevel = clamp(1 - disagreement * 1.8, 0, 1);
  const confidence = clamp(
    (perspectives.reduce((sum, p) => sum + p.confidence, 0) / perspectives.length) * (0.6 + agreementLevel * 0.4),
    0.05,
    0.99,
  );

  const recommendation =
    consensusScore >= 0.7 ? 'strong_approve' :
    consensusScore >= 0.55 ? 'approve_with_guardrails' :
    consensusScore >= 0.45 ? 'needs_revision' :
    'decline';

  return {
    recommendation,
    consensus_score: consensusScore,
    confidence,
    agreement_level: agreementLevel,
    confidence_bounds: {
      lower: clamp(consensusScore - disagreement, 0, 1),
      upper: clamp(consensusScore + disagreement, 0, 1),
      disagreement,
    },
  };
}

function optimizeExecutiveWeights(
  historical: HistoricalDecision[],
  decisionType: ExecutiveDomain | undefined,
) {
  const optimized = EXECUTIVE_SWARM.map((executive) => {
    const accuracyBoost = computeAccuracyBoost(executive.id, historical);
    const typeWeight = decisionType ? executive.domainWeights[decisionType] : 0.5;

    return {
      executive_id: executive.id,
      executive_name: executive.name,
      role: executive.role,
      suggested_weight: clamp(typeWeight * accuracyBoost, 0.1, 1.6),
      accuracy_boost: accuracyBoost,
      domain_strength: typeWeight,
    };
  });

  const convergenceIndex = clamp(
    1 - stdDev(optimized.map((entry) => entry.suggested_weight)) / 0.8,
    0,
    1,
  );

  return {
    optimized_weights: optimized,
    convergence_index: convergenceIndex,
    iterations: Math.min(20, Math.max(3, historical.length || 3)),
  };
}

function trackOutcomes(historical: HistoricalDecision[]) {
  const evaluated = historical
    .map((entry) => {
      const predicted = Number(entry.predicted_score);
      const actual = Number(entry.actual_score);
      const confidence = Number(entry.confidence);
      if (!Number.isFinite(predicted) || !Number.isFinite(actual)) return null;

      const absoluteError = Math.abs(actual - predicted);
      return {
        decision_id: entry.decision_id ?? 'unknown',
        predicted_score: clamp(predicted, 0, 1),
        actual_score: clamp(actual, 0, 1),
        absolute_error: absoluteError,
        confidence: Number.isFinite(confidence) ? clamp(confidence, 0, 1) : null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const mae = evaluated.length
    ? evaluated.reduce((sum, row) => sum + row.absolute_error, 0) / evaluated.length
    : null;

  return {
    samples: evaluated.length,
    mean_absolute_error: mae,
    calibration_score: mae === null ? null : clamp(1 - mae, 0, 1),
    outcomes: evaluated,
  };
}

function simulateScenarios(
  scenarios: ScenarioInput[],
  decisionScore: number,
  historical: HistoricalDecision[],
) {
  return scenarios.map((scenario) => {
    const vector = defaultDecisionVector(undefined, scenario.impacts);
    const perspectives = buildExecutivePerspectives(vector, decisionScore, historical);
    const consensus = consensusFromPerspectives(perspectives);

    return {
      scenario: scenario.name,
      consensus,
      top_supporter: [...perspectives].sort((a, b) => b.support_score - a.support_score)[0]?.executive_id ?? null,
      risk_flag: consensus.confidence_bounds.disagreement > 0.16,
    };
  });
}

function parseBody(raw: unknown): ExecutiveSwarmRequest {
  if (!raw || typeof raw !== 'object') return {};
  return raw as ExecutiveSwarmRequest;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const usageTracker = startUsageTracking(FUNCTION_NAME, undefined, { method: req.method });

  try {
    let rawBody: unknown = {};
    if (req.method !== 'GET') {
      const text = await req.text();
      rawBody = text ? JSON.parse(text) : {};
    }

    const body = parseBody(rawBody);
    const action = body.action ?? 'analyze_decision';
    const decisionScore = clamp(Number.isFinite(Number(body.decision_score)) ? Number(body.decision_score) : 0.6, 0, 1);
    const historical = Array.isArray(body.historical_decisions) ? body.historical_decisions : [];
    const decisionVector = defaultDecisionVector(body.decision_type, body.decision_vector);

    const perspectives = buildExecutivePerspectives(decisionVector, decisionScore, historical);
    const consensus = consensusFromPerspectives(perspectives);

    const normalizedParticipation = Object.fromEntries(
      Object.entries(body.participation ?? {}).map(([executiveId, userId]) => [executiveId, normalizeUserId(userId)]),
    );

    if (action === 'health') {
      await usageTracker.success({ action, executives: EXECUTIVE_SWARM.length });
      return new Response(
        JSON.stringify({
          success: true,
          function: FUNCTION_NAME,
          action,
          status: 'healthy',
          executive_count: EXECUTIVE_SWARM.length,
          supported_actions: [
            'analyze_decision',
            'generate_consensus',
            'weight_executives',
            'track_decision_outcomes',
            'optimize_weights',
            'simulate_scenarios',
            'health',
          ],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let result: Record<string, unknown>;

    switch (action) {
      case 'analyze_decision':
        result = {
          decision_id: body.decision_id ?? crypto.randomUUID(),
          title: body.title ?? 'Untitled Executive Decision',
          summary: body.summary ?? null,
          decision_type: body.decision_type ?? 'business',
          perspectives,
          consensus,
        };
        break;
      case 'generate_consensus':
        result = { consensus, perspectives };
        break;
      case 'weight_executives':
      case 'optimize_weights':
        result = optimizeExecutiveWeights(historical, body.decision_type);
        break;
      case 'track_decision_outcomes':
        result = trackOutcomes(historical);
        break;
      case 'simulate_scenarios':
        result = {
          scenarios: simulateScenarios(Array.isArray(body.scenarios) ? body.scenarios : [], decisionScore, historical),
        };
        break;
      default:
        await usageTracker.failure('unsupported_action', 400);
        return new Response(
          JSON.stringify({
            error: `Unsupported action: ${action}`,
            supported_actions: [
              'analyze_decision',
              'generate_consensus',
              'weight_executives',
              'track_decision_outcomes',
              'optimize_weights',
              'simulate_scenarios',
              'health',
            ],
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }

    await usageTracker.success({
      action,
      decision_type: body.decision_type ?? 'business',
      historical_samples: historical.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        function: FUNCTION_NAME,
        action,
        generated_at: new Date().toISOString(),
        executive_swarm: EXECUTIVE_SWARM.map((executive) => ({
          executive_id: executive.id,
          name: executive.name,
          role: executive.role,
        })),
        participation: normalizedParticipation,
        metadata: body.metadata ?? {},
        result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('executive-swarm error', message);
    await usageTracker.failure(message, 500);

    return new Response(
      JSON.stringify({ error: message, function: FUNCTION_NAME }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
