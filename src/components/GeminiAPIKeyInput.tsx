import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Key, AlertCircle, CheckCircle, X } from 'lucide-react';
import { apiKeyManager, type APIKeyStatus } from '@/services/apiKeyManager';

interface GeminiAPIKeyInputProps {
  onKeyValidated?: () => void;
  onClose?: () => void;
  showAsDialog?: boolean;
  className?: string;
}

export const GeminiAPIKeyInput: React.FC<GeminiAPIKeyInputProps> = ({
  onKeyValidated,
  onClose,
  showAsDialog = false,
  className = ''
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [keyStatus, setKeyStatus] = useState<APIKeyStatus>({ 
    isValid: false, 
    keyType: 'none', 
    lastChecked: null 
  });

  useEffect(() => {
    // Load current key status
    const status = apiKeyManager.getKeyStatus();
    setKeyStatus(status);
  }, []);

  const handleValidateKey = async () => {
    if (!apiKey.trim()) {
      setValidationMessage('Please enter an API key');
      setValidationSuccess(false);
      return;
    }

    setIsValidating(true);
    setValidationMessage('');
    
    try {
      const result = await apiKeyManager.setUserApiKey(apiKey.trim());
      
      if (result.success) {
        setValidationMessage(result.message);
        setValidationSuccess(true);
        setKeyStatus(apiKeyManager.getKeyStatus());
        
        // Clear the input for security
        setApiKey('');
        
        // Notify parent component
        if (onKeyValidated) {
          setTimeout(() => {
            onKeyValidated();
          }, 1500); // Give user time to see success message
        }
      } else {
        setValidationMessage(result.message);
        setValidationSuccess(false);
      }
    } catch (error) {
      setValidationMessage('Failed to validate API key. Please try again.');
      setValidationSuccess(false);
      console.error('API key validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClearKey = () => {
    apiKeyManager.clearUserApiKey();
    setKeyStatus(apiKeyManager.getKeyStatus());
    setApiKey('');
    setValidationMessage('User API key cleared. Using default key.');
    setValidationSuccess(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating) {
      handleValidateKey();
    }
  };

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Google Gemini API Configuration</CardTitle>
          </div>
          {showAsDialog && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <CardDescription>
          To continue using intelligent AI conversations, please provide your own Google Gemini API key. 
          This will restore full AI capabilities including advanced reasoning, memory, and web browsing.
        </CardDescription>

        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Current Status:</span>
            <Badge variant={keyStatus.isValid ? 'default' : 'secondary'}>
              {keyStatus.isValid 
                ? `${keyStatus.keyType === 'user' ? 'User' : 'Default'} API Key Active`
                : 'No Valid API Key'
              }
            </Badge>
          </div>
          
          {keyStatus.keyType === 'user' && (
            <Button variant="outline" size="sm" onClick={handleClearKey}>
              Clear User Key
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* API Key Input */}
        <div className="space-y-2">
          <label htmlFor="api-key" className="text-sm font-medium">
            Your Google Gemini API Key
          </label>
          <div className="flex space-x-2">
            <Input
              id="api-key"
              type="password"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isValidating}
              className="flex-1"
            />
            <Button 
              onClick={handleValidateKey} 
              disabled={isValidating || !apiKey.trim()}
              className="whitespace-nowrap"
            >
              {isValidating ? 'Validating...' : 'Validate & Save'}
            </Button>
          </div>
        </div>

        {/* Validation Message */}
        {validationMessage && (
          <div className="p-3 rounded-lg">
            <span className={`text-sm ${validationSuccess ? 'text-green-600' : 'text-muted-foreground'}`}>
              {validationMessage}
            </span>
          </div>
        )}

        {/* Get API Key Link */}
        <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
          <h4 className="font-medium text-sm">Don't have a Google Gemini API key?</h4>
          <p className="text-sm text-muted-foreground">
            Get a free API key from Google AI Studio. The free tier includes generous usage limits 
            perfect for personal projects and testing.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Get Free API Key from Google AI Studio</span>
            </a>
          </Button>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium">Quick Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Click the link above to visit Google AI Studio</li>
            <li>Sign in with your Google account</li>
            <li>Click "Get API Key" → "Create API Key in new project"</li>
            <li>Copy the generated API key (starts with "AIza...")</li>
            <li>Paste it in the field above and click "Validate & Save"</li>
          </ol>
        </div>

        {/* Security Notice */}
        <div className="p-3 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            <strong>Privacy:</strong> Your API key is stored locally in your browser and never sent to our servers. 
            It's only used to communicate directly with Google's Gemini API.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};