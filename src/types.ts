// 1. Define as a const object (Standard JS)
export const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
} as const;

// 2. Extract the type from the values
export type ConnectionState = typeof ConnectionState[keyof typeof ConnectionState];

// Keep interfaces as they are
export interface Message {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
}

export interface VolumeData {
  input: number;
  output: number;
}