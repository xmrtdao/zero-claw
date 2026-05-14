import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, RefreshCw, TrendingUp, Lock } from "lucide-react";
import { WalletState } from "@/hooks/useWallet";
import { formatUnixTimestamp } from "@/utils/dateFormatter";

interface XMRTBalanceProps {
  wallet: WalletState;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const XMRTBalance = ({ wallet, onRefresh, isRefreshing = false }: XMRTBalanceProps) => {
  const formatTokenAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };


  const getTotalValue = () => {
    const balance = parseFloat(wallet.xmrtBalance);
    const staked = parseFloat(wallet.xmrtStakeInfo.amount);
    return (balance + staked).toFixed(2);
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-400" />
            XMRT Balance
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-gray-400">
          Your XMRT token holdings and staking information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Available Balance */}
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-blue-400" />
              <span className="text-gray-300">Available</span>
            </div>
            <span className="text-blue-400 font-semibold">
              {formatTokenAmount(wallet.xmrtBalance)} XMRT
            </span>
          </div>

          {/* Staked Balance */}
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-green-400" />
              <span className="text-gray-300">Staked</span>
            </div>
            <span className="text-green-400 font-semibold">
              {formatTokenAmount(wallet.xmrtStakeInfo.amount)} XMRT
            </span>
          </div>

          {/* Total Value */}
          <div className="flex justify-between items-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <span className="text-purple-300 font-medium">Total Holdings</span>
            </div>
            <span className="text-purple-400 font-bold text-lg">
              {formatTokenAmount(getTotalValue())} XMRT
            </span>
          </div>

          {/* Staking Info */}
          {parseFloat(wallet.xmrtStakeInfo.amount) > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-700">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Staked Since</span>
                <span className="text-gray-300">{formatUnixTimestamp(wallet.xmrtStakeInfo.timestamp)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Penalty Status</span>
                <span className={wallet.xmrtStakeInfo.canUnstakeWithoutPenalty ? "text-green-400" : "text-orange-400"}>
                  {wallet.xmrtStakeInfo.canUnstakeWithoutPenalty ? "No Penalty" : "10% Penalty"}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default XMRTBalance;