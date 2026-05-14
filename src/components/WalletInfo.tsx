import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Wallet2 } from "lucide-react";
import { WalletState } from "@/hooks/useWallet";

interface WalletInfoProps {
  wallet: WalletState;
}

const WalletInfo = ({ wallet }: WalletInfoProps) => {
  const getWalletBrand = () => {
    if (typeof window.ethereum !== 'undefined') {
      if (window.ethereum.isMetaMask) return 'MetaMask';
      if (window.ethereum.isWalletConnect) return 'WalletConnect';
      return 'Unknown Wallet';
    }
    return 'No Wallet Detected';
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet2 className="h-5 w-5 text-purple-400" />
            {getWalletBrand()}
            <CheckCircle className="h-5 w-5 text-green-400 animate-pulse" />
          </CardTitle>
        </div>
        <CardDescription className="text-gray-400">
          Connected wallet details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Address</span>
            <span className="text-purple-400 text-sm truncate max-w-[200px]">
              {wallet.address}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Sepolia ETH</span>
            <span className="text-blue-400 font-mono">{parseFloat(wallet.balance).toFixed(4)} ETH</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">XMRT Balance</span>
            <span className="text-green-400 font-mono">{parseFloat(wallet.xmrtBalance).toFixed(2)} XMRT</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Network</span>
            <span className={`${wallet.chainId === 11155111 ? 'text-green-400' : 'text-yellow-400'}`}>
              {wallet.chainId === 11155111 ? 'Sepolia Testnet' : `Chain ID: ${wallet.chainId}`}
            </span>
          </div>
          {wallet.chainId !== 11155111 && (
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mt-3">
              <p className="text-yellow-400 text-sm">
                ⚠️ Please switch to Sepolia testnet for full XMRT functionality
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletInfo;