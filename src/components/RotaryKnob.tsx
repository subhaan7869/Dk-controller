import React, { useRef, useState, useEffect } from "react";

interface RotaryKnobProps {
  id: string;
  label: string;
  value: number; // 0 to 1
  min?: number;
  max?: number;
  defaultValue?: number;
  onChange: (val: number) => void;
  colorTheme?: "blue" | "orange" | "red" | "zinc";
  size?: "sm" | "md" | "lg";
}

export default function RotaryKnob({
  id,
  label,
  value,
  min = 0,
  max = 1,
  defaultValue = 0.5,
  onChange,
  colorTheme = "zinc",
  size = "md",
}: RotaryKnobProps) {
  const knobRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  // Define angles: -135deg to +135deg
  const minAngle = -135;
  const maxAngle = 135;
  const angleRange = maxAngle - minAngle;

  const currentAngle = minAngle + ((value - min) / (max - min)) * angleRange;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!knobRef.current) return;
    knobRef.current.setPointerCapture(e.pointerId);
    setIsDragging(true);
    startY.current = e.clientY;
    startVal.current = value;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaY = startY.current - e.clientY; // up is positive, down is negative
    
    // Sensitivity: 150px drag covers full range from 0 to 1
    const sensitivity = 150;
    const newVal = Math.min(max, Math.max(min, startVal.current + deltaY / sensitivity));
    
    onChange(Number(newVal.toFixed(2)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (knobRef.current) {
      knobRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  // Size configurations
  const sizeClasses = {
    sm: "w-10 h-10 text-[9px]",
    md: "w-12 h-12 text-[10px]",
    lg: "w-14 h-14 text-[11px]",
  };

  // Color accents
  const themeColors = {
    blue: "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]",
    orange: "border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.2)]",
    red: "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]",
    zinc: "border-zinc-750 shadow-none",
  };

  const highlightIndicator = {
    blue: "bg-blue-400 shadow-[0_0_4px_#60a5fa]",
    orange: "bg-orange-400 shadow-[0_0_4px_#fb923c]",
    red: "bg-red-400 shadow-[0_0_4px_#f87171]",
    zinc: "bg-zinc-300",
  };

  return (
    <div className="flex flex-col items-center justify-center select-none" id={`knob-container-${id}`}>
      {/* Knob outer ring */}
      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={`relative rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center cursor-ns-resize touch-none transition-shadow ${
          sizeClasses[size]
        } ${isDragging ? themeColors[colorTheme] : ""}`}
        style={{
          boxShadow: `inset 0 2px 4px rgba(255,255,255,0.05), inset 0 -2px 4px rgba(0,0,0,0.8), 0 3px 6px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Radial ticking marks around active knob path */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="44%"
            fill="transparent"
            stroke="rgba(30, 41, 59, 0.5)"
            strokeWidth="3"
            strokeDasharray="4 2"
          />
          {/* Active colored arc track representation */}
          <circle
            cx="50%"
            cy="50%"
            r="44%"
            fill="transparent"
            stroke={
              colorTheme === "blue"
                ? "rgba(59, 130, 246, 0.7)"
                : colorTheme === "orange"
                ? "rgba(249, 115, 22, 0.7)"
                : colorTheme === "red"
                ? "rgba(239, 68, 68, 0.7)"
                : "rgba(113, 113, 122, 0.7)"
            }
            strokeWidth="2.5"
            strokeDasharray={`${((value - min) / (max - min)) * 75} 100`}
            className="transition-all duration-75"
          />
        </svg>

        {/* Inner Physical Knob Dial */}
        <div
          className="absolute w-[80%] h-[80%] rounded-full bg-zinc-900 flex items-center justify-center"
          style={{
            backgroundImage: "conic-gradient(from 0deg, #18181b 0%, #27272a 35%, #09090b 50%, #27272a 65%, #18181b 100%)",
            transform: `rotate(${currentAngle}deg)`,
            boxShadow: "0 2px 3px rgba(0,0,0,0.6)",
          }}
        >
          {/* White physical vertical groove notches on visual cap */}
          <div className="absolute top-[3px] w-[2px] h-[7px] rounded-full bg-white opacity-90 shadow-sm" />
          
          {/* Subtle center point cap */}
          <div className="w-2 h-2 rounded-full bg-black/60 shadow-inner" />
        </div>
      </div>

      {/* Label and Value */}
      <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-tighter mt-1">
        {label}
      </span>
      <span className="text-[7.5px] font-mono text-zinc-400 font-medium scale-95 origin-center leading-tight">
        {value === defaultValue ? "0" : value > defaultValue ? `+${((value - defaultValue) * 10).toFixed(1)}` : `${((value - defaultValue) * 10).toFixed(1)}`}
      </span>
    </div>
  );
}
