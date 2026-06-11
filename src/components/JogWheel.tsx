import React, { useEffect, useRef, useState } from "react";

interface JogWheelProps {
  idName: string;
  deckId: "A" | "B";
  playing: boolean;
  onJog: (value: number, isScratch: boolean) => void;
  vinylMode: boolean;
  onHoverChanged?: (hovering: boolean) => void;
  bpm: number;
  pitch: number;
}

export default function JogWheel({
  idName,
  deckId,
  playing,
  onJog,
  vinylMode,
  onHoverChanged,
  bpm,
  pitch,
}: JogWheelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Platter animation loop
  const lastTimeRef = useRef(Date.now());
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (playing && !isDragging) {
        // Standard vinyl rotation speed (approx. 200 degrees/sec at 128BPM)
        const tempoScale = 1 + (pitch / 100);
        const degreesToRotate = (delta / 1000) * 200 * tempoScale;
        setRotation((prev) => (prev + degreesToRotate) % 360);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = Date.now();
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [playing, isDragging, pitch]);

  const lastAngle = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    container.setPointerCapture(e.pointerId);
    setIsDragging(true);

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    lastAngle.current = angle;

    if (onHoverChanged) onHoverChanged(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let deltaAngle = currentAngle - lastAngle.current;

    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

    const deltaDegrees = deltaAngle * (180 / Math.PI);
    setRotation((prev) => (prev + deltaDegrees + 360) % 360);

    const normalizedValue = Number((deltaAngle / (Math.PI / 2)).toFixed(3));
    onJog(normalizedValue, vinylMode);

    lastAngle.current = currentAngle;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (container) {
      container.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    if (onHoverChanged) onHoverChanged(false);
  };

  // Color configurations matching the screenshot style
  const isDeckA = deckId === "A";
  const glowBorderClass = isDeckA
    ? "shadow-[0_0_20px_rgba(59,130,246,0.35)] border-blue-500/80"
    : "shadow-[0_0_20px_rgba(239,68,68,0.35)] border-red-500/80";

  const colorHex = isDeckA ? "#3b82f6" : "#ef4444";

  return (
    <div className="flex flex-col items-center justify-center select-none" id={idName}>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative w-48 h-48 rounded-full bg-zinc-950 border-4 border-zinc-900 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none transition-shadow duration-300 ${
          isDragging ? glowBorderClass : "hover:border-zinc-800"
        }`}
        style={{
          boxShadow: `inset 0 0 40px rgba(0,0,0,0.95), 0 10px 20px rgba(0,0,0,0.7)`,
        }}
      >
        {/* Outermost Strobe dots styling matching real Pioneer CDJs */}
        <div 
          className="absolute inset-[3px] rounded-full opacity-35"
          style={{
            backgroundImage: "radial-gradient(circle, transparent 65%, #000 66%), repeating-conic-gradient(from 0deg, #fff 0% 0.5%, transparent 0.6% 2%)",
            transform: `rotate(${-rotation}deg)`,
          }}
        />

        {/* Outer silver bevel plate */}
        <div className="absolute inset-[10px] rounded-full border border-zinc-850 bg-gradient-to-tr from-zinc-900 via-zinc-950 to-zinc-900 shadow-lg flex items-center justify-center">
          
          {/* Circular Platter segment track grooves */}
          <div className="absolute inset-[8px] rounded-full border border-black/40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black/90 flex items-center justify-center">
            
            {/* Fine vinyl track ridge lines */}
            <div className="absolute inset-[6px] rounded-full border border-zinc-800/20" />
            <div className="absolute inset-[12px] rounded-full border border-zinc-800/15" />
            <div className="absolute inset-[18px] rounded-full border border-zinc-800/10" />

            {/* Platter Marker line (spinning needle indicator) */}
            <div 
              className="absolute w-full h-[3px] opacity-75"
              style={{
                background: `linear-gradient(90deg, transparent 0%, transparent 10%, #fff 10%, #fff 16%, transparent 16%)`,
                transform: `rotate(${rotation}deg)`,
              }}
            />

            {/* ==============================================
                CENTER LCD SCREEN DISPLAY (Direct from image)
                ============================================== */}
            <div 
              className="absolute w-24 h-24 rounded-full bg-zinc-950 border-[3px] border-zinc-900 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden"
              style={{
                backgroundImage: "radial-gradient(circle, #0c0d12 40%, #030406 100%)",
              }}
            >
              {/* LED Ring Segment arc - glowing rotation path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="42%"
                  fill="transparent"
                  stroke="rgba(24, 24, 27, 0.5)"
                  strokeWidth="4"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="42%"
                  fill="transparent"
                  stroke={colorHex}
                  strokeWidth="5"
                  strokeDasharray="180 300"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: "center",
                  }}
                  className="transition-all duration-75 shadow-lg shadow-blue-500"
                />
              </svg>

              {/* Inside Center LCD parameters */}
              <div className="z-10 flex flex-col items-center justify-center mt-1 select-none pointer-events-none">
                <span className="text-[19px] font-mono font-black text-zinc-100 tracking-tight leading-none">
                  {bpm.toFixed(1)}
                </span>
                <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest font-bold mt-0.5">
                  BPM
                </span>
                <span className="text-[9.5px] font-mono text-zinc-400 font-bold mt-1 tracking-tighter">
                  {pitch >= 0 ? "+" : ""}{pitch.toFixed(1)}%
                </span>
              </div>

              {/* Gloss screen glaze reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
