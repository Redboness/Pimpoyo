// src/components/ChatInput/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { ChatInputProps } from '../../types/types';

function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
  };

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const computedStyle = window.getComputedStyle(textarea);
      // Get the min-height as computed by the browser from your CSS (e.g., "42.4px")
      // This represents the height of a single line.
      const cssMinHeight = parseInt(computedStyle.minHeight, 10);

      if (inputText.trim() === '') {
        // If input is empty, ensure height is 'auto' to respect CSS min-height.
        textarea.style.height = 'auto';
        // console.log(`Input empty. Height set to 'auto'. Effective min-height: ${cssMinHeight}px`);
      } else {
        // For non-empty input:
        // 1. Temporarily set to 'auto' to correctly measure scrollHeight,
        //    allowing it to shrink if text was deleted.
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;

        // console.log(`Measured scrollHeight: ${scrollHeight}px, CSS minHeight: ${cssMinHeight}px`);

        // 2. Only set the height to scrollHeight if scrollHeight is greater
        //    than the single-line min-height. Otherwise, let 'auto' (and thus CSS min-height) rule.
        //    A small tolerance (e.g., 1 or 2 pixels) can prevent jitter if scrollHeight and cssMinHeight
        //    are extremely close but not identical due to subpixel rendering.
        const tolerance = 25; // Adjust if needed, or set to 0 for strict comparison
        if (scrollHeight > cssMinHeight + tolerance) {
          textarea.style.height = `${scrollHeight}px`;
          // console.log(`Expanded height to: ${scrollHeight}px`);
        } else {
          // If content is still within the first line (or very close),
          // ensure it stays at the CSS defined min-height by using 'auto'.
          textarea.style.height = 'auto';
          // console.log('Content fits min-height. Height remains "auto".');
        }
      }
    }
  }, [inputText]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText(''); // Triggers useEffect, input becomes empty, height goes to 'auto'
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
