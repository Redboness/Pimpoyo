// src/components/Message/Message.tsx
import React from 'react'; // <--- ASEGÚRATE DE TENER ESTA IMPORTACIÓN
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // <--Remark-gfm para mejor renderizado
// Modificado para usar 'import type' para tipos que solo se usan como anotaciones
import type { ChatMessage, MessageButton} from '../../types/types'; // Ajusta la ruta

interface MessageProps {
  message: ChatMessage;
  onButtonClick: (messageId: number | string, buttonId: string) => void;
}

// Comentario encima de la función Message
function Message({ message, onButtonClick }: MessageProps) {
  // Desestructurar el nuevo campo 'interactiveContent'
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
        {/* --- INICIO DE LA MODIFICACIÓN DEL CONTENIDO PRINCIPAL --- */}
        {interactiveContent ? (
          <div>{interactiveContent}</div> // Renderiza directamente el contenido interactivo
        ) : htmlContent ? (
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ) : text ? (
          isUser ? (
            <p>{text}</p>
          ) : (
            <ReactMarkdown>{text}</ReactMarkdown>
          )
        ) : null}
        {/* --- FIN DE LA MODIFICACIÓN DEL CONTENIDO PRINCIPAL --- */}

        {/* NUEVO: Renderizado de la tarjeta del reto (tu código existente se mantiene) */}
        {challengeCard && (
          <div className="tip-challenge-card">
            <div className="challenge-question">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{challengeCard.question}</ReactMarkdown>
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

        {/* Botones de navegación PRINCIPALES del consejo (tu código existente se mantiene) */}
        {/* He añadido !challengeCard aquí para evitar renderizar estos botones si ya hay una challengeCard.
            Ajusta si tu lógica de visualización de botones es diferente. */}
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
