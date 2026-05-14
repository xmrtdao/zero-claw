/**
 * Speech Learning Service
 * Learns user preferences for pronunciation, speech rate, and voice preferences
 * Stores preferences in localStorage for persistence
 */

export interface SpeechPreference {
  word: string;
  pronunciation: string;
  rate?: number;
  emphasis?: 'strong' | 'moderate' | 'subtle';
  notes?: string;
}

class SpeechLearningService {
  private preferences: Map<string, SpeechPreference> = new Map();
  private defaultRate = 0.95;
  private storageKey = 'eliza_speech_preferences';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load preferences from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.defaultRate = data.defaultRate || 0.95;
        if (data.preferences) {
          Object.entries(data.preferences).forEach(([word, pref]) => {
            this.preferences.set(word, pref as SpeechPreference);
          });
        }
        console.log(`✅ Loaded ${this.preferences.size} speech preferences`);
      }
    } catch (error) {
      console.warn('Could not load speech preferences:', error);
    }
  }

  /**
   * Save preferences to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        defaultRate: this.defaultRate,
        preferences: Object.fromEntries(this.preferences)
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save speech preferences:', error);
    }
  }

  /**
   * Add or update a pronunciation preference
   */
  addPreference(preference: SpeechPreference): void {
    this.preferences.set(preference.word.toLowerCase(), preference);
    this.saveToStorage();
    console.log(`🎓 Learned pronunciation for "${preference.word}": ${preference.pronunciation}`);
  }

  /**
   * Apply learned preferences to text before speaking
   */
  applyPreferences(text: string): { text: string; rate: number } {
    let modifiedText = text;
    let rate = this.defaultRate;

    // Apply pronunciation substitutions
    this.preferences.forEach((pref) => {
      const regex = new RegExp(`\\b${pref.word}\\b`, 'gi');
      if (regex.test(modifiedText)) {
        modifiedText = modifiedText.replace(regex, pref.pronunciation);
        
        // Use word-specific rate if available
        if (pref.rate) {
          rate = pref.rate;
        }
      }
    });

    return { text: modifiedText, rate };
  }

  /**
   * Parse user instruction to learn pronunciation
   * Examples:
   * - "pronounce XMRT as ex em are tee"
   * - "say Eliza slower"
   * - "speak faster"
   */
  parseInstruction(instruction: string): boolean {
    const lower = instruction.toLowerCase();

    // Pattern: "pronounce X as Y"
    const pronounceMatch = lower.match(/pronounce\s+(\S+)\s+as\s+(.+)/i);
    if (pronounceMatch) {
      this.addPreference({
        word: pronounceMatch[1],
        pronunciation: pronounceMatch[2].trim()
      });
      return true;
    }

    // Pattern: "say X slower/faster"
    const rateMatch = lower.match(/say\s+(\S+)\s+(slower|faster)/i);
    if (rateMatch) {
      const rate = rateMatch[2] === 'slower' ? 0.8 : 1.2;
      this.addPreference({
        word: rateMatch[1],
        pronunciation: rateMatch[1], // Keep original
        rate
      });
      return true;
    }

    // Pattern: "speak slower/faster"
    if (lower.includes('speak slower') || lower.includes('talk slower')) {
      this.defaultRate = Math.max(0.7, this.defaultRate - 0.1);
      this.saveToStorage();
      console.log(`🎓 Global rate adjusted to ${this.defaultRate}`);
      return true;
    }

    if (lower.includes('speak faster') || lower.includes('talk faster')) {
      this.defaultRate = Math.min(1.3, this.defaultRate + 0.1);
      this.saveToStorage();
      console.log(`🎓 Global rate adjusted to ${this.defaultRate}`);
      return true;
    }

    return false;
  }

  /**
   * Adjust speech rate based on feedback
   */
  adjustRate(faster: boolean): void {
    if (faster) {
      this.defaultRate = Math.min(1.3, this.defaultRate + 0.05);
    } else {
      this.defaultRate = Math.max(0.7, this.defaultRate - 0.05);
    }
    this.saveToStorage();
    console.log(`🎓 Speech rate adjusted to ${this.defaultRate}`);
  }

  getDefaultRate(): number {
    return this.defaultRate;
  }

  getPreferences(): SpeechPreference[] {
    return Array.from(this.preferences.values());
  }
}

export const speechLearningService = new SpeechLearningService();

