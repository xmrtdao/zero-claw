import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  to?: string;
  label?: string;
}

export function BackButton({ to = '/dashboard', label = 'Back' }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      onClick={() => navigate(to)}
      variant="ghost"
      size="sm"
      className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 -ml-2"
    >
      <ArrowLeft className="w-4 h-4 mr-1.5" />
      {label}
    </Button>
  );
}
