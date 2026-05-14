import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  Share2, Users, Copy, CheckCircle,
  TrendingUp, BarChart3, Gift, Percent, ChevronRight,
  Loader2, Link as LinkIcon, MousePointerClick, Coins
} from "lucide-react";
import { toast } from "sonner";

interface ReferralCode {
  referral_code: string;
  custom_slug: string | null;
  created_at: string;
  total_referred: number;
  total_commission_earned: number;
  pending_commission: number;
}

interface ReferralLink {
  id: string;
  referral_code: string;
  referred_wallet: string | null;
  referred_worker_id: string | null;
  commission_rate: number;
  status: string;
  created_at: string;
  estimated_hashrate: number;
  estimated_commission: number;
}

interface Dashboard {
  referral_code: string | null;
  referral_code_id: string;
  custom_slug: string | null;
  code_created_at: string;
  total_referred: number;
  total_commission_earned: number;
  pending_commission: number;
  active_referrals: number;
  recent_links: ReferralLink[];
}

interface Props {
  walletAddress: string;
}

const ReferralDashboard = ({ walletAddress }: Props) => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    try {
      const { data: codeData, error: codeError } = await supabase
        .rpc('api_get_referral_code', { p_wallet: walletAddress });

      if (codeError) {
        console.error('Referral code fetch error:', codeError);
      } else if (codeData) {
        setReferralCode(codeData);
      }

      const { data: dashData, error: dashError } = await supabase
        .rpc('api_get_referral_dashboard', { p_wallet: walletAddress });

      if (dashError) {
        console.error('Referral dashboard fetch error:', dashError);
      } else if (dashData) {
        setDashboard(dashData);
      }
    } catch (err) {
      console.error('Referral fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyReferralLink = () => {
    const baseUrl = window.location.origin;
    const link = referralCode
      ? `${baseUrl}/register?ref=${referralCode}`
      : `${baseUrl}/register`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading referral data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card - Referral Code & Share */}
      <Card className="border-border bg-gradient-to-br from-card to-secondary/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Your Referral Code</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-muted-foreground"
            >
              <Loader2 className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>
            Share your code — earn 20% commission on referred miners' hashrate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralCode ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted/50 rounded-lg px-4 py-3 border border-border">
                  <code className="text-lg font-mono font-bold text-primary">
                    {referralCode}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  className="shrink-0"
                  title="Copy code"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleCopyReferralLink}
                  className="shrink-0"
                  title="Copy referral link"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {dashboard?.total_referred ?? 0} referred
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Percent className="h-3 w-3" />
                  20% commission
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {dashboard?.active_referrals ?? 0} active
                </Badge>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                No referral code yet. Start mining to generate one automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{dashboard?.total_referred ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Referred</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{dashboard?.active_referrals ?? 0}</p>
            <p className="text-xs text-muted-foreground">Active Miners</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">
              {dashboard?.total_commission_earned
                ? `${dashboard.total_commission_earned.toFixed(4)}`
                : '—'}
            </p>
            <p className="text-xs text-muted-foreground">XMR Earned</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Gift className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">
              {dashboard?.pending_commission
                ? `${dashboard.pending_commission.toFixed(4)}`
                : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Pending XMR</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Referrals Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Recent Referrals</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {dashboard?.recent_links?.length ?? 0} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {dashboard?.recent_links && dashboard.recent_links.length > 0 ? (
            <div className="space-y-2">
              {dashboard.recent_links.slice(0, 10).map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {link.referred_worker_id || link.referred_wallet || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(link.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={link.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {link.status}
                    </Badge>
                    <span className="text-sm font-mono text-muted-foreground">
                      {link.estimated_hashrate
                        ? `${(link.estimated_hashrate / 1000).toFixed(1)} KH/s`
                        : '—'}
                    </span>
                    <span className="text-sm font-mono text-primary">
                      +{link.estimated_commission?.toFixed(6) || '0'} XMR
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No referrals yet</p>
              <p className="text-xs">
                Share your referral code to start earning 20% commission
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            How Referral Commissions Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="font-medium flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                Share Your Code
              </p>
              <p className="text-muted-foreground text-xs">
                Send your unique referral code to other miners
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="font-medium flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                They Register
              </p>
              <p className="text-muted-foreground text-xs">
                New miners enter your code during registration
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="font-medium flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                Earn 20%
              </p>
              <p className="text-muted-foreground text-xs">
                Receive 20% of their mining hashrate as XMR commission
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { ReferralDashboard };
export default ReferralDashboard;
