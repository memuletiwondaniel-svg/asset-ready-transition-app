import React from 'react';
import { useTypingEffect } from '@/hooks/useTypingEffect';
import { cn } from '@/lib/utils';

interface AgentIntroductionProps {
  text: string;
  agentName: string;
  gradient: string;
}

const AgentIntroduction: React.FC<AgentIntroductionProps> = ({ text, agentName, gradient }) => {
  const { displayText, isTyping } = useTypingEffect({
    texts: [text],
    typingSpeed: 18,
    pauseBeforeNext: 60000, // Don't cycle — just type once and hold
    pauseBeforeType: 500,
  });

  return (
    <div className="relative">
      <div className="flex items-start gap-3">
        <div className={cn("w-1 rounded-full self-stretch bg-gradient-to-b", gradient, "opacity-60")} />
        <div className="flex-1">
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            "{displayText}
            {isTyping && displayText.length < text.length && (
              <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
            )}
            {displayText.length === text.length && '"'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2 font-medium">— {agentName}</p>
        </div>
      </div>
    </div>
  );
};

export default AgentIntroduction;
