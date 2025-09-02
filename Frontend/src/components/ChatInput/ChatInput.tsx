// src/components/ChatInput/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { ChatInputProps } from '../../types/types';

/**
 * Un componente controlado para el área de entrada del chat.
 * Incluye un textarea que se redimensiona automáticamente con el contenido y un botón de envío.
 * @param {ChatInputProps} props - Propiedades para el componente.
 * @param {(message: string) => void} props.onSendMessage - Función callback para enviar un mensaje.
 * @param {boolean} props.disabled - Deshabilita la entrada y el botón cuando es verdadero.
 * @returns {React.ReactElement} El elemento de formulario renderizado para la entrada de chat.
 */
function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Actualiza el estado `inputText` cada vez que el usuario escribe en el textarea.
   * @param {React.ChangeEvent<HTMLTextAreaElement>} event - El evento de cambio del textarea.
   * @returns {void}
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
  };

  /**
   * Efecto para auto-redimensionar la altura del textarea basándose en su contenido.
   * Se activa cada vez que el `inputText` cambia.
   */
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const computedStyle = window.getComputedStyle(textarea);
      const cssMinHeight = parseInt(computedStyle.minHeight, 10);

      if (inputText.trim() === '') {
        textarea.style.height = 'auto';
      } else {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const tolerance = 25;
        if (scrollHeight > cssMinHeight + tolerance) {
          textarea.style.height = `${scrollHeight}px`;
        } else {
          textarea.style.height = 'auto';
        }
      }
    }
  }, [inputText]);

  /**
   * Gestiona el envío del formulario.
   * Previene la acción por defecto del formulario, recorta el texto de entrada,
   * envía el mensaje si no está vacío y luego limpia el textarea.
   * @param {React.FormEvent} event - El evento de envío del formulario.
   * @returns {void}
   */
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <form className="chat-input-area" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className="text-input"
        placeholder={disabled ? "Esperando respuesta o acción..." : "Comienza a escribir..."}
        value={inputText}
        onChange={handleInputChange}
        aria-label="Mensaje a enviar"
        disabled={disabled}
        rows={1}
      />
      <button
        type="submit"
        className="send-button"
        aria-label="Enviar mensaje"
        disabled={disabled || !inputText.trim()}
      >
        <FontAwesomeIcon icon={faChevronRight} />
      </button>
    </form>
  );
}

export default ChatInput;
