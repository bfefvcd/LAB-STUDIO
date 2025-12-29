
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { DetectionResult } from '../types';

const ObjectVision: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DetectionResult[]>([]);
  const [mode, setMode] = useState<'point' | 'box'>('point');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResults([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const runDetection = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const base64Data = image.split(',')[1];
      const prompt = mode === 'point' 
        ? "Point to no more than 10 items in the image. The answer should follow the json format: [{\"point\": [y, x], \"label\": \"name\"}]. Points are normalized 0-1000."
        : "Return bounding boxes as a JSON array with labels. Format: [{\"box_2d\": [ymin, xmin, ymax, xmax], \"label\": \"name\"}] normalized to 0-1000.";
      
      const response = await geminiService.detectObjects(base64Data, prompt);
      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed: DetectionResult[] = JSON.parse(cleaned);
      setResults(parsed);
    } catch (err) {
      console.error("Detection failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!imgRef.current || !canvasRef.current || results.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    results.forEach(res => {
      if (res.point) {
        const [y, x] = res.point;
        const realX = (x / 1000) * canvas.width;
        const realY = (y / 1000) * canvas.height;

        ctx.beginPath();
        ctx.arc(realX, realY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Inter';
        ctx.fillText(res.label, realX + 10, realY + 4);
      } else if (res.box_2d) {
        const [ymin, xmin, ymax, xmax] = res.box_2d;
        const left = (xmin / 1000) * canvas.width;
        const top = (ymin / 1000) * canvas.height;
        const width = ((xmax - xmin) / 1000) * canvas.width;
        const height = ((ymax - ymin) / 1000) * canvas.height;

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, width, height);

        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(left, top - 20, ctx.measureText(res.label).width + 10, 20);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Inter';
        ctx.fillText(res.label, left + 5, top - 6);
      }
    });
  }, [results, mode]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Object Vision Lab</h2>
        <p className="text-zinc-500 mb-8">Spatial awareness and precision pointing powered by Gemini Robotics</p>

        <div className="flex flex-col items-center gap-6">
          <div className="relative w-full max-w-2xl aspect-video bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-800 flex items-center justify-center overflow-hidden group">
            {image ? (
              <>
                <img ref={imgRef} src={image} alt="Upload" className="w-full h-full object-contain" />
                <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none" />
              </>
            ) : (
              <div className="text-zinc-600 flex flex-col items-center">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Drop an image or click to upload</p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="absolute inset-0 opacity-0 cursor-pointer" 
            />
          </div>

          <div className="flex items-center gap-4">
             <div className="bg-zinc-800 p-1 rounded-xl flex">
              <button 
                onClick={() => setMode('point')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'point' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Points
              </button>
              <button 
                onClick={() => setMode('box')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'box' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Boxes
              </button>
            </div>

            <button 
              disabled={!image || loading}
              onClick={runDetection}
              className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${loading || !image ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'}`}
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'ANALYZING...' : 'RUN DETECTION'}
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-mono text-zinc-500 uppercase mb-4">Detected Entities</h3>
          <div className="flex flex-wrap gap-2">
            {results.map((res, i) => (
              <div key={i} className="px-3 py-1 bg-zinc-800 rounded-lg text-xs font-medium border border-zinc-700">
                {res.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectVision;
