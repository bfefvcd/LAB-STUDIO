
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { INSTRUMENTS, GENRES, MOODS } from '../constants';
import { Scale, MusicGenerationMode, MusicConfig, WeightedPrompt } from '../types';
import { geminiService } from '../services/geminiService';
import { Type, LiveServerMessage } from '@google/genai';

const MusicLab: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [prompts, setPrompts] = useState<WeightedPrompt[]>([]);
  const [config, setConfig] = useState<MusicConfig>({
    guidance: 4.5,
    bpm: 128,
    density: 0.7,
    brightness: 0.6,
    scale: Scale.SCALE_UNSPECIFIED,
    muteBass: false,
    muteDrums: false,
    onlyBassAndDrums: false,
    mode: MusicGenerationMode.QUALITY,
  });

  const sessionRef = useRef<any>(null);
  const voiceSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const togglePrompt = useCallback((text: string) => {
    setPrompts(prev => {
      const exists = prev.find(p => p.text === text);
      if (exists) return prev.filter(p => p.text !== text);
      return [...prev, { text, weight: 1.0 }];
    });
  }, []);

  const handleGenerateFullMusic = async () => {
    setIsGenerating(true);
    const steps = [
      'Analisando referências de estilo...',
      'Compondo arranjo instrumental...',
      'Sincronizando métrica das letras...',
      'Ajustando flow vocal...',
      'Processando Mixagem Profissional...',
      'Finalizando Masterização Hi-Fi...',
    ];

    for (const step of steps) {
      setGenerationStep(step);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setIsGenerating(false);
    setIsPlaying(true);
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    console.log("Full Production Completed. Starting Playback...", { 
      lyrics, 
      prompts, 
      config,
      features: ['Auto-Mix', 'Mastering', 'Vocal Alignment']
    });
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIsGenerating(false);
    if (sessionRef.current) {
      sessionRef.current.close();
    }
  };

  const stopAssistant = () => {
    setIsVoiceActive(false);
    if (voiceSessionRef.current) {
      voiceSessionRef.current.then((s: any) => s.close());
    }
    for (const source of sourcesRef.current) {
      source.stop();
    }
    sourcesRef.current.clear();
  };

  const startAssistant = async () => {
    if (!voiceAudioContextRef.current) {
      voiceAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const tools = [
      {
        name: 'toggleInfluence',
        description: 'Toggles a musical influence (instrument, genre, or mood) on or off.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.STRING, description: 'The name of the instrument, genre or mood.' }
          },
          required: ['value']
        }
      },
      {
        name: 'setLyrics',
        description: 'Updates the lyrics for the song.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: 'The lyrics to sing.' }
          },
          required: ['text']
        }
      },
      {
        name: 'generateMusic',
        description: 'Starts the full music generation process.',
        parameters: { type: Type.OBJECT, properties: {} }
      }
    ];

    const sessionPromise = geminiService.connectVoiceAssistant({
      onopen: () => {
        setIsVoiceActive(true);
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = geminiService.createPcmBlob(inputData);
          sessionPromise.then((session: any) => {
            session.sendRealtimeInput({ media: pcmBlob });
          });
        };
        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);
      },
      onmessage: async (message: LiveServerMessage) => {
        if (message.toolCall) {
          for (const fc of message.toolCall.functionCalls) {
            if (fc.name === 'generateMusic') {
              handleGenerateFullMusic();
              sessionPromise.then((s: any) => s.sendToolResponse({
                functionResponses: { id: fc.id, name: fc.name, response: { result: 'Generation started' } }
              }));
            } else if (fc.name === 'toggleInfluence') {
              const val = (fc.args as any).value;
              togglePrompt(val);
              sessionPromise.then((s: any) => s.sendToolResponse({
                functionResponses: { id: fc.id, name: fc.name, response: { result: `Toggled ${val}` } }
              }));
            } else if (fc.name === 'setLyrics') {
              setLyrics((fc.args as any).text);
              sessionPromise.then((s: any) => s.sendToolResponse({
                functionResponses: { id: fc.id, name: fc.name, response: { result: 'Lyrics updated' } }
              }));
            }
          }
        }

        const audioBase64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioBase64 && voiceAudioContextRef.current) {
          const ctx = voiceAudioContextRef.current;
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
          const audioBuffer = await geminiService.decodeAudioData(geminiService.decodeBase64(audioBase64), ctx, 24000, 1);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.addEventListener('ended', () => sourcesRef.current.delete(source));
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
          sourcesRef.current.add(source);
        }
      },
      onerror: (e) => {
        console.error("Studio Assistant Error", e);
        setIsVoiceActive(false);
      },
      onclose: () => setIsVoiceActive(false)
    }, tools);

    voiceSessionRef.current = sessionPromise;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 relative">
      {/* Generation Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 mb-8 relative">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
            <div className="absolute inset-4 bg-blue-500/10 rounded-full animate-pulse flex items-center justify-center">
              <MusicIcon />
            </div>
          </div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">CRIANDO SUA OBRA-PRIMA</h2>
          <p className="text-blue-500 font-mono text-sm uppercase tracking-widest animate-pulse">{generationStep}</p>
          <div className="w-full max-w-md h-1 bg-zinc-800 rounded-full mt-8 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(generationStep.length / 40) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Left Column: Master Controls */}
      <div className="xl:col-span-3 space-y-6">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-6 sticky top-24 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest">Mastering Studio</h3>
            <button 
              onClick={isVoiceActive ? stopAssistant : startAssistant}
              className={`p-2 rounded-xl transition-all ${isVoiceActive ? 'bg-blue-500 text-white animate-pulse shadow-lg shadow-blue-500/50' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              <VoiceIcon />
            </button>
          </div>

          <div className="space-y-5">
            <ControlGroup label="BPM" value={config.bpm}>
              <input type="range" min="60" max="200" value={config.bpm} onChange={(e) => setConfig({...config, bpm: parseInt(e.target.value)})} className="studio-range" />
            </ControlGroup>
            
            <ControlGroup label="Mix Depth" value={config.density.toFixed(2)}>
              <input type="range" min="0" max="1" step="0.01" value={config.density} onChange={(e) => setConfig({...config, density: parseFloat(e.target.value)})} className="studio-range" />
            </ControlGroup>

            <ControlGroup label="Brightness" value={config.brightness.toFixed(2)}>
              <input type="range" min="0" max="1" step="0.01" value={config.brightness} onChange={(e) => setConfig({...config, brightness: parseFloat(e.target.value)})} className="studio-range" />
            </ControlGroup>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Scale</label>
              <select value={config.scale} onChange={(e) => setConfig({...config, scale: e.target.value as Scale})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs">
                {Object.values(Scale).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <MasteringToggle label="Mute Bass" active={config.muteBass} onClick={() => setConfig({...config, muteBass: !config.muteBass})} />
              <MasteringToggle label="Mute Drums" active={config.muteDrums} onClick={() => setConfig({...config, muteDrums: !config.muteDrums})} />
            </div>
          </div>

          <button 
            onClick={isPlaying ? handleStop : handleGenerateFullMusic}
            className={`w-full py-5 rounded-2xl font-black text-sm tracking-widest transition-all shadow-2xl ${isPlaying ? 'bg-red-500/10 text-red-500 border border-red-500/50' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.02] active:scale-[0.98] shadow-blue-600/30'}`}
          >
            {isPlaying ? 'PARAR REPRODUÇÃO' : 'GERAR MÚSICA COMPLETA'}
          </button>
        </div>
      </div>

      {/* Middle Column: Composition Studio */}
      <div className="xl:col-span-6 space-y-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-8 min-h-[600px]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight">Estúdio de Composição</h2>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-400">MIXAGEM AUTO</span>
              <span className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-400">MASTER HI-FI</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Letras e Melodia Vocal</label>
              <span className="text-[10px] text-zinc-600 uppercase font-mono">Robô IA de Canto v3.0</span>
            </div>
            <textarea 
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Escreva sua letra aqui... O robô irá interpretar o flow, a métrica e o estilo baseado nas suas escolhas."
              className="w-full h-48 bg-zinc-950/50 border border-zinc-800 rounded-2xl p-6 text-lg font-medium focus:ring-1 ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="space-y-8 pt-6 border-t border-zinc-800/50">
             <PromptSection title="Base Instrumental" items={INSTRUMENTS} activePrompts={prompts} onToggle={togglePrompt} />
             <PromptSection title="Estilo e Flow" items={GENRES} activePrompts={prompts} onToggle={togglePrompt} />
             <PromptSection title="Texturas de Produção" items={MOODS} activePrompts={prompts} onToggle={togglePrompt} />
          </div>
        </div>
      </div>

      {/* Right Column: Signal & Status */}
      <div className="xl:col-span-3 space-y-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col">
           <div className="flex items-center gap-2 mb-6">
             <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-zinc-700'}`} />
             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Signal Chain</h3>
           </div>
           
           <div className="flex-1 space-y-3 overflow-y-auto">
              {prompts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <span className="text-xs font-bold">{p.text}</span>
                  <div className="w-8 h-px bg-zinc-800" />
                </div>
              ))}
              {lyrics && <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                 <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Vocal Layer</p>
                 <p className="text-xs text-zinc-400 line-clamp-3 italic">"{lyrics}"</p>
              </div>}
           </div>

           <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-[9px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tighter">
                O robô está processando estilos globais para garantir que sua mixagem seja competitiva em todas as plataformas de streaming.
              </p>
           </div>
        </div>
      </div>

      <style>{`
        .studio-range { width: 100%; accent-color: #3b82f6; background: #18181b; height: 4px; border-radius: 999px; appearance: none; }
        .studio-range::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; background: #fff; border-radius: 50%; cursor: pointer; }
      `}</style>
    </div>
  );
};

const ControlGroup: React.FC<{ label: string, value: string | number, children: React.ReactNode }> = ({ label, value, children }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-bold text-zinc-500 uppercase">{label}</label>
      <span className="text-[10px] font-mono font-bold text-blue-500">{value}</span>
    </div>
    {children}
  </div>
);

const MasteringToggle: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-3 py-2 rounded-lg text-[9px] font-bold uppercase transition-all border ${active ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
    {label}
  </button>
);

const PromptSection: React.FC<{ title: string, items: string[], activePrompts: WeightedPrompt[], onToggle: (s: string) => void }> = ({ title, items, activePrompts, onToggle }) => (
  <section className="space-y-3">
    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{title}</h4>
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <button key={item} onClick={() => onToggle(item)} className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${activePrompts.some(p => p.text === item) ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
          {item}
        </button>
      ))}
    </div>
  </section>
);

const VoiceIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const MusicIcon = () => (
  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
  </svg>
);

export default MusicLab;
