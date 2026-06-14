import { Link, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export function ChatNav() {
  const location = useLocation();
  const isActive = location.pathname === '/chat';

  return (
    <Link
      to="/chat"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      <MessageSquare className="w-4 h-4" />
      <span>Encrypted Chat</span>
      <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
        E2E
      </span>
    </Link>
  );
}
