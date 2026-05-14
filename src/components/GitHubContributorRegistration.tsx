import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Eye, EyeOff, Key, ExternalLink, Github } from 'lucide-react';
import { useCredentialSession } from '@/contexts/CredentialSessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Label } from './ui/label';

interface GitHubPATInputProps {
  onKeyValidated?: () => void;
  onCancel?: () => void;
}

export const GitHubPATInput: React.FC<GitHubPATInputProps> = ({
  onKeyValidated,
  onCancel,
}) => {
  const [pat, setPat] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [repoOwner, setRepoOwner] = useState('DevGruGold');
  const [repoName, setRepoName] = useState('XMRT-Ecosystem');
  const [isValidating, setIsValidating] = useState(false);
  const [showPat, setShowPat] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
    username?: string;
  } | null>(null);
  
  const { setCredential } = useCredentialSession();

  const validatePat = async (token: string): Promise<{ success: boolean; message: string }> => {
    if (!token.trim()) {
      return { success: false, message: 'Please enter a GitHub Personal Access Token' };
    }

    // Check format
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      return { 
        success: false, 
        message: 'Invalid PAT format. Must start with "ghp_" or "github_pat_"' 
      };
    }

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return {
          success: true,
          message: `✅ Valid GitHub PAT for user: ${userData.login} (5000 req/hr rate limit)`
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: '❌ Invalid GitHub PAT. Please check your token and try again.'
        };
      } else {
        return {
          success: false,
          message: `❌ GitHub API error: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  };

  const handleValidateAndSave = async () => {
    setIsValidating(true);
    setValidationResult(null);

    // Validate wallet address format
    if (!walletAddress || !/^(0x)?[0-9a-fA-F]{40}$/.test(walletAddress)) {
      setValidationResult({
        success: false,
        message: '❌ Invalid wallet address format. Must be 42 characters starting with 0x.'
      });
      setIsValidating(false);
      return;
    }

    try {
      const result = await validatePat(pat);
      
      if (result.success) {
        // Fetch full user info from GitHub
        const userInfoResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${pat}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!userInfoResponse.ok) {
          setValidationResult({
            success: false,
            message: '❌ Failed to fetch GitHub user info'
          });
          setIsValidating(false);
          return;
        }

        const userInfo = await userInfoResponse.json();
        
        // Store PAT and user info in session credentials
        setCredential('github_pat', pat);
        setCredential('github_username', userInfo.login);
        if (userInfo.email) setCredential('github_email', userInfo.email);
        if (userInfo.name) setCredential('github_name', userInfo.name);
        
        console.log(`✅ GitHub user authenticated: ${userInfo.login}`);
        
        setValidationResult({
          ...result,
          username: userInfo.login
        });
        
        // Validate repository exists and is public
        const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
          headers: {
            'Authorization': `Bearer ${pat}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!repoResponse.ok) {
          setValidationResult({
            success: false,
            message: `❌ Repository ${repoOwner}/${repoName} not found or not accessible`
          });
          setIsValidating(false);
          return;
        }

        const repoData = await repoResponse.json();
        
        // Register contributor in database
        try {
          await supabase.from('github_contributors').upsert({
            github_username: userInfo.login,
            wallet_address: walletAddress,
            target_repo_owner: repoOwner,
            target_repo_name: repoName,
            pat_last_validated: new Date().toISOString(),
            is_active: true,
          }, {
            onConflict: 'github_username'
          });
          console.log('✅ Contributor profile created/updated');
        } catch (dbError) {
          console.warn('⚠️ Could not update contributor profile:', dbError);
        }
        
        // Store wallet and repo in session credentials
        setCredential('wallet_address', walletAddress);
        setCredential('target_repo', `${repoOwner}/${repoName}`);
        
        // Update api_key_health table via edge function
        try {
          await supabase.functions.invoke('api-key-health-monitor', {
            body: { session_credentials: { github_pat: pat } }
          });
          console.log('✅ Updated api_key_health with session PAT');
        } catch (healthError) {
          console.warn('⚠️ Could not update health status:', healthError);
        }
        
        setTimeout(() => {
          onKeyValidated?.();
        }, 1500);
      } else {
        setValidationResult(result);
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
          GitHub Personal Access Token
        </CardTitle>
        <CardDescription>
          Provide your GitHub PAT to enable posting discussions and accessing GitHub features when backend rate limits are hit. 
          Your token gets 5000 requests/hour - same as OAuth apps.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="github-pat">Your GitHub Personal Access Token</Label>
          <div className="relative">
            <Input
              id="github-pat"
              type={showPat ? "text" : "password"}
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPat(!showPat)}
            >
              {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wallet-address">Your Wallet Address (for XMRT rewards)</Label>
          <Input
            id="wallet-address"
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>

        <div className="space-y-2">
          <Label>Target Repository</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={repoOwner}
              onChange={(e) => setRepoOwner(e.target.value)}
              placeholder="Owner"
              className="flex-1"
            />
            <span className="self-center">/</span>
            <Input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="Repository"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Default: DevGruGold/XMRT-Ecosystem (can target any public repo)
          </p>
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
            disabled={isValidating || !pat.trim() || !walletAddress.trim()}
            className="flex-1"
          >
            {isValidating ? 'Validating...' : 'Validate & Register as Contributor'}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        <div className="mt-6 space-y-3 text-sm text-muted-foreground">
          <h4 className="font-medium text-sm">Don't have a GitHub PAT?</h4>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Visit GitHub Settings → Developer Settings</li>
            <li>Click "Personal Access Tokens" → "Tokens (classic)"</li>
            <li>Generate new token (classic)</li>
            <li>Select scopes: <code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">write:discussion</code></li>
            <li>Copy and paste it above</li>
          </ol>
          
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a 
              href="https://github.com/settings/tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Get GitHub Personal Access Token
            </a>
          </Button>
          
          <div className="p-3 bg-muted/50 rounded-lg text-xs">
            <strong>Privacy:</strong> Your GitHub PAT is stored in your browser session only and used directly with GitHub's API.
            It's never sent to any other server except GitHub. Session credentials are cleared when you close the browser.
          </div>

          <div className="p-3 bg-primary/10 rounded-lg text-xs">
            <strong>Why provide your PAT?</strong> When backend GitHub tokens hit rate limits, Eliza can use your PAT 
            to continue posting discussions and accessing GitHub features. Your PAT gets its own 5000 req/hr quota.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};