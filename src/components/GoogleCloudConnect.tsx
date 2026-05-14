import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, Cloud, ExternalLink, Loader2, AlertCircle, Copy, Check, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface GoogleCloudConnectProps {
  className?: string;
}

export const GoogleCloudConnect: React.FC<GoogleCloudConnectProps> = ({ className }) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [loading, setLoading] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const { user } = useAuth();

  const checkStatus = useCallback(async (showChecking = true) => {
    if (showChecking) {
      setStatus('checking');
    }
    try {
      // First check if connected via unified login (oauth_connections table)
      if (user) {
        const { data: oauthData } = await supabase
          .from('oauth_connections')
          .select('account_email, is_active, scopes')
          .eq('user_id', user.id)
          .eq('provider', 'google_cloud')
          .single();
        
        if (oauthData?.is_active && oauthData?.account_email) {
          setConnectedEmail(oauthData.account_email);
          setStatus('connected');
          return;
        }
      }

      // Fallback: check edge function status
      const { data, error } = await supabase.functions.invoke('google-cloud-auth', {
        body: { action: 'status' }
      });

      if (error) throw error;
      
      if (data?.success && data?.ready === true) {
        setStatus('connected');
      } else if (data?.success) {
        setStatus('disconnected');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Failed to check Google Cloud status:', error);
      setStatus('disconnected');
    }
  }, [user]);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'google-cloud-oauth-complete') return;
      if (event.data?.success) {
        toast.success('Google Cloud connected!');
        setAuthUrl(null);
        void checkStatus(false);
      } else {
        toast.error(event.data?.error || 'Google Cloud authorization failed');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [checkStatus]);

  // Check connection status on mount and when user changes
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/credentials`;
      
      const { data, error } = await supabase.functions.invoke('google-cloud-auth', {
        body: { 
          action: 'get_authorization_url',
          redirect_uri: redirectUri,
          return_to: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      if (data?.success && data?.authorization_url) {
        const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
          window.location.assign(data.authorization_url);
          return;
        }

        const authWindow = window.open(data.authorization_url, 'google_oauth', 'width=600,height=700');

        if (authWindow) {
          const pollWindowClosed = window.setInterval(() => {
            if (authWindow.closed) {
              window.clearInterval(pollWindowClosed);
              void checkStatus(false);
            }
          }, 500);
        } else {
          setAuthUrl(data.authorization_url);
          toast.info('Popup blocked - click the link below to connect');
        }
      } else {
        throw new Error(data?.error || 'Failed to get authorization URL');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to initiate Google OAuth:', error);
      toast.error('Failed to connect: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const copyAuthUrl = () => {
    if (authUrl) {
      navigator.clipboard.writeText(authUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('URL copied to clipboard');
    }
  };

  const services = [
    { name: 'Gmail', icon: '📧' },
    { name: 'Drive', icon: '📁' },
    { name: 'Sheets', icon: '📊' },
    { name: 'Calendar', icon: '📅' }
  ];

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Cloud className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">Google Cloud Services</h4>
            <p className="text-sm text-muted-foreground">
              Gmail, Drive, Sheets, Calendar
            </p>
          </div>
        </div>
        
        {status === 'checking' && (
          <Badge variant="outline" className="border-muted">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Checking
          </Badge>
        )}
        {status === 'connected' && (
          <Badge variant="outline" className="border-success text-success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )}
        {status === 'disconnected' && (
          <Badge variant="outline" className="border-warning text-warning">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not Connected
          </Badge>
        )}
        {status === 'error' && (
          <Badge variant="outline" className="border-destructive text-destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )}
      </div>

      {/* Connected account info */}
      {status === 'connected' && connectedEmail && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-success/10 border border-success/20">
          <User className="h-4 w-4 text-success" />
          <span className="text-sm text-success">
            Authorized via Google login: <strong>{connectedEmail}</strong>
          </span>
        </div>
      )}

      {/* Service icons */}
      <div className="flex gap-2 mb-4">
        {services.map((service) => (
          <div
            key={service.name}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              status === 'connected' 
                ? 'bg-success/10 text-success' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <span>{service.icon}</span>
            <span>{service.name}</span>
          </div>
        ))}
      </div>

      {status !== 'connected' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in with Google to automatically authorize Eliza's access to your Google services.
          </p>
          <Button
            onClick={handleConnect}
            disabled={loading}
            className="w-full"
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 mr-2" />
                Connect Google Cloud
              </>
            )}
          </Button>

          {authUrl && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Popup blocked? Click below to authorize:
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(authUrl, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open Auth Page
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAuthUrl}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'connected' && (
        <div className="space-y-3">
          <div className="p-3 bg-success/10 rounded-lg">
            <p className="text-sm text-success">
              ✓ Eliza can now access Gmail, Drive, Sheets, and Calendar
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={refreshingStatus}
            onClick={async () => {
              setRefreshingStatus(true);
              await checkStatus(false);
              setRefreshingStatus(false);
            }}
            className="w-full"
          >
            {refreshingStatus ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh Status'
            )}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default GoogleCloudConnect;
