// src/components/MessageList/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import Message from '../Message/Message';
import { MessageListProps } from '../../types/types';

/**
 * Renderiza la lista de mensajes en el chat.
 * Itera sobre un array de mensajes y usa el componente `Message` para mostrar
 * cada uno. Implementa una función de auto-scroll para que la vista siempre
 * se desplace hacia el mensaje más reciente.
 * @param {MessageListProps} props - Las propiedades del componente.
 * @param {ChatMessage[]} props.messages - El array de objetos de mensaje a renderizar.
 * @param {(messageId: number | string, buttonId: string) => void} props.onButtonClick - La función callback que se pasa a cada `Message` para manejar los clics en botones.
 * @returns {React.ReactElement} El elemento `main` que contiene la lista de mensajes.
 */
function MessageList({ messages, onButtonClick }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="chat-messages">
      {messages.map((msg) => (
        <Message
          key={msg.id}
          message={msg}
          onButtonClick={onButtonClick}
        />
      ))}
      <div ref={messagesEndRef} />
    </main>
  );
}

export default MessageList;
