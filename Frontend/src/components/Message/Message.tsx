// src/components/Message/Message.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, MessageButton} from '../../types/types';

interface MessageProps {
  message: ChatMessage;
  onButtonClick: (messageId: number | string, buttonId: string) => void;
}

/**
 * Renderiza un único mensaje en el chat.
 * Es capaz de mostrar diferentes tipos de contenido: texto plano (usuario), Markdown (bot),
 * HTML y componentes interactivos de React. También gestiona la visualización de
 * botones de acción, de navegación y tarjetas de desafío.
 * @param {MessageProps} props - Las propiedades del componente.
 * @param {ChatMessage} props.message - El objeto del mensaje con la información a renderizar.
 * @param {(messageId: number | string, buttonId: string) => void} props.onButtonClick - Callback que se ejecuta al hacer clic en un botón del mensaje.
 * @returns {React.ReactElement} Un elemento `div` que representa el mensaje completo.
 */
function Message({ message, onButtonClick }: MessageProps) {
  const { id, sender, text, htmlContent, interactiveContent, avatar, buttons, buttonsDisabled, challengeCard } = message;
  const isUser = sender === 'user';
  const isTipNavButtonSet = buttons?.some(btn => btn.icon && (btn.id.startsWith('btn-tip-prev-') || btn.id.startsWith('btn-tip-next-'))) ?? false;

  return (
    <div data-message-id={id} className={`message ${isUser ? 'sent' : 'received'}`}>
      <img
        src={avatar}
        alt={`Avatar de ${isUser ? 'Usuario' : 'Pimpoyo'}`}
        className={`avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`}
      />
      <div className="message-bubble">
        {interactiveContent ? (
          <div>{interactiveContent}</div>
        ) : htmlContent ? (
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ) : text ? (
          isUser ? (
            <p>{text}</p>
          ) : (
            <ReactMarkdown>{text}</ReactMarkdown>
          )
        ) : null}

        {challengeCard && (
          <div className="tip-challenge-card">
            <div className="challenge-question">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{challengeCard.question}</ReactMarkdown>
            </div>
            <div className="message-buttons challenge-options">
              {challengeCard.options.map((button: MessageButton) => (
                <button
                  key={button.id}
                  className="message-button challenge-option-button"
                  onClick={() => onButtonClick(id, button.id)}
                  disabled={buttonsDisabled}
                  aria-label={button.ariaLabel || button.text}
                >
                  {button.icon ? <FontAwesomeIcon icon={button.icon} /> : button.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {buttons && buttons.length > 0 && !challengeCard && (
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
