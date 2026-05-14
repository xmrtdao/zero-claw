import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatTime } from '@/utils/dateFormatter';
import { realtimeManager } from '@/services/realtimeSubscriptionManager';

interface ActivityLog {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  metadata: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

const NOTE_POSITIONS = [
  { top: '2%', left: '2%', rotate: '-6deg' },
  { top: '10%', left: '31%', rotate: '5deg' },
  { top: '4%', left: '60%', rotate: '-4deg' },
  { top: '31%', left: '8%', rotate: '6deg' },
  { top: '34%', left: '37%', rotate: '-5deg' },
  { top: '30%', left: '66%', rotate: '4deg' },
  { top: '61%', left: '3%', rotate: '-3deg' },
  { top: '60%', left: '31%', rotate: '5deg' },
  { top: '56%', left: '60%', rotate: '-4deg' },
] as const;

const PythonShell = () => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('eliza_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setActivityLogs(data);
      }
      setIsLoading(false);
    };

    fetchActivity();

    const unsubscribe = realtimeManager.subscribe(
      'eliza_activity_log',
      (payload) => {
        console.log('Activity update:', payload);
        setActivityLogs(prev => [payload.new as ActivityLog, ...prev].slice(0, 50));
      },
      {
        event: 'INSERT',
        schema: 'public'
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'python_execution':
        return '⚡';
      case 'python_fix_execution':
        return '🔧';
      case 'agent_management':
        return '🤖';
      case 'github_integration':
        return '📦';
      case 'task_assignment':
        return '📋';
      case 'batch_vectorization':
        return '🧠';
      default:
        return '○';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-suite-success/10 text-suite-success border-suite-success/30';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'in_progress':
        return 'bg-suite-info/10 text-suite-info border-suite-info/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getExecutionBadge = (activity: ActivityLog) => {
    if (activity.activity_type === 'python_fix_execution' || activity.metadata?.was_auto_fixed) {
      return (
        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
          Auto-fixed
        </Badge>
      );
    }
    if (activity.metadata?.source === 'autonomous_agent') {
      return (
        <Badge variant="outline" className="text-[10px] bg-suite-warning/10 text-suite-warning border-suite-warning/30">
          Autonomous
        </Badge>
      );
    }
    return null;
  };

  const visibleNotes = activityLogs.slice(0, NOTE_POSITIONS.length);

  return (
    <ScrollArea className="h-[440px]">
      <div className="relative min-h-[440px] p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">
              Waiting for system activity...
            </p>
          </div>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 rounded-b-xl bg-gradient-to-br from-amber-100/15 via-transparent to-yellow-100/20" />
            <div className="absolute -top-4 right-6 hidden md:block rounded-sm border border-amber-300/50 bg-amber-100/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-900 shadow-[0_8px_18px_rgba(120,93,10,0.18)]">
              Live system notes
            </div>
            {visibleNotes.map((activity, index) => (
              <article
                key={activity.id}
                className="sticky-note-hero absolute w-[31%] min-w-[200px] max-w-[290px]"
                style={{
                  top: NOTE_POSITIONS[index].top,
                  left: NOTE_POSITIONS[index].left,
                  ['--sticky-rotate' as string]: NOTE_POSITIONS[index].rotate,
                  ['--sticky-duration' as string]: `${3.2 + (index % 3) * 0.35}s`,
                  ['--sticky-delay' as string]: `${index * 120}ms`,
                }}
              >
                <div className="sticky-note-hero__shadow" />
                <div className="sticky-note-hero__paper bg-gradient-to-br from-yellow-200 via-amber-100 to-yellow-50 !min-h-[170px]">
                  <div className="sticky-note-hero__tape" />
                  <div className="sticky-note-hero__pin" />
                  <div className="sticky-note-hero__fold" />
                  <div className="mt-8 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{getActivityIcon(activity.activity_type)}</span>
                        <Badge variant="outline" className={`text-[10px] ${getStatusStyles(activity.status)}`}>
                          {activity.status}
                        </Badge>
                        {getExecutionBadge(activity)}
                      </div>
                      <span className="text-[10px] text-amber-900/70 whitespace-nowrap">
                        {formatTime(activity.created_at)}
                      </span>
                    </div>
                    <p className="sticky-note-handwriting text-[22px] leading-[1.06] text-amber-950/90 line-clamp-2">
                      {activity.title}
                    </p>
                    <p className="text-xs text-amber-950/80 line-clamp-3">{activity.description}</p>
                  </div>
                </div>
              </article>
            ))}

            <div className="mt-[360px] space-y-2 rounded-lg border border-border/50 bg-background/75 p-3 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground">Recent activity stream</p>
              {activityLogs.slice(0, 4).map((activity) => (
                <div
                  key={`stream-${activity.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-card/60 px-2.5 py-1.5 text-xs"
                >
                  <span className="truncate">
                    {getActivityIcon(activity.activity_type)} {activity.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(activity.created_at)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

export default PythonShell;
