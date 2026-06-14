import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService, type ChatMessage } from '@/services/chatService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/SEOHead';
import {
  Send,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Lock,
} from 'lucide-react';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [username, setUsername] = useState('');
  const [serverUrl, setServerUrl] = useState('wss://relay.mobilemonero.com:8443');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleStatus = useCallback((status: boolean) => {
    setConnected(status);
    setConnecting(false);
  }, []);

  useEffect(() => {
    const unsubMsg = chatService.onMessage(handleMessage);
    const unsubStatus = chatService.onStatusChange(handleStatus);
    return () => {
      unsubMsg();
      unsubStatus();
    };
  }, [handleMessage, handleStatus]);

  const connect = () => {
    if (!caseId || !username) return;
    setConnecting(true);
    chatService.connect(serverUrl, caseId, username);
  };

  const disconnect = () => {
    chatService.disconnect();
    setMessages([]);
    setConnected(false);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      await chatService.sendMessage(input.trim());
      setInput('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!connected) {
    return (
      <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center p-6 bg-slate-950">
        <SEOHead title="Encrypted Chat | ZeroClaw" />
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-emerald-400" />
            </div>
            <CardTitle className="text-white text-xl">
              Zero-Knowledge Chat
            </CardTitle>
            <p className="text-slate-400 text-sm mt-1">
              End-to-end encrypted. RAM-only. No logs.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                Server URL
              </label>
              <Input
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="wss://relay.example.com:8443"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                Case ID
              </label>
              <Input
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="e.g., TREASURY-2026-Q2"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                Your Name
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Enter your name"
              />
            </div>
            <Button
              onClick={connect}
              disabled={connecting || !caseId || !username}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {connecting ? 'Connecting...' : 'Connect Securely'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-64px)] flex flex-col bg-slate-950">
      <SEOHead title={`Chat: ${caseId} | ZeroClaw`} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {connected ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-400" />
            )}
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
            >
              {connected ? 'Encrypted' : 'Disconnected'}
            </Badge>
          </div>
          <div className="text-sm text-slate-300">
            Case: <span className="font-medium text-white">{caseId}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            <span>RAM-Only</span>
          </div>
          <Button
            onClick={disconnect}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Wipe & Disconnect
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-slate-600 py-12">
            <Lock className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No messages yet. Start the conversation.</p>
            <p className="text-xs mt-1">
              All messages are end-to-end encrypted.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === username ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
                msg.sender === username
                  ? 'bg-emerald-600/20 border border-emerald-500/30'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-slate-400">
                  {msg.sender}
                </span>
                <span className="text-[10px] text-slate-600">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type an encrypted message..."
            className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
