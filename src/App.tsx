import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiveClient } from './services/liveClient';
import { ConnectionState } from './types';
import Orb from './components/Orb';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [inputVol, setInputVol] = useState(0);
  const [outputVol, setOutputVol] = useState(0);
  const [transcripts, setTranscripts] = useState<{text: string, isUser: boolean}[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);

  const liveClientRef = useRef<LiveClient | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, showTranscript]);

  const handleTranscript = useCallback((text: string, isUser: boolean) => {
    setTranscripts(prev => {
      const last = prev[prev.length - 1];
      // Append if same speaker to avoid choppy logs, otherwise new entry
      if (last && last.isUser === isUser) {
        const newPrev = [...prev];
        newPrev[newPrev.length - 1].text = prev[prev.length - 1].text + text; 
        return newPrev;
      }
      return [...prev, { text, isUser }];
    });
  }, []);

  const startSession = async () => {
    setError(null);
    setTranscripts([]);
    
    // Initialize Client
    liveClientRef.current = new LiveClient(
      (newState) => setStatus(newState),
      (inVol, outVol) => {
        setInputVol(inVol);
        setOutputVol(outVol);
      },
      handleTranscript,
      (err) => setError(err)
    );

    await liveClientRef.current.connect();
  };

  const endSession = async () => {
    if (liveClientRef.current) {
      await liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col overflow-hidden relative">
        
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold">
                AI
            </div>
            <div>
                <h1 className="text-xl font-semibold tracking-tight">Interviewer</h1>
                <p className="text-xs text-slate-400">Voice-First Technical Assessment</p>
            </div>
        </div>
        
        <div className="flex gap-4">
            <button 
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-sm text-slate-400 hover:text-white transition-colors"
            >
                {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
            </button>
            <div className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2 ${
                status === ConnectionState.CONNECTED ? 'bg-green-500/20 text-green-400' :
                status === ConnectionState.CONNECTING ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
            }`}>
                <div className={`w-2 h-2 rounded-full ${
                    status === ConnectionState.CONNECTED ? 'bg-green-400 animate-pulse' :
                    status === ConnectionState.CONNECTING ? 'bg-yellow-400 animate-pulse' :
                    'bg-red-400'
                }`} />
                {status}
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        
        {/* Error Banner */}
        {error && (
            <div className="absolute top-4 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm mb-8">
                {error}
            </div>
        )}

        {/* Visualizer */}
        <div className="mb-12">
            <Orb 
                isActive={status === ConnectionState.CONNECTED} 
                inputVolume={inputVol} 
                outputVolume={outputVol} 
            />
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2 h-16">
            {status === ConnectionState.CONNECTED && (
                <p className="text-slate-400 text-lg animate-pulse">
                    {outputVol > 0.1 ? "Interviewer is speaking..." : 
                     inputVol > 0.1 ? "Listening..." : "Waiting for response..."}
                </p>
            )}
            {status === ConnectionState.DISCONNECTED && (
                <p className="text-slate-500">Ready to start interview.</p>
            )}
        </div>

        {/* Controls */}
        <div className="flex gap-4 mt-8">
            {status === ConnectionState.DISCONNECTED || status === ConnectionState.ERROR ? (
                <button
                    onClick={startSession}
                    className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:shadow-[0_0_40px_rgba(79,70,229,0.7)]"
                >
                    Start Interview
                    <span className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
                </button>
            ) : (
                <button
                    onClick={endSession}
                    className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-full transition-all border border-slate-600"
                >
                    End Interview
                </button>
            )}
        </div>
      </main>

      {/* Transcript Drawer */}
      <div 
        className={`absolute inset-y-0 right-0 w-full md:w-96 bg-slate-900/95 border-l border-slate-700 transform transition-transform duration-300 ease-in-out z-20 flex flex-col ${
            showTranscript ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-semibold text-slate-200">Live Transcript</h3>
            <button onClick={() => setShowTranscript(false)} className="text-slate-400 hover:text-white">
                ✕
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcripts.length === 0 && (
                <p className="text-slate-500 text-sm text-center mt-10">Transcript will appear here...</p>
            )}
            {transcripts.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                        {msg.isUser ? 'Candidate' : 'Interviewer'}
                    </span>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                        msg.isUser 
                        ? 'bg-indigo-600/20 text-indigo-100 rounded-tr-none border border-indigo-500/30' 
                        : 'bg-slate-800 text-slate-300 rounded-tl-none border border-slate-700'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            <div ref={transcriptBottomRef} />
        </div>
      </div>

    </div>
  );
};

export default App;
