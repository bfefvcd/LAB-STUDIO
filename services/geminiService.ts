
import { GoogleGenAI, GenerateContentResponse, Modality, LiveServerMessage } from "@google/genai";
import { Scale, MusicGenerationMode, MusicConfig, WeightedPrompt } from "../types";

const API_KEY = process.env.API_KEY || '';

export class GeminiService {
  private ai: any;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  async detectObjects(imageBase64: string, prompt: string): Promise<string> {
    const response: GenerateContentResponse = await this.ai.models.generateContent({
      model: 'gemini-robotics-er-1.5-preview',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        },
        { text: prompt }
      ],
      config: {
        temperature: 0.5,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || '[]';
  }

  async connectVoiceAssistant(callbacks: {
    onopen?: () => void;
    onmessage?: (message: LiveServerMessage) => void;
    onerror?: (e: ErrorEvent) => void;
    onclose?: (e: CloseEvent) => void;
  }, tools: any[]) {
    return this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
        systemInstruction: 'You are a professional music studio assistant. Help the user select instruments, genres, moods, and configure music settings like BPM or density. Use the provided tools to update the UI state based on user requests.',
        tools: [{ functionDeclarations: tools }],
      }
    });
  }

  // Audio Utilities
  decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  encodeBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: this.encodeBase64(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }
}

export const geminiService = new GeminiService();
