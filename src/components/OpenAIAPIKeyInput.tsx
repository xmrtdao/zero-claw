import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Eye, EyeOff, Key, ExternalLink } from 'lucide-react';
import { openAIApiKeyManager } from '@/services/openAIApiKeyManager';

interface OpenAIAPIKeyInputProps {
  onKeyValidated?: () => void;
  onCancel?: () => void;
}

export const OpenAIAPIKeyInput: React.FC<OpenAIAPIKeyInputProps> = ({
  onKeyValidated,
  onCancel,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleValidateAndSave = async () => {
    if (!apiKey.trim()) {
      setValidationResult({
        success: false,
        message: 'Please enter an API key'
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await openAIApiKeyManager.setUserApiKey(apiKey);
      setValidationResult(result);
      
      if (result.success) {
        setTimeout(() => {
          onKeyValidated?.();
        }, 1500);
      }
    } catch (error) {
      setValidationResult({
        success: false,
        message: 'Validation failed. Please try again.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          OpenAI API Configuration
        </CardTitle>
        <CardDescription>
          To continue using intelligent AI conversations, please provide your OpenAI API key. 
          This enables advanced reasoning, memory recall, and high-quality text-to-speech capabilities.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="openai-key" className="text-sm font-medium">
            Your OpenAI API Key
          </label>
          <div className="relative">
            <Input
              id="openai-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="pr-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isValidating) {
                  handleValidateAndSave();
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {validationResult && (
          <Alert className={validationResult.success ? "border-green-500" : "border-red-500"}>
            <AlertDescription>
              {validationResult.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleValidateAndSave}
            disabled={isValidating || !apiKey.trim()}
            className="flex-1"
          >
            {isValidating ? 'Validating...' : 'Validate & Save'}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        <div className="mt-6 space-y-3 text-sm text-muted-foreground">
          <h4 className="font-medium text-sm">Don't have an OpenAI API key?</h4>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Visit the OpenAI Platform</li>
            <li>Create an account or sign in</li>
            <li>Navigate to API Keys section</li>
            <li>Generate a new API key</li>
            <li>Copy and paste it above</li>
          </ol>
          
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Get OpenAI API Key
            </a>
          </Button>
          
          <div className="p-3 bg-muted/50 rounded-lg text-xs">
            <strong>Privacy:</strong> Your API key is stored locally in your browser and used only for direct communication with OpenAI's API.
            It's only used to communicate directly with OpenAI's API.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};