import React, { useRef, useEffect, useState } from 'react';
import { VisualMode } from '../types';
import { Maximize, Minimize } from 'lucide-react';

const VisualStimulator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMode, setActiveMode] = useState<VisualMode['type']>('high-contrast');
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const animationRef = useRef<number | null>(null);

  const modes: VisualMode[] = [
    { name: 'Hitam Putih', type: 'high-contrast', description: 'Untuk 0-3 bulan. Pola kontras tinggi untuk fokus.' },
    { name: 'Objek Bergerak', type: 'tracking', description: 'Melatih otot mata mengikuti objek.' },
    { name: 'Warna-Warni', type: 'colors', description: 'Untuk 6+ bulan. Stimulasi spektrum warna & bentuk.' },
  ];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Force resize on change
      if (canvasRef.current) {
         setTimeout(() => {
             canvasRef.current!.width = canvasRef.current!.offsetWidth;
             canvasRef.current!.height = canvasRef.current!.offsetHeight;
         }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure size matches display
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let frame = 0;
    
    // Tracking variables
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let dx = 3;
    let dy = 3;

    const render = () => {
      frame++;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (activeMode === 'high-contrast') {
        // Change pattern every 3-4 seconds (approx 200 frames)
        const patternType = Math.floor(frame / 200) % 4; 
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'black';

        if (patternType === 0) {
          // CHECKERBOARD
          const size = Math.min(width, height) / 4;
          for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
              if (((x / size) + (y / size)) % 2 === 0) {
                ctx.fillRect(x, y, size, size);
              }
            }
          }
        } else if (patternType === 1) {
          // BULLSEYE (Pulsing)
          const maxRadius = Math.min(width, height) / 1.5;
          const pulse = (Math.sin(frame * 0.05) + 1) / 2; 
          
          for (let r = maxRadius; r > 0; r -= 40) {
             ctx.beginPath();
             ctx.arc(centerX, centerY, r * (0.9 + 0.1 * pulse), 0, Math.PI * 2);
             ctx.fillStyle = ((r / 40) % 2 === 0) ? 'black' : 'white';
             ctx.fill();
          }
        } else if (patternType === 2) {
          // SUNBURST (Rotating)
          const numRays = 12;
          const rotation = frame * 0.01;
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(rotation);
          
          for (let i = 0; i < numRays; i++) {
             ctx.beginPath();
             ctx.moveTo(0, 0);
             ctx.arc(0, 0, Math.max(width, height), (i * 2 * Math.PI) / numRays, ((i + 0.5) * 2 * Math.PI) / numRays);
             ctx.lineTo(0, 0);
             ctx.fill();
          }
          ctx.restore();
        } else {
           // MOVING BARS
           const barWidth = 60;
           const offset = (frame * 2) % (barWidth * 2);
           
           for(let x = -barWidth * 2; x < width + barWidth; x += barWidth * 2) {
               ctx.fillRect(x + offset, 0, barWidth, height);
           }
        }

      } else if (activeMode === 'tracking') {
        ctx.fillStyle = '#f0f9ff'; // Light blue bg
        ctx.fillRect(0, 0, width, height);

        const trackType = Math.floor(frame / 400) % 2;

        if (trackType === 0) {
            // BOUNCING BALL
            ctx.beginPath();
            ctx.arc(ballX, ballY, 40, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444'; // Red
            ctx.fill();
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 4;
            ctx.stroke();

            if (ballX + 40 > width || ballX - 40 < 0) dx = -dx;
            if (ballY + 40 > height || ballY - 40 < 0) dy = -dy;

            ballX += dx;
            ballY += dy;
        } else {
            // SINE WAVE MOVEMENT
            const waveX = (frame * 3) % (width + 100) - 50;
            const waveY = centerY + Math.sin(frame * 0.05) * (height / 4);
            
            ctx.beginPath();
            ctx.arc(waveX, waveY, 45, 0, Math.PI * 2);
            ctx.fillStyle = '#16a34a'; // Green
            ctx.fill();
            ctx.strokeStyle = '#14532d';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Add trail eyes
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(waveX - 15, waveY - 10, 8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(waveX + 15, waveY - 10, 8, 0, Math.PI * 2); ctx.fill();
        }

      } else if (activeMode === 'colors') {
        // --- DYNAMIC GRADIENT & FLOATING SHAPES ---

        // 1. Dynamic Gradient Background (HSL shift)
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        // Slowly rotate hues
        const h1 = (frame * 0.5) % 360;
        const h2 = (h1 + 60) % 360;
        const h3 = (h1 + 120) % 360;
        
        gradient.addColorStop(0, `hsl(${h1}, 75%, 75%)`); 
        gradient.addColorStop(0.5, `hsl(${h2}, 75%, 75%)`);
        gradient.addColorStop(1, `hsl(${h3}, 75%, 75%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 2. Floating Shapes
        const numShapes = 12;
        
        for (let i = 0; i < numShapes; i++) {
            // Deterministic random properties derived from index i
            const sizeBase = 25;
            const sizeVar = (i * 19) % 60; 
            const size = sizeBase + sizeVar; // Size varies 25px - 85px
            
            const speedFactor = 1 + ((i * 3) % 4) * 0.4; // Varied speeds
            
            // X Movement: Steady flow rightward with wrap-around
            const xOffset = i * (width / numShapes);
            let x = (xOffset + frame * speedFactor) % (width + size * 2);
            x -= size; 
            
            // Y Movement: Sine wave floating
            const yOffset = height * 0.5;
            const amp = height * 0.35;
            const freq = 0.01 + ((i % 5) * 0.005);
            const phase = i * 1.5;
            const y = yOffset + Math.sin(frame * freq + phase) * amp;
            
            // Rotation
            const rotSpeed = 0.015 * ((i % 2 === 0) ? 1 : -1);
            const rotation = frame * rotSpeed;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            
            ctx.beginPath();
            const shapeType = i % 3;
            
            if (shapeType === 0) {
                // Circle
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            } else if (shapeType === 1) {
                // Square
                ctx.rect(-size / 2, -size / 2, size, size);
            } else {
                // Triangle
                ctx.moveTo(0, -size / 2);
                ctx.lineTo(size / 2, size / 2);
                ctx.lineTo(-size / 2, size / 2);
                ctx.closePath();
            }
            
            ctx.fill();
            
            // Add subtle stroke
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning, activeMode]);

  // Handle canvas sizing on resize
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
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
        <h2 className="text-xl font-semibold text-blue-800 mb-4 text-center">Visual Stimulation</h2>
        
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
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {mode.name}
            </button>
          ))}
        </div>

        <div 
            ref={containerRef}
            className={`relative w-full aspect-square md:aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-inner border-4 border-gray-800 group ${isFullscreen ? 'h-screen w-screen border-none rounded-none fixed top-0 left-0 z-[200]' : ''}`}
        >
           {/* Controls Overlay */}
           <div className={`absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${!isRunning ? 'opacity-100' : ''}`}>
               <button
                 onClick={toggleFullscreen}
                 className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-lg backdrop-blur-sm"
                 title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
               >
                   {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
               </button>
           </div>

           {!isRunning && (
               <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center bg-black/10 backdrop-blur-[2px] z-10">
                   <button 
                    onClick={() => setIsRunning(true)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all flex items-center gap-2"
                   >
                       Mulai Play
                   </button>
                   <p className="text-sm font-medium text-gray-700 bg-white/80 px-3 py-1 rounded-full">
                       Tekan tombol di pojok kanan untuk Fullscreen
                   </p>
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