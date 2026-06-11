import React, { useState } from "react";
import { DJEvent } from "../types";
import { Terminal, Send, Trash2, Wifi, WifiOff, RefreshCw, Cpu, Check } from "lucide-react";

interface MidiMonitorProps {
  idName: string;
  eventLogs: DJEvent[];
  onClearLogs: () => void;
  socketConnected: boolean;
  serverUrl: string;
  onServerUrlChange: (newUrl: string) => void;
  midiDevices: MIDIOutput[];
  selectedMidiPortId: string;
  onSelectMidiPort: (id: string) => void;
  reconnectAttempts: number;
  triggerManualReconnect: () => void;
}

// Minimal type definitions for the browser's Web MIDI API
interface MIDIOutput {
  id: string;
  name: string;
  manufacturer?: string;
  state: string;
}

export default function MidiMonitor({
  idName,
  eventLogs,
  onClearLogs,
  socketConnected,
  serverUrl,
  onServerUrlChange,
  midiDevices,
  selectedMidiPortId,
  onSelectMidiPort,
  reconnectAttempts,
  triggerManualReconnect,
}: MidiMonitorProps) {
  const [editingUrl, setEditingUrl] = useState(serverUrl);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onServerUrlChange(editingUrl.trim());
  };

  return (
    <div
      id={idName}
      className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-sans text-xs flex flex-col md:flex-row gap-4 h-full"
    >
      {/* SECTION 1: NETWORK & MIDI IO CONFIG - 40% WIDTH */}
      <div className="flex flex-col gap-3 md:w-1/3">
        <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-zinc-400 animate-pulse" /> NETWORK & MIDI CONNECTIONS
        </h4>

        {/* WebSocket Connection Rack */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-zinc-300">WEBSOCKET STATUS</span>
            <div className="flex items-center gap-1.5">
              {socketConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono leading-none font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Wifi className="w-2.5 h-2.5" /> ONLINE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono leading-none font-bold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                  <WifiOff className="w-2.5 h-2.5" /> OFFLINE
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleUrlSubmit} className="flex gap-1.5 mt-1">
            <input
              type="text"
              value={editingUrl}
              onChange={(e) => setEditingUrl(e.target.value)}
              placeholder="ws://localhost:3000"
              className="flex-1 px-2 py-1 rounded bg-zinc-950 text-[11px] border border-zinc-800 text-zinc-100 font-mono focus:outline-none focus:border-zinc-700"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-mono active:scale-95 transition-all flex items-center justify-center border border-zinc-700"
            >
              SAVE
            </button>
          </form>

          {!socketConnected && (
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
              <span>Attempts: {reconnectAttempts}</span>
              <button
                type="button"
                onClick={triggerManualReconnect}
                className="text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3 animate-spin" /> RECONNECT NOW
              </button>
            </div>
          )}
        </div>

        {/* Web MIDI Output Port Selector */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono font-bold text-zinc-300">NATIVE WEB MIDI OUTPUT</span>
            <span className="text-[10px] text-zinc-500 font-mono">CH 1 & 2 Mapped</span>
          </div>

          {midiDevices.length === 0 ? (
            <div className="text-[10px] text-zinc-500 font-mono py-1.5 px-2 bg-zinc-950 rounded border border-zinc-900">
              No physical/virtual MIDI ports detected in browser. Use native virtual ports or MIDI bridge setup to direct output.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {midiDevices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => onSelectMidiPort(device.id)}
                  className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded border text-[11px] font-mono text-left transition-all ${
                    selectedMidiPortId === device.id
                      ? "bg-zinc-800 border-zinc-600 text-amber-400 shadow-md"
                      : "bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  <span className="truncate">{device.name}</span>
                  {selectedMidiPortId === device.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
          <span className="text-[9px] text-zinc-500 leading-normal">
            Note: Controls map to Standard CC # values. Connect to a virtual MIDI driver (like IAC driver on Mac or loopMIDI on PC) to directly patch into Rekordbox/Serato.
          </span>
        </div>
      </div>

      {/* SECTION 2: LIVE RUNNING JSON EVENT LOGGER - 60% WIDTH */}
      <div className="flex-1 flex flex-col gap-2 min-h-[160px] md:h-auto">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-zinc-400" /> REAL-TIME EVENT STREAM (JSON LOGS)
          </h4>
          <button
            onClick={onClearLogs}
            disabled={eventLogs.length === 0}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono text-zinc-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-400 hover:bg-zinc-900 rounded border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> CLEAR LOG
          </button>
        </div>

        {/* Live Scrollable Term terminal */}
        <div className="flex-1 bg-black border border-zinc-900 rounded p-2.5 overflow-y-auto max-h-[180px] md:max-h-none h-48 md:h-full font-mono text-[11px] leading-relaxed flex flex-col-reverse shadow-inner">
          {eventLogs.length === 0 ? (
            <div className="text-zinc-600 italic m-auto text-center py-8">
              Waiting for DJ interactions...<br />
              <span className="text-[10px] not-italic text-zinc-700 font-mono">Tap pads, adjust sliders, or spin jogwheels to inspect output stream.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {eventLogs.slice(0, 40).map((log, idx) => {
                const isSystem = log.type.startsWith("system_");
                let colorClass = "text-zinc-400";
                
                if (isSystem) {
                  colorClass = log.type === "system_error" ? "text-red-400" : "text-amber-400";
                } else if (log.deck === "A") {
                  colorClass = "text-blue-400"; // Deck A events
                } else if (log.deck === "B") {
                  colorClass = "text-orange-400"; // Deck B events
                }

                return (
                  <div key={log.id || `log-key-${idx}-${log.timestamp}`} className="border-b border-zinc-900/50 pb-1.5 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500 font-mono text-[9px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`font-bold uppercase tracking-wider text-[10px] ${colorClass}`}>
                          {log.type}
                        </span>
                        {log.deck && (
                          <span className={`px-1 py-[1px] leading-none text-[8px] font-bold rounded ${log.deck === "A" ? "bg-blue-900/30 text-blue-400 border border-blue-500/20" : "bg-orange-900/30 text-orange-400 border border-orange-500/20"}`}>
                            DECK {log.deck}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono">id: {log.id}</span>
                    </div>
                    {/* Compact printable output format */}
                    <div className="text-zinc-300 font-mono pl-3 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(
                        Object.keys(log)
                          .filter((k) => k !== "id" && k !== "timestamp")
                          .reduce((obj: any, key) => {
                            obj[key] = log[key as keyof DJEvent];
                            return obj;
                          }, {}),
                        null,
                        2
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
