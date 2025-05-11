// src/components/ChatInput/ChatInput.tsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { ChatInputProps } from '../../types/types'; // types.ts ya debería tener 'disabled'

// El comentario está encima de la función, como solicitaste.
function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [inputText, setInputText] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled) return; // No hacer nada si está deshabilitado
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <form className="chat-input-area" onSubmit={handleSubmit}>
      <input
        type="text"
        className="text-input"
        placeholder={disabled ? "Esperando respuesta o acción..." : "Comienza a escribir..."} // Placeholder dinámico
        value={inputText}
        onChange={handleInputChange}
        aria-label="Mensaje a enviar"
        disabled={disabled} // <-- APLICAR PROPIEDAD DISABLED
      />
      <button
        type="submit"
        className="send-button"
        aria-label="Enviar mensaje"
        disabled={disabled} // <-- APLICAR PROPIEDAD DISABLED
      >
        <FontAwesomeIcon icon={faChevronRight} />
      </button>
    </form>
  );
}

export default ChatInput;
