import React from 'react';
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react';

interface VoteProgressProps {
  approvals: number;
  rejections: number;
  abstentions: number;
  required: number;
}

export const VoteProgress: React.FC<VoteProgressProps> = ({
  approvals,
  rejections,
  abstentions,
  required
}) => {
  const total = approvals + rejections + abstentions;
  const progressPercent = Math.min((approvals / required) * 100, 100);
  
  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        {/* Approval section */}
        <div 
          className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300"
          style={{ width: `${(approvals / Math.max(total, required)) * 100}%` }}
        />
        {/* Rejection section */}
        <div 
          className="absolute top-0 h-full bg-red-500 transition-all duration-300"
          style={{ 
            left: `${(approvals / Math.max(total, required)) * 100}%`,
            width: `${(rejections / Math.max(total, required)) * 100}%` 
          }}
        />
        {/* Abstention section */}
        <div 
          className="absolute top-0 h-full bg-muted-foreground/30 transition-all duration-300"
          style={{ 
            left: `${((approvals + rejections) / Math.max(total, required)) * 100}%`,
            width: `${(abstentions / Math.max(total, required)) * 100}%` 
          }}
        />
        {/* Required threshold marker */}
        <div 
          className="absolute top-0 h-full w-0.5 bg-foreground/50"
          style={{ left: `${(required / Math.max(total, required, 4)) * 100}%` }}
        />
      </div>

      {/* Vote counts */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            {approvals} approve
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            {rejections} reject
          </span>
          {abstentions > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MinusCircle className="h-3 w-3" />
              {abstentions} abstain
            </span>
          )}
        </div>
        <span className="text-muted-foreground">
          {approvals >= required ? (
            <span className="text-green-600 font-medium">Consensus reached!</span>
          ) : (
            `${required - approvals} more needed`
          )}
        </span>
      </div>
    </div>
  );
};
