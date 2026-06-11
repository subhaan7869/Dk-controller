/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { DeckState, DJEvent } from "./types";
import Deck from "./components/Deck";
import Mixer from "./components/Mixer";
import MidiMonitor from "./components/MidiMonitor";
import { 
  Menu, 
  FolderOpen, 
  Clock, 
  Circle, 
  Settings, 
  Activity, 
  Layers, 
  BookOpen, 
  Wifi, 
  Play, 
  BookMarked,
  Sliders,
  HelpCircle
} from "lucide-react";

export default function App() {
  // Determine dynamic default socket URL based on hosting env
  const getInitialSocketUrl = () => {
    if (typeof window !== "undefined") {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.host}`;
    }
    return "ws://localhost:3000";
  };

  const [serverUrl, setServerUrl] = useState(getInitialSocketUrl());
  const [socketConnected, setSocketConnected] = useState(false);
  const [eventLogs, setEventLogs] = useState<DJEvent[]>([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [activeTab, setActiveTab] = useState<"ALL" | "DECK_A" | "MIXER" | "DECK_B">("ALL");
  const [recording, setRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [midiDevices, setMidiDevices] = useState<any[]>([]);
  const [selectedMidiPortId, setSelectedMidiPortId] = useState("");

  const wsRef = useRef<WebSocket | null>(null);

  // Deck states matching image parameters
  const [deckA, setDeckA] = useState<DeckState>({
    playing: false,
    cueActive: false,
    bpm: 128.0,
    originalBpm: 128.0,
    pitch: 0.0,
    volume: 0.8,
    gain: 0.7,
    eq: { high: 0.5, mid: 0.5, low: 0.5 },
    fx: { filter: 0.5, echo: 0.0, depth: 0.0, beats: 1, active: false },
    hoveringJog: false,
    loopActive: false,
    loopLength: 4,
    syncActive: true,
    hotCues: [15, 35, null, null, null, null, null, null],
    wavePosition: 20.4,
  });

  const [deckB, setDeckB] = useState<DeckState>({
    playing: false,
    cueActive: false,
    bpm: 128.0,
    originalBpm: 128.0,
    pitch: 0.0,
    volume: 0.8,
    gain: 0.7,
    eq: { high: 0.5, mid: 0.5, low: 0.5 },
    fx: { filter: 0.5, echo: 0.0, depth: 0.0, beats: 1, active: false },
    hoveringJog: false,
    loopActive: false,
    loopLength: 4,
    syncActive: false,
    hotCues: [10, 45, 68, null, null, null, null, null],
    wavePosition: 5.5,
  });

  const [crossfader, setCrossfader] = useState(0.5);

  // Modern Web MIDI connection
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess()
        .then((access) => {
          const outputs = Array.from(access.outputs.values());
          setMidiDevices(outputs);
          if (outputs.length > 0) {
            setSelectedMidiPortId(outputs[0].id);
          }

          access.onstatechange = (e) => {
            setMidiDevices(Array.from(access.outputs.values()));
          };
        })
        .catch((err) => {
          console.warn("Web MIDI access blocked or unsupported in this frame browser:", err);
        });
    }
  }, []);

  // Sync iPad system Clock in header
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      let hrs = date.getHours();
      const mins = date.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hrs.toString().padStart(2, "0")}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Re-establish socket connections
  useEffect(() => {
    let active = true;
    let timer: number;

    const connectWebSocket = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      console.log(`[WebSocket] Connecting to ${serverUrl}...`);
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        setSocketConnected(true);
        setReconnectAttempts(0);
        console.log("[WebSocket] Connection established successfully!");
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type?.startsWith("system_")) {
            const enriched = {
              id: parsed.id || "sys-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now(),
              timestamp: parsed.timestamp || new Date().toISOString(),
              ...parsed,
            };
            // Log server-side handshakes inside monitor
            setEventLogs((prev) => [enriched, ...prev].slice(0, 200));
          }
        } catch (e) {
          // Normal log telemetry
        }
      };

      ws.onclose = () => {
        if (!active) return;
        setSocketConnected(false);
        // Exponential retry backoff
        const timeout = Math.min(10000, 1000 * Math.pow(1.5, reconnectAttempts));
        timer = window.setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connectWebSocket();
        }, timeout);
      };

      ws.onerror = (err) => {
        console.warn("[WebSocket] Error details on connection handle:", err);
      };
    };

    connectWebSocket();

    return () => {
      active = false;
      clearTimeout(timer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [serverUrl, reconnectAttempts]);

  // Unified DJ Event Dispatcher (WebSocket stream + Native Web MIDI CC mapper)
  const emitDJEvent = (type: string, data: any) => {
    const djEvent: DJEvent = {
      id: "evt-" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type: type as any,
      ...data,
    };

    // 1. Update client local log monitor
    setEventLogs((prev) => [djEvent, ...prev].slice(0, 150));

    // 2. Stream to Node.js backend WebSocket server for bridging
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(djEvent));
    }

    // 3. Dispatch native Web MIDI signals to virtual cables (IAC / LoopMIDI) if mapped
    if (selectedMidiPortId) {
      const targetPort = midiDevices.find((d) => d.id === selectedMidiPortId);
      if (targetPort) {
        // Map common DJ parameters to CC values (Channel 1 for Deck A, Channel 2 for Deck B)
        const channel = data.deck === "B" ? 1 : 0; // MIDI channel offset
        let statusByte = 176 + channel; // CC message
        let controlNumber = 0;
        let midiValue = 0;

        switch (type) {
          case "crossfader":
            controlNumber = 10; // crossfader position
            midiValue = Math.floor(data.value * 127);
            break;
          case "volume":
            controlNumber = 11; // volume slider channel
            midiValue = Math.floor(data.value * 127);
            break;
          case "eq":
            controlNumber = data.band === "high" ? 12 : data.band === "mid" ? 13 : 14;
            midiValue = Math.floor(data.value * 127);
            break;
          case "pitch":
            controlNumber = 15; // pitch tempo slider
            // Normalize pitch -8% to +8% to 0-127
            midiValue = Math.floor(((data.value + 8) / 16) * 127);
            break;
          case "jog":
            controlNumber = 16; // Jog twist delta
            midiValue = Math.min(127, Math.max(0, 64 + Math.floor(data.value * 30)));
            break;
          case "play":
            statusByte = data.value ? 144 + channel : 128 + channel; // Note On / Note Off
            controlNumber = 60; // Middle C for play
            midiValue = 127;
            break;
          case "cue":
            statusByte = data.value ? 144 + channel : 128 + channel;
            controlNumber = 61; // C# for cue
            midiValue = 127;
            break;
          case "hotcue":
            statusByte = 144 + channel;
            controlNumber = 70 + data.pad; // Notes 70-77
            midiValue = 127;
            break;
          default:
            return; // skip unsupported mapping
        }

        try {
          targetPort.send([statusByte, controlNumber, midiValue]);
        } catch (err) {
          console.warn("Failed sending MIDI byte stream:", err);
        }
      }
    }
  };

  // Deck action handlers
  const handlePlayToggle = (deckId: "A" | "B") => {
    if (deckId === "A") {
      const nextPlaying = !deckA.playing;
      setDeckA(prev => ({ ...prev, playing: nextPlaying }));
      emitDJEvent("play", { deck: "A", value: nextPlaying });
    } else {
      const nextPlaying = !deckB.playing;
      setDeckB(prev => ({ ...prev, playing: nextPlaying }));
      emitDJEvent("play", { deck: "B", value: nextPlaying });
    }
  };

  const handleCueTrigger = (deckId: "A" | "B", active: boolean) => {
    if (deckId === "A") {
      setDeckA(prev => ({ 
        ...prev, 
        cueActive: active,
        playing: active ? false : prev.playing,
        wavePosition: active ? 0 : prev.wavePosition 
      }));
      emitDJEvent("cue", { deck: "A", value: active });
    } else {
      setDeckB(prev => ({ 
        ...prev, 
        cueActive: active,
        playing: active ? false : prev.playing,
        wavePosition: active ? 0 : prev.wavePosition 
      }));
      emitDJEvent("cue", { deck: "B", value: active });
    }
  };

  const handleJogSpin = (deckId: "A" | "B", value: number, isScratch: boolean) => {
    if (deckId === "A") {
      // Modify waveposition temporarily for feedback
      setDeckA(prev => ({ 
        ...prev, 
        wavePosition: Math.max(0, Math.min(100, prev.wavePosition + (isScratch ? value * 1.5 : value * 0.45))) 
      }));
      emitDJEvent("jog", { deck: "A", value: parseFloat(value.toFixed(3)), isScratch });
    } else {
      setDeckB(prev => ({ 
        ...prev, 
        wavePosition: Math.max(0, Math.min(100, prev.wavePosition + (isScratch ? value * 1.5 : value * 0.45))) 
      }));
      emitDJEvent("jog", { deck: "B", value: parseFloat(value.toFixed(3)), isScratch });
    }
  };

  const handlePitchAdjust = (deckId: "A" | "B", val: number) => {
    if (deckId === "A") {
      setDeckA(prev => ({ 
        ...prev, 
        pitch: val,
        bpm: prev.originalBpm * (1 + val / 100)
      }));
      emitDJEvent("pitch", { deck: "A", value: val });
    } else {
      setDeckB(prev => ({ 
        ...prev, 
        pitch: val,
        bpm: prev.originalBpm * (1 + val / 100)
      }));
      emitDJEvent("pitch", { deck: "B", value: val });
    }
  };

  const handleHotCueTrigger = (deckId: "A" | "B", padIdx: number) => {
    if (deckId === "A") {
      const updatedCues = [...deckA.hotCues];
      const selectedPos = updatedCues[padIdx];
      
      if (selectedPos === null) {
        // Set new cue point at current position
        updatedCues[padIdx] = deckA.wavePosition;
        setDeckA(prev => ({ ...prev, hotCues: updatedCues }));
        emitDJEvent("hotcue_set", { deck: "A", pad: padIdx, value: deckA.wavePosition });
      } else {
        // Jump to hotcue position
        setDeckA(prev => ({ ...prev, wavePosition: selectedPos }));
        emitDJEvent("hotcue", { deck: "A", pad: padIdx, value: selectedPos });
      }
    } else {
      const updatedCues = [...deckB.hotCues];
      const selectedPos = updatedCues[padIdx];

      if (selectedPos === null) {
        updatedCues[padIdx] = deckB.wavePosition;
        setDeckB(prev => ({ ...prev, hotCues: updatedCues }));
        emitDJEvent("hotcue_set", { deck: "B", pad: padIdx, value: deckB.wavePosition });
      } else {
        setDeckB(prev => ({ ...prev, wavePosition: selectedPos }));
        emitDJEvent("hotcue", { deck: "B", pad: padIdx, value: selectedPos });
      }
    }
  };

  const handleHotCueClear = (deckId: "A" | "B", padIdx: number) => {
    if (deckId === "A") {
      const updatedCues = [...deckA.hotCues];
      updatedCues[padIdx] = null;
      setDeckA(prev => ({ ...prev, hotCues: updatedCues }));
      emitDJEvent("hotcue_clear", { deck: "A", pad: padIdx });
    } else {
      const updatedCues = [...deckB.hotCues];
      updatedCues[padIdx] = null;
      setDeckB(prev => ({ ...prev, hotCues: updatedCues }));
      emitDJEvent("hotcue_clear", { deck: "B", pad: padIdx });
    }
  };

  const handleLoopToggle = (deckId: "A" | "B") => {
    if (deckId === "A") {
      const target = !deckA.loopActive;
      setDeckA(prev => ({ ...prev, loopActive: target }));
      emitDJEvent("loop_toggle", { deck: "A", value: target, size: deckA.loopLength });
    } else {
      const target = !deckB.loopActive;
      setDeckB(prev => ({ ...prev, loopActive: target }));
      emitDJEvent("loop_toggle", { deck: "B", value: target, size: deckB.loopLength });
    }
  };

  const handleLoopSizeChange = (deckId: "A" | "B", size: number) => {
    if (deckId === "A") {
      setDeckA(prev => ({ ...prev, loopLength: size }));
      emitDJEvent("loop_size", { deck: "A", size });
    } else {
      setDeckB(prev => ({ ...prev, loopLength: size }));
      emitDJEvent("loop_size", { deck: "B", size });
    }
  };

  const handleSyncToggle = (deckId: "A" | "B") => {
    if (deckId === "A") {
      const nextSync = !deckA.syncActive;
      setDeckA(prev => ({ 
        ...prev, 
        syncActive: nextSync,
        bpm: nextSync ? deckB.bpm : prev.originalBpm
      }));
      emitDJEvent("sync", { deck: "A", value: nextSync });
    } else {
      const nextSync = !deckB.syncActive;
      setDeckB(prev => ({ 
        ...prev, 
        syncActive: nextSync,
        bpm: nextSync ? deckA.bpm : prev.originalBpm
      }));
      emitDJEvent("sync", { deck: "B", value: nextSync });
    }
  };

  const handleVolumeChange = (deckId: "A" | "B", val: number) => {
    if (deckId === "A") {
      setDeckA(prev => ({ ...prev, volume: val }));
      emitDJEvent("volume", { deck: "A", value: val });
    } else {
      setDeckB(prev => ({ ...prev, volume: val }));
      emitDJEvent("volume", { deck: "B", value: val });
    }
  };

  const handleGainChange = (deckId: "A" | "B", val: number) => {
    if (deckId === "A") {
      setDeckA(prev => ({ ...prev, gain: val }));
      emitDJEvent("eq", { deck: "A", band: "trim", value: val });
    } else {
      setDeckB(prev => ({ ...prev, gain: val }));
      emitDJEvent("eq", { deck: "B", band: "trim", value: val });
    }
  };

  const handleEqChange = (deckId: "A" | "B", band: "high" | "mid" | "low", val: number) => {
    if (deckId === "A") {
      setDeckA(prev => ({
        ...prev,
        eq: { ...prev.eq, [band]: val }
      }));
      emitDJEvent("eq", { deck: "A", band, value: val });
    } else {
      setDeckB(prev => ({
        ...prev,
        eq: { ...prev.eq, [band]: val }
      }));
      emitDJEvent("eq", { deck: "B", band, value: val });
    }
  };

  const handleCrossfaderChange = (val: number) => {
    setCrossfader(val);
    emitDJEvent("crossfader", { value: val });
  };

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-zinc-100 p-3 select-none flex flex-col gap-3 justify-between">
      
      {/* =======================================================
          TOP BAR OVERLAY (High fidelity representation from image)
          ======================================================= */}
      <header className="bg-zinc-900/60 border border-zinc-850 px-4 py-2.5 rounded-xl flex items-center justify-between shadow-md">
        
        {/* Left column */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => emitDJEvent("menu_press", {})}
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 active:scale-95 transition-all cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => emitDJEvent("library_toggle", {})}
            className="px-3.5 py-1 text-[11px] font-mono tracking-widest leading-none border border-zinc-800 text-zinc-300 hover:text-white rounded-md bg-zinc-950/40 hover:bg-zinc-850 cursor-pointer"
          >
            LIBRARY
          </button>
          
          <button 
            onClick={() => setActiveTab("DECK_A")}
            className={`px-3 py-1 text-xs font-mono font-bold rounded shadow transition-all cursor-pointer ${
              activeTab === "ALL" || activeTab === "DECK_A"
                ? "bg-blue-600/95 text-white shadow-[0_0_8px_rgba(59,130,246,0.5)] border border-blue-400/30"
                : "bg-zinc-900 border border-zinc-800 text-zinc-500"
            }`}
          >
            A
          </button>
        </div>

        {/* Center Clock / Status Readouts */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[13px] tracking-wide font-black bg-zinc-950 px-3 py-1 rounded-md border border-zinc-900">
            <Clock className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
            {currentTime || "12:00"}
          </div>

          <button
            onClick={() => {
              setRecording(prev => !prev);
              emitDJEvent("recording_toggle", { value: !recording });
            }}
            className={`px-3.5 py-1 text-[10.5px] font-mono font-bold flex items-center gap-1.5 rounded-md border transition-all cursor-pointer ${
              recording
                ? "bg-red-950/80 text-red-400 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"
                : "bg-zinc-950/20 text-zinc-400 border-zinc-800"
            }`}
          >
            <Circle className={`w-2.5 h-2.5 fill-current ${recording ? "text-red-500" : "text-zinc-500"}`} />
            REC
          </button>

          <button 
            onClick={() => emitDJEvent("preference_modal_toggle", {})}
            className="p-1.5 rounded-lg border border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-850 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Right Columns */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab("DECK_B")}
            className={`px-3 py-1 text-xs font-mono font-bold rounded shadow transition-all cursor-pointer ${
              activeTab === "ALL" || activeTab === "DECK_B"
                ? "bg-red-650 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)] border border-red-500/30"
                : "bg-zinc-900 border border-zinc-800 text-zinc-500"
            }`}
          >
            B
          </button>

          <button 
            onClick={() => emitDJEvent("bpm_tap", {})}
            className="px-3.5 py-1 text-[10.5px] font-mono tracking-widest leading-none border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md bg-zinc-950/40 cursor-pointer"
          >
            BPM
          </button>

          <button 
            onClick={() => emitDJEvent("fx_drawer_toggle", {})}
            className="px-3.5 py-1 text-[10.5px] font-mono tracking-widest leading-none border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md bg-zinc-950/40 cursor-pointer"
          >
            FX
          </button>

          {/* Connection status pills */}
          <div className="flex items-center gap-1.5 pl-2.5">
            <Wifi className={`w-4 h-4 ${socketConnected ? "text-emerald-400" : "text-red-400 animate-pulse"}`} />
            <span className="text-[10px] uppercase font-mono font-black tracking-widest">
              {socketConnected ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>
        </div>

      </header>

      {/* =======================================================
          MAIN HARDWARE CONTROLLER PANEL (3-Channel Flex Grid)
          ======================================================= */}
      <main className="flex-1 min-h-0 flex flex-col xl:flex-row gap-3">
        {/* --- DECK A (Blue section) --- */}
        {(activeTab === "ALL" || activeTab === "DECK_A") && (
          <Deck
            idName="deck-a-container"
            deckId="A"
            state={deckA}
            onPlayToggle={() => handlePlayToggle("A")}
            onCueTrigger={(act) => handleCueTrigger("A", act)}
            onJog={(val, isScratch) => handleJogSpin("A", val, isScratch)}
            onPitchChange={(val) => handlePitchAdjust("A", val)}
            onHotCueTrigger={(idx) => handleHotCueTrigger("A", idx)}
            onHotCueClear={(idx) => handleHotCueClear("A", idx)}
            onLoopToggle={() => handleLoopToggle("A")}
            onLoopSizeChange={(size) => handleLoopSizeChange("A", size)}
            onSyncToggle={() => handleSyncToggle("A")}
            onVinylToggle={() => emitDJEvent("vinyl_mode_toggle", { deck: "A" })}
            vinylMode={true}
            onWaveformScroll={(pos) => setDeckA(p => ({ ...p, wavePosition: pos % 100 }))}
            emitEvent={emitDJEvent}
          />
        )}

        {/* --- CENTRAL EQ & FX CHANNEL MIXER --- */}
        {(activeTab === "ALL" || activeTab === "MIXER") && (
          <Mixer
            deckA={deckA}
            deckB={deckB}
            crossfader={crossfader}
            onCrossfaderChange={handleCrossfaderChange}
            onVolumeChange={handleVolumeChange}
            onGainChange={handleGainChange}
            onEqChange={handleEqChange}
            onFilterChange={(deck, val) => {
              if (deck === "A") setDeckA(p => ({ ...p, fx: { ...p.fx, filter: val } }));
              else setDeckB(p => ({ ...p, fx: { ...p.fx, filter: val } }));
              emitDJEvent("eq", { deck, band: "filter", value: val });
            }}
            onEchoChange={(deck, val) => {
              if (deck === "A") setDeckA(p => ({ ...p, fx: { ...p.fx, echo: val } }));
              else setDeckB(p => ({ ...p, fx: { ...p.fx, echo: val } }));
              emitDJEvent("fx", { deck, effect: "echo", value: val });
            }}
            emitEvent={emitDJEvent}
          />
        )}

        {/* --- DECK B (Red section) --- */}
        {(activeTab === "ALL" || activeTab === "DECK_B") && (
          <Deck
            idName="deck-b-container"
            deckId="B"
            state={deckB}
            onPlayToggle={() => handlePlayToggle("B")}
            onCueTrigger={(act) => handleCueTrigger("B", act)}
            onJog={(val, isScratch) => handleJogSpin("B", val, isScratch)}
            onPitchChange={(val) => handlePitchAdjust("B", val)}
            onHotCueTrigger={(idx) => handleHotCueTrigger("B", idx)}
            onHotCueClear={(idx) => handleHotCueClear("B", idx)}
            onLoopToggle={() => handleLoopToggle("B")}
            onLoopSizeChange={(size) => handleLoopSizeChange("B", size)}
            onSyncToggle={() => handleSyncToggle("B")}
            onVinylToggle={() => emitDJEvent("vinyl_mode_toggle", { deck: "B" })}
            vinylMode={true}
            onWaveformScroll={(pos) => setDeckB(p => ({ ...p, wavePosition: pos % 100 }))}
            emitEvent={emitDJEvent}
          />
        )}
      </main>

      {/* =======================================================
          TELEMETRY MIDI LOGGER EXPANSION DOCK
          ======================================================= */}
      <div className="row-span-1 min-h-[160px] xl:h-[220px]">
        <MidiMonitor
          idName="midi-logs-streamer"
          eventLogs={eventLogs}
          onClearLogs={() => setEventLogs([])}
          socketConnected={socketConnected}
          serverUrl={serverUrl}
          onServerUrlChange={(url) => setServerUrl(url)}
          midiDevices={midiDevices}
          selectedMidiPortId={selectedMidiPortId}
          onSelectMidiPort={(id) => setSelectedMidiPortId(id)}
          reconnectAttempts={reconnectAttempts}
          triggerManualReconnect={() => setReconnectAttempts(0)}
        />
      </div>

      {/* =======================================================
          FOOTER BAR ACTIONS (Tab Views & Learn selectors)
          ======================================================= */}
      <footer className="bg-zinc-900/60 border border-zinc-850 px-4 py-2.5 rounded-xl flex items-center justify-between shadow-md">
        
        {/* Left Automix / Config buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => emitDJEvent("automix_toggle", {})}
            className="px-3.5 py-1 text-[11px] font-mono tracking-widest leading-none border border-zinc-800 text-zinc-300 hover:text-white rounded-md bg-zinc-950/40 hover:bg-zinc-850 cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-3 h-3 fill-current text-zinc-400" />
            AUTOMIX
          </button>
          
          <button 
            onClick={() => emitDJEvent("settings_drawer_open", {})}
            className="px-3.5 py-1 text-[11px] font-mono tracking-widest leading-none border border-zinc-800 text-zinc-400 hover:text-white rounded-md bg-zinc-950/40 cursor-pointer flex items-center gap-1.5"
          >
            <Settings className="w-3 h-3" />
            SETTINGS
          </button>
        </div>

        {/* Center UI focus switch panel (Direct from image) */}
        <div className="flex items-center gap-1 bg-zinc-950 px-1 p-1 rounded-lg border border-zinc-900 shadow-inner">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1 text-[10.5px] font-mono uppercase tracking-wider transition-all rounded cursor-pointer ${
              activeTab === "ALL"
                ? "bg-zinc-800 text-white font-bold"
                : "text-zinc-550 hover:text-zinc-300"
            }`}
          >
            ALL GEAR
          </button>
          <button
            onClick={() => setActiveTab("DECK_A")}
            className={`px-3.5 py-1 text-[10.5px] font-mono uppercase tracking-wider transition-all rounded cursor-pointer ${
              activeTab === "DECK_A" ? "bg-zinc-800 text-blue-400 font-bold" : "text-zinc-550 hover:text-zinc-400"
            }`}
          >
            DECK A
          </button>
          <button
            onClick={() => setActiveTab("MIXER")}
            className={`px-3.5 py-1 text-[10.5px] font-mono uppercase tracking-wider transition-all rounded cursor-pointer ${
              activeTab === "MIXER" ? "bg-zinc-800 text-zinc-200 font-bold" : "text-zinc-550 hover:text-zinc-400"
            }`}
          >
            MIXER
          </button>
          <button
            onClick={() => setActiveTab("DECK_B")}
            className={`px-3.5 py-1 text-[10.5px] font-mono uppercase tracking-wider transition-all rounded cursor-pointer ${
              activeTab === "DECK_B" ? "bg-zinc-800 text-red-400 font-bold" : "text-zinc-550 hover:text-zinc-400"
            }`}
          >
            DECK B
          </button>
        </div>

        {/* Right Learn details */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => emitDJEvent("midi_learn_cycle", {})}
            className="px-3.5 py-1 text-[11px] font-mono tracking-widest leading-none border border-zinc-850 text-amber-500/90 hover:text-amber-400 rounded-md bg-zinc-950/40 cursor-pointer flex items-center gap-1.5"
          >
            <BookMarked className="w-3.5 h-3.5" />
            MIDI LEARN
          </button>

          <button
            onClick={() => {
              setRecording(prev => !prev);
              emitDJEvent("recording_toggle", { value: !recording });
            }}
            className={`px-3 py-1 text-[11px] font-mono tracking-widest rounded bg-zinc-950 border border-zinc-800 flex items-center gap-1.5 transition-all cursor-pointer ${
              recording ? "text-red-400 shadow-[0_0_6px_rgba(239,68,68,0.2)]" : "text-zinc-550"
            }`}
          >
            <Circle className={`w-2.5 h-2.5 fill-current ${recording ? "text-red-500 animate-ping" : "text-zinc-500"}`} />
            REC
          </button>
        </div>

      </footer>

    </div>
  );
}
