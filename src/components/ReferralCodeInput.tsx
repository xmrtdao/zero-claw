import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { CheckCircle, Gift, Percent, Loader2, AlertCircle } from 'lucide-react';

interface ReferralCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  walletAddress?: string;
}

interface ReferralValidation {
  valid: boolean;
  message: string;
  confirmed: 'idle' | 'validating' | 'valid' | 'invalid';
}

export function ReferralCodeInput({ value, onChange, walletAddress }: ReferralCodeInputProps) {
  const [validation, setValidation] = useState<ReferralValidation>({
    valid: false,
    message: '',
    confirmed: 'idle',
  });

  const handleChange = (code: string) => {
    const cleaned = code.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    onChange(cleaned);
    if (validation.confirmed !== 'idle') {
      setValidation({ valid: false, message: '', confirmed: 'idle' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">
          Referral Code <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
      </div>
      <Input
        placeholder="e.g., XMRT-A3F7"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="font-mono tracking-wider"
        maxLength={12}
      />
      <div className="flex items-center gap-2">
        <Percent className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          You'll earn 20% of their hashrate as commission
        </span>
      </div>
      {validation.confirmed === 'invalid' && (
        <div className="flex items-center gap-2 text-destructive text-xs">
          <AlertCircle className="h-3 w-3" />
          {validation.message}
        </div>
      )}
      {validation.confirmed === 'valid' && (
        <div className="flex items-center gap-2 text-green-500 text-xs">
          <CheckCircle className="h-3 w-3" />
          {validation.message}
        </div>
      )}
    </div>
  );
}
