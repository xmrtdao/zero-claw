import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReferralCodeInput } from './ReferralCodeInput';

interface LinkWorkerDialogProps {
  userId: string;
  existingWorkerIds: string[];
  onWorkerLinked: (workerId: string) => void;
}

export function LinkWorkerDialog({ userId, existingWorkerIds, onWorkerLinked }: LinkWorkerDialogProps) {
  const [open, setOpen] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerifyAndLink = async () => {
    const cleanWorkerId = workerId.trim().toUpperCase();
    
    // Validate 8-character alphanumeric format
    if (!/^[A-Z0-9]{8}$/.test(cleanWorkerId)) {
      setVerificationStatus('error');
      setErrorMessage('Worker ID must be exactly 8 alphanumeric characters');
      return;
    }

    // Check if already linked
    if (existingWorkerIds.includes(cleanWorkerId)) {
      setVerificationStatus('error');
      setErrorMessage('This worker is already linked to your profile');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');
    setErrorMessage('');

    try {
      // Check if worker exists in user_worker_mappings
      const { data: workerData, error: workerError } = await supabase
        .from('user_worker_mappings')
        .select('worker_id, total_hashrate, total_shares, last_active')
        .eq('worker_id', cleanWorkerId)
        .maybeSingle();

      if (workerError) throw workerError;

      if (!workerData) {
        setVerificationStatus('error');
        setErrorMessage('Worker ID not found in the mining pool. Start mining first!');
        setIsVerifying(false);
        return;
      }

      // Link the worker to the user's profile
      const newWorkerIds = [...existingWorkerIds, cleanWorkerId];
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ linked_worker_ids: newWorkerIds })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Apply referral code if one was provided
      if (referralCode.trim()) {
        const { error: refError } = await supabase.rpc('apply_referral_code', {
          p_referral_code: referralCode.trim().toUpperCase(),
          p_referred_worker_id: cleanWorkerId,
          p_referred_wallet: null,
        });

        if (!refError) {
          toast.success('Referral applied! You are now earning 20% commission.');
        } else {
          console.warn('Referral application failed (non-fatal):', refError);
          toast.error(refError.message || 'Could not apply referral code');
        }
      }

      setVerificationStatus('success');
      toast.success(`Worker ${cleanWorkerId} linked successfully!`);
      onWorkerLinked(cleanWorkerId);
      
      setTimeout(() => {
        setOpen(false);
        setWorkerId('');
        setReferralCode('');
        setVerificationStatus('idle');
      }, 1500);

    } catch (error) {
      console.error('Error linking worker:', error);
      setVerificationStatus('error');
      setErrorMessage('Failed to link worker. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Link Worker
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Mining Worker</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="worker-id">8-Digit Worker ID</Label>
            <Input
              id="worker-id"
              placeholder="e.g., A3F7B2C8"
              value={workerId}
              onChange={(e) => {
                setWorkerId(e.target.value.toUpperCase().slice(0, 8));
                setVerificationStatus('idle');
                setErrorMessage('');
              }}
              className="font-mono text-lg tracking-wider"
              maxLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Find your worker ID in the MobileMonero app or XMRig config
            </p>
          </div>

          <ReferralCodeInput
            value={referralCode}
            onChange={setReferralCode}
          />

          {verificationStatus === 'error' && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <CheckCircle className="h-4 w-4" />
              Worker verified and linked!
            </div>
          )}

          <Button
            onClick={handleVerifyAndLink}
            disabled={workerId.length !== 8 || isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Link Worker'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
