import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

export interface ReasoningStep {
  step: number;
  thought: string;
  action?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  result?: any;
}

interface ReasoningStepsProps {
  steps: ReasoningStep[];
  className?: string;
}

export const ReasoningSteps: React.FC<ReasoningStepsProps> = ({ steps, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!steps || steps.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500 text-white">Completed</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500 text-white">Running</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card className={`border border-border bg-background/50 backdrop-blur-sm ${className}`}>
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Eliza's Reasoning Process</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {steps.length} {steps.length === 1 ? 'step' : 'steps'}
        </Badge>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {steps.map((step) => (
            <div
              key={step.step}
              className="border border-border rounded-lg p-3 bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getStatusIcon(step.status)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Step {step.step}
                    </span>
                    {getStatusBadge(step.status)}
                  </div>
                  <p className="text-sm text-foreground">{step.thought}</p>
                  {step.action && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Action:</span> {step.action}
                    </p>
                  )}
                  {step.duration && step.status === 'success' && (
                    <p className="text-xs text-muted-foreground">
                      Completed in {step.duration}ms
                    </p>
                  )}
                  {step.result && step.status === 'success' && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-primary">
                        View result
                      </summary>
                      <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(step.result, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
