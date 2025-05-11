// src/components/GuidedAnalysisActivity/GuidedAnalysisActivity.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Usar ChatMessage directamente como está definido en tu types.ts
import { NoticiaParaAnalisis, ChatMessage } from '../../types/types';
import MessageList from '../MessageList/MessageList';
import ChatInput from '../ChatInput/ChatInput';
import './GuidedAnalysisActivity.css';
import { continueGuidedChat, finishGuidedNews, getNextGuidedNews, startGuidedAnalysis } from '../../services/GuideAnalysisApi';

const GuidedAnalysisActivity: React.FC = () => {
  const [currentNews, setCurrentNews] = useState<NoticiaParaAnalisis | null>(null);
  const [chatSessionId, setChatSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userInitialExplanation, setUserInitialExplanation] = useState<string>('');
  const [activityPhase, setActivityPhase] = useState<'loading' | 'showing_news' | 'initial_explanation' | 'chatting' | 'finished_news_item' | 'no_more_news'>('loading');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchNextNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setMessages([]);
    setUserInitialExplanation('');
    setChatSessionId(null);
    try {
      const news = await getNextGuidedNews();
      setCurrentNews(news);
      setActivityPhase('showing_news');
    } catch (err: any) {
      console.error("Error fetching next news:", err);
      setError(err.message || 'No se pudo cargar la siguiente noticia.');
      if (err.message && err.message.includes("No hay más noticias")) {
        setActivityPhase('no_more_news');
      } else {
        setActivityPhase('loading'); 
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNextNews();
  }, [fetchNextNews]);

  const handleStartInitialExplanation = () => {
    if (currentNews) {
      setActivityPhase('initial_explanation');
    }
  };

  const handleSubmitInitialExplanation = async () => {
    if (!currentNews || !userInitialExplanation.trim()) {
      setError('Por favor, escribe tu explicación.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    // Construye el mensaje del usuario usando el tipo ChatMessage
    // Tu ChatMessage requiere 'avatar' y 'timestamp' como number.
    const userExplanationMessage: ChatMessage = {
      id: `user-init-${Date.now()}`,
      text: `Mi explicación inicial: ${userInitialExplanation}`,
      sender: 'user',
      timestamp: Date.now(), // timestamp como number
      avatar: '', // Proporciona una URL de avatar o un placeholder
      // buttons y buttonsDisabled son opcionales en tu tipo ChatMessage
    };

    try {
      const response = await startGuidedAnalysis({
        noticia_id_json: currentNews.noticia_id_json,
        explicacion_usuario: userInitialExplanation,
      });
      setChatSessionId(response.chat_sesion_noticia_id);
      const botMessage: ChatMessage = {
        id: `bot-start-${Date.now()}`,
        text: response.respuesta_chatbot,
        sender: 'bot',
        timestamp: Date.now(),
        avatar: '', // Avatar para el bot
      };
      setMessages([userExplanationMessage, botMessage]);
      setActivityPhase('chatting');
    } catch (err: any) {
      console.error("Error starting guided analysis:", err);
      setError(err.message || 'No se pudo enviar la explicación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!chatSessionId || !text.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-msg-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: Date.now(),
      avatar: '', // Avatar del usuario
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsSubmitting(true);

    try {
      const response = await continueGuidedChat(chatSessionId, { mensaje_usuario: text });
      const botMessage: ChatMessage = {
        id: `bot-reply-${Date.now()}`,
        text: response.respuesta_chatbot,
        sender: 'bot',
        timestamp: Date.now(),
        avatar: '', // Avatar del bot
      };
      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (err: any) {
      console.error("Error continuing chat:", err);
      const errorMessage: ChatMessage = {
        id: `error-msg-${Date.now()}`,
        text: `Error: ${err.message || 'No se pudo enviar el mensaje.'}`,
        // Tu ChatMessage no tiene 'system' como sender, usa 'bot' o ajusta el tipo
        sender: 'bot', // O crea un avatar/estilo específico para mensajes de error del sistema
        timestamp: Date.now(),
        avatar: '', // Avatar para mensajes de error
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishCurrentNews = async () => {
    if (!chatSessionId) return;
    setIsSubmitting(true);
    try {
      await finishGuidedNews(chatSessionId);
      setActivityPhase('finished_news_item');
    } catch (err: any) {
      console.error("Error finishing news analysis:", err);
      setError(err.message || 'No se pudo finalizar el análisis de la noticia.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Función dummy para onButtonClick ya que MessageListProps lo requiere
  const handleMessageButtonClick = (messageId: number | string, buttonId: string) => {
    console.log(`Button ${buttonId} clicked on message ${messageId} - No action defined in GuidedAnalysis`);
    // Implementa la lógica si esta actividad usara botones en los mensajes
  };


  if (activityPhase === 'loading') {
    return <div className="guided-analysis-container loading">Cargando actividad...</div>;
  }

  if (activityPhase === 'no_more_news') {
    return <div className="guided-analysis-container finished-all">¡Felicidades! Has analizado todas las noticias disponibles para esta actividad.</div>;
  }
  
  const shouldShowError = error && !['no_more_news', 'finished_news_item'].includes(activityPhase);
  if (shouldShowError) {
    return <div className="guided-analysis-container error">Error: {error} <button onClick={fetchNextNews}>Reintentar</button></div>;
  }

  return (
    <div className="guided-analysis-container">
      <h2 className="activity-title">Análisis Guiado de Noticias</h2>

      {currentNews && (activityPhase === 'showing_news' || activityPhase === 'initial_explanation' || activityPhase === 'chatting') && (
        <div className="news-display-section card">
          <h3>Noticia a Analizar: {currentNews.headline}</h3>
          {currentNews.source && <p className="news-source"><strong>Fuente:</strong> {currentNews.source}</p>}
          {currentNews.difficulty_level && <p className="news-difficulty"><strong>Dificultad:</strong> {currentNews.difficulty_level}</p>}
          <p className="news-text">{currentNews.text}</p>
          {activityPhase === 'showing_news' && (
            <button onClick={handleStartInitialExplanation} className="btn-primary" disabled={isLoading}>
              Entendido, ¡listo para explicar!
            </button>
          )}
        </div>
      )}

      {activityPhase === 'initial_explanation' && (
        <div className="initial-explanation-section card">
          <h4>¿Qué piensas de esta noticia?</h4>
          <p>Escribe por qué crees que es verdadera o falsa. ¡No te preocupes por acertar, Pimpoyo te ayudará a reflexionar!</p>
          <textarea
            value={userInitialExplanation}
            onChange={(e) => setUserInitialExplanation(e.target.value)}
            placeholder="Escribe aquí tu explicación detallada..."
            rows={6}
            disabled={isSubmitting}
          />
          <button onClick={handleSubmitInitialExplanation} disabled={isSubmitting || !userInitialExplanation.trim()} className="btn-primary">
            {isSubmitting ? 'Enviando...' : 'Enviar mi explicación'}
          </button>
          {error && activityPhase === 'initial_explanation' && <p className="error-message">{error}</p>}
        </div>
      )}

      {(activityPhase === 'chatting') && chatSessionId && (
        <div className="chat-interaction-section">
          <div className="chat-messages-container">
            <MessageList messages={messages} onButtonClick={handleMessageButtonClick} />
            <div ref={messagesEndRef} />
          </div>
          {/* Eliminado el prop 'disabled' de ChatInput ya que no está en ChatInputProps */}
          <ChatInput onSendMessage={handleSendMessage} />
          <button onClick={handleFinishCurrentNews} disabled={isSubmitting} className="btn-secondary btn-finish-news">
            No tengo más preguntas, ¡siguiente!
          </button>
        </div>
      )}
      
      {activityPhase === 'finished_news_item' && (
        <div className="finished-news-item-message card">
            <p>¡Buen trabajo analizando esa noticia!</p>
            <button onClick={fetchNextNews} className="btn-primary">Cargar Siguiente Noticia</button>
        </div>
      )}
    </div>
  );
};

export default GuidedAnalysisActivity;