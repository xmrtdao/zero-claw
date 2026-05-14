interface EmotionData {
  primary: string;
  secondary?: string;
  intensity: number;
  confidence: number;
  timestamp: number;
  source: 'voice' | 'visual' | 'text' | 'multimodal';
}

interface EmotionalProfile {
  dominantEmotion: string;
  emotionalStability: number;
  expressiveness: number;
  reactivity: number;
  baselineEmotion: string;
  emotionalHistory: EmotionData[];
}

class EmotionalIntelligenceService {
  private emotionalProfile: EmotionalProfile;
  private emotionBuffer: EmotionData[] = [];
  private bufferSize = 50;

  // Emotion mapping for different sources
  private voiceEmotionMap = {
    'happy': { arousal: 0.8, valence: 0.9 },
    'sad': { arousal: -0.5, valence: -0.8 },
    'angry': { arousal: 0.9, valence: -0.7 },
    'excited': { arousal: 0.9, valence: 0.8 },
    'calm': { arousal: -0.3, valence: 0.5 },
    'frustrated': { arousal: 0.6, valence: -0.6 },
    'confident': { arousal: 0.4, valence: 0.7 },
    'nervous': { arousal: 0.7, valence: -0.3 }
  };

  constructor() {
    this.emotionalProfile = {
      dominantEmotion: 'neutral',
      emotionalStability: 0.5,
      expressiveness: 0.5,
      reactivity: 0.5,
      baselineEmotion: 'neutral',
      emotionalHistory: []
    };
  }

  analyzeVoiceEmotion(audioData: any, transcript?: string): EmotionData {
    // Simulate voice emotion analysis
    // In real implementation, this would use audio analysis libraries
    const emotions = ['happy', 'calm', 'excited', 'confident', 'neutral'];
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    let intensity = Math.random() * 0.8 + 0.2; // 0.2 to 1.0
    let confidence = Math.random() * 0.6 + 0.4; // 0.4 to 1.0
    
    // Adjust based on transcript content if available
    if (transcript) {
      const analysisFromText = this.analyzeTextEmotion(transcript);
      intensity = (intensity + analysisFromText.intensity) / 2;
      confidence = Math.max(confidence, analysisFromText.confidence);
    }

    const emotionData: EmotionData = {
      primary: randomEmotion,
      intensity,
      confidence,
      timestamp: Date.now(),
      source: 'voice'
    };

    this.addEmotionData(emotionData);
    return emotionData;
  }

  analyzeVisualEmotion(imageData: string | HTMLImageElement): EmotionData {
    // Simulate facial expression analysis
    // In real implementation, this would use computer vision libraries
    const facialEmotions = ['happy', 'sad', 'surprised', 'focused', 'neutral'];
    const randomEmotion = facialEmotions[Math.floor(Math.random() * facialEmotions.length)];
    
    const emotionData: EmotionData = {
      primary: randomEmotion,
      intensity: Math.random() * 0.7 + 0.3,
      confidence: Math.random() * 0.5 + 0.5,
      timestamp: Date.now(),
      source: 'visual'
    };

    this.addEmotionData(emotionData);
    return emotionData;
  }

  analyzeTextEmotion(text: string): EmotionData {
    // Simple text emotion analysis
    const positiveWords = ['great', 'awesome', 'love', 'happy', 'excited', 'wonderful', 'amazing'];
    const negativeWords = ['sad', 'angry', 'frustrated', 'hate', 'terrible', 'awful', 'disappointed'];
    const neutralWords = ['okay', 'fine', 'normal', 'standard', 'regular'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
      if (neutralWords.includes(word)) neutralScore++;
    });
    
    let primary = 'neutral';
    let intensity = 0.3;
    
    if (positiveScore > negativeScore && positiveScore > 0) {
      primary = 'happy';
      intensity = Math.min(positiveScore / words.length * 2, 1);
    } else if (negativeScore > positiveScore && negativeScore > 0) {
      primary = 'frustrated';
      intensity = Math.min(negativeScore / words.length * 2, 1);
    }
    
    const emotionData: EmotionData = {
      primary,
      intensity,
      confidence: 0.6,
      timestamp: Date.now(),
      source: 'text'
    };

