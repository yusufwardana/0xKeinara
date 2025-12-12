import React, { useRef, useEffect, useState } from 'react';
import { VisualMode } from '../types';

const VisualStimulator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeMode, setActiveMode] = useState<VisualMode['type']>('high-contrast');
  const [isRunning, setIsRunning] = useState(false);
  const animationRef = useRef<number | null>(null);

  const modes: VisualMode[] = [
    { name: 'Hitam Putih', type: 'high-contrast', description: 'Untuk bayi 0-3 bulan. Meningkatkan fokus.' },
    { name: 'Objek Bergerak', type: 'tracking', description: 'Untuk melatih pelacakan mata.' },
    { name: 'Warna-Warni', type: 'colors', description: 'Untuk bayi 6+ bulan. Pengenalan warna.' },
  ];

  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    
    // Tracking variables
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let dx = 2;
    let dy = 2;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (activeMode === 'high-contrast') {
        // Alternating Patterns
        const patternType = Math.floor(frame / 120) % 2; // Switch every 2 seconds approx
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';

        if (patternType === 0) {
          // Checkerboard
          const size = 100;
          for (let y = 0; y < canvas.height; y += size) {
            for (let x = 0; x < canvas.width; x += size) {
              if (((x / size) + (y / size)) % 2 === 0) {
                ctx.fillRect(x, y, size, size);
              }
            }
          }
        } else {
          // Bullseye expanding
          const maxRadius = Math.min(canvas.width, canvas.height) / 2;
          const pulse = (Math.sin(frame * 0.05) + 1) / 2; 
          
          for (let r = maxRadius; r > 0; r -= 40) {
             ctx.beginPath();
             ctx.arc(canvas.width/2, canvas.height/2, r * (0.8 + 0.2 * pulse), 0, Math.PI * 2);
             ctx.fillStyle = ((r / 40) % 2 === 0) ? 'black' : 'white';
             ctx.fill();
          }
        }

      } else if (activeMode === 'tracking') {
        ctx.fillStyle = '#f0f9ff'; // Light blue bg
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Bouncing red ball
        ctx.beginPath();
        ctx.arc(ballX, ballY, 40, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444'; // Red
        ctx.fill();
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 4;
        ctx.stroke();

        if (ballX + 40 > canvas.width || ballX - 40 < 0) dx = -dx;
        if (ballY + 40 > canvas.height || ballY - 40 < 0) dy = -dy;

        ballX += dx;
        ballY += dy;

      } else if (activeMode === 'colors') {
        // Slow color changing gradient
        const time = frame * 0.01;
        const r = Math.floor(128 + 128 * Math.sin(time));
        const g = Math.floor(128 + 128 * Math.sin(time + 2));
        const b = Math.floor(128 + 128 * Math.sin(time + 4));
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Floating shapes
        for(let i=0; i<5; i++) {
           ctx.fillStyle = 'rgba(255,255,255,0.3)';
           const x = (canvas.width / 5) * i + 50 + Math.sin(frame * 0.02 + i) * 30;
           const y = canvas.height / 2 + Math.cos(frame * 0.03 + i) * 50;
           ctx.beginPath();
           if (i % 2 === 0) {
             ctx.arc(x, y, 40, 0, Math.PI * 2);
           } else {
             ctx.rect(x-30, y-30, 60, 60);
           }
           ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning, activeMode]);

  // Handle canvas sizing
  useEffect(() => {
    const handleResize = () => {
        if(canvasRef.current) {
            canvasRef.current.width = canvasRef.current.offsetWidth;
            canvasRef.current.height = canvasRef.current.offsetHeight;
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
        <h2 className="text-xl font-semibold text-orange-600 mb-4 text-center">Visual Stimulation</h2>
        
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {modes.map((mode) => (
            <button
              key={mode.type}
              onClick={() => {
                  setActiveMode(mode.type);
                  setIsRunning(true);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeMode === mode.type
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              {mode.name}
            </button>
          ))}
        </div>

        <div className="relative w-full aspect-square md:aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-inner border-4 border-gray-800">
           {!isRunning && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-10">
                   <button 
                    onClick={() => setIsRunning(true)}
                    className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-orange-700 transform hover:scale-105 transition-all"
                   >
                       Mulai Play
                   </button>
               </div>
           )}
           <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
        
        <div className="mt-4 text-center text-gray-600">
            <p className="text-sm">{modes.find(m => m.type === activeMode)?.description}</p>
            {isRunning && (
                <button 
                    onClick={() => setIsRunning(false)}
                    className="mt-2 text-red-500 text-sm font-medium underline"
                >
                    Berhenti
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default VisualStimulator;