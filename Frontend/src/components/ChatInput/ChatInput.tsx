// src/components/ChatContainer/ChatInput.tsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { ChatInputProps } from '../../types/types';


function ChatInput({ onSendMessage }: ChatInputProps) {
  const [inputText, setInputText] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission
    if (inputText.trim()) {
      onSendMessage(inputText.trim()); // Call the function passed from parent
      setInputText(''); // Clear input after sending
    }
  };

  return (
    // Structure from index.html, wrapped in a form for Enter key submission
    <form className="chat-input-area" onSubmit={handleSubmit}>
      <input
        type="text"
        className="text-input" // Class from style.css
        placeholder="Comienza a escribir..." // Placeholder from index.html
        value={inputText}
        onChange={handleInputChange}
        aria-label="Mensaje a enviar"
      />
      <button
        type="submit" // Submit button triggers form onSubmit
        className="send-button" // Class from style.css
        aria-label="Enviar mensaje" // Label from index.html
      >
        <FontAwesomeIcon icon={faChevronRight} />
      </button>
    </form>
  );
}

export default ChatInput;
