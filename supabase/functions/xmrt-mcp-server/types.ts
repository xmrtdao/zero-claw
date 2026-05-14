export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: {
    tools: Record<string, any>;
    resources: {
      subscribe: boolean;
      listChanged: boolean;
    };
    prompts: Record<string, any>;
    logging: Record<string, any>;
  };
}

export interface MCPRequest {
  method: string;
  params?: any;
}

export interface MCPResponse {
  [key: string]: any;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface Prompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required: boolean;
    default?: any;
  }>;
}
