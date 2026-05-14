import OpenAI from 'openai';

export interface APIKeyStatus {
  isValid: boolean;
  keyType: 'default' | 'user' | 'env' | 'none';
  lastChecked: Date | null;
  errorMessage?: string;
}

export class OpenAIAPIKeyManager {
  private static instance: OpenAIAPIKeyManager;
  private userApiKey: string | null = null;
  private keyStatus: APIKeyStatus = {
    isValid: false,
    keyType: 'none',
    lastChecked: null
  };

  private constructor() {
    this.loadUserApiKey();
  }

  public static getInstance(): OpenAIAPIKeyManager {
    if (!OpenAIAPIKeyManager.instance) {
      OpenAIAPIKeyManager.instance = new OpenAIAPIKeyManager();
    }
    return OpenAIAPIKeyManager.instance;
  }

  private loadUserApiKey(): void {
    try {
      const stored = localStorage.getItem('openai_user_api_key');
      if (stored) {
        this.userApiKey = stored;
        console.log('✅ User OpenAI API key loaded from localStorage');
      }
    } catch (error) {
      console.warn('Failed to load user OpenAI API key from localStorage:', error);
    }
  }

  private saveUserApiKey(apiKey: string): void {
    try {
      localStorage.setItem('openai_user_api_key', apiKey);
      console.log('✅ User OpenAI API key saved to localStorage');
    } catch (error) {
      console.warn('Failed to save user OpenAI API key to localStorage:', error);
    }
  }

  public async setUserApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { success: false, message: 'API key cannot be empty' };
    }

    // Basic validation for OpenAI API keys
    if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      return { success: false, message: 'Invalid API key format. OpenAI API keys start with "sk-"' };
    }

    console.log('🔑 Validating user OpenAI API key...');
    
    try {
      // Test the API key by making a simple request
      const openai = new OpenAI({ 
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true
      });
      
      // Simple test prompt
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5
      });
      
      if (completion.choices && completion.choices.length > 0) {
        this.userApiKey = apiKey.trim();
        this.saveUserApiKey(apiKey.trim());
        this.keyStatus = {
          isValid: true,
          keyType: 'user',
          lastChecked: new Date()
        };
        console.log('✅ User OpenAI API key validated successfully');
        return { success: true, message: 'OpenAI API key validated and saved successfully!' };
      } else {
        return { success: false, message: 'API key validation failed - no response received' };
      }
    } catch (error: any) {
      console.error('❌ OpenAI API key validation failed:', error);
      
      let errorMessage = 'Invalid API key';
      if (error.message?.includes('quota')) {
        errorMessage = 'API key quota exceeded. Please check your OpenAI usage limits.';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'Invalid API key. Please check the key from OpenAI platform.';
      } else if (error.message?.includes('permission')) {
        errorMessage = 'API key lacks required permissions.';
      }
      
      return { success: false, message: errorMessage };
    }
  }

  public clearUserApiKey(): void {
    this.userApiKey = null;
    try {
      localStorage.removeItem('openai_user_api_key');
      console.log('✅ User OpenAI API key cleared');
    } catch (error) {
      console.warn('Failed to clear user OpenAI API key from localStorage:', error);
    }
    this.keyStatus = {
      isValid: false,
      keyType: 'none',
      lastChecked: new Date()
    };
  }

  public getCurrentApiKey(): string | null {
    // Priority: user key first, then environment variable (from Supabase secrets)
    if (this.userApiKey) {
      console.log('🔑 Using user-provided OpenAI API key');
      return this.userApiKey;
    }
    
    // Note: We'll use Supabase Edge Functions for server-side OpenAI calls
    // to keep the API key secure
    return null;
  }

  public async createOpenAIInstance(): Promise<OpenAI | null> {
    const apiKey = this.getCurrentApiKey();
    if (!apiKey) {
      console.warn('⚠️ No client-side OpenAI API key available - will use server-side edge functions');
      return null;
    }

    try {
      const openai = new OpenAI({ 
        apiKey,
        dangerouslyAllowBrowser: true
      });
      console.log('✅ OpenAI client initialized with user API key');
      return openai;
    } catch (error) {
      console.error('❌ Failed to create OpenAI instance:', error);
      return null;
    }
  }

  public getKeyStatus(): APIKeyStatus {
    return { ...this.keyStatus };
  }

  public hasUserApiKey(): boolean {
    return !!this.userApiKey;
  }

  public async testCurrentKey(): Promise<APIKeyStatus> {
    const apiKey = this.getCurrentApiKey();
    
    if (!apiKey) {
      this.keyStatus = {
        isValid: false,
        keyType: 'none',
        lastChecked: new Date(),
        errorMessage: 'No API key available'
      };
      return this.keyStatus;
    }

    try {
      console.log('🧪 Testing current OpenAI API key...');
      const openai = new OpenAI({ 
        apiKey,
        dangerouslyAllowBrowser: true
      });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 5
      });
      
      if (completion.choices && completion.choices.length > 0) {
        this.keyStatus = {
          isValid: true,
          keyType: this.userApiKey ? 'user' : 'env',
          lastChecked: new Date()
        };
        console.log('✅ OpenAI API key test successful');
      } else {
        throw new Error('No response received');
      }
    } catch (error: any) {
      console.error('❌ OpenAI API key test failed:', error);
      
      let errorMessage = 'API key test failed';
      if (error.message?.includes('quota')) {
        errorMessage = 'API quota exceeded';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'Invalid API key';
      } else if (error.message?.includes('permission')) {
        errorMessage = 'Insufficient permissions';
      }
      
      this.keyStatus = {
        isValid: false,
        keyType: this.userApiKey ? 'user' : 'env',
        lastChecked: new Date(),
        errorMessage
      };
    }

    return this.keyStatus;
  }

  // Mark the current API key as working without doing another test call
  public markKeyAsWorking(): void {
    const apiKey = this.getCurrentApiKey();
    if (apiKey) {
      this.keyStatus = {
        isValid: true,
        keyType: this.userApiKey ? 'user' : 'env',
        lastChecked: new Date()
      };
      console.log('✅ OpenAI API key marked as working');
    }
  }
}

// Singleton instance
export const openAIApiKeyManager = OpenAIAPIKeyManager.getInstance();
