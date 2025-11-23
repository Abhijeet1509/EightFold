import React from 'react';

interface OrbProps {
  isActive: boolean;
  inputVolume: number;
  outputVolume: number;
}

const Orb: React.FC<OrbProps> = ({ isActive, inputVolume, outputVolume }) => {
  // Determine scale based on volume.
  // Input volume (user speaking) makes it pulsate Green/Cyan.
  // Output volume (AI speaking) makes it pulsate Purple/Blue.
  
  const isUserSpeaking = inputVolume > 0.05;
  const isAiSpeaking = outputVolume > 0.05;

  let scale = 1;
  let colorClass = "bg-slate-500";
  let glowClass = "shadow-slate-500/50";

  if (isActive) {
    if (isUserSpeaking) {
      scale = 1 + Math.min(inputVolume, 1.5);
      colorClass = "bg-cyan-400";
      glowClass = "shadow-cyan-400/80";
    } else if (isAiSpeaking) {
      scale = 1 + Math.min(outputVolume, 1.5);
      colorClass = "bg-indigo-500";
      glowClass = "shadow-indigo-500/80";
    } else {
      // Idle listening
      colorClass = "bg-white";
      glowClass = "shadow-white/40";
      scale = 1.05; // Slight breathe
    }
  }

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Glow Ring (Breathing) */}
      <div 
        className={`absolute rounded-full transition-all duration-200 ease-out opacity-30 ${colorClass}`}
        style={{ 
            width: isActive ? '120px' : '100px', 
            height: isActive ? '120px' : '100px',
            transform: `scale(${scale * 1.5})`,
            filter: 'blur(20px)'
        }}
      />
      
      {/* Core Orb */}
      <div 
        className={`z-10 w-32 h-32 rounded-full shadow-2xl transition-all duration-100 ease-linear ${colorClass} ${glowClass}`}
        style={{ 
            transform: `scale(${scale})` 
        }}
      >
        {!isActive && (
            <div className="flex items-center justify-center w-full h-full text-slate-900 font-bold">
                OFF
            </div>
        )}
      </div>
    </div>
  );
};

export default Orb;
