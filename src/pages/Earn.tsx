import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, GitCommit, Lightbulb, Users, Share2 } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { IdeaSubmissionForm } from "@/components/IdeaSubmissionForm";
import { IdeaDashboard } from "@/components/IdeaDashboard";
import { ContributorDashboard } from "@/components/ContributorDashboard";
import { TreasuryStats } from "@/components/TreasuryStats";
import { ReferralDashboard } from "@/components/ReferralDashboard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";

const Earn = () => {
  const { wallet } = useWallet();

  return (
    <>
      <SEOHead
        title="Earn XMRT Tokens | Suite"
        description="Earn XMRT tokens through code contributions, mining, device charging, idea submissions, or referrals. Multiple pathways to participate in the Suite ecosystem."
        image="/og-image-contributors.svg"
        url="/earn"
        keywords="XMRT tokens, crypto rewards, GitHub contributions, mining, proof of participation, community treasury, referrals"
        twitterLabel1="💰 Earn"
        twitterData1="5 Ways"
        twitterLabel2="⚡ Rewards"
        twitterData2="Real-time"
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Title */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground">
            Earn & Contribute
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Multiple pathways to earn XMRT tokens: contribute code, mine crypto, charge your device, refer miners, or submit ideas
          </p>
        </div>

        <Tabs defaultValue="contribute" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="contribute" className="gap-2">
              <GitCommit className="w-4 h-4" />
              <span className="hidden sm:inline">Contribute</span>
            </TabsTrigger>
            <TabsTrigger value="treasury" className="gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Treasury</span>
            </TabsTrigger>
            <TabsTrigger value="ideas" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Ideas</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Community</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Referrals</span>
            </TabsTrigger>
          </TabsList>

          {/* Contribute Tab - GitHub, Mining, Chargers */}
          <TabsContent value="contribute">
            <ContributorDashboard />
          </TabsContent>

          {/* Treasury Tab - NOW WITH REAL STATS */}
          <TabsContent value="treasury">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button asChild variant="outline">
                  <Link to="/mining-dashboard">Open Mining Operations</Link>
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* REPLACED STATIC TREASURY STATS WITH REAL COMPONENT */}
                <TreasuryStats />

                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">Purchase Crypto</CardTitle>
                    <CardDescription>
                      Buy cryptocurrency directly with fiat to fund your participation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ width: "100%", height: "600px" }}>
                      <iframe
                        src="https://buy.onramper.com?color=3b82f6&apiKey=pk_prod_01HMVZ8HJ2E7XQFVT2VVJMVZ0Q"
                        title="Onramper widget"
                        height="600px"
                        width="100%"
                        allow="accelerometer; autoplay; camera; gyroscope; payment"
                        className="rounded-lg"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Ideas Tab */}
          <TabsContent value="ideas">
            <IdeaSubmissionForm />
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community">
            <IdeaDashboard />
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <div className="space-y-4">
              {wallet.isConnected && wallet.address ? (
                <ReferralDashboard walletAddress={wallet.address} />
              ) : (
                <Card className="border-border">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Share2 className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
                    <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Connect your wallet to get a referral code and start earning 20% commission
                      on every miner you refer.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Earn;
