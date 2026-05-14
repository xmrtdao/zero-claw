import React, { createContext, useContext, useState, useCallback } from 'react';

interface SessionCredentials {
  github_pat?: string;
  github_oauth_token?: string;
  github_username?: string;
  github_email?: string;
  github_name?: string;
  openai_api_key?: string;
  deepseek_api_key?: string;
  elevenlabs_api_key?: string;
  [key: string]: string | undefined;
}

interface CredentialSessionContextType {
  credentials: SessionCredentials;
  setCredential: (service: string, credential: string) => void;
  clearCredential: (service: string) => void;
  clearAll: () => void;
  hasCredential: (service: string) => boolean;
  getAll: () => SessionCredentials;
}

const CredentialSessionContext = createContext<CredentialSessionContextType | undefined>(undefined);

export const CredentialSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [credentials, setCredentials] = useState<SessionCredentials>({});

  const setCredential = useCallback((service: string, credential: string) => {
    setCredentials(prev => ({ ...prev, [service]: credential }));
    console.log(`🔐 Session credential set for ${service}`);
  }, []);

  const clearCredential = useCallback((service: string) => {
    setCredentials(prev => {
      const next = { ...prev };
      delete next[service];
      return next;
    });
    console.log(`🗑️ Session credential cleared for ${service}`);
  }, []);

  const clearAll = useCallback(() => {
    setCredentials({});
    console.log('🗑️ All session credentials cleared');
  }, []);

  const hasCredential = useCallback((service: string) => {
    return !!credentials[service];
  }, [credentials]);

  const getAll = useCallback(() => {
    return credentials;
  }, [credentials]);

  const contextValue = {
    credentials,
    setCredential,
    clearCredential,
    clearAll,
    hasCredential,
    getAll
  };

  // Expose context globally for non-React services
  React.useEffect(() => {
    (window as any).__credentialSessionContext = contextValue;
  }, [contextValue]);

  return (
    <CredentialSessionContext.Provider value={contextValue}>
      {children}
    </CredentialSessionContext.Provider>
  );
};

export const useCredentialSession = () => {
  const context = useContext(CredentialSessionContext);
  if (!context) {
    throw new Error('useCredentialSession must be used within CredentialSessionProvider');
  }
  return context;
};