    this.addEmotionData(emotionData);
    return emotionData;
  }

  analyzeMultimodalEmotion(voiceData?: any, visualData?: any, textData?: string): EmotionData {
    const emotions: EmotionData[] = [];
    
    if (voiceData) {
      emotions.push(this.analyzeVoiceEmotion(voiceData, textData));
    }
    
    if (visualData) {
      emotions.push(this.analyzeVisualEmotion(visualData));
    }
    
    if (textData && !voiceData) {
      emotions.push(this.analyzeTextEmotion(textData));
    }
    
    if (emotions.length === 0) {
      return {
        primary: 'neutral',
        intensity: 0.3,
        confidence: 0.3,
        timestamp: Date.now(),
        source: 'multimodal'
      };
    }
    
    // Combine emotions using weighted average
    const weightedEmotion = this.combineEmotions(emotions);
    weightedEmotion.source = 'multimodal';
    
    this.addEmotionData(weightedEmotion);
    return weightedEmotion;
  }

  private combineEmotions(emotions: EmotionData[]): EmotionData {
    if (emotions.length === 1) return emotions[0];
    
    // Weight by confidence and recency
    const now = Date.now();
    const weightedEmotions = emotions.map(emotion => ({
      ...emotion,
      weight: emotion.confidence * (1 - (now - emotion.timestamp) / 10000) // Decay over 10 seconds
    }));
    
    // Find dominant emotion
    const emotionScores: Record<string, number> = {};
    let totalWeight = 0;
    let totalIntensity = 0;
    let totalConfidence = 0;
    
    weightedEmotions.forEach(emotion => {
      const score = emotion.intensity * emotion.weight;
      emotionScores[emotion.primary] = (emotionScores[emotion.primary] || 0) + score;
      totalWeight += emotion.weight;
      totalIntensity += emotion.intensity * emotion.weight;
      totalConfidence += emotion.confidence * emotion.weight;
    });
    
    const dominantEmotion = Object.entries(emotionScores)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral';
    
    return {
      primary: dominantEmotion,
      intensity: totalIntensity / totalWeight,
      confidence: totalConfidence / totalWeight,
      timestamp: now,
      source: 'multimodal'
    };
  }

  private addEmotionData(emotionData: EmotionData) {
    this.emotionBuffer.push(emotionData);
    
    // Maintain buffer size
    if (this.emotionBuffer.length > this.bufferSize) {
      this.emotionBuffer.shift();
    }
    
    // Update emotional profile
    this.updateEmotionalProfile();
  }

  private updateEmotionalProfile() {
    if (this.emotionBuffer.length === 0) return;
    
    const recentEmotions = this.emotionBuffer.slice(-20); // Last 20 emotions
    
    // Calculate dominant emotion
    const emotionCounts: Record<string, number> = {};
    recentEmotions.forEach(emotion => {
      emotionCounts[emotion.primary] = (emotionCounts[emotion.primary] || 0) + emotion.intensity;
    });
    
    this.emotionalProfile.dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral';
    
    // Calculate emotional stability (consistency of emotions)
    const intensities = recentEmotions.map(e => e.intensity);
    const avgIntensity = intensities.reduce((sum, i) => sum + i, 0) / intensities.length;
    const variance = intensities.reduce((sum, i) => sum + Math.pow(i - avgIntensity, 2), 0) / intensities.length;
    this.emotionalProfile.emotionalStability = Math.max(0, 1 - variance);
    
    // Calculate expressiveness (average intensity)
    this.emotionalProfile.expressiveness = avgIntensity;
    
    // Calculate reactivity (how quickly emotions change)
    let changes = 0;
    for (let i = 1; i < recentEmotions.length; i++) {
      if (recentEmotions[i].primary !== recentEmotions[i-1].primary) {
        changes++;
      }
    }
    this.emotionalProfile.reactivity = changes / (recentEmotions.length - 1);
    
    // Update history
    this.emotionalProfile.emotionalHistory = [...this.emotionBuffer];
  }

  getCurrentEmotion(): EmotionData | null {
    return this.emotionBuffer[this.emotionBuffer.length - 1] || null;
  }

  getEmotionalProfile(): EmotionalProfile {
    return { ...this.emotionalProfile };
  }

  getEmotionalTrend(timeWindow: number = 300000): string {
    const cutoff = Date.now() - timeWindow;
    const recentEmotions = this.emotionBuffer.filter(e => e.timestamp > cutoff);
    
    if (recentEmotions.length < 3) return 'stable';
    
    const firstHalf = recentEmotions.slice(0, Math.ceil(recentEmotions.length / 2));
    const secondHalf = recentEmotions.slice(Math.ceil(recentEmotions.length / 2));
    
    const firstAvgValence = this.getAverageValence(firstHalf);
    const secondAvgValence = this.getAverageValence(secondHalf);
    
    const difference = secondAvgValence - firstAvgValence;
    
    if (difference > 0.2) return 'improving';
    if (difference < -0.2) return 'declining';
    return 'stable';
  }

  private getAverageValence(emotions: EmotionData[]): number {
    if (emotions.length === 0) return 0;
    
    const valences = emotions.map(emotion => {
      const emotionMap = this.voiceEmotionMap[emotion.primary as keyof typeof this.voiceEmotionMap];
      return emotionMap ? emotionMap.valence : 0;
    });
    
    return valences.reduce((sum, v) => sum + v, 0) / valences.length;
  }

  generateEmotionalInsight(): string {
    const profile = this.emotionalProfile;
    const currentEmotion = this.getCurrentEmotion();
    const trend = this.getEmotionalTrend();
    
    if (!currentEmotion) return 'Unable to determine current emotional state';
    
    let insight = `User is currently feeling ${currentEmotion.primary}`;
    
    if (currentEmotion.intensity > 0.7) {
      insight += ' with high intensity';
    } else if (currentEmotion.intensity < 0.3) {
      insight += ' mildly';
    }
    
    if (trend !== 'stable') {
      insight += ` and emotional state is ${trend}`;
    }
    
    if (profile.emotionalStability < 0.3) {
      insight += '. Emotions are quite variable';
    } else if (profile.emotionalStability > 0.7) {
      insight += '. Emotional state is very stable';
    }
    
    return insight;
  }

  reset() {
    this.emotionBuffer = [];
    this.emotionalProfile = {
      dominantEmotion: 'neutral',
      emotionalStability: 0.5,
      expressiveness: 0.5,
      reactivity: 0.5,
      baselineEmotion: 'neutral',
      emotionalHistory: []
    };
  }
}

export const emotionalIntelligenceService = new EmotionalIntelligenceService();
export type { EmotionData, EmotionalProfile };