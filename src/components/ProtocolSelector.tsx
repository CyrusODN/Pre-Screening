import React from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { PREDEFINED_PROTOCOLS } from '../data/protocols';
import { Protocol } from '../types';

interface ProtocolSelectorProps {
  selectedProtocol: Protocol | null;
  onProtocolSelect: (protocol: Protocol) => void;
}

export const ProtocolSelector: React.FC<ProtocolSelectorProps> = ({
  selectedProtocol,
  onProtocolSelect,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Wybierz Protokół Badania</h3>
      <div className="grid gap-4">
        {Object.values(PREDEFINED_PROTOCOLS).map((protocol) => (
          <button
            key={protocol.id}
            onClick={() => onProtocolSelect(protocol)}
            className={`w-full text-left p-4 rounded-lg border transition-all ${
              selectedProtocol?.id === protocol.id
                ? 'border-sky-500 bg-sky-50'
                : 'border-slate-200 hover:border-sky-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <FileText className={`w-5 h-5 ${
                  selectedProtocol?.id === protocol.id ? 'text-sky-500' : 'text-slate-400'
                }`} />
                <div>
                  <h4 className="font-medium text-slate-900">{protocol.name}</h4>
                  <p className="text-sm text-slate-600 mt-1">{protocol.description}</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${
                selectedProtocol?.id === protocol.id ? 'rotate-180 text-sky-500' : 'text-slate-400'
              }`} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};