
import React, { useState } from 'react';
import MusicLab from './components/MusicLab';
import ObjectVision from './components/ObjectVision';
import { LabTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LabTab>('music');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-400 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">X</span>
            </div>
            <h1 className="font-bold text-xl tracking-tight hidden sm:block">Creativity Lab</h1>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl">
            <TabButton 
              active={activeTab === 'music'} 
              onClick={() => setActiveTab('music')} 
              icon={<MusicIcon />}
              label="Music Lab"
            />
            <TabButton 
              active={activeTab === 'vision'} 
              onClick={() => setActiveTab('vision')} 
              icon={<VisionIcon />}
              label="Object Vision"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-zinc-500 px-2 py-1 border border-zinc-800 rounded bg-zinc-900/50">
              v1.5-ALPHA
            </span>
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'music' ? <MusicLab /> : <ObjectVision />}
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-zinc-800 text-center text-zinc-600 text-xs">
        <p>© 2024 AI Creativity Lab • Powered by Lyria & Gemini Robotics</p>
      </footer>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const MusicIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
  </svg>
);

const VisionIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

export default App;
