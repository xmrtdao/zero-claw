import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, TrendingUp, Users, Shield, Cpu, Heart, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  financial_sovereignty_score: number | null;
  democracy_score: number | null;
  privacy_score: number | null;
  technical_feasibility_score: number | null;
  community_benefit_score: number | null;
  cso_perspective: string | null;
  cto_perspective: string | null;
  council_recommendation: string | null;
  estimated_complexity: string | null;
  estimated_timeline: string | null;
  created_at: string;
}

const categoryIcons: Record<string, any> = {
  financial_sovereignty: TrendingUp,
  democracy: Users,
  privacy: Shield,
  technical: Cpu,
  community: Heart
};

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-500',
  under_review: 'bg-yellow-500',
  council_deliberation: 'bg-purple-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  implemented: 'bg-emerald-500'
};

const statusIcons: Record<string, any> = {
  submitted: Clock,
  under_review: AlertCircle,
  council_deliberation: Users,
  approved: CheckCircle2,
  rejected: XCircle,
  implemented: CheckCircle2
};

export const IdeaDashboard = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIdeas();
    
    // Subscribe to changes
    const channel = supabase
      .channel('community_ideas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_ideas' }, () => {
        fetchIdeas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('community_ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (error) {
      console.error('Error fetching ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAvgScore = (idea: Idea) => {
    const scores = [
      idea.financial_sovereignty_score,
      idea.democracy_score,
      idea.privacy_score,
      idea.technical_feasibility_score,
      idea.community_benefit_score
    ].filter(s => s !== null) as number[];

    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const IdeaCard = ({ idea }: { idea: Idea }) => {
    const CategoryIcon = categoryIcons[idea.category] || Lightbulb;
    const StatusIcon = statusIcons[idea.status] || Clock;
    const avgScore = calculateAvgScore(idea);

    return (
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <CategoryIcon className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1">
                <CardTitle className="text-lg">{idea.title}</CardTitle>
                <CardDescription className="mt-1">{idea.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              <Badge className={statusColors[idea.status]}>
                {idea.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {avgScore !== null && (
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <span className="text-2xl font-bold">{avgScore}/100</span>
              </div>
              <Progress value={avgScore} className="h-2" />
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                {idea.financial_sovereignty_score && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Financial</div>
                    <div className="text-sm font-semibold">{idea.financial_sovereignty_score}</div>
                  </div>
                )}
                {idea.democracy_score && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Democracy</div>
                    <div className="text-sm font-semibold">{idea.democracy_score}</div>
                  </div>
                )}
                {idea.privacy_score && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Privacy</div>
                    <div className="text-sm font-semibold">{idea.privacy_score}</div>
                  </div>
                )}
                {idea.technical_feasibility_score && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Technical</div>
                    <div className="text-sm font-semibold">{idea.technical_feasibility_score}</div>
                  </div>
                )}
                {idea.community_benefit_score && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Community</div>
                    <div className="text-sm font-semibold">{idea.community_benefit_score}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {idea.council_recommendation && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-semibold mb-1">Council Recommendation:</p>
              <p className="text-muted-foreground">{idea.council_recommendation}</p>
            </div>
          )}

          {idea.estimated_complexity && (
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span>Complexity: <span className="font-medium">{idea.estimated_complexity}</span></span>
              {idea.estimated_timeline && (
                <span>Timeline: <span className="font-medium">{idea.estimated_timeline}</span></span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading ideas...</div>;
  }

  const filteredIdeas = {
    all: ideas,
    submitted: ideas.filter(i => i.status === 'submitted' || i.status === 'under_review'),
    approved: ideas.filter(i => i.status === 'approved' || i.status === 'implemented'),
    rejected: ideas.filter(i => i.status === 'rejected')
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({filteredIdeas.all.length})</TabsTrigger>
          <TabsTrigger value="submitted">Pending ({filteredIdeas.submitted.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({filteredIdeas.approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({filteredIdeas.rejected.length})</TabsTrigger>
        </TabsList>

        {Object.entries(filteredIdeas).map(([key, list]) => (
          <TabsContent key={key} value={key}>
            <ScrollArea className="h-[600px] pr-4">
              {list.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No ideas in this category yet
                </div>
              ) : (
                list.map(idea => <IdeaCard key={idea.id} idea={idea} />)
              )}
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
