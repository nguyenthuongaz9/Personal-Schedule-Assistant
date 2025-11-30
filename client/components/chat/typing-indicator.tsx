import React from 'react';
import { Bot } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex space-x-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
        <Bot className="h-4 w-4 text-white" />
      </div>
      
      <div className="flex-1">
        <div className="inline-block bg-gray-100 text-gray-900 rounded-2xl px-4 py-3">
          <div className="flex space-x-1">
            <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
