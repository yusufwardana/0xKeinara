import React, { useRef, useEffect, useState } from 'react';
import { VisualMode } from '../types';
import { Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';

const VisualStimulator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMode, setActiveMode] = useState<VisualMode['type']>('high-contrast');
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const animationRef = useRef<number | null>(null);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const modes: VisualMode[] = [
    { name: 'Hitam Putih', type: 'high-contrast', description: 'Untuk 0-3 bulan. Pola kontras tinggi untuk fokus.' },
    { name: 'Objek Bergerak', type: 'tracking', description: 'Melatih otot mata mengikuti objek.' },
    { name: 'Warna-Warni', type: 'colors', description: 'Untuk 6+ bulan. Stimulasi spektrum warna.' },
  ];

  // --- Audio Logic (Brown Noise Generator) ---
  const initAudio = () => {
    if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
    }
  };

  const toggleSound = () => {
    initAudio();
    if (!audioContextRef.current) return;

    if (soundEnabled) {
        // Stop sound
        setSoundEnabled(false);
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.5);
            setTimeout(() => {
                if(noiseNodeRef.current) {
                    noiseNodeRef.current.stop();
                    noiseNodeRef.current = null;
                }
            }, 500);
        }
    } else {
        // Start Sound (Brown Noise - soothing low frequency)
        setSoundEnabled(true);
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const bufferSize = audioContextRef.current.sampleRate * 2; // 2 seconds buffer
        const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate Noise
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Simple Brown Noise approximation integration
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Compensate for gain loss
        }

        noiseNodeRef.current = audioContextRef.current.createBufferSource();
        noiseNodeRef.current.buffer = buffer;
        noiseNodeRef.current.loop = true;

        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = 0.001; // Start silent
        
        noiseNodeRef.current.connect(gainNodeRef.current);
        gainNodeRef.current.connect(audioContextRef.current.destination);
        
        noiseNodeRef.current.start();
        gainNodeRef.current.gain.exponentialRampToValueAtTime(0.15, audioContextRef.current.currentTime + 1); // Fade in to 15% volume
    }
  };
  
  // Variables for noise generation
  let lastOut = 0;

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
        if (noiseNodeRef.current) noiseNodeRef.current.stop();
        if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

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
    let angle = 0;

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
        const colorType = Math.floor(frame / 300) % 2;
        
        if (colorType === 0) {
             // GRADIENT & FLOATING
            const time = frame * 0.01;
            const r = Math.floor(128 + 128 * Math.sin(time));
            const g = Math.floor(128 + 128 * Math.sin(time + 2));
            const b = Math.floor(128 + 128 * Math.sin(time + 4));
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(0, 0, width, height);
            
            // Floating shapes
            for(let i=0; i<5; i++) {
               ctx.fillStyle = 'rgba(255,255,255,0.3)';
               const x = (width / 5) * i + 50 + Math.sin(frame * 0.02 + i) * 30;
               const y = centerY + Math.cos(frame * 0.03 + i) * 50;
               ctx.beginPath();
               if (i % 2 === 0) {
                 ctx.arc(x, y, 40, 0, Math.PI * 2);
               } else {
                 ctx.rect(x-30, y-30, 60, 60);
               }
               ctx.fill();
            }
        } else {
            // EXPANDING RINGS
            ctx.fillStyle = '#111827'; // Dark bg
            ctx.fillRect(0, 0, width, height);
            
            const count = 10;
            const maxR = Math.max(width, height);
            
            for(let i=0; i<count; i++) {
                const progress = (frame * 2 + i * (maxR/count)) % maxR;
                const hue = (frame + i * 30) % 360;
                
                ctx.beginPath();
                ctx.arc(centerX, centerY, progress, 0, Math.PI * 2);
                ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
                ctx.lineWidth = 15;
                ctx.stroke();
            }
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

        <div 
            ref={containerRef}
            className={`relative w-full aspect-square md:aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-inner border-4 border-gray-800 group ${isFullscreen ? 'h-screen w-screen border-none rounded-none fixed top-0 left-0 z-[200]' : ''}`}
        >
           {/* Controls Overlay */}
           <div className={`absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${!isRunning ? 'opacity-100' : ''}`}>
               {/* Sound Toggle */}
               <button
                 onClick={toggleSound}
                 className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${soundEnabled ? 'bg-orange-500 text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
                 title={soundEnabled ? "Matikan Suara (Brown Noise)" : "Nyalakan Suara (Brown Noise)"}
               >
                 {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
               </button>

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
                    className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-orange-700 transform hover:scale-105 transition-all flex items-center gap-2"
                   >
                       Mulai Play
                   </button>
                   <p className="text-sm font-medium text-gray-700 bg-white/80 px-3 py-1 rounded-full text-center">
                       Tekan tombol di pojok kanan untuk Fullscreen & Audio
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