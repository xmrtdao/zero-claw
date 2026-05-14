import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { useState } from "react";
// Toast removed for lighter UI
import { stakeXMRT, unstakeXMRT } from "@/utils/contractUtils";
import { WalletState } from "@/hooks/useWallet";
import Web3 from "web3";

interface XMRTStakingProps {
  wallet: WalletState;
  onStakingAction: () => void;
}

const XMRTStaking = ({ wallet, onStakingAction }: XMRTStakingProps) => {
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);

  const formatTimeRemaining = (timestamp: number) => {
    const unlockTime = timestamp + (7 * 24 * 60 * 60); // 7 days from stake
    const remaining = unlockTime - (Date.now() / 1000);
    
    if (remaining <= 0) return "No penalty";
    
    const days = Math.ceil(remaining / (24 * 60 * 60));
    return `${days} day${days !== 1 ? 's' : ''} for no penalty`;
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      console.warn('⚠️ Invalid stake amount entered');
      return;
    }

    if (parseFloat(stakeAmount) > parseFloat(wallet.xmrtBalance)) {
      console.warn('⚠️ Insufficient Balance: Not enough XMRT tokens to stake this amount');
      return;
    }

    setIsStaking(true);
    try {
      const web3 = new Web3(window.ethereum);
      await stakeXMRT(web3, stakeAmount, wallet.address, wallet.chainId);
      
      console.info(`✅ Staking Successful: Staked ${stakeAmount} XMRT tokens`);
      
      setStakeAmount("");
      onStakingAction();
    } catch (error: any) {
      console.error('❌ Staking Failed:', error.message || 'Failed to stake XMRT tokens');
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      console.warn('⚠️ Invalid unstake amount entered');
      return;
    }

    if (parseFloat(unstakeAmount) > parseFloat(wallet.xmrtStakeInfo.amount)) {
      console.warn('⚠️ Insufficient Staked Balance: Not enough staked XMRT tokens');
      return;
    }

    setIsUnstaking(true);
    try {
      const web3 = new Web3(window.ethereum);
      await unstakeXMRT(web3, unstakeAmount, wallet.address, wallet.chainId);
      
      const penalty = wallet.xmrtStakeInfo.canUnstakeWithoutPenalty ? 0 : parseFloat(unstakeAmount) * 0.1;
      const received = parseFloat(unstakeAmount) - penalty;
      
      console.info(
        penalty > 0 
          ? `✅ Unstaking Successful: Unstaked ${unstakeAmount} XMRT. Received ${received.toFixed(2)} XMRT (${penalty.toFixed(2)} penalty burned)`
          : `✅ Unstaking Successful: Unstaked ${unstakeAmount} XMRT tokens`
      );
      
      setUnstakeAmount("");
      onStakingAction();
    } catch (error: any) {
      console.error('❌ Unstaking Failed:', error.message || 'Failed to unstake XMRT tokens');
    } finally {
      setIsUnstaking(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Staking Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Stake XMRT
          </CardTitle>
          <CardDescription className="text-gray-400">
            Stake your XMRT tokens to participate in governance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stake-amount">Amount to Stake</Label>
            <Input
              id="stake-amount"
              type="number"
              placeholder="0.0"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="bg-gray-700 border-gray-600"
            />
            <div className="flex justify-between text-sm text-gray-400">
              <span>Available: {parseFloat(wallet.xmrtBalance).toFixed(2)} XMRT</span>
              <button
                onClick={() => setStakeAmount(wallet.xmrtBalance)}
                className="text-blue-400 hover:text-blue-300"
              >
                Max
              </button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Minimum staking period: 7 days</span>
            </div>
          </div>

          <Button
            onClick={handleStake}
            disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || isStaking}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isStaking ? "Staking..." : "Stake XMRT"}
          </Button>
        </CardContent>
      </Card>

      {/* Unstaking Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="h-5 w-5 text-orange-400" />
            Unstake XMRT
          </CardTitle>
          <CardDescription className="text-gray-400">
            Unstake your XMRT tokens (10% penalty if before 7 days)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unstake-amount">Amount to Unstake</Label>
            <Input
              id="unstake-amount"
              type="number"
              placeholder="0.0"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              className="bg-gray-700 border-gray-600"
            />
            <div className="flex justify-between text-sm text-gray-400">
              <span>Staked: {parseFloat(wallet.xmrtStakeInfo.amount).toFixed(2)} XMRT</span>
              <button
                onClick={() => setUnstakeAmount(wallet.xmrtStakeInfo.amount)}
                className="text-orange-400 hover:text-orange-300"
              >
                Max
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Penalty Status</span>
              <span className={wallet.xmrtStakeInfo.canUnstakeWithoutPenalty ? "text-green-400" : "text-orange-400"}>
                {formatTimeRemaining(wallet.xmrtStakeInfo.timestamp)}
              </span>
            </div>
          </div>

          {!wallet.xmrtStakeInfo.canUnstakeWithoutPenalty && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">10% penalty applies for early unstaking</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleUnstake}
            disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || parseFloat(wallet.xmrtStakeInfo.amount) <= 0 || isUnstaking}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {isUnstaking ? "Unstaking..." : "Unstake XMRT"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default XMRTStaking;