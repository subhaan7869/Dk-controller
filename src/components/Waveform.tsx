import React, { useEffect, useRef, useState } from "react";

interface WaveformProps {
  idName: string;
  deckId: "A" | "B";
  playing: boolean;
  wavePosition: number; // 0 to 100
  onPositionChange?: (newPos: number) => void;
  bpm: number;
}

export default function Waveform({
  idName,
  deckId,
  playing,
  wavePosition,
  onPositionChange,
  bpm,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Track metadata
  const track = deckId === "A" 
    ? { title: "Lose Control", artist: "Calvin Harris, Teddy Swims", duration: 206, key: "8A" }
    : { title: "One More Time", artist: "Daft Punk", duration: 320, key: "8A" };

  const elapsedSeconds = Math.floor((wavePosition / 100) * track.duration);
  const remainingSeconds = track.duration - elapsedSeconds;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const [points, setPoints] = useState<number[]>([]);

  // Pre-generate professional-looking waveform bars
  useEffect(() => {
    const totalBars = 120;
    const generatedPoints: number[] = [];
    let currentHeight = 20;

    for (let i = 0; i < totalBars; i++) {
      // Create organic multi-peak rhythm structure (verses, bridges, chorus drops)
      const baseSin = Math.sin(i / 10) * 12;
      const baseCos = Math.cos(i / 4) * 8;
      let randomFactor = (Math.random() - 0.5) * 6;
      
      // Breakdown points
      if (i > 35 && i < 48) {
        // quiet verse/intro
        generatedPoints.push(Math.max(4, 8 + Math.random() * 4));
      } else if (i > 75 && i < 95) {
        // massive chorus drop height
        generatedPoints.push(Math.max(25, 28 + baseSin + baseCos + Math.random() * 8));
      } else {
        generatedPoints.push(Math.max(6, 16 + baseSin + baseCos + randomFactor));
      }
    }
    setPoints(generatedPoints);
  }, []);

  const pointerDownRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownRef.current = true;
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
    updatePositionFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerDownRef.current) return;
    updatePositionFromEvent(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointerDownRef.current = false;
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const updatePositionFromEvent = (e: React.PointerEvent) => {
    if (!containerRef.current || !onPositionChange) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPos = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    onPositionChange(newPos);
  };

  // Cover pictures
  const coverUrl = deckId === "A"
    ? "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&auto=format&fit=crop&q=60" // deep neon blue party light
    : "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&auto=format&fit=crop&q=60"; // fiery vinyl decks turntables

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-2.5 flex flex-col gap-2 relative shadow-inner select-none overflow-hidden" id={idName}>
      {/* Visual background deck pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-transparent to-transparent pointer-events-none" />

      {/* Track Metadata bar */}
      <div className="flex items-center gap-2 justify-between z-10">
        <div className="flex items-center gap-2">
          {/* Virtual Vinyl Cover Card */}
          <div className="relative w-10 h-10 rounded overflow-hidden border border-zinc-800 bg-zinc-900/60 shadow flex-shrink-0">
            <img src={coverUrl} alt={track.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          <div className="flex flex-col min-w-0">
            <h4 className="text-zinc-100 font-bold text-[13px] leading-tight truncate font-sans">
              {track.title}
            </h4>
            <span className="text-zinc-400 text-[10px] truncate leading-none">
              {track.artist}
            </span>
          </div>
        </div>

        {/* BPM & Timing readout specs */}
        <div className="flex items-center gap-3 text-right">
          <div className="text-right">
            <span className="text-zinc-100 font-black text-[13px] leading-none font-mono">
              {bpm.toFixed(1)}
            </span>
            <span className="text-zinc-500 text-[8px] block font-mono">BPM</span>
          </div>
          
          <div className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-center min-w-[34px]">
            <span className={`text-[10px] font-bold font-mono ${deckId === "A" ? "text-blue-400" : "text-red-400"}`}>
              {track.key}
            </span>
            <span className="text-[7px] text-zinc-500 block font-mono leading-none">KEY</span>
          </div>

          <div className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-center">
            <span className="text-[10px] font-bold text-zinc-300 font-mono">
              0.0 dB
            </span>
            <span className="text-[7px] text-zinc-500 block font-mono leading-none">GAIN</span>
          </div>
        </div>
      </div>

      {/* Waveform Visualization Grid canvas timeline */}
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-[48px] bg-zinc-950/80 rounded border border-zinc-900 flex items-center justify-center cursor-ew-resize overflow-hidden touch-none"
      >
        {/* Subtle grid background stripes */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_100%]" />

        {/* Dynamic bar indicators */}
        <div className="absolute inset-0 flex items-center justify-between px-1.5 gap-[1px]">
          {points.map((val, idx) => {
            const barProgress = (idx / points.length) * 100;
            const isPlayed = wavePosition >= barProgress;
            
            // Color determination
            let barColor = "bg-zinc-800";
            if (isPlayed) {
              barColor = deckId === "A" 
                ? "bg-gradient-to-t from-blue-600 via-sky-400 to-blue-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]" 
                : "bg-gradient-to-t from-red-650 via-rose-500 to-orange-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
            } else {
              barColor = deckId === "A"
                ? "bg-blue-950/40 border border-blue-900/10"
                : "bg-red-950/30 border border-red-900/10";
            }

            return (
              <div 
                key={idx}
                className={`flex-1 rounded-sm transition-all duration-300 ${barColor}`}
                style={{ 
                  height: `${(val / 36) * 100}%`,
                  opacity: isPlayed ? 1 : 0.4 
                }}
              />
            );
          })}
        </div>

        {/* Center orange/red indicator line representing current playing point */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-red-500 shadow-[0_0_8px_#ef4444] pointer-events-none"
          style={{ left: `${wavePosition}%` }}
        />
        
        {/* Playhead arrow cue marker */}
        <div 
          className="absolute top-0 w-3 h-3 bg-amber-400 select-none pointer-events-none transform -translate-x-1/2 rotate-45 border-r border-b border-black"
          style={{ left: `${wavePosition}%`, top: "-6px" }}
        />
      </div>

      {/* Timers reading bar */}
      <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 z-10 mt-0.5">
        <span className="font-bold text-zinc-400">{formatTime(elapsedSeconds)}</span>
        <span className="text-zinc-400">-{formatTime(remainingSeconds)}</span>
      </div>
    </div>
  );
}
