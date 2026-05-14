import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, Search, Eye, Brain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { testHarpaAI } from '@/services/harpaAITestService';
import { harpaAIService } from '@/services/harpaAIService';

export const HarpaAIStatus: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  useEffect(() => {
    // Check initial status
    const status = harpaAIService.getStatus();
    setConnectionStatus(status.connected ? 'connected' : 'disconnected');
  }, []);

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      const fullTest = await testHarpaAI.runFullTest();
      setTestResults(fullTest.results);
      setConnectionStatus(fullTest.success ? 'connected' : 'disconnected');
    } catch (error) {
      setTestResults([`❌ Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Globe className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-primary/20">
      <CardHeader className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          {getStatusIcon()}
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            HARPA AI Agentic Browsing
          </CardTitle>
          <Badge variant="outline" className={`${getStatusColor()} text-white border-0`}>
            {connectionStatus.toUpperCase()}
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Advanced web intelligence and autonomous browsing capabilities for Eliza
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Capabilities Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Search className="h-6 w-6 text-primary mb-1" />
            <span className="text-xs font-medium">Smart Search</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-secondary/5 border border-secondary/10">
            <Eye className="h-6 w-6 text-secondary mb-1" />
            <span className="text-xs font-medium">Web Scraping</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-accent/5 border border-accent/10">
            <Brain className="h-6 w-6 text-accent mb-1" />
            <span className="text-xs font-medium">AI Analysis</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/5 border border-muted-foreground/10">
            <Globe className="h-6 w-6 text-muted-foreground mb-1" />
            <span className="text-xs font-medium">Monitoring</span>
          </div>
        </div>

        {/* Service Info */}
        <Alert className="bg-primary/5 border-primary/20">
          <Globe className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {testHarpaAI.getServiceInfo()}
          </AlertDescription>
        </Alert>

        {/* Test Button */}
        <Button 
          onClick={runTests} 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Test HARPA AI Integration
            </>
          )}
        </Button>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Diagnostic Results:</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className="text-xs p-2 rounded bg-muted/50 border border-muted-foreground/10 font-mono"
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10">
          <h4 className="text-sm font-semibold mb-2 text-foreground">How to Use:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Ask Eliza to search for current information</li>
            <li>• Request analysis of specific websites</li>
            <li>• Get real-time market data and news</li>
            <li>• Monitor mining pools and cryptocurrency trends</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default HarpaAIStatus;