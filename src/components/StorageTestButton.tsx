// ============================================================================
// STORAGE TEST BUTTON - Przycisk do testowania systemu storage
// ============================================================================

import React, { useState } from 'react';
import { testBrowserStorage } from '../test-storage';

export const StorageTestButton: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const runTest = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      console.log('🧪 [UI Test] Starting storage test from button...');
      await testBrowserStorage();
      setResult('✅ Test passed successfully!');
      console.log('🧪 [UI Test] Storage test completed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult(`❌ Test failed: ${errorMessage}`);
      console.error('🧪 [UI Test] Storage test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">🧪 Storage System Test</h3>
      <p className="text-sm text-gray-600 mb-3">
        Test systemu przechowywania analiz w IndexedDB
      </p>
      
      <button
        onClick={runTest}
        disabled={isRunning}
        className={`px-4 py-2 rounded font-medium ${
          isRunning
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isRunning ? 'Testowanie...' : 'Uruchom Test Storage'}
      </button>
      
      {result && (
        <div className={`mt-3 p-2 rounded text-sm ${
          result.startsWith('✅') 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {result}
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        Sprawdź konsolę przeglądarki (F12) aby zobaczyć szczegółowe logi
      </div>
    </div>
  );
}; 