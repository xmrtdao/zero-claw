import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIExecutiveKeyInputProps {
  serviceName: string;
  serviceLabel: string;
  role: string;
  keyPrefix: string;
  helpUrl: string;
  secretName: string;
}

export const AIExecutiveKeyInput: React.FC<AIExecutiveKeyInputProps> = ({
  serviceName,
  serviceLabel,
  role,
  keyPrefix,
  helpUrl,
  secretName
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive"
      });
      return;
    }

    if (!apiKey.startsWith(keyPrefix)) {
      toast({
        title: "Invalid Format",
        description: `${serviceLabel} API keys should start with "${keyPrefix}"`,
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);

    try {
      // Store in Supabase secrets via edge function
      const { data, error } = await supabase.functions.invoke('update-api-key', {
        body: {
          service: serviceName,
          secret_name: secretName,
          api_key: apiKey
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${serviceLabel} API key updated successfully. The health monitor will verify it shortly.`,
      });

      // Clear input for security
      setApiKey('');
      
      // Trigger health check
      setTimeout(async () => {
        await supabase.functions.invoke('api-key-health-monitor');
      }, 1000);

    } catch (error) {
      console.error('Failed to update API key:', error);
      toast({
        title: "Error",
        description: `Failed to update ${serviceLabel} API key. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-secondary/20 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm text-foreground">{serviceLabel}</h4>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <a href={helpUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3" />
          </a>
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${serviceName}-key`} className="text-xs">API Key</Label>
        <div className="relative">
          <Input
            id={`${serviceName}-key`}
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`${keyPrefix}...`}
            className="pr-10 text-sm"
            disabled={isValidating}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isValidating || !apiKey.trim()}
        size="sm"
        className="w-full"
      >
        {isValidating ? (
          <>
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            Updating...
          </>
        ) : (
          'Update Key'
        )}
      </Button>
    </div>
  );
};
