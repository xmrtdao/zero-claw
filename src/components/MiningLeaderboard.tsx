import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Zap, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WorkerStats {
  identifier: string;
  hash: number;
  validShares: number;
  invalidShares: number;
  lastHash: number;
}

const MiningLeaderboard = () => {
  const [workers, setWorkers] = useState<WorkerStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('mining-proxy');
      
      if (error) {
        console.error('Failed to fetch mining stats:', error);
        return;
      }

      if (data?.workers && Array.isArray(data.workers)) {
        // Display individual workers from the pool
        setWorkers(data.workers.sort((a, b) => b.hash - a.hash)); // Sort by hashrate
      } else if (data) {
        // Fallback to global stats if no workers array
        const workerData: WorkerStats = {
          identifier: data.identifier || 'global',
          hash: data.hash || 0,
          validShares: data.validShares || 0,
          invalidShares: data.invalidShares || 0,
          lastHash: data.lastHash || 0,
        };
        setWorkers([workerData]);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatHashRate = (hash: number) => {
    if (hash >= 1000) return `${(hash / 1000).toFixed(1)} KH/s`;
    return `${hash} H/s`;
  };

  const formatTime = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Card className="bg-card/50 border-border shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-mining-warning" />
              Mining Leaderboard
            </CardTitle>
            <CardDescription>
              Top performing workers in the XMRT mining pool
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{workers.length} Active</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active workers found
          </div>
        ) : (
          <div className="space-y-3">
            {workers.map((worker, index) => (
              <div
                key={worker.identifier}
                className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-background to-secondary/30 border border-border hover:border-primary/50 transition-all duration-300"
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
                  {index === 0 ? (
                    <Trophy className="h-6 w-6 text-mining-warning" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Worker Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold text-foreground truncate">
                      {worker.identifier}
                    </span>
                    {worker.lastHash && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(worker.lastHash)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-mining-active" />
                      <span className="text-muted-foreground">
                        {formatHashRate(worker.hash)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-mining-info">✓</span>
                      <span className="text-muted-foreground">
                        {worker.validShares.toLocaleString()} shares
                      </span>
                    </div>
                    {worker.invalidShares > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-mining-error">✗</span>
                        <span className="text-muted-foreground">
                          {worker.invalidShares.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Badge */}
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <div className="px-3 py-1 rounded-full bg-mining-active/10 text-mining-active text-xs font-semibold">
                    Active
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {((worker.validShares / (worker.validShares + worker.invalidShares)) * 100 || 100).toFixed(1)}% valid
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground text-center">
          Updates every 30 seconds • Live data from SupportXMR pool
        </div>
      </CardContent>
    </Card>
  );
};

export default MiningLeaderboard;