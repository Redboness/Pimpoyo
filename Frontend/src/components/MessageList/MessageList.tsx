// src/components/MessageList/MessageList.tsx
import React, { useEffect, useRef } from 'react';
// Import the new Message component
import Message from '../Message/Message';
import { MessageListProps } from '../../types/types';

function MessageList({ messages, onButtonClick }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for scrolling

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="chat-messages">
      {messages.map((msg) => (
         // Use the Message component for each message
         <Message
            key={msg.id}
            message={msg}
            onButtonClick={onButtonClick} // Pass the handler down
         />
      ))}
      {/* Empty div at the end to scroll to */}
      <div ref={messagesEndRef} />
    </main>
  );
}

export default MessageList;
