// src/components/ChatContainer/ChatHeader.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';

interface ChatHeaderProps {
  nickname: string;
  onPanelToggle: () => void;
  onRefresh: () => void;
}

/**
 * Componente funcional que renderiza la cabecera de la interfaz de chat.
 * Muestra el apodo del usuario e incluye botones para refrescar el chat y para alternar un panel lateral.
 * @param {ChatHeaderProps} props - Las propiedades pasadas al componente.
 * @param {string} props.nickname - El apodo del usuario a mostrar.
 * @param {() => void} props.onPanelToggle - Función callback a ejecutar cuando se hace clic en el botón del panel.
 * @param {() => void} props.onRefresh - Función callback a ejecutar cuando se hace clic en el botón de refrescar.
 * @returns {React.ReactElement} El elemento de la cabecera renderizado.
 */
function ChatHeader({ nickname, onPanelToggle, onRefresh }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <button
        className="button-refresh"
        aria-label="Volver al principio"
        onClick={onRefresh}
      >
        <FontAwesomeIcon icon={faRotateRight} />
      </button>
      <span id="header-nickname">{nickname}</span>
      <button
        className="button-panel"
        aria-label="Abrir panel"
        onClick={onPanelToggle}
      >
        <span className="panel-bar-middle"></span>
      </button>
    </header>
  );
}

export default ChatHeader;
