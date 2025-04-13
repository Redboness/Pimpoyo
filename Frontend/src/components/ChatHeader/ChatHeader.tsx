// src/components/ChatContainer/ChatHeader.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';

interface ChatHeaderProps {
  nickname: string;
  onPanelToggle: () => void;
  onRefresh: () => void;
}

function ChatHeader({ nickname, onPanelToggle, onRefresh }: ChatHeaderProps) {
  return (
    // Structure from index.html
    <header className="chat-header">
      <button
        className="button-refresh"
        aria-label="Volver al principio"
        onClick={onRefresh} // Attach refresh handler
      >
        <FontAwesomeIcon icon={faRotateRight} />
      </button>
      {/* Display nickname passed via props */}
      <span id="header-nickname">{nickname}</span>
      <button
        className="button-panel"
        aria-label="Abrir panel"
        onClick={onPanelToggle} // Attach panel toggle handler
      >
        {/* The bars are created using CSS pseudo-elements in style.css */}
        <span className="panel-bar-middle"></span>
      </button>
    </header>
  );
}

export default ChatHeader;
