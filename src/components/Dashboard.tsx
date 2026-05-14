import { WalletState } from "@/hooks/useWallet";
import WalletSetup from "./WalletSetup";
import { useState } from "react";
import WalletInfo from "./WalletInfo";
import AssetTypeSelector from "./AssetTypeSelector";
import WorkflowSteps from "./WorkflowSteps";

interface DashboardProps {
  wallet: WalletState;
  onSetupComplete: (selectedAccount: string) => void;
}

const Dashboard = ({ wallet, onSetupComplete }: DashboardProps) => {
  const [assetType, setAssetType] = useState<string>("");

  if (!wallet.isSetupComplete) {
    return <WalletSetup accounts={wallet.availableAccounts} onComplete={onSetupComplete} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <WalletInfo wallet={wallet} />
        <AssetTypeSelector assetType={assetType} onAssetTypeChange={setAssetType} />
      </div>
      <WorkflowSteps assetType={assetType} />
    </div>
  );
};

export default Dashboard;