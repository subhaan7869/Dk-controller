import React, { useState } from "react";
import { DeckState } from "../types";
import Waveform from "./Waveform";
import JogWheel from "./JogWheel";
import { Play, Pause, ChevronLeft, ChevronRight, CornerDownRight } from "lucide-react";

interface DeckProps {
  idName: string;
  deckId: "A" | "B";
  state: DeckState;
  onPlayToggle: () => void;
  onCueTrigger: (active: boolean) => void;
  onJog: (val: number, isScratch: boolean) => void;
  onPitchChange: (val: number) => void;
  onHotCueTrigger: (padIdx: number) => void;
  onHotCueClear: (padIdx: number) => void;
  onLoopToggle: () => void;
  onLoopSizeChange: (size: number) => void;
  onSyncToggle: () => void;
  onVinylToggle: () => void;
  vinylMode: boolean;
  onWaveformScroll: (pos: number) => void;
  emitEvent: (type: string, data: any) => void;
}

export default function Deck({
  idName,
  deckId,
  state,
  onPlayToggle,
  onCueTrigger,
  onJog,
  onPitchChange,
  onHotCueTrigger,
  onHotCueClear,
  onLoopToggle,
  onLoopSizeChange,
  onSyncToggle,
  onVinylToggle,
  vinylMode,
  onWaveformScroll,
  emitEvent,
}: DeckProps) {
  const [padMode, setPadMode] = useState<"HOT_CUES" | "SLICER" | "SAMPLER" | "SAVED_LOOP">("HOT_CUES");
  const [quantize, setQuantize] = useState(true);
  const [slipActive, setSlipActive] = useState(false);
  const [activePad, setActivePad] = useState<number | null>(null);

  // Styling helper based on Deck A or B
  const isDeckA = deckId === "A";
  const mainColorAccentClass = isDeckA ? "text-blue-400" : "text-rose-500";
  const neonBorderClass = isDeckA ? "border-blue-500/30" : "border-rose-500/30";

  // Sync button glow
  const syncBtnClass = state.syncActive
    ? isDeckA
      ? "bg-blue-950/80 text-blue-400 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] font-bold"
      : "bg-red-950/80 text-red-400 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)] font-bold"
    : "bg-zinc-900/60 text-zinc-500 border-zinc-850 hover:text-zinc-300";

  // Quantize button
  const quantBtnClass = quantize
    ? "bg-zinc-800 text-amber-500 border-amber-600/40"
    : "bg-zinc-900/60 text-zinc-500 border-zinc-850 hover:text-zinc-300";

  // Slip button
  const slipBtnClass = slipActive
    ? "bg-zinc-800 text-purple-400 border-purple-500/40"
    : "bg-zinc-900/60 text-zinc-500 border-zinc-850 hover:text-zinc-400";

  const handlePadInteraction = (idx: number) => {
    setActivePad(idx);
    setTimeout(() => setActivePad(null), 180);

    // Dynamic state management or notification trigger
    if (padMode === "HOT_CUES") {
      onHotCueTrigger(idx);
    } else {
      emitEvent("sampler_pad", { deck: deckId, pad: idx, mode: padMode });
    }
  };

  const handlePitchNudge = (factor: number) => {
    const nudgeAmount = 0.5 * factor;
    onPitchChange(state.pitch + nudgeAmount);
    emitEvent("pitch_nudge", { deck: deckId, nudge: factor, resultingPitch: state.pitch + nudgeAmount });
  };

  return (
    <div
      id={idName}
      className={`flex-1 bg-zinc-950/90 border border-zinc-900/90 rounded-2xl p-4 flex flex-col justify-between max-w-[500px] shadow-2xl relative ${neonBorderClass}`}
    >
      {/* 1. Header labeling */}
      <div className="flex items-center justify-between border-b border-zinc-900/80 pb-2 mb-2">
        <span className={`font-mono text-[11px] font-black uppercase tracking-wider ${isDeckA ? "text-blue-500" : "text-red-500"}`}>
          DECK {deckId}
        </span>
        <span className="text-[10px] text-zinc-650 font-mono">CHANNEL {isDeckA ? "1" : "2"}</span>
      </div>

      {/* 2. Waveform Plotter */}
      <Waveform
        idName={`deck-${deckId}-wave`}
        deckId={deckId}
        playing={state.playing}
        wavePosition={state.wavePosition}
        onPositionChange={onWaveformScroll}
        bpm={state.bpm}
      />

      {/* 3. Pitch control bar beneath waveform (Pioneer design) */}
      <div className="flex items-center justify-between gap-1.5 mt-2.5 mb-2">
        {/* SYNC button */}
        <button
          onClick={onSyncToggle}
          className={`flex-1 py-1.5 rounded font-mono text-[9.5px] uppercase border transition-all cursor-pointer ${syncBtnClass}`}
        >
          SYNC
        </button>

        {/* QUANT button */}
        <button
          onClick={() => {
            setQuantize(prev => !prev);
            emitEvent("quantize", { deck: deckId, value: !quantize });
          }}
          className={`flex-1 py-1.5 rounded font-mono text-[9.5px] uppercase border transition-all cursor-pointer ${quantBtnClass}`}
        >
          QUANT
        </button>

        {/* SLIP button */}
        <button
          onClick={() => {
            setSlipActive(prev => !prev);
            emitEvent("slip", { deck: deckId, value: !slipActive });
          }}
          className={`flex-1 py-1.5 rounded font-mono text-[9.5px] uppercase border transition-all cursor-pointer ${slipBtnClass}`}
        >
          SLIP
        </button>

        {/* Nudge Pitch Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePitchNudge(-1)}
            className="w-7 py-1.5 rounded bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 text-[10px] font-mono leading-none cursor-pointer"
          >
            —
          </button>
          <span className="text-[9.5px] font-mono font-bold text-zinc-400 px-1">
            {state.pitch >= 0 ? "+" : ""}{state.pitch.toFixed(1)}%
          </span>
          <button
            onClick={() => handlePitchNudge(1)}
            className="w-7 py-1.5 rounded bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 text-[10px] font-mono leading-none cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      {/* 4. Platter Center Core Grid */}
      <div className="flex items-center justify-between gap-2.5 my-2 w-full">
        
        {/* LEFT PLATTER COLUMN (IN, OUT, LOOP controls) */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => emitEvent("loop_in", { deck: deckId })}
            className="w-12 py-1.5 rounded border border-amber-500/20 text-amber-500/90 font-mono text-[8px] font-bold text-center bg-zinc-950/60 hover:bg-zinc-900 cursor-pointer"
          >
            IN
          </button>
          <button
            onClick={() => emitEvent("loop_out", { deck: deckId })}
            className="w-12 py-1.5 rounded border border-amber-500/20 text-amber-500/90 font-mono text-[8px] font-bold text-center bg-zinc-950/60 hover:bg-zinc-900 cursor-pointer"
          >
            OUT
          </button>
          <button
            onClick={() => {
              onLoopSizeChange(4);
              if (!state.loopActive) onLoopToggle();
            }}
            className="w-12 py-1.5 rounded border border-zinc-800 text-zinc-400 font-mono text-[8px] text-center bg-zinc-950/60 hover:text-white cursor-pointer"
          >
            4 BEAT
          </button>
          <button
            onClick={onLoopToggle}
            className={`w-12 py-1.5 rounded border font-mono text-[8.5px] text-center transition-all cursor-pointer ${
              state.loopActive ? "bg-purple-950 border-purple-500 text-purple-400" : "border-zinc-800 text-zinc-400 bg-zinc-950/60"
            }`}
          >
            LOOP
          </button>
          <button
            onClick={() => emitEvent("reloop_exit", { deck: deckId })}
            className="w-12 py-1 select-none rounded border border-zinc-800 text-zinc-500 font-mono text-[7px] text-center bg-zinc-950/60 hover:text-zinc-300 pointer-events-auto leading-tight uppercase"
          >
            RELOOP<br />/EXIT
          </button>
          
          <div className="flex justify-between w-full px-1">
            <button
              onClick={() => onLoopSizeChange(Math.max(0.25, state.loopLength / 2))}
              className="text-zinc-500 hover:text-zinc-200 text-[9px] font-mono cursor-pointer"
            >
              &lt;
            </button>
            <button
              onClick={() => onLoopSizeChange(Math.min(32, state.loopLength * 2))}
              className="text-zinc-500 hover:text-zinc-200 text-[9px] font-mono cursor-pointer"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* METALLIC platters */}
        <div className="flex-1 flex justify-center">
          <JogWheel
            idName={`deck-${deckId}-jog`}
            deckId={deckId}
            playing={state.playing}
            vinylMode={vinylMode}
            onJog={onJog}
            bpm={state.bpm}
            pitch={state.pitch}
          />
        </div>

        {/* RIGHT PLATTER COLUMN (CUE, REV, FWD, PITCH TEMPO SLIDER) */}
        <div className="flex flex-col items-center justify-between gap-1.5 h-44">
          <button
            onClick={() => emitEvent("deck_cue_marker", { deck: deckId })}
            className="w-11 py-1 rounded border border-zinc-850 text-zinc-400 font-mono text-[8px] text-center bg-zinc-950 hover:text-zinc-200 cursor-pointer"
          >
            CUE
          </button>
          <button
            onClick={() => emitEvent("reverse", { deck: deckId })}
            className="w-11 py-1 rounded border border-zinc-850 text-zinc-400 font-mono text-[8px] text-center bg-zinc-950 hover:text-zinc-200 cursor-pointer"
          >
            REV
          </button>
          <button
            onClick={() => emitEvent("forward", { deck: deckId })}
            className="w-11 py-1 rounded border border-zinc-850 text-zinc-400 font-mono text-[8px] text-center bg-zinc-950 hover:text-zinc-200 cursor-pointer"
          >
            FWD
          </button>

          {/* Physical Vertical Pitch Slider */}
          <div className="flex-1 flex flex-col items-center justify-center p-1 bg-zinc-900/20 border border-zinc-900 rounded w-11 mt-1">
            <div className="relative h-20 flex items-center justify-center">
              <input
                type="range"
                min="-8"
                max="8"
                step="0.05"
                value={state.pitch}
                onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                orient="vertical"
                className="accent-zinc-400 h-[72px] w-3 cursor-row-resize bg-zinc-950 rounded"
                style={{ writingMode: "bt-lr", WebkitAppearance: "slider-vertical" } as any}
              />
            </div>
            <span className="text-[6.5px] font-mono text-zinc-500 uppercase tracking-tighter leading-none mt-1">PITCH</span>
          </div>
        </div>

      </div>

      {/* 5. DRUM SILICONE PERFORMANCE PADS block */}
      <div className="w-full bg-zinc-900/20 border border-zinc-900/80 rounded-xl p-2 mt-2">
        
        {/* Toggle headers matching screenshot */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5 mb-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setPadMode("HOT_CUES");
                emitEvent("pad_mode", { deck: deckId, mode: "HOT_CUES" });
              }}
              className={`px-2 py-0.5 rounded-sm font-mono text-[8.5px] uppercase tracking-wider transition-all cursor-pointer ${
                padMode === "HOT_CUES"
                  ? isDeckA
                    ? "text-blue-400 font-bold"
                    : "text-red-400 font-bold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              ● HOT CUES
            </button>
            <button
              onClick={() => {
                setPadMode("SLICER");
                emitEvent("pad_mode", { deck: deckId, mode: "SLICER" });
              }}
              className={`px-2 py-0.5 rounded-sm font-mono text-[8.5px] uppercase tracking-wider transition-all cursor-pointer ${
                padMode === "SLICER" ? "text-zinc-300 font-bold" : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              ◆ SLICER
            </button>
            <button
              onClick={() => {
                setPadMode("SAMPLER");
                emitEvent("pad_mode", { deck: deckId, mode: "SAMPLER" });
              }}
              className={`px-2 py-0.5 rounded-sm font-mono text-[8.5px] uppercase tracking-wider transition-all cursor-pointer ${
                padMode === "SAMPLER" ? "text-zinc-300 font-bold" : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              SAMPLER
            </button>
            <button
              onClick={() => {
                setPadMode("SAVED_LOOP");
                emitEvent("pad_mode", { deck: deckId, mode: "SAVED_LOOP" });
              }}
              className={`px-2 py-0.5 rounded-sm font-mono text-[8.5px] uppercase tracking-wider transition-all cursor-pointer ${
                padMode === "SAVED_LOOP" ? "text-zinc-300 font-bold" : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              SAVED LOOP
            </button>
          </div>
        </div>

        {/* 8 Pads layout */}
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, idx) => {
            const hasCue = state.hotCues[idx] !== null;
            let padClass = "bg-zinc-900 border-zinc-800/80 text-zinc-500";
            
            if (activePad === idx) {
              padClass = "bg-white border-white text-zinc-950 scale-95";
            } else if (padMode === "HOT_CUES" && hasCue) {
              padClass = isDeckA
                ? "bg-gradient-to-t from-blue-700 via-blue-500 to-sky-400 border-blue-400/80 text-white shadow-[0_0_12px_rgba(59,130,246,0.65)] hover:from-blue-600"
                : "bg-gradient-to-t from-red-700 via-red-500 to-rose-400 border-rose-400/80 text-white shadow-[0_0_12px_rgba(244,63,94,0.65)] hover:from-red-650";
            } else {
              // Dim active color blocks representing silicone feel
              padClass = isDeckA
                ? "bg-blue-950/20 border-blue-900/30 text-blue-500/80 hover:bg-blue-900/20"
                : "bg-red-950/20 border-red-900/30 text-red-500/80 hover:bg-red-900/20";
            }

            return (
              <button
                key={idx}
                onPointerDown={() => handlePadInteraction(idx)}
                className={`w-full py-3 px-1 rounded border font-mono text-[9px] font-black tracking-tight active:scale-95 transition-all outline-none flex flex-col items-center justify-center gap-0.5 cursor-pointer ${padClass}`}
              >
                <span>PAD {idx + 1}</span>
                {padMode === "HOT_CUES" && (
                  <span className="text-[7.5px] opacity-60">
                    {hasCue ? `${state.hotCues[idx]?.toFixed(0)}%` : "SET"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. BOTTOM TRANSPORT LAYOUT ROW */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-zinc-900/80">
        {/* Amber CUE button */}
        <button
          onPointerDown={() => onCueTrigger(true)}
          onPointerUp={() => onCueTrigger(false)}
          onPointerLeave={() => onCueTrigger(false)}
          className={`flex-1 py-3.5 rounded-lg border-2 border-amber-500/80 text-[12px] font-mono font-black text-amber-500 bg-zinc-950/20 hover:bg-amber-500/10 active:scale-95 cursor-pointer text-center leading-none tracking-wider shadow`}
        >
          CUE
        </button>

        {/* Play/Pause Button is Green */}
        <button
          onClick={onPlayToggle}
          className={`flex-1 py-3.5 rounded-lg border-2 text-[12px] font-mono font-black active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 leading-none tracking-wider transition-all shadow ${
            state.playing
              ? "bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold animate-pulse"
              : "bg-zinc-950/20 border-emerald-500/80 text-emerald-500 hover:bg-emerald-500/10"
          }`}
        >
          {state.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          PLAY/PAUSE
        </button>

        {/* STUTTER button */}
        <button
          onClick={() => {
            onWaveformScroll(0);
            if (!state.playing) onPlayToggle();
            emitEvent("stutter", { deck: deckId });
          }}
          className="flex-1 py-3.5 rounded-lg border-2 border-zinc-800 text-[12.5px] font-mono font-black text-zinc-400 bg-zinc-950/20 hover:text-white hover:bg-zinc-900 active:scale-95 cursor-pointer text-center leading-none tracking-wider"
        >
          STUTTER
        </button>
      </div>

    </div>
  );
}
