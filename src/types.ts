/**
 * Types and interfaces for the iPad Web DJ MIDI Controller System
 */

export interface DJEvent {
  id: string;
  timestamp: string;
  type: DJEventType;
  deck?: "A" | "B";
  value?: number;
  band?: "high" | "mid" | "low";
  pad?: number;
  control?: string;
  action?: string;
  fxName?: string;
}

export type DJEventType =
  | "play"
  | "cue"
  | "jog"
  | "crossfader"
  | "eq"
  | "volume"
  | "pitch"
  | "hotcue"
  | "loop"
  | "fx_toggle"
  | "fx_knob"
  | "sync"
  | "gain"
  | "headphone"
  | "nudge"
  | "system_status"
  | "system_connections"
  | "system_error";

export interface DeckState {
  playing: boolean;
  cueActive: boolean;
  bpm: number;
  originalBpm: number;
  pitch: number; // -8% to +8%
  volume: number; // 0 to 1
  gain: number; // 0 to 1
  eq: {
    high: number; // 0.5 is middle (neutral)
    mid: number;
    low: number;
  };
  fx: {
    filter: number; // 0.5 is center (off)
    echo: number;   // 0 to 1
    depth: number;  // 0 to 1
    beats: number;  // FX rate beats e.g. 1/4, 1/2, 1, 2
    active: boolean;
  };
  hoveringJog: boolean;
  loopActive: boolean;
  loopLength: number; // 1, 2, 4, 8, 16 beats
  syncActive: boolean;
  hotCues: (number | null)[]; // store sample timestamp or mark active (null if empty, numbers are cue point percentages)
  wavePosition: number; // 0 to 100 representing position in the track
}

export interface MidiMapping {
  name: string;
  description: string;
  events: {
    [key in DJEventType]?: {
      channel: number;
      midiType: "note" | "cc";
      num: number; // note number or CC number
    };
  };
}
