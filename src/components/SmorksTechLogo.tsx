import React, { useState } from 'react';
import { Cpu, Terminal } from 'lucide-react';

interface SmorksTechLogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export const SmorksTechLogo: React.FC<SmorksTechLogoProps> = ({
  className = '',
  showSubtitle = true,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {!imageError ? (
        <img
          src="/images/smorks_tech_logo.svg"
          alt="SMORK'S TECH Logo"
          className="h-10 w-auto object-contain photo-natural"
          onError={() => setImageError(true)}
        />
      ) : null}

      {imageError ? (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E90FF] to-[#0047AB] flex items-center justify-center text-white shadow-[0_0_15px_rgba(30,144,255,0.4)] flex-shrink-0">
          <Terminal className="w-5 h-5 text-white" />
        </div>
      ) : null}

      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-['Outfit',sans-serif]">
            SMORK'S <span className="text-[#1E90FF]">TECH</span>
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[10px] tracking-wider font-mono text-[#94a3b8] uppercase">
            Web Engineering · Virtual Assistance
          </p>
        )}
      </div>
    </div>
  );
};
