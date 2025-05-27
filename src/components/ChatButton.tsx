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
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-50 
        flex items-center justify-center
        w-14 h-14 rounded-lg
        bg-gradient-theme
        hover:shadow-xl hover:scale-102
        text-white shadow-lg 
        transition-all duration-300 ease-in-out
        ${isOpen ? 'rotate-0' : 'rotate-0'}
        no-print
      `}
      title={isOpen ? 'Zamknij czat medyczny' : 'Otwórz czat medyczny'}
    >
      {isOpen ? (
        <X size={20} className="transition-transform duration-200" />
      ) : (
        <div className="relative">
          <MessageSquare size={20} className="transition-transform duration-200" />
          {hasNewMessages && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
      )}
    </button>
  );
}; 