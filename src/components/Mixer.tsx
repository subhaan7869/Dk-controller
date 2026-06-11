import React, { useState, useEffect } from "react";
import { DeckState } from "../types";
import RotaryKnob from "./RotaryKnob";
import { Headphones, Activity, Sliders, Volume2, ShieldAlert } from "lucide-react";

interface MixerProps {
  deckA: DeckState;
  deckB: DeckState;
  crossfader: number; // 0 to 1
  onCrossfaderChange: (val: number) => void;
  onVolumeChange: (deck: "A" | "B", val: number) => void;
  onGainChange: (deck: "A" | "B", val: number) => void;
  onEqChange: (deck: "A" | "B", band: "high" | "mid" | "low", val: number) => void;
  onFilterChange: (deck: "A" | "B", val: number) => void;
  onEchoChange: (deck: "A" | "B", val: number) => void;
  emitEvent: (type: string, data: any) => void;
}

export default function Mixer({
  deckA,
  deckB,
  crossfader,
  onCrossfaderChange,
  onVolumeChange,
  onGainChange,
  onEqChange,
  onFilterChange,
  onEchoChange,
  emitEvent,
}: MixerProps) {
  // FX State
  const [fxBypass, setFxBypass] = useState(false);
  const [echoTime, setEchoTime] = useState(0.5);
  const [echoFeedback, setEchoFeedback] = useState(0.4);
  const [echoMix, setEchoMix] = useState(0.3);

  const [filterCutoff, setFilterCutoff] = useState(0.5);
  const [filterResonance, setFilterResonance] = useState(0.4);
  const [filterMix, setFilterMix] = useState(0.5);

  const [cueActive, setCueActive] = useState(false);
  const [headphonesCh1, setHeadphonesCh1] = useState(true);
  const [headphonesCh2, setHeadphonesCh2] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.7);

  // VU Levels simulation loop
  const [vuLevelL, setVuLevelL] = useState<number[]>([]);
  const [vuLevelR, setVuLevelR] = useState<number[]>([]);

  useEffect(() => {
    let timer: number;
    const updateVUMeter = () => {
      // Audio signal from playing tracks mixed on the crossfader
      let signalA = deckA.playing ? deckA.volume * deckA.gain : 0;
      let signalB = deckB.playing ? deckB.volume * deckB.gain : 0;

      // Add music fluctuation
      signalA *= (0.65 + Math.random() * 0.35);
      signalB *= (0.65 + Math.random() * 0.35);

      // Mix based on crossfader value
      const leftMix = signalA * (1 - crossfader) * masterVolume;
      const rightMix = signalB * crossfader * masterVolume;

      // Generate heights
      const barCount = 10;
      const activeL = Math.floor(leftMix * barCount);
      const activeR = Math.floor(rightMix * barCount);

      const computedL = Array.from({ length: barCount }).map((_, i) => i < activeL ? 1 : 0);
      const computedR = Array.from({ length: barCount }).map((_, i) => i < activeR ? 1 : 0);

      setVuLevelL(computedL);
      setVuLevelR(computedR);

      timer = requestAnimationFrame(updateVUMeter);
    };

    updateVUMeter();
    return () => cancelAnimationFrame(timer);
  }, [deckA.playing, deckA.volume, deckA.gain, deckB.playing, deckB.volume, deckB.gain, crossfader, masterVolume]);

  const toggleFxBypass = () => {
    setFxBypass(prev => !prev);
    emitEvent("fx_bypass", { active: !fxBypass });
  };

  return (
    <div className="w-64 bg-zinc-950/95 border-x border-zinc-900/90 py-3.5 px-3 flex flex-col justify-between h-full select-none max-w-[320px] shadow-2xl relative">
      
      {/* 1. TOP FX RACK SECTION (ECHO Block & FILTER Block) */}
      <div className="flex flex-col gap-3 pb-3 border-b border-zinc-900/80">
        
        {/* FX ROW 1: ECHO Selector */}
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-2 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[7px] font-mono text-zinc-500 uppercase tracking-widest font-black">
            <span>FX BAR 1</span>
            <span className="text-red-400">ECHO</span>
          </div>
          
          <div className="grid grid-cols-3 gap-1">
            <RotaryKnob
              id="fx-echo-time"
              label="TIME"
              value={echoTime}
              onChange={(v) => {
                setEchoTime(v);
                emitEvent("fx_knob", { effect: "echo", control: "time", value: v });
              }}
              colorTheme="red"
              size="sm"
            />
            <RotaryKnob
              id="fx-echo-feedback"
              label="FEEDBACK"
              value={echoFeedback}
              onChange={(v) => {
                setEchoFeedback(v);
                emitEvent("fx_knob", { effect: "echo", control: "feedback", value: v });
              }}
              colorTheme="red"
              size="sm"
            />
            <RotaryKnob
              id="fx-echo-mix"
              label="MIX"
              value={echoMix}
              onChange={(v) => {
                setEchoMix(v);
                emitEvent("fx_knob", { effect: "echo", control: "mix", value: v });
              }}
              colorTheme="red"
              size="sm"
            />
          </div>
        </div>

        {/* FX ROW 2: FILTER Selector */}
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-2 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[7px] font-mono text-zinc-500 uppercase tracking-widest font-black">
            <span>FX BAR 2</span>
            <span className="text-red-400">FILTER</span>
          </div>

          <div className="grid grid-cols-3 gap-1">
            <RotaryKnob
              id="fx-filter-cutoff"
              label="CUTOFF"
              value={filterCutoff}
              onChange={(v) => {
                setFilterCutoff(v);
                emitEvent("fx_knob", { effect: "filter", control: "cutoff", value: v });
              }}
              colorTheme="red"
              size="sm"
            />
            <RotaryKnob
              id="fx-filter-resonance"
              label="RESONANCE"
              value={filterResonance}
              onChange={(v) => {
                setFilterResonance(v);
                emitEvent("fx_knob", { effect: "filter", control: "resonance", value: v });
              }}
              colorTheme="red"
              size="sm"
            />
            <RotaryKnob
              id="fx-filter-mix"
              label="MIX"
              value={filterMix}
              onChange={(v) => {
                setFilterMix(v);
                emitEvent("fx_knob", { effect: "filter", control: "mix", value: v });
              }}
              colorTheme="red"
              size="sm"
            />
          </div>
        </div>

        {/* FX BYPASS BUTTON */}
        <button
          onClick={toggleFxBypass}
          className={`w-full py-1 rounded font-mono text-[8px] uppercase tracking-widest border transition-all cursor-pointer ${
            fxBypass
              ? "bg-amber-950/40 text-amber-500 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
              : "bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:text-white"
          }`}
        >
          FX BYPASS
        </button>
      </div>

      {/* 2. CHANNELS MIXING SECTION (TRIM, EQs, HEADPHONE PREVIEW) */}
      <div className="flex-1 grid grid-cols-3 gap-1.5 my-3">
        
        {/* COLUMN 1 - DECK A MIXER */}
        <div className="flex flex-col items-center justify-between py-1 border-r border-zinc-900/40">
          <RotaryKnob
            id="mixer-a-trim"
            label="TRIM"
            value={deckA.gain}
            onChange={(v) => onGainChange("A", v)}
            colorTheme="blue"
            size="sm"
          />
          <RotaryKnob
            id="mixer-a-high"
            label="HIGH"
            value={deckA.eq.high}
            onChange={(v) => onEqChange("A", "high", v)}
            size="sm"
          />
          <RotaryKnob
            id="mixer-a-mid"
            label="MID"
            value={deckA.eq.mid}
            onChange={(v) => onEqChange("A", "mid", v)}
            size="sm"
          />
          <RotaryKnob
            id="mixer-a-low"
            label="LOW"
            value={deckA.eq.low}
            onChange={(v) => onEqChange("A", "low", v)}
            size="sm"
          />

          <button
            onClick={() => {
              setHeadphonesCh1(prev => !prev);
              emitEvent("headphone_cue", { deck: "A", active: !headphonesCh1 });
            }}
            className={`w-8 h-8 rounded border text-[11px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
              headphonesCh1
                ? "bg-blue-950/60 border-blue-500 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                : "bg-zinc-900 border-zinc-850 text-zinc-650 hover:text-zinc-400"
            }`}
          >
            1
          </button>
        </div>

        {/* COLUMN 2 (CENTER MONITOR COLUMN: MASTER, LED VUs, HEADPHONE CUE) */}
        <div className="flex flex-col items-center justify-between py-1 px-1">
          <RotaryKnob
            id="mixer-master-vol"
            label="MASTER"
            value={masterVolume}
            onChange={(v) => {
              setMasterVolume(v);
              emitEvent("master_gain", { value: v });
            }}
            defaultValue={0.7}
            size="sm"
          />

          {/* Glowing Stereo VU LED Ticks */}
          <div className="flex-1 flex gap-1.5 py-1.5 px-1 rounded-sm bg-zinc-950/80 border border-zinc-900/40 my-2 shadow-inner">
            {/* L Ladder */}
            <div className="flex flex-col-reverse gap-[2px] w-1.5">
              {vuLevelL.map((v, i) => {
                let col = "bg-zinc-900/60";
                if (v === 1) {
                  col = i >= 8 ? "bg-red-500" : i >= 6 ? "bg-amber-400" : "bg-emerald-500";
                }
                return <div key={i} className={`h-[5px] w-full rounded-sm transition-all duration-75 ${col}`} />;
              })}
            </div>

            {/* R Ladder */}
            <div className="flex flex-col-reverse gap-[2px] w-1.5">
              {vuLevelR.map((v, i) => {
                let col = "bg-zinc-900/60";
                if (v === 1) {
                  col = i >= 8 ? "bg-red-500" : i >= 6 ? "bg-amber-400" : "bg-emerald-500";
                }
                return <div key={i} className={`h-[5px] w-full rounded-sm transition-all duration-75 ${col}`} />;
              })}
            </div>
          </div>

          {/* Yellow CUE indicator outline */}
          <button
            onClick={() => {
              setCueActive(prev => !prev);
              emitEvent("master_cue", { active: !cueActive });
            }}
            className={`w-[44px] py-1 border rounded text-[8px] font-mono font-bold uppercase transition-all mb-1 cursor-pointer ${
              cueActive
                ? "border-amber-500 text-amber-500 bg-amber-950/20 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                : "border-zinc-850 text-zinc-600 hover:text-zinc-400 bg-zinc-900"
            }`}
          >
            CUE
          </button>

          {/* Headphone button indicator */}
          <button
            onClick={() => emitEvent("headphones_config", {})}
            className="w-8 h-8 rounded border border-zinc-850 bg-zinc-900 text-zinc-550 flex items-center justify-center cursor-pointer hover:text-zinc-300"
          >
            <Headphones className="w-4 h-4" />
          </button>
        </div>

        {/* COLUMN 3 - DECK B MIXER */}
        <div className="flex flex-col items-center justify-between py-1 border-l border-zinc-900/40">
          <RotaryKnob
            id="mixer-b-trim"
            label="TRIM"
            value={deckB.gain}
            onChange={(v) => onGainChange("B", v)}
            colorTheme="red"
            size="sm"
          />
          <RotaryKnob
            id="mixer-b-high"
            label="HIGH"
            value={deckB.eq.high}
            onChange={(v) => onEqChange("B", "high", v)}
            size="sm"
          />
          <RotaryKnob
            id="mixer-b-mid"
            label="MID"
            value={deckB.eq.mid}
            onChange={(v) => onEqChange("B", "mid", v)}
            size="sm"
          />
          <RotaryKnob
            id="mixer-b-low"
            label="LOW"
            value={deckB.eq.low}
            onChange={(v) => onEqChange("B", "low", v)}
            size="sm"
          />

          <button
            onClick={() => {
              setHeadphonesCh2(prev => !prev);
              emitEvent("headphone_cue", { deck: "B", active: !headphonesCh2 });
            }}
            className={`w-8 h-8 rounded border text-[11px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
              headphonesCh2
                ? "bg-rose-950/60 border-rose-500 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                : "bg-zinc-900 border-zinc-850 text-zinc-655 hover:text-zinc-400"
            }`}
          >
            2
          </button>
        </div>

      </div>

      {/* 3. CHANNEL FADER LINEARS */}
      <div className="flex items-center justify-between px-3 gap-6 bg-zinc-950/20 border-t border-zinc-900 border-dashed py-3">
        {/* Left Fader */}
        <div className="flex-1 flex flex-col items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={deckA.volume}
            onChange={(e) => onVolumeChange("A", parseFloat(e.target.value))}
            orient="vertical"
            className="accent-blue-500 h-[68px] w-3 cursor-row-resize bg-zinc-900 rounded"
            style={{ writingMode: "bt-lr", WebkitAppearance: "slider-vertical" } as any}
          />
        </div>

        {/* Right Fader */}
        <div className="flex-1 flex flex-col items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={deckB.volume}
            onChange={(e) => onVolumeChange("B", parseFloat(e.target.value))}
            orient="vertical"
            className="accent-red-500 h-[68px] w-3 cursor-row-resize bg-zinc-900 rounded"
            style={{ writingMode: "bt-lr", WebkitAppearance: "slider-vertical" } as any}
          />
        </div>
      </div>

      {/* 4. BASE HORIZONTAL CROSSFADER BLOCK */}
      <div className="w-full flex flex-col gap-1 items-center border-t border-zinc-900/80 pt-3 mt-1.5">
        <div className="w-full relative px-1 bg-zinc-950 rounded border border-zinc-900 h-6 flex items-center justify-center">
          {/* Channel ticks left-to-right (A, B) */}
          <div className="absolute inset-x-2 flex justify-between pointer-events-none text-[8px] font-mono font-bold leading-none select-none">
            <span className="text-blue-500">A</span>
            <span className="text-zinc-700">| | | | | |</span>
            <span className="text-red-500">B</span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="accent-zinc-100 w-full h-full cursor-pointer bg-transparent pointer-events-auto relative z-10"
          />
        </div>
      </div>

    </div>
  );
}
