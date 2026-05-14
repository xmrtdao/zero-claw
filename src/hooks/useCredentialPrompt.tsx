import { useState, useCallback } from 'react';
import { CredentialRequiredError } from '@/services/credentialManager';

export interface CredentialPromptConfig extends CredentialRequiredError {
  onRetry?: () => void;
}

export function useCredentialPrompt() {
  const [promptConfig, setPromptConfig] = useState<CredentialPromptConfig | null>(null);

  const showPrompt = useCallback((config: CredentialPromptConfig) => {
    setPromptConfig(config);
  }, []);

  const hidePrompt = useCallback(() => {
    setPromptConfig(null);
  }, []);

  return {
    promptConfig,
    showPrompt,
    hidePrompt,
    isShowing: !!promptConfig
  };
}
