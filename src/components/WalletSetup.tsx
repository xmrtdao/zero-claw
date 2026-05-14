import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface WalletSetupProps {
  accounts: string[];
  onComplete: (selectedAccount: string) => void;
}

const WalletSetup = ({ accounts, onComplete }: WalletSetupProps) => {
  const [step, setStep] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  const handleNext = () => {
    if (!selectedAccount) {
      toast.error("Please select an account to continue");
      return;
    }
    if (step === 1) {
      setStep(2);
    } else {
      onComplete(selectedAccount);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {step === 1 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Select Your Account</CardTitle>
            <CardDescription className="text-gray-400">
              Choose which MetaMask account you'd like to use for your NFT portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              className="space-y-4"
              value={selectedAccount}
              onValueChange={setSelectedAccount}
            >
              {accounts.map((account) => (
                <div key={account} className="flex items-center space-x-2">
                  <RadioGroupItem value={account} id={account} />
                  <Label htmlFor={account} className="text-white">
                    {account}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              className="mt-6 w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              onClick={handleNext}
            >
              Next
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Create NFT Portfolio</CardTitle>
            <CardDescription className="text-gray-400">
              Set up your dedicated space for digital collectables and NFTs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-gray-300">
              <h3 className="font-semibold mb-2">Portfolio Features:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>View and manage all your NFTs in one place</li>
                <li>Track NFT values and collection statistics</li>
                <li>Easily transfer and showcase your digital art</li>
                <li>Get notifications for NFT activities</li>
              </ul>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <p className="text-sm text-gray-300">
                Your NFT portfolio will be created in MetaMask, allowing you to manage your digital collectables directly through the app.
              </p>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              onClick={handleNext}
            >
              Create NFT Portfolio
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WalletSetup;