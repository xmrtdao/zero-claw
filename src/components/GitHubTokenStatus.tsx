import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAPIKeyHealth } from '@/services/credentialManager';

interface GitHubTokenStatusProps {
  onRequestPAT?: () => void;
}

export const GitHubTokenStatus: React.FC<GitHubTokenStatusProps> = ({ onRequestPAT }) => {
  const { health, loading } = useAPIKeyHealth();
  const [githubHealth, setGithubHealth] = useState<any>(null);

  useEffect(() => {
    // Prefer session token over backend token (session = github_session, backend = github)
    const sessionToken = health.find(h => h.service_name === 'github_session' && h.is_healthy);
    const backendToken = health.find(h => h.service_name === 'github' && h.is_healthy);
    const githubService = sessionToken || backendToken || health.find(h => h.service_name === 'github');
    setGithubHealth(githubService);
  }, [health]);

  if (loading || !githubHealth) {
    return null;
  }

  const getStatusIndicator = () => {
    if (githubHealth.expiry_warning && githubHealth.is_healthy) {
      return {
        icon: <Clock className="w-4 h-4 text-yellow-500" />,
        color: 'bg-yellow-500',
        label: '🟡',
        status: 'warning'
      };
    }
    
    if (githubHealth.is_healthy) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        color: 'bg-green-500',
        label: '🟢',
        status: 'healthy'
      };
    }
    
    return {
      icon: <AlertCircle className="w-4 h-4 text-red-500" />,
      color: 'bg-red-500',
      label: '🔴',
      status: 'error'
    };
  };

  const getTooltipContent = () => {
    const status = getStatusIndicator();
    
    if (status.status === 'healthy') {
      const tokenSource = githubHealth.service_name === 'github_session' 
        ? `Your PAT (${githubHealth.metadata?.user || 'Session'})` 
        : `Backend (${githubHealth.metadata?.token_name || 'System'})`;
      
      return (
        <div className="space-y-1 text-xs">
          <div className="font-semibold">✅ GitHub Token Working</div>
          <div>Source: {tokenSource}</div>
          {githubHealth.metadata?.rate_limit && (
            <div className="text-green-200">
              Rate Limit: {githubHealth.metadata.rate_limit.remaining}/{githubHealth.metadata.rate_limit.limit}
            </div>
          )}
          {githubHealth.days_until_expiry && (
            <div>Expires in {githubHealth.days_until_expiry} days</div>
          )}
        </div>
      );
    }
    
    if (status.status === 'warning') {
      return (
        <div className="space-y-1 text-xs">
          <div className="font-semibold">⚠️ Token Expiring Soon</div>
          <div>Expires in {githubHealth.days_until_expiry} days</div>
          <div className="text-yellow-200">Consider providing a new PAT</div>
        </div>
      );
    }
    
    return (
      <div className="space-y-1 text-xs">
        <div className="font-semibold">❌ No Working Token</div>
        <div className="text-red-200">{githubHealth.error_message}</div>
        <div className="text-red-100 mt-2">
          Provide your PAT for 5000 req/hr
        </div>
      </div>
    );
  };

  const status = getStatusIndicator();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={status.status !== 'healthy' ? onRequestPAT : undefined}
            className="h-8 w-8 p-0 relative"
          >
            <div className="relative">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div 
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${status.color} border border-background`}
              />
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {getTooltipContent()}
          {status.status !== 'healthy' && (
            <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
              Click to provide your GitHub PAT
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
