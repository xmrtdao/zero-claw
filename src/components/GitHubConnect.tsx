import React, { useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, Github, Loader2, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GitHubConnectProps {
  className?: string;
}

export const GitHubConnect: React.FC<GitHubConnectProps> = ({ className }) => {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const githubIdentity = useMemo(
    () => user?.identities?.find((identity) => identity.provider === 'github'),
    [user?.identities]
  );

  const githubUsername =
    (githubIdentity?.identity_data?.preferred_username as string | undefined) ||
    (githubIdentity?.identity_data?.user_name as string | undefined) ||
    (githubIdentity?.identity_data?.name as string | undefined) ||
    null;

  const githubEmail = (githubIdentity?.identity_data?.email as string | undefined) || null;
  const isConnected = Boolean(githubIdentity);

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/profile`,
          scopes: 'repo read:user user:email',
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to connect GitHub: ${message}`);
      setIsConnecting(false);
    }
  };

  return (
    <Card className={`p-4 ${className || ''}`}>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Github className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">GitHub</h4>
            <p className="text-sm text-muted-foreground">Repository access for GitHub integration</p>
          </div>
        </div>

        {isConnected ? (
          <Badge variant="outline" className="border-success text-success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        ) : (
          <Badge variant="outline" className="border-warning text-warning">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not Connected
          </Badge>
        )}
      </div>

      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
            <User className="h-4 w-4 text-success" />
            <span className="text-sm text-success">
              Connected as <strong>{githubUsername ? `@${githubUsername}` : 'GitHub user'}</strong>
              {githubEmail ? ` (${githubEmail})` : ''}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Eliza can now use your GitHub OAuth identity when interacting with repositories.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connect your GitHub account to authorize the GitHub integration for your own repositories.
          </p>
          <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Github className="h-4 w-4 mr-2" />
                Connect GitHub
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
};
