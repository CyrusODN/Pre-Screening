import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Clock, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { chatbotService, type ChatMessage } from '../services/chatbotService';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<'criteria' | 'pharmacotherapy' | 'episodes' | 'risk' | 'general'>('general');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Załaduj wiadomości przy otwieraniu
  useEffect(() => {
    if (isOpen && chatbotService.isSessionActive()) {
      setMessages(chatbotService.getMessages());
    }
  }, [isOpen]);

  // Auto-scroll do ostatniej wiadomości
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus na input przy otwieraniu
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    const question = inputValue.trim();
    setInputValue('');

    try {
      const response = await chatbotService.askQuestion(question, selectedFocus);
      setMessages(chatbotService.getMessages());
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = async (question: string) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await chatbotService.askQuestion(question, selectedFocus);
      setMessages(chatbotService.getMessages());
    } catch (error) {
      console.error('Error sending suggested question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('pl-PL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return <AlertCircle size={12} />;
    if (confidence >= 0.8) return <CheckCircle size={12} />;
    if (confidence >= 0.6) return <Clock size={12} />;
    return <AlertCircle size={12} />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 no-print">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900 bg-opacity-40 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Chat Window */}
      <div className="absolute bottom-6 right-6 w-96 h-[600px] card-remedy flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-theme text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="icon-circle">
              <Bot size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Asystent Medyczny AI</h3>
              <p className="text-xs opacity-90">Analiza Pre-screeningowa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white hover:bg-opacity-20 rounded"
          >
            ✕
          </button>
        </div>

        {/* Focus Area Selector */}
        <div className="p-3 border-b bg-gray-50">
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Obszar fokus:
          </label>
          <select
            value={selectedFocus}
            onChange={(e) => setSelectedFocus(e.target.value as any)}
            className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all"
          >
            <option value="general">Ogólne pytania</option>
            <option value="criteria">Kryteria włączenia/wyłączenia</option>
            <option value="pharmacotherapy">Farmakoterapia i TRD</option>
            <option value="episodes">Epizody depresyjne</option>
            <option value="risk">Ocena ryzyka</option>
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <div
                  className={`
                    p-3 rounded-lg text-sm transition-all
                    ${message.type === 'user' 
                      ? 'bg-gradient-theme text-white shadow-md' 
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                    }
                  `}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Bot message metadata */}
                  {message.type === 'bot' && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTimestamp(message.timestamp)}
                        </div>
                        {message.confidence !== undefined && (
                          <div className={`flex items-center gap-1 ${getConfidenceColor(message.confidence)}`}>
                            {getConfidenceIcon(message.confidence)}
                            {Math.round(message.confidence * 100)}%
                          </div>
                        )}
                      </div>
                      
                      {message.referencedSections && message.referencedSections.length > 0 && (
                        <div className="mt-1 text-xs text-gray-600">
                          <strong>Odniesienia:</strong> {message.referencedSections.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Suggested follow-up questions */}
                {message.type === 'bot' && message.suggestedFollowUp && message.suggestedFollowUp.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Lightbulb size={10} />
                      Sugerowane pytania:
                    </div>
                    {message.suggestedFollowUp.slice(0, 3).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedQuestion(suggestion)}
                        disabled={isLoading}
                        className="block w-full text-left p-2 text-xs bg-remedy-accent bg-opacity-10 hover:bg-remedy-accent hover:bg-opacity-20 border border-remedy-accent border-opacity-30 rounded-lg text-remedy-accent transition-all disabled:opacity-50 hover:scale-102"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs shadow-sm ${
                message.type === 'user' 
                  ? 'bg-gradient-theme order-1 mr-2' 
                  : 'bg-remedy-accent order-2 ml-2'
              }`}>
                {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 shadow-sm p-3 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-2 h-2 bg-remedy-accent rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-remedy-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-remedy-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="ml-2">Analizuję pytanie...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Zadaj pytanie o analizę pacjenta..."
              disabled={isLoading}
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent text-sm disabled:opacity-50 transition-all"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10"
            >
              <Send size={16} />
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
            💡 Zadawaj pytania o kryteria, farmakoterapię, TRD, ryzyko pacjenta
          </div>
        </div>
      </div>
    </div>
  );
}; 