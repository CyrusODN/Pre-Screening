import React from 'react';
import { MessageSquare, X } from 'lucide-react';

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  hasNewMessages?: boolean;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ 
  isOpen, 
  onClick, 
  hasNewMessages = false 
}) => {
  // Ukryj przycisk gdy chat jest otwarty - ChatWindow ma własny przycisk zamknięcia
  if (isOpen) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-50 
        flex items-center justify-center
        w-12 h-12 rounded-lg
        bg-gradient-theme
        hover:shadow-xl hover:scale-102
        text-white shadow-lg 
        transition-all duration-300 ease-in-out
        no-print
      `}
      title="Otwórz czat medyczny"
    >
      <div className="relative">
        <MessageSquare size={18} className="transition-transform duration-200" />
        {hasNewMessages && (
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </div>
    </button>
  );
}; 