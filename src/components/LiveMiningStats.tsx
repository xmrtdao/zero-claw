import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Activity, Hash, Coins, Clock, Zap, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface MiningStats {
  hash: number;
  validShares: number;
  invalidShares: number;
  lastHash: number;
  totalHashes: number;
  amtDue: number;
  amtPaid: number;
  txnCount: number;
  isOnline: boolean;
}

const LiveMiningStats = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<MiningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMiningStats = async () => {
    try {
      // Use Supabase edge function proxy for better browser compatibility (works on Brave, Chrome, etc.)
      const { data, error } = await supabase.functions.invoke('mining-proxy');
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch mining stats');
      }
      
      if (!data) {
        throw new Error('No data returned from mining proxy');
      }
      
      // Log the raw API response for debugging
      console.log('📊 Raw mining data from SupportXMR API:', data);
      
      setStats({
        hash: data.hash || 0,
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        lastHash: data.lastHash || 0,
        totalHashes: data.totalHashes || 0,
        amtDue: data.amtDue || 0,
        amtPaid: data.amtPaid || 0,
        txnCount: data.txnCount || 0,
        isOnline: data.lastHash > (Date.now() / 1000) - 300 // 5 minutes
      });
      
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch mining stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMiningStats();
    const interval = setInterval(fetchMiningStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatHashrate = (hashrate: number): string => {
    if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(2)} KH/s`;
    }
    return `${hashrate.toFixed(2)} H/s`;
  };

  const formatTimeAgo = (timestamp: number): string => {
    if (!timestamp) return "Never";
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    if (seconds < 60) return `${seconds}s ${t('stats.ago')}`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${t('stats.ago')}`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${t('stats.ago')}`;
    return `${Math.floor(seconds / 86400)}d ${t('stats.ago')}`;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card to-secondary border-border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 animate-pulse text-primary" />
            Connecting to Mining Network...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-muted/50 rounded animate-pulse" />
                <div className="h-5 bg-muted/30 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // Show demo data when offline instead of error
    const demoStats = {
      hash: 0,
      validShares: 0,
      invalidShares: 0,
      lastHash: 0,
      totalHashes: 0,
      amtDue: 0,
      amtPaid: 0,
      txnCount: 0,
      isOnline: false
    };

    return (
      <Card className="bg-gradient-to-br from-card to-secondary border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-mining-info/5 opacity-50" />
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('stats.title')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {t('stats.status.offline')}
              </Badge>
              <button 
                onClick={fetchMiningStats}
                className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
              >
                {t('stats.retry')}
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Hash className="h-3 w-3" />
                {t('stats.hashrate')}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                0 H/s
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <TrendingUp className="h-3 w-3" />
                {t('stats.shares')}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                0
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Coins className="h-3 w-3" />
                Amount Due
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                0 XMR
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock className="h-3 w-3" />
                Status
              </div>
              <div className="text-sm font-medium text-mining-inactive">
                Connecting...
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Zap className="h-3 w-3" />
                Network
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Offline
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Activity className="h-3 w-3" />
                Connection
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Retry Available
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-secondary border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-mining-info/5" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('stats.title')}
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={stats?.isOnline ? "default" : "destructive"}
              className={stats?.isOnline ? "bg-mining-active animate-pulse-glow" : ""}
            >
              {stats?.isOnline ? t('stats.status.online') : t('stats.status.offline')}
            </Badge>
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('stats.last.update')}: {lastUpdate.toLocaleTimeString()}
        </p>
      </CardHeader>
      <CardContent className="relative">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Hash className="h-4 w-4" />
              {t('stats.hashrate')}
            </div>
            <div className="text-lg font-bold text-foreground">
              {stats ? formatHashrate(stats.hash) : "0 H/s"}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              {t('stats.shares')}
            </div>
            <div className="text-lg font-bold text-foreground">
              {stats?.validShares.toLocaleString() || "0"}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              {t('stats.last.hash')}
            </div>
            <div className="text-lg font-bold text-foreground">
              {stats ? formatTimeAgo(stats.lastHash) : "Never"}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Coins className="h-4 w-4" />
              {t('stats.amount.due')}
            </div>
            <div className="text-lg font-bold text-foreground">
              {stats ? `${stats.amtDue.toFixed(6)} XMR` : "0 XMR"}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Zap className="h-4 w-4" />
              {t('stats.total.hashes')}
            </div>
            <div className="text-lg font-bold text-foreground">
              {stats?.totalHashes.toLocaleString() || "0"}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="h-4 w-4" />
              {t('stats.status.online')}
            </div>
            <div className={`text-lg font-bold ${stats?.isOnline ? 'text-mining-active' : 'text-mining-inactive'}`}>
              {stats?.isOnline ? t('stats.status.online') : t('stats.status.offline')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveMiningStats;