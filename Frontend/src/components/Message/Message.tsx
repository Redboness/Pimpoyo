// src/components/Message/Message.tsx
// import React from 'react'; // Eliminado ya que no se usa React explícitamente como valor
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ReactMarkdown from 'react-markdown';
// Modificado para usar 'import type' para tipos que solo se usan como anotaciones
import type { ChatMessage, MessageButton} from '../../types/types'; // Ajusta la ruta

interface MessageProps {
  message: ChatMessage;
  onButtonClick: (messageId: number | string, buttonId: string) => void;
}

// Comentario encima de la función Message
function Message({ message, onButtonClick }: MessageProps) {
  const { id, sender, text, htmlContent, avatar, buttons, buttonsDisabled, challengeCard } = message;
  const isUser = sender === 'user';
  // const hasMainNavigationButtons = buttons && buttons.length > 0 && !challengeCard; // Eliminado porque no se usa
  const isTipNavButtonSet = buttons?.some(btn => btn.icon && (btn.id.startsWith('btn-tip-prev-') || btn.id.startsWith('btn-tip-next-'))) ?? false;


  return (
    <div data-message-id={id} className={`message ${isUser ? 'sent' : 'received'}`}>
      <img
        src={avatar}
        alt={`Avatar de ${isUser ? 'Usuario' : 'Pimpoyo'}`}
        className={`avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`}
      />
      <div className="message-bubble">
        {htmlContent ? (
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ) : text ? (
          isUser ? (
            <p>{text}</p>
          ) : (
            <ReactMarkdown>{text}</ReactMarkdown> // Texto principal del consejo
          )
        ) : null}

        {/* NUEVO: Renderizado de la tarjeta del reto */}
        {challengeCard && (
          <div className="tip-challenge-card">
            <div className="challenge-question">
              <ReactMarkdown>{challengeCard.question}</ReactMarkdown>
            </div>
            <div className="message-buttons challenge-options">
              {challengeCard.options.map((button: MessageButton) => (
                <button
                  key={button.id}
                  className="message-button challenge-option-button" // Clase específica
                  onClick={() => onButtonClick(id, button.id)}
                  disabled={buttonsDisabled} // El mensaje general puede deshabilitar estos
                  aria-label={button.ariaLabel || button.text}
                >
                  {button.icon ? <FontAwesomeIcon icon={button.icon} /> : button.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botones de navegación PRINCIPALES del consejo (Siguiente/Anterior/Entendido) */}
        {buttons && buttons.length > 0 && (
          <div className={isTipNavButtonSet ? "message-buttons-nav" : "message-buttons"}>
            {buttons.map((button: MessageButton) => {
              if (!button.id.startsWith('btn-tip-challenge-')) {
                const buttonClass = (isTipNavButtonSet && button.icon) ? 'message-button-nav' : 'message-button';
                return (
                  <button
                    key={button.id}
                    className={buttonClass}
                    onClick={() => onButtonClick(id, button.id)}
                    disabled={buttonsDisabled}
                    aria-label={button.ariaLabel || button.text}
                  >
                    {button.icon ? <FontAwesomeIcon icon={button.icon} /> : button.text}
                  </button>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Message;