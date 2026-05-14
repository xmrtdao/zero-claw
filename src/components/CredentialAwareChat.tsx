import React, { useState } from 'react';
import { DiscreetCredentialPrompt } from './DiscreetCredentialPrompt';
import { useCredentialSession } from '@/contexts/CredentialSessionContext';
import { isCredentialRequiredError, type CredentialRequiredError } from '@/services/credentialManager';

interface CredentialAwareChatProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that detects credential_required errors and shows discreet prompts
 * Wrap any chat interface with this to enable automatic credential collection
 */
export const CredentialAwareChat: React.FC<CredentialAwareChatProps> = ({ children }) => {
  const [credentialRequest, setCredentialRequest] = useState<CredentialRequiredError | null>(null);
  const [retryCallback, setRetryCallback] = useState<(() => void) | null>(null);
  const { getAll } = useCredentialSession();

  // Expose method to trigger credential request (called by services)
  React.useEffect(() => {
    (window as any).__showCredentialPrompt = (error: CredentialRequiredError, retry?: () => void) => {
      setCredentialRequest(error);
      if (retry) {
        setRetryCallback(() => retry);
      }
    };

    return () => {
      delete (window as any).__showCredentialPrompt;
    };
  }, []);

  const handleRetry = () => {
    if (retryCallback) {
      retryCallback();
    }
    setCredentialRequest(null);
    setRetryCallback(null);
  };

  const handleDismiss = () => {
    setCredentialRequest(null);
    setRetryCallback(null);
  };

  return (
    <>
      {children}
      {credentialRequest && (
        <DiscreetCredentialPrompt
          service={credentialRequest.service}
          credentialType={credentialRequest.credential_type}
          message={credentialRequest.user_prompt}
          onDismiss={handleDismiss}
          onRetry={handleRetry}
          helpUrl={credentialRequest.help_url}
          requiredScopes={credentialRequest.required_scopes}
          attempted={credentialRequest.attempted}
        />
      )}
    </>
  );
};

/**
 * Helper to wrap API calls with automatic credential detection
 */
export async function callWithCredentialDetection<T>(
  apiCall: () => Promise<T>,
  retryFn?: () => void
): Promise<T> {
  try {
    const result = await apiCall();
    
    // Check if result contains credential_required error
    if (typeof result === 'object' && result !== null && isCredentialRequiredError(result)) {
      if ((window as any).__showCredentialPrompt) {
        (window as any).__showCredentialPrompt(result, retryFn);
      }
      throw new Error('Credential required - prompt shown to user');
    }
    
    return result;
  } catch (error: any) {
    // Check if error response contains credential_required
    if (error?.response?.data && isCredentialRequiredError(error.response.data)) {
      if ((window as any).__showCredentialPrompt) {
        (window as any).__showCredentialPrompt(error.response.data, retryFn);
      }
    }
    throw error;
  }
}
