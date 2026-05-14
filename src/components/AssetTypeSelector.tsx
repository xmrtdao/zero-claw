import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, CodeIcon, FileTextIcon, MusicIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface AssetTypeSelectorProps {
  assetType: string;
  onAssetTypeChange: (value: string) => void;
}

const AssetTypeSelector = ({ assetType, onAssetTypeChange }: AssetTypeSelectorProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700 col-span-2">
      <CardHeader>
        <CardTitle className="text-white">Select Asset Type</CardTitle>
        <CardDescription className="text-gray-400">
          Choose the type of asset you want to create
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={assetType}
          onValueChange={onAssetTypeChange}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <RadioGroupItem
              value="image"
              id="image"
              className="peer sr-only"
            />
            <Label
              htmlFor="image"
              className="flex flex-col items-center justify-between rounded-md border-2 border-gray-700 p-4 hover:bg-gray-700/30 peer-data-[state=checked]:border-purple-500 [&:has([data-state=checked])]:border-purple-500 cursor-pointer"
            >
              <ImageIcon className="mb-3 h-6 w-6 text-purple-400" />
              <span className="text-sm font-medium">Image NFT</span>
            </Label>
          </div>

          <div>
            <RadioGroupItem
              value="code"
              id="code"
              className="peer sr-only"
            />
            <Label
              htmlFor="code"
              className="flex flex-col items-center justify-between rounded-md border-2 border-gray-700 p-4 hover:bg-gray-700/30 peer-data-[state=checked]:border-purple-500 [&:has([data-state=checked])]:border-purple-500 cursor-pointer"
            >
              <CodeIcon className="mb-3 h-6 w-6 text-blue-400" />
              <span className="text-sm font-medium">Smart Contract</span>
            </Label>
          </div>

          <div>
            <RadioGroupItem
              value="document"
              id="document"
              className="peer sr-only"
            />
            <Label
              htmlFor="document"
              className="flex flex-col items-center justify-between rounded-md border-2 border-gray-700 p-4 hover:bg-gray-700/30 peer-data-[state=checked]:border-purple-500 [&:has([data-state=checked])]:border-purple-500 cursor-pointer"
            >
              <FileTextIcon className="mb-3 h-6 w-6 text-green-400" />
              <span className="text-sm font-medium">Document</span>
            </Label>
          </div>

          <div>
            <RadioGroupItem
              value="audio"
              id="audio"
              className="peer sr-only"
            />
            <Label
              htmlFor="audio"
              className="flex flex-col items-center justify-between rounded-md border-2 border-gray-700 p-4 hover:bg-gray-700/30 peer-data-[state=checked]:border-purple-500 [&:has([data-state=checked])]:border-purple-500 cursor-pointer"
            >
              <MusicIcon className="mb-3 h-6 w-6 text-yellow-400" />
              <span className="text-sm font-medium">Audio NFT</span>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default AssetTypeSelector;