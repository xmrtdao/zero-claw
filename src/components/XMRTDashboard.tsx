import { WalletState } from "@/hooks/useWallet";
import XMRTBalance from "./XMRTBalance";
import XMRTFaucet from "./XMRTFaucet";
import XMRTStaking from "./XMRTStaking";
import { useState } from "react";

interface XMRTDashboardProps {
  wallet: WalletState;
  onRefreshXMRT: () => void;
}

const XMRTDashboard = ({ wallet, onRefreshXMRT }: XMRTDashboardProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshXMRT();
    // Add a small delay to make the loading state more visible
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleFaucetClaimed = () => {
    // Refresh XMRT data after successful faucet claim
    handleRefresh();
  };

  const handleStakingAction = () => {
    // Refresh XMRT data after staking/unstaking
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Balance and Faucet Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <XMRTBalance 
          wallet={wallet} 
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <XMRTFaucet 
          wallet={wallet} 
          onClaimed={handleFaucetClaimed}
        />
      </div>

      {/* Staking Section */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Staking</h3>
        <XMRTStaking 
          wallet={wallet} 
          onStakingAction={handleStakingAction}
        />
      </div>
    </div>
  );
};

export default XMRTDashboard;