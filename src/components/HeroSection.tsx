import { useState, useEffect } from 'react';
import { AnimatedCounter } from './AnimatedCounter';
import { supabase } from '@/integrations/supabase/client';
import {
  Zap,
  Bot,
  Activity,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Workflow,
  BrainCircuit,
  Network,
  Database,
  Cpu,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface Stats {
  totalExecutions: number;
  activeAgents: number;
  activeTasks: number;
  healthScore: number;
  healthStatus: 'healthy' | 'degraded' | 'critical';
  healthIssues: string[];
  knowledgeEntitiesTotal: number;
  userContextKnowledge: number;
  userWorkflows: number;
  registeredEdgeFunctions: number;
}

interface HeroSectionProps {
  stats: Stats;
}

interface EcosystemEndpoint {
  id: string;
  name: string;
  path: string;
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  metric: string;
}

interface HeroDataPoint {
  id: string;
  label: string;
  detail?: string;
  kind: 'stat' | 'health' | 'endpoint';
  status?: 'healthy' | 'degraded' | 'error' | 'unknown';
  icon: React.ReactNode;
  value?: number;
  suffix?: string;
  path?: string;
}

export const HeroSection = ({ stats }: HeroSectionProps) => {
  const { t } = useLanguage();
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isUnifiedDataMinimized, setIsUnifiedDataMinimized] = useState(true);
  const [ecosystemEndpoints, setEcosystemEndpoints] = useState<EcosystemEndpoint[]>([
    {
      id: 'system-status',
      name: 'System status',
      path: 'system-status',
      status: 'unknown',
      metric: 'Syncing...',
    },
    {
      id: 'edge-functions',
      name: 'Edge functions',
      path: 'edge_functions',
      status: 'unknown',
      metric: `${stats.registeredEdgeFunctions} registered`,
    },
    {
      id: 'activity-log',
      name: 'Activity stream',
      path: 'activity_log',
      status: 'unknown',
      metric: 'Awaiting telemetry',
    },
    {
      id: 'database',
      name: 'Database',
      path: 'database',
      status: 'unknown',
      metric: 'Awaiting response',
    },
  ]);

  const marketingBanners = [
    {
      title: t('hero.banner.enterprise.title'),
      subtitle: t('hero.banner.enterprise.subtitle'),
      gradient: 'from-primary/20 to-primary/5',
    },
    {
      title: t('hero.banner.functions.title'),
      subtitle: t('hero.banner.functions.subtitle'),
      gradient: 'from-emerald-500/20 to-emerald-500/5',
    },
    {
      title: t('hero.banner.monitoring.title'),
      subtitle: t('hero.banner.monitoring.subtitle'),
      gradient: 'from-violet-500/20 to-violet-500/5',
    },
    {
      title: t('hero.banner.council.title'),
      subtitle: t('hero.banner.council.subtitle'),
      gradient: 'from-amber-500/20 to-amber-500/5',
    },
  ];

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % marketingBanners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, marketingBanners.length]);

  useEffect(() => {
    const fetchEcosystemSnapshot = async () => {
      const { data, error } = await supabase.functions.invoke('system-status', {
        body: {},
      });

      if (error || !data?.success || !data.status) {
        setEcosystemEndpoints((prev) =>
          prev.map((endpoint) => ({
            ...endpoint,
            status: endpoint.status === 'healthy' ? endpoint.status : 'degraded',
          }))
        );
        return;
      }

      const status = data.status;
      const edgeFunctions = status.components?.edge_functions;
      const activityLog = status.components?.activity_log;
      const database = status.components?.database;
      const agents = status.components?.agents;
      const mining = status.components?.mining;

      const nextEndpoints: EcosystemEndpoint[] = [
        {
          id: 'system-status',
          name: 'System status',
          path: 'system-status',
          status: status.overall_status === 'unhealthy' ? 'error' : status.overall_status,
          metric: `${status.health_score}% health`,
        },
        {
          id: 'edge-functions',
          name: 'Edge functions',
          path: 'edge_functions',
          status: edgeFunctions?.status || 'unknown',
          metric: `${edgeFunctions?.total_active_24h ?? 0} active / 24h`,
        },
        {
          id: 'activity-log',
          name: 'Activity stream',
          path: 'activity_log',
          status: activityLog?.status || 'unknown',
          metric: `${activityLog?.stats?.total_24h ?? 0} events / 24h`,
        },
        {
          id: 'database',
          name: 'Database',
          path: 'database',
          status: database?.status || 'unknown',
          metric: `${database?.response_time_ms ?? 0}ms latency`,
        },
        {
          id: 'agent-runtime',
          name: 'Agent runtime',
          path: 'agents',
          status: agents?.status || 'unknown',
          metric: `${agents?.stats?.working ?? 0} agents working`,
        },
        {
          id: 'mining-telemetry',
          name: 'Mining telemetry',
          path: 'mining',
          status: mining?.status || 'unknown',
          metric: `${mining?.active_workers ?? 0} active workers`,
        },
      ];

      setEcosystemEndpoints(nextEndpoints);
    };

    fetchEcosystemSnapshot();
    const interval = setInterval(fetchEcosystemSnapshot, 60000);

    return () => clearInterval(interval);
  }, []);

  const banner = marketingBanners[currentBanner];
  const registeredEdgeFunctions = stats.registeredEdgeFunctions;
  const pipelineStages = [
    { id: 'capture', label: 'Capture', value: stats.activeTasks },
    {
      id: 'context',
      label: 'Context',
      value: stats.userContextKnowledge,
    },
    {
      id: 'orchestrate',
      label: 'Orchestrate',
      value: stats.userWorkflows,
    },
    {
      id: 'execute',
      label: 'Execute',
      value: stats.totalExecutions,
    },
  ];

  const heroDataPoints: HeroDataPoint[] = [
    {
      id: 'executions',
      label: t('hero.stats.executions'),
      kind: 'stat',
      icon: <Zap className="h-3 w-3 text-primary" />,
      value: stats.totalExecutions,
      suffix: '+',
    },
    {
      id: 'agents',
      label: t('hero.stats.agents'),
      kind: 'stat',
      icon: <Bot className="h-3 w-3 text-emerald-500" />,
      value: stats.activeAgents,
    },
    {
      id: 'health',
      label: t('hero.stats.health'),
      kind: 'health',
      icon: <Gauge className="h-3 w-3 text-amber-500" />,
      value: stats.healthScore,
      suffix: '%',
      detail: stats.healthIssues[0],
      status:
        stats.healthScore >= 95
          ? 'healthy'
          : stats.healthScore >= 80
            ? 'degraded'
            : 'error',
    },
    {
      id: 'tasks',
      label: t('hero.stats.tasks'),
      kind: 'stat',
      icon: <Activity className="h-3 w-3 text-amber-500" />,
      value: stats.activeTasks,
    },
    {
      id: 'registered-edge-functions',
      label: 'Edge functions (system)',
      kind: 'stat',
      icon: <Workflow className="h-3 w-3 text-sky-500" />,
      value: registeredEdgeFunctions,
    },
    {
      id: 'knowledge-entities-total',
      label: 'Total knowledge entities',
      kind: 'stat',
      icon: <BrainCircuit className="h-3 w-3 text-violet-500" />,
      value: stats.knowledgeEntitiesTotal,
    },
    {
      id: 'knowledge-entities-user-context',
      label: 'User context knowledge',
      kind: 'stat',
      icon: <BrainCircuit className="h-3 w-3 text-violet-500" />,
      value: stats.userContextKnowledge,
    },
    {
      id: 'user-workflows',
      label: 'User workflows',
      kind: 'stat',
      icon: <Workflow className="h-3 w-3 text-sky-500" />,
      value: stats.userWorkflows,
    },
    ...ecosystemEndpoints.map((endpoint) => ({
      id: endpoint.id,
      label: endpoint.name,
      kind: 'endpoint' as const,
      icon:
        endpoint.id === 'database' ? (
          <Database className="h-2.5 w-2.5 text-primary" />
        ) : endpoint.id === 'agent-runtime' ? (
          <Cpu className="h-2.5 w-2.5 text-primary" />
        ) : (
          <Workflow className="h-2.5 w-2.5 text-primary" />
        ),
      detail: endpoint.metric,
      status: endpoint.status,
      path: endpoint.path,
    })),
  ];

  return (
    <section className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm">
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br transition-all duration-1000',
          banner.gradient
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_35%),linear-gradient(hsl(var(--background)/0.45),hsl(var(--background)/0.7))]" />

      <div className="relative space-y-2 p-2 md:p-2.5">
        <div
          className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/55 px-2 py-1.5 backdrop-blur"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <button
            onClick={() =>
              setCurrentBanner(
                (prev) =>
                  (prev - 1 + marketingBanners.length) % marketingBanners.length
              )
            }
            className="rounded-full bg-background/70 p-1 transition-colors hover:bg-background"
            aria-label="Previous banner"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p
              className="truncate text-xs font-medium text-foreground md:text-sm"
              key={currentBanner}
            >
              <span className="font-semibold">{banner.title}</span>
              <span className="mx-2 text-muted-foreground">—</span>
              <span className="text-muted-foreground">{banner.subtitle}</span>
            </p>
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            {marketingBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentBanner(i)}
                className={cn(
                  'h-1 w-1 rounded-full transition-all duration-300',
                  i === currentBanner
                    ? 'w-3 bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() =>
              setCurrentBanner((prev) => (prev + 1) % marketingBanners.length)
            }
            className="rounded-full bg-background/70 p-1 transition-colors hover:bg-background"
            aria-label="Next banner"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="glass-card rounded-xl border border-primary/15 bg-background/65 p-1.5 shadow-lg shadow-primary/5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Network className="h-3 w-3 text-primary" />
                Unified data module
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Core hero metrics and ecosystem endpoint telemetry.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsUnifiedDataMinimized((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/70 px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-background"
              aria-expanded={!isUnifiedDataMinimized}
              aria-label={isUnifiedDataMinimized ? 'Expand unified data module' : 'Minimize unified data module'}
            >
              {isUnifiedDataMinimized ? (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Expand
                </>
              ) : (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Minimize
                </>
              )}
            </button>
          </div>

          {isUnifiedDataMinimized ? (
            <div className="rounded-md border border-dashed border-border/60 bg-background/40 px-2 py-1.5 text-[10px] text-muted-foreground">
              Module minimized to preserve dashboard space. Expand to view live telemetry and pipeline metrics.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {heroDataPoints.map((point) => (
                  <DataPointCard key={point.id} point={point} />
                ))}
              </div>

              <div className="mt-1 rounded-md border border-border/50 bg-background/45 px-1.5 py-1">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[9px] font-medium text-foreground">Task pipeline</p>
                  <p className="text-[8px] text-muted-foreground">Live miniature view</p>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {pipelineStages.map((stage, index) => (
                    <div key={stage.id} className="relative rounded-sm border border-border/50 bg-background/70 px-1 py-0.5">
                      <div className="truncate text-[8px] text-muted-foreground">{stage.label}</div>
                      <div className="text-[10px] font-semibold text-foreground">
                        <AnimatedCounter end={stage.value} />
                      </div>
                      {index < pipelineStages.length - 1 && (
                        <div className="pointer-events-none absolute -right-1.5 top-1/2 h-px w-2 -translate-y-1/2 bg-primary/50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

const DataPointCard = ({ point }: { point: HeroDataPoint }) => {
  const statusClass =
    point.status === 'healthy'
      ? 'bg-emerald-500'
      : point.status === 'degraded'
        ? 'bg-amber-500'
        : point.status === 'error'
          ? 'bg-destructive'
          : 'bg-muted-foreground';
  const isEndpoint = point.kind === 'endpoint';
  const isHealth = point.kind === 'health';
  const valueClass =
    isHealth && point.value !== undefined
      ? point.value >= 95
        ? 'text-emerald-500'
        : point.value >= 80
          ? 'text-amber-500'
          : 'text-destructive'
      : 'text-foreground';

  return (
    <div className="rounded-md border border-border/50 bg-background/50 px-1.5 py-1 text-[9px]">
      <div className="flex items-center justify-between gap-1">
        <div className="inline-flex items-center gap-1 truncate font-medium text-foreground">
          {point.icon}
          <span className="truncate">{point.label}</span>
        </div>
        {(isEndpoint || isHealth) && (
          <span className={cn('h-1.5 w-1.5 rounded-full', statusClass)} />
        )}
      </div>
      {isEndpoint ? (
        <>
          <p className="truncate text-[8px] text-muted-foreground">/{point.path}</p>
          <p className="truncate text-[9px] text-foreground">{point.detail}</p>
        </>
      ) : (
        <>
          <div className={cn('truncate text-sm font-bold md:text-base', valueClass)}>
            <AnimatedCounter end={point.value ?? 0} suffix={point.suffix} />
          </div>
          <p className="truncate text-[8px] text-muted-foreground">
            {point.detail || 'Live dashboard metric'}
          </p>
        </>
      )}
    </div>
  );
};
