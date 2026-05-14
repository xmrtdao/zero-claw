interface RealTimeConfig {
  voiceProcessing: boolean;
  videoProcessing: boolean;
  emotionAnalysis: boolean;
  ambientMode: boolean;
  processingIntensity: 'low' | 'medium' | 'high';
}

interface RealTimeContext {
  currentEmotion?: string;
  voiceActivity: boolean;
  speechConfidence: number;
  visualContext: string;
  environmentalContext: string;
  lastUpdate: number;
}

class RealTimeProcessingService {
  private config: RealTimeConfig;
  private context: RealTimeContext;
  private isProcessing = false;
  private callbacks: Map<string, Function> = new Map();
  private processingWorker?: Worker;

  constructor(config: Partial<RealTimeConfig> = {}) {
    this.config = {
      voiceProcessing: true,
      videoProcessing: true,
      emotionAnalysis: true,
      ambientMode: false,
      processingIntensity: 'medium',
      ...config
    };

    this.context = {
      voiceActivity: false,
      speechConfidence: 0,
      visualContext: '',
      environmentalContext: '',
      lastUpdate: Date.now()
    };
  }

  async initialize() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('🔄 Initializing real-time processing...');
    
    // Initialize web worker for background processing
    try {
      this.processingWorker = new Worker(
        URL.createObjectURL(new Blob([this.getWorkerScript()], { type: 'application/javascript' }))
      );
      
      this.processingWorker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };
    } catch (error) {
      console.warn('Web Worker not available, using main thread processing');
    }
  }

  private getWorkerScript(): string {
    return `
      let processingInterval;
      
      self.onmessage = function(e) {
        const { type, data } = e.data;
        
        switch(type) {
          case 'START_PROCESSING':
            startProcessing(data.interval);
            break;
          case 'STOP_PROCESSING':
            stopProcessing();
            break;
          case 'ANALYZE_FRAME':
            analyzeFrame(data);
            break;
        }
      };
      
      function startProcessing(interval) {
        processingInterval = setInterval(() => {
          self.postMessage({ type: 'PROCESS_TICK', timestamp: Date.now() });
        }, interval);
      }
      
      function stopProcessing() {
        if (processingInterval) {
          clearInterval(processingInterval);
        }
      }
      
      function analyzeFrame(frameData) {
        // Lightweight frame analysis in worker
        const analysis = {
          timestamp: Date.now(),
          hasMovement: Math.random() > 0.7, // Placeholder
          brightness: Math.random(),
          complexity: Math.random()
        };
        
        self.postMessage({ type: 'FRAME_ANALYSIS', data: analysis });
      }
    `;
  }

  private handleWorkerMessage(message: any) {
    switch(message.type) {
      case 'PROCESS_TICK':
        this.updateContext();
        break;
      case 'FRAME_ANALYSIS':
        this.handleFrameAnalysis(message.data);
        break;
    }
  }

  async startContinuousProcessing() {
    if (!this.isProcessing) {
      await this.initialize();
    }

    const interval = this.getProcessingInterval();
    
    if (this.processingWorker) {
      this.processingWorker.postMessage({
        type: 'START_PROCESSING',
        data: { interval }
      });
    }

    this.notifyCallbacks('processing_started', this.context);
  }

  stopContinuousProcessing() {
    if (this.processingWorker) {
      this.processingWorker.postMessage({ type: 'STOP_PROCESSING' });
    }
    
    this.isProcessing = false;
    this.notifyCallbacks('processing_stopped', this.context);
  }

  private getProcessingInterval(): number {
    switch(this.config.processingIntensity) {
      case 'low': return 1000; // 1 second
      case 'medium': return 500; // 0.5 seconds
      case 'high': return 200; // 0.2 seconds
      default: return 500;
    }
  }

  private updateContext() {
    this.context.lastUpdate = Date.now();
    this.notifyCallbacks('context_updated', this.context);
  }

  private handleFrameAnalysis(analysis: any) {
    // Update visual context based on frame analysis
    if (analysis.hasMovement) {
      this.context.visualContext = 'active_movement';
    }
    
    this.notifyCallbacks('frame_analyzed', analysis);
  }

  updateVoiceActivity(isActive: boolean, confidence: number = 0) {
    this.context.voiceActivity = isActive;
    this.context.speechConfidence = confidence;
    this.context.lastUpdate = Date.now();
    
    this.notifyCallbacks('voice_activity_changed', {
      isActive,
      confidence,
      context: this.context
    });
  }

  updateEmotionalContext(emotion: string, confidence: number = 0) {
    this.context.currentEmotion = emotion;
    this.context.lastUpdate = Date.now();
    
    this.notifyCallbacks('emotion_detected', {
      emotion,
      confidence,
      context: this.context
    });
  }

  updateVisualContext(visualData: string) {
    this.context.visualContext = visualData;
    this.context.lastUpdate = Date.now();
    
    if (this.processingWorker) {
      this.processingWorker.postMessage({
        type: 'ANALYZE_FRAME',
        data: visualData
      });
    }
    
    this.notifyCallbacks('visual_context_updated', this.context);
  }

  getContext(): RealTimeContext {
    return { ...this.context };
  }

  getConfig(): RealTimeConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<RealTimeConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.notifyCallbacks('config_updated', this.config);
  }

  subscribe(event: string, callback: Function): () => void {
    const key = `${event}_${Date.now()}_${Math.random()}`;
    this.callbacks.set(key, callback);
    
    return () => {
      this.callbacks.delete(key);
    };
  }

  private notifyCallbacks(event: string, data: any) {
    Array.from(this.callbacks.entries())
      .filter(([key]) => key.startsWith(event))
      .forEach(([, callback]) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in real-time callback:', error);
        }
      });
  }

  destroy() {
    this.stopContinuousProcessing();
    
    if (this.processingWorker) {
      this.processingWorker.terminate();
    }
    
    this.callbacks.clear();
    this.isProcessing = false;
  }
}

export const realTimeProcessingService = new RealTimeProcessingService();
export type { RealTimeConfig, RealTimeContext };