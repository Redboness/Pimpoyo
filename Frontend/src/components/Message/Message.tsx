// src/components/Message/Message.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, MessageButton } from '../../types/types'; // Adjust path as needed

interface MessageProps {
  message: ChatMessage;
  onButtonClick: (messageId: number | string, buttonId: string) => void;
}

function Message({ message, onButtonClick }: MessageProps) {
  const { id, sender, text, htmlContent, avatar, buttons, buttonsDisabled } = message;
  const isUser = sender === 'user';
  const isTipNavButtonSet = buttons?.some(btn => btn.icon && btn.id.startsWith('btn-tip-')) ?? false;

  return (
    <div data-message-id={id} className={`message ${isUser ? 'sent' : 'received'}`}>
      <img
        src={avatar}
        alt={`Avatar de ${isUser ? 'Usuario' : 'Pimpoyo'}`}
        className={`avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`}
      />
      <div className="message-bubble">

        {/* Render plain text if sender is user OR if text is empty/null */}
        {/* Render Markdown if sender is bot AND text has content */}
        {isUser || !text ? (
          text && <p>{text}</p> /* Render user message or empty bot message simply */
        ) : (
          // Use ReactMarkdown for bot messages with text content
          <ReactMarkdown>{text}</ReactMarkdown>
        )}

        {/* Render HTML content if present (less common now, but kept for compatibility) */}
        {htmlContent && (
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        )}

        {/* Conditionally render buttons */}
        {buttons && buttons.length > 0 && (
          <div className={isTipNavButtonSet ? "message-buttons-nav" : "message-buttons"}>
            {buttons.map((button: MessageButton) => {
              const buttonClass = (isTipNavButtonSet && button.icon) ? 'message-button-nav' : 'message-button';
              return (
                <button
                  key={button.id}
                  className={buttonClass}
                  onClick={() => onButtonClick(id, button.id)}
                  disabled={buttonsDisabled}
                  aria-label={button.ariaLabel || button.text}
                >
                  {button.icon ? (
                    <FontAwesomeIcon icon={button.icon} />
                  ) : (
                    button.text
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Message;
