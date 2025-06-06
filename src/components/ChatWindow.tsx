import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Clock, CheckCircle, AlertCircle, Lightbulb, Copy, Maximize2, Minimize2, Check } from 'lucide-react';
import { chatbotService, type ChatMessage } from '../services/chatbotService';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

// Funkcja do formatowania tekstu markdown
const formatMarkdownText = (text: string): JSX.Element => {
  // Podziel tekst na części i zastąp **tekst** na <strong>tekst</strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Usuń ** i zwróć pogrubiony tekst
          const boldText = part.slice(2, -2);
          return <strong key={index} className="font-semibold text-remedy-primary">{boldText}</strong>;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<'criteria' | 'pharmacotherapy' | 'episodes' | 'risk' | 'general'>('general');
  const [analysisType, setAnalysisType] = useState<'multi-agent' | 'single-agent'>('multi-agent');
  const [isMaximized, setIsMaximized] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Funkcja przewijania na dół
  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current) {
      // Opcja 1: Używaj scrollIntoView
      messagesEndRef.current.scrollIntoView({ 
        behavior: force ? 'auto' : 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
    
    // Opcja 2: Backup - przewiń kontener do końca
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      if (force) {
        container.scrollTop = container.scrollHeight;
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  // Załaduj wiadomości przy otwieraniu
  useEffect(() => {
    if (isOpen && chatbotService.isSessionActive()) {
      setMessages(chatbotService.getMessages());
      setAnalysisType(chatbotService.getAnalysisType());
      // Przewiń na dół po załadowaniu wiadomości
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [isOpen]);

  // Auto-scroll do ostatniej wiadomości z opóźnieniem
  useEffect(() => {
    if (messages.length > 0) {
      // Krótkie opóźnienie żeby DOM zdążył się zaktualizować
      setTimeout(() => scrollToBottom(), 50);
      // Dodatkowe przewijanie dla pewności po dłuższym czasie
      setTimeout(() => scrollToBottom(), 200);
    }
  }, [messages]);

  // Focus na input przy otwieraniu
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Funkcja kopiowania tekstu do schowka
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000); // Reset po 2 sekundach
    } catch (error) {
      console.error('Błąd podczas kopiowania:', error);
      // Fallback dla starszych przeglądarek
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  // Funkcja maksymalizacji/minimalizacji okna
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    const question = inputValue.trim();
    setInputValue('');

    // Przewiń natychmiast po dodaniu wiadomości użytkownika
    setTimeout(() => scrollToBottom(), 50);

    try {
      const response = await chatbotService.askQuestion(question, selectedFocus);
      setMessages(chatbotService.getMessages());
      // Wymuś przewijanie po otrzymaniu odpowiedzi
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
      // Ostateczne przewijanie po zakończeniu
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const handleSuggestedQuestion = async (question: string) => {
    if (isLoading) return;

    setIsLoading(true);
    
    // Przewiń natychmiast po kliknięciu sugerowanego pytania
    setTimeout(() => scrollToBottom(), 50);
    
    try {
      const response = await chatbotService.askQuestion(question, selectedFocus);
      setMessages(chatbotService.getMessages());
      // Wymuś przewijanie po otrzymaniu odpowiedzi
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error sending suggested question:', error);
    } finally {
      setIsLoading(false);
      // Ostateczne przewijanie po zakończeniu
      setTimeout(() => scrollToBottom(), 100);
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
    if (confidence >= 0.8) return 'text-remedy-success';
    if (confidence >= 0.6) return 'text-remedy-warning';
    return 'text-remedy-danger';
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return <AlertCircle size={12} />;
    if (confidence >= 0.8) return <CheckCircle size={12} />;
    if (confidence >= 0.6) return <Clock size={12} />;
    return <AlertCircle size={12} />;
  };

  if (!isOpen) return null;

  // Dynamiczne style dla okna w zależności od stanu maksymalizacji
  const windowClasses = isMaximized 
    ? "fixed inset-4 w-auto h-auto" 
    : "absolute bottom-6 right-6 w-[500px] h-[600px]";

  return (
    <div className="fixed inset-0 z-40 no-print">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900 bg-opacity-40 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Chat Window */}
      <div className={`${windowClasses} card-remedy flex flex-col overflow-hidden shadow-2xl border border-remedy-border bg-white rounded-xl transition-all duration-300`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-remedy-primary via-remedy-accent to-remedy-secondary text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Asystent Medyczny AI</h3>
              <p className="text-xs opacity-90">
                {analysisType === 'multi-agent' ? 'Analiza Wieloagentowa' : 'Analiza Klasyczna'} • Wsparcie kliniczne
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Przycisk maksymalizacji */}
            <button
              onClick={toggleMaximize}
              className="text-white hover:text-gray-200 transition-all duration-200 p-1 hover:bg-white hover:bg-opacity-20 rounded-lg"
              title={isMaximized ? "Minimalizuj okno" : "Maksymalizuj okno"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            {/* Przycisk zamknięcia */}
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-all duration-200 p-1 hover:bg-white hover:bg-opacity-20 rounded-lg"
              title="Zamknij chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Focus Area Selector */}
        <div className="p-3 border-b bg-gradient-to-r from-remedy-light to-gray-50">
          <label className="text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1">
            <svg className="w-3 h-3 text-remedy-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Obszar specjalizacji:
          </label>
          <select
            value={selectedFocus}
            onChange={(e) => setSelectedFocus(e.target.value as any)}
            className="w-full p-2 text-xs border border-remedy-border rounded-lg focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent transition-all bg-white shadow-sm"
          >
            <option value="general">🔍 Ogólne pytania</option>
            <option value="criteria">📋 Kryteria włączenia/wyłączenia</option>
            <option value="pharmacotherapy">💊 Farmakoterapia i TRD</option>
            <option value="episodes">📊 Epizody depresyjne</option>
            <option value="risk">⚠️ Ocena ryzyka</option>
          </select>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-remedy-light to-white">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <div
                  className={`
                    p-3 rounded-xl text-xs transition-all shadow-sm relative group
                    ${message.type === 'user' 
                      ? 'bg-gradient-to-r from-remedy-primary to-remedy-accent text-white shadow-lg' 
                      : 'bg-white text-gray-800 border border-remedy-border shadow-md'
                    }
                  `}
                >
                  {/* Przycisk kopiowania dla odpowiedzi bota */}
                  {message.type === 'bot' && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-remedy-light rounded-md"
                      title="Kopiuj odpowiedź"
                    >
                      {copiedMessageId === message.id ? (
                        <Check size={12} className="text-remedy-success" />
                      ) : (
                        <Copy size={12} className="text-gray-500 hover:text-remedy-primary" />
                      )}
                    </button>
                  )}
                  
                  <div className="whitespace-pre-wrap leading-relaxed pr-6">
                    {message.type === 'bot' ? formatMarkdownText(message.content) : message.content}
                  </div>
                  
                  {/* Bot message metadata */}
                  {message.type === 'bot' && (
                    <div className="mt-2 pt-2 border-t border-remedy-border">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={8} />
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
                    <div className="text-xs text-gray-600 flex items-center gap-1 font-medium">
                      <Lightbulb size={12} className="text-remedy-warning" />
                      Sugerowane pytania:
                    </div>
                    {message.suggestedFollowUp.slice(0, 3).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedQuestion(suggestion)}
                        disabled={isLoading}
                        className="block w-full text-left p-2 text-xs bg-gradient-to-r from-remedy-light to-remedy-secondary/10 hover:from-remedy-secondary/20 hover:to-remedy-accent/20 border border-remedy-border rounded-lg text-remedy-primary transition-all duration-200 disabled:opacity-50 hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shadow-lg ${
                message.type === 'user' 
                  ? 'bg-gradient-to-r from-remedy-primary to-remedy-accent order-1 mr-2' 
                  : 'bg-gradient-to-r from-remedy-accent to-remedy-secondary order-2 ml-2'
              }`}>
                {message.type === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-remedy-border shadow-lg p-3 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-remedy-primary rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-remedy-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-remedy-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="font-medium">Analizuję pytanie...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Zadaj pytanie o analizę pacjenta..."
              disabled={isLoading}
              className="flex-1 p-2 border border-remedy-border rounded-xl focus:ring-2 focus:ring-remedy-accent focus:border-remedy-accent text-xs disabled:opacity-50 transition-all shadow-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-to-r from-remedy-primary to-remedy-accent hover:from-remedy-primary/90 hover:to-remedy-accent/90 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Send size={14} />
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-600 flex items-center gap-1 bg-gradient-to-r from-remedy-light to-remedy-secondary/10 p-2 rounded-lg">
            <svg className="w-4 h-4 text-remedy-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="font-medium">Zadawaj pytania o kryteria, farmakoterapię, TRD, ryzyko pacjenta</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 