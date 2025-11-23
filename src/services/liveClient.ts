import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';

// Audio Context Configurations
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;
// Noise Gate Threshold: Volume below this level (RMS) will be treated as silence.
// This prevents breathing or background hiss from triggering the model's VAD.
const NOISE_THRESHOLD = 0.01; 

export class LiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Audio Playback Queue
  private nextStartTime = 0;
  private scheduledSources = new Set<AudioBufferSourceNode>();

  // State Callbacks
  private onStateChange: (state: ConnectionState) => void;
  private onVolumeChange: (inputVol: number, outputVol: number) => void;
  private onTranscript: (text: string, isUser: boolean) => void;
  private onError: (error: string) => void;

  private sessionPromise: Promise<any> | null = null;

  constructor(
    onStateChange: (state: ConnectionState) => void,
    onVolumeChange: (inputVol: number, outputVol: number) => void,
    onTranscript: (text: string, isUser: boolean) => void,
    onError: (error: string) => void
  ) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    this.onStateChange = onStateChange;
    this.onVolumeChange = onVolumeChange;
    this.onTranscript = onTranscript;
    this.onError = onError;
  }

  async connect() {
    this.onStateChange(ConnectionState.CONNECTING);

    try {
      // 1. Setup Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      this.inputNode = this.inputAudioContext.createGain();
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      // 2. Get Microphone Access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3. Connect to Gemini Live
      this.sessionPromise = this.ai.live.connect({
        model: MODEL_NAME,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseModalities: [Modality.AUDIO], 
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } 
            },
            inputAudioTranscription: {}, 
            outputAudioTranscription: {},
        },
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onclose: this.handleClose.bind(this),
          onerror: (e) => {
             console.error("Gemini Live Error:", e);
             this.onError("Connection error: " + (e.message || "Unknown network error"));
             this.onStateChange(ConnectionState.ERROR);
          }
        }
      });
      
    } catch (err: any) {
      console.error(err);
      this.onError(err.message || "Failed to initialize audio or connection.");
      this.onStateChange(ConnectionState.ERROR);
    }
  }

  private handleOpen() {
    this.onStateChange(ConnectionState.CONNECTED);
    this.setupAudioProcessing();
  }

  private setupAudioProcessing() {
    if (!this.inputAudioContext || !this.mediaStream || !this.sessionPromise) return;

    this.source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.inputAudioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate Volume for Visualization
      let sum = 0;
      for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeChange(rms * 10, 0); // Scale up for visibility

      // Noise Gate: Send silence if volume is too low to prevent interruptions
      let bufferToSend = inputData;
      if (rms < NOISE_THRESHOLD) {
        bufferToSend = new Float32Array(inputData.length); // All zeros
      }

      const pcmBlob = createPcmBlob(bufferToSend);

      // Send to API
      this.sessionPromise!.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      }).catch(err => {
        console.error("Failed to send input:", err);
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    const { serverContent } = message;

    // 1. Handle Turn Complete (Transcription)
    if (serverContent?.turnComplete) {
       // We handle partials below, but this confirms a turn.
    }

    // 2. Handle Transcriptions (Real-time updates)
    if (serverContent?.inputTranscription?.text) {
        this.onTranscript(serverContent.inputTranscription.text, true);
    }
    if (serverContent?.outputTranscription?.text) {
        this.onTranscript(serverContent.outputTranscription.text, false);
    }

    // 3. Handle Audio Output
    const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
        // Update Output Visualization (approximate)
        this.onVolumeChange(0, 0.5 + Math.random() * 0.5); 

        const audioData = base64ToUint8Array(base64Audio);
        
        // Sync Logic
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);

        try {
            const audioBuffer = await decodeAudioData(
                audioData, 
                this.outputAudioContext, 
                OUTPUT_SAMPLE_RATE, 
                1
            );
            
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode);
            
            source.addEventListener('ended', () => {
                this.scheduledSources.delete(source);
                if (this.scheduledSources.size === 0) {
                     this.onVolumeChange(0, 0); // Reset visualizer
                }
            });

            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.scheduledSources.add(source);

        } catch (e) {
            console.error("Audio Decode Error", e);
        }
    }

    // 4. Handle Interruption
    if (serverContent?.interrupted) {
        console.log("Interrupted by user");
        this.stopAllScheduledAudio();
    }
  }

  private stopAllScheduledAudio() {
    this.scheduledSources.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    this.scheduledSources.clear();
    this.nextStartTime = 0;
    if(this.outputAudioContext) {
        this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  private handleClose() {
    this.onStateChange(ConnectionState.DISCONNECTED);
  }

  async disconnect() {
    // Stop microphone
    this.mediaStream?.getTracks().forEach(track => track.stop());
    
    // Stop processing
    this.processor?.disconnect();
    this.source?.disconnect();
    
    // Close Audio Contexts
    await this.inputAudioContext?.close();
    await this.outputAudioContext?.close();
    
    // Note: session.close() is not explicitly available on the interface in some versions,
    // but stopping the stream essentially kills the loop. 
    this.stopAllScheduledAudio();
    
    this.onStateChange(ConnectionState.DISCONNECTED);
  }
}
