// src/components/Message/Message.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, MessageButton } from '../../types/types'; // Adjust path as needed

interface MessageProps {
  message: ChatMessage;
  onButtonClick: (messageId: number | string, buttonId: string) => void;
}

// Renders a single chat message bubble.
function Message({ message, onButtonClick }: MessageProps) {
  // Destructure htmlContent as well
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

        {htmlContent ? (
            // PRIORITY: If htmlContent exists, render it directly.
            // Used for the news challenge's mobile view.
            // WARNING: Ensure htmlContent is safe/sanitized before using dangerouslySetInnerHTML.
            // In this specific case, we construct it carefully in ChatContainer.
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
         ) : text ? (
            // If no htmlContent but text exists:
            isUser ? (
                // Render user text simply within a paragraph
                <p>{text}</p>
            ) : (
                // Render bot text using Markdown for formatting
                <ReactMarkdown>{text}</ReactMarkdown>
            )
         ) : null /* Render nothing if both text and htmlContent are null/empty */
        }



        {/* Conditionally render buttons (logic remains the same) */}
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
                  {button.icon ? ( <FontAwesomeIcon icon={button.icon} /> ) : ( button.text )}
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
