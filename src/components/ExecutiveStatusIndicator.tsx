import { useAPIKeyHealth } from "@/services/credentialManager";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronRight, Settings } from "lucide-react";
import { AIExecutiveKeyInput } from "./AIExecutiveKeyInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const EXECUTIVES = [
  { 
    name: 'Vercel AI', 
    service: 'vercel_ai', 
    role: 'CSO',
    keyPrefix: 'vck_',
    helpUrl: 'https://vercel.com/docs/ai-sdk',
    secretName: 'VERCEL_AI_GATEWAY_KEY'
  },
  { 
    name: 'DeepSeek', 
    service: 'deepseek', 
    role: 'CTO',
    keyPrefix: 'sk-',
    helpUrl: 'https://platform.deepseek.com/api_keys',
    secretName: 'DEEPSEEK_API_KEY'
  },
  { 
    name: 'Lovable AI', 
    service: 'lovable_ai', 
    role: 'Backup CSO',
    keyPrefix: 'lvbl_',
    helpUrl: 'https://docs.lovable.dev/features/ai',
    secretName: 'LOVABLE_API_KEY'
  },
  { 
    name: 'Gemini', 
    service: 'gemini', 
    role: 'CPO',
    keyPrefix: 'AIza',
    helpUrl: 'https://aistudio.google.com/app/apikey',
    secretName: 'GEMINI_API_KEY'
  },
  { 
    name: 'OpenAI', 
    service: 'openai', 
    role: 'CAO',
    keyPrefix: 'sk-',
    helpUrl: 'https://platform.openai.com/api-keys',
    secretName: 'OPENAI_API_KEY'
  }
];

export const ExecutiveStatusIndicator = () => {
  const { health, loading } = useAPIKeyHealth();

  const getStatus = (serviceName: string) => {
    const service = health.find(h => h.service_name === serviceName);
    
    if (!service) return 'unknown';
    if (service.is_healthy && !service.expiry_warning) return 'healthy';
    if (service.is_healthy && service.expiry_warning) return 'warning';
    return 'error';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-mining-active';
      case 'warning': return 'bg-mining-warning';
      case 'error': return 'bg-mining-error';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Ready';
      case 'warning': return 'Expiring Soon';
      case 'error': return 'Unavailable';
      default: return 'Unknown';
    }
  };

  const getStatusMessage = (exec: typeof EXECUTIVES[0]) => {
    const service = health.find(h => h.service_name === exec.service);
    if (!service) return 'Status unknown';
    if (service.error_message) return service.error_message;
    if (service.expiry_warning && service.days_until_expiry) {
      return `API key expires in ${service.days_until_expiry} days`;
    }
    return 'All systems operational';
  };

  if (loading) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="flex items-center gap-2 justify-center px-3 py-2 rounded-lg hover:bg-secondary/50 active:bg-secondary transition-colors touch-manipulation">
          <span className="text-xs text-muted-foreground font-medium">AI Executives</span>
          <div className="flex items-center gap-1.5">
            {EXECUTIVES.map((exec) => {
              const status = getStatus(exec.service);
              return (
                <div 
                  key={exec.service}
                  className={`w-2 h-2 rounded-full ${getStatusColor(status)} transition-colors`}
                  role="status"
                  aria-label={`${exec.name} status: ${getStatusText(status)}`}
                />
              );
            })}
          </div>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>AI Executive Management</SheetTitle>
          <SheetDescription>
            Monitor health and configure API keys for all AI executives
          </SheetDescription>
        </SheetHeader>
        
        <Tabs defaultValue="status" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="configure">
              <Settings className="w-3 h-3 mr-2" />
              Configure Keys
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4 mt-4">
            {EXECUTIVES.map((exec) => {
              const status = getStatus(exec.service);
              return (
                <div 
                  key={exec.service}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} mt-1 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-foreground">{exec.name}</h4>
                      <span className="text-xs text-muted-foreground">{exec.role}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{getStatusText(status)}</p>
                    <p className="text-xs text-muted-foreground/80">{getStatusMessage(exec)}</p>
                  </div>
                </div>
              );
            })}
          </TabsContent>
          
          <TabsContent value="configure" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Update API keys below. Changes take effect immediately and are verified by the health monitor.
            </p>
            {EXECUTIVES.map((exec) => (
              <AIExecutiveKeyInput
                key={exec.service}
                serviceName={exec.service}
                serviceLabel={exec.name}
                role={exec.role}
                keyPrefix={exec.keyPrefix}
                helpUrl={exec.helpUrl}
                secretName={exec.secretName}
              />
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
