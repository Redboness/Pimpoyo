/* eslint-disable prefer-const */
// src/components/ChatContainer/ChatContainer.tsx
import React, { useState, useEffect, useCallback } from "react";
import MessageList from "../MessageList/MessageList";
import ChatHeader from "../ChatHeader/ChatHeader";
import ChatInput from "../ChatInput/ChatInput";
import SidePanel from "../SidePanel/SidePanel";
import PostTestFlow from '../PostTestFlow/PostTestFlow'; // <--- IMPORTA TU COMPONENTE DE POST-TEST
import {
  UserInfo,
  ChatMessage,
  MessageButton,
  OllamaMessage,
  NewsItem,
  NewsChallengeState,
  DifficultyLevel,
  difficultyOrder,
  NoticiaParaAnalisis,
  ExplicacionInicialPayload,
  ChatGuiaResponse,
  ContinuarChatGuiaPayload,
  FinishPairChallengePayload,
  FinishPairChallengeResponse
  // Asegúrate de que UserInfo aquí (o en types.ts) tiene puntuacion_pre_test y puntuacion_post_test
} from "../../types/types";
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';

interface ChatContainerProps {
  authToken: string;
  onLogout: () => void;
}

const BOT_AVATAR_URL = "https://i.postimg.cc/GpMfkzPx/Rat-n-profesor-Copy.png";
const USER_AVATAR_URL_DEFAULT = "https://i.postimg.cc/SQwcn892/Ni-o-avatar-copy.png";

const tips = [
  { title: "Consejo 1:", text: "Revisa siempre la fuente de la información. ¿Es conocida? ¿Es fiable?" },
  { title: "Consejo 2:", text: "Busca otras fuentes que confirmen o desmientan la noticia. No te quedes con la primera versión." },
  { title: "Consejo 3:", text: "Fíjate en la fecha de publicación. A veces, noticias antiguas se hacen pasar por actuales." },
];

const SYSTEM_PROMPT_FAKE_NEWS = `
Rol: Eres un chatbot educativo y amigable llamado Pimpoyo, diseñado para niños de 10-12 años.
Misión Principal: Enseñar a identificar noticias falsas y comprender sus consecuencias.
Flujo de Interacción:
1. Tutorial Inicial: Si es apropiado, comienza con una guía rápida o consejos clave (píldoras informativas) para detectar noticias dudosas. Usa lenguaje sencillo y ejemplos claros. Sé muy breve.
2. Práctica Interactiva / Análisis de Noticias: Cuando el usuario presente una noticia o intente explicar por qué una noticia es falsa:
    - No des la respuesta directa (verdadero/falso) inmediatamente.
    - Guía sutilmente: Anímale a reflexionar haciendo preguntas sobre aspectos específicos. Ej: "¿Has revisado bien la fuente?", "¿Qué te dice la fecha de la noticia?", "¿El titular parece muy exagerado?".
    - Refuerza el esfuerzo: Valida su intento aunque no sea correcto del todo.
Estilo de Comunicación:
- Tono: Entusiasta, paciente y motivador. Como un compañero de aprendizaje.
- Extensión: Mensajes cortos y directos. Prioriza la claridad. Evita párrafos largos.
- Lenguaje: Simple, adecuado para niños de 10-12 años. Evita tecnicismos complejos.
- No afirmes lo que has recibido, es decir, si digo: Explicame como funciona X cosa, no digas: Claro, te explicaré cómo funciona X cosa (respuesta), simplemente responde a la pregunta sin repetirla.
Adaptación Personalizada (Contexto Backend):
- Ocasionalmente, podrías recibir información sobre las áreas de mejora del usuario (como 'area_de_enfoque_sugerida'). Usa esta información para enfocar sutilmente las preguntas o ejemplos en sus puntos débiles, ayudándole a practicar esas habilidades específicas.
Objetivo Final: Que el usuario aprenda a verificar información de forma crítica y autónoma, mediante un proceso interactivo y guiado.
`;

const SYSTEM_PROMPT_FREE_CHAT = `
Rol: Eres un chatbot educativo y amigable llamado Pimpoyo, diseñado para niños de 10-12 años.
Misión Principal: Enseñar o ayudar al usuario sobre las preguntas que tiene.
Flujo de Interacción:
1. El usuario te hará preguntas sobre temas variados, como matemáticas, historia, ciencia, etc.
2. Responde de manera clara y sencilla, proporcionando ejemplos si es necesario.
Estilo de Comunicación:
- Tono: Entusiasta, paciente y motivador. Como un compañero de aprendizaje.
- Extensión: Mensajes cortos y directos. Prioriza la claridad. Evita párrafos largos.
- Lenguaje: Simple, adecuado para niños de 10-12 años. Evita tecnicismos complejos.
- No afirmes lo que has recibido, es decir, si digo: Explicame que es el modelo gemma3:4b de Meta, no digas: Claro, te explicaré cómo funciona el Modelo gemma3:4b de Meta, simplemente responde a la pregunta sin repetirla.
- Tampoco afirmes que has escuchado al usuario, es decir, no digas cosas tipo ---¡Claro! Entiendo lo que quieres decir.--- o similar, simplemente di el resto.
Objetivo Final: Que el usuario aprenda sobre la información que te pregunta, mediante un proceso interactivo y guiado.
`;
// Comentario encima de la función ChatContainer
function ChatContainer({ authToken, onLogout }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [currentUserInfo, setCurrentUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState<boolean>(true);
  const [chatError, setChatError] = useState<string>("");
  const [refreshUserInfoToggle, setRefreshUserInfoToggle] = useState<boolean>(false);
  const [isFreeChatMode, setIsFreeChatMode] = useState<boolean>(false);

  const [newsData, setNewsData] = useState<NewsItem[] | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(false);
  const [newsChallengeState, setNewsChallengeState] = useState<NewsChallengeState | null>(null);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('bajo');
  const [correctStreak, setCorrectStreak] = useState<number>(0);
  const [incorrectStreak, setIncorrectStreak] = useState<number>(0);

  const [isSingleNewsAnalysisMode, setIsSingleNewsAnalysisMode] = useState<boolean>(false);
  const [singleNewsAnalysisData, setSingleNewsAnalysisData] = useState<NoticiaParaAnalisis | null>(null);
  const [currentGuidedChatSessionId, setCurrentGuidedChatSessionId] = useState<number | null>(null);
  const [isAwaitingInitialAnalysis, setIsAwaitingInitialAnalysis] = useState<boolean>(false);
  const [guidedAnalysesSubmitted, setGuidedAnalysesSubmitted] = useState<number>(0);
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);

  const [isPostTestMode, setIsPostTestMode] = useState<boolean>(false); // <--- NUEVO ESTADO PARA EL POST-TEST

  // Comentario encima de la función fetchUserInfo
  const fetchUserInfo = useCallback(async () => {
    setChatError('');
    if (!authToken) {
      setIsLoadingUserInfo(false);
      return;
    }
    setIsLoadingUserInfo(true); // Asegurar que está en true al iniciar el fetch
    try {
      const response = await fetch(`/api/users/me/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
      });
      if (!response.ok) {
        if (response.status === 401) { onLogout(); }
        else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Error ${response.status}`);
        }
        return;
      }
      const userData: UserInfo = await response.json();
      setCurrentUserInfo(userData);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Failed to load user data.');
      // setCurrentUserInfo(null); // Podrías limpiar userInfo si falla la carga
    } finally {
      setIsLoadingUserInfo(false);
    }
  }, [authToken, onLogout]);

  useEffect(() => {
    // Llama a fetchUserInfo solo si hay authToken y no estamos ya cargando, o si se pide refrescar
    if (authToken && (currentUserInfo === null || refreshUserInfoToggle)) {
      fetchUserInfo();
      if (refreshUserInfoToggle) setRefreshUserInfoToggle(false); // Resetear el toggle
    } else if (!authToken) {
      setCurrentUserInfo(null); // Limpiar si el token se va
      setIsLoadingUserInfo(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, fetchUserInfo, refreshUserInfoToggle]); // currentUserInfo quitado para evitar loops si fetchUserInfo lo setea

  // Comentario encima de la función createWelcomeMessage
  const createWelcomeMessage = useCallback((): ChatMessage => ({
    id: "welcome-msg-" + Date.now(),
    sender: "bot",
    text: `¡Encantado de conocerte, ${currentUserInfo?.apodo || "Usuario"}! Soy Pimpoyo. Puedo ayudarte con tips y consejos, descifrar noticias falsas o simplemente conversar un rato.`,
    avatar: BOT_AVATAR_URL,
    timestamp: Date.now(),
  }), [currentUserInfo]);

  useEffect(() => {
    if (!isLoadingUserInfo && currentUserInfo && messages.length === 0 && !isPostTestMode) { // No mostrar mensajes iniciales si estamos en post-test
      const initialButtonsMessage: ChatMessage = {
        id: "buttons-msg-" + Date.now(), sender: "bot", text: "¿Cómo empezamos?", avatar: BOT_AVATAR_URL, timestamp: Date.now() + 1,
        buttons: [
          { id: "btn-tips", text: "TIPS Y CONSEJOS" },
          { id: "btn-news", text: "DESCIFRAR NOTICIAS" },
          { id: "btn-talk", text: "SÓLO CHARLAR" },
        ],
        buttonsDisabled: false,
      };
      setIsFreeChatMode(false);
      setMessages([createWelcomeMessage(), initialButtonsMessage]);
    }
  }, [isLoadingUserInfo, currentUserInfo, createWelcomeMessage, messages.length, isPostTestMode]);
  // Comentario encima de la función togglePanel
  const togglePanel = () => setIsPanelOpen(!isPanelOpen);
  // Comentario encima de la función closePanel
  const closePanel = () => setIsPanelOpen(false);
  // Comentario encima de la función handleSettingsSaved
  const handleSettingsSaved = () => setRefreshUserInfoToggle(true); // Activar el toggle para refrescar
  // Comentario encima de la función addUserChoiceMessage
  const addUserChoiceMessage = useCallback((text: string) => {
    if (!currentUserInfo) return;
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(), sender: "user", text,
      avatar: currentUserInfo?.avatar_url || USER_AVATAR_URL_DEFAULT, timestamp: Date.now(),
    }]);
  }, [currentUserInfo]);
  // Comentario encima de la función addBotResponse
  const addBotResponse = useCallback((text: string | null, buttons: MessageButton[] = [], delay: number = 300, onMessageAdded?: (id: string | number) => void, htmlContent: string | null = null): string | number => {
    setIsBotTyping(false);
    const botMsgId = "bot-msg-" + Date.now() + Math.random();
    const botMsg: ChatMessage = {
      id: botMsgId, sender: "bot", text, htmlContent, avatar: BOT_AVATAR_URL,
      timestamp: Date.now() + delay, buttons, buttonsDisabled: buttons.length === 0,
    };
    if (text && htmlContent) console.warn("addBotResponse: Both text and htmlContent provided.");
    setTimeout(() => {
      setMessages(prev => [...prev, botMsg]);
      if (onMessageAdded) onMessageAdded(botMsgId);
    }, delay);
    return botMsgId;
  }, []);
  // Comentario encima de la función increaseDifficulty
  const increaseDifficulty = useCallback(() => {
    const currentIndex = difficultyOrder.indexOf(difficultyLevel);
    if (currentIndex < difficultyOrder.length - 1) {
      const nextLevel = difficultyOrder[currentIndex + 1];
      setDifficultyLevel(nextLevel); console.log(`Difficulty increased to: ${nextLevel}`); return true;
    } console.log(`Already at max difficulty: ${difficultyLevel}`); return false;
  }, [difficultyLevel]);
  // Comentario encima de la función decreaseDifficulty
  const decreaseDifficulty = useCallback(() => {
    const currentIndex = difficultyOrder.indexOf(difficultyLevel);
    if (currentIndex > 0) {
      const prevLevel = difficultyOrder[currentIndex - 1];
      setDifficultyLevel(prevLevel); console.log(`Difficulty decreased to: ${prevLevel}`); return true;
    } console.log(`Already at min difficulty: ${difficultyLevel}`); return false;
  }, [difficultyLevel]);
  // Comentario encima de la función resetSingleAnalysisMode
  const resetSingleAnalysisMode = useCallback(() => {
    setIsSingleNewsAnalysisMode(false);
    setSingleNewsAnalysisData(null);
    setCurrentGuidedChatSessionId(null);
    setIsAwaitingInitialAnalysis(false);
  }, []);
  // Comentario encima de la función processTwoNewsChallenge
  const processTwoNewsChallenge = useCallback((currentNewsData: NewsItem[], introId: string | number) => {
    // ... (tu lógica existente) ...
    const newsAtCurrentLevel = currentNewsData.filter(item => item.DIFFICULTY_LEVEL === difficultyLevel);
    const trueNewsFiltered = newsAtCurrentLevel.filter(item => item.CATEGORY === 'TRUE');
    const falseNewsFiltered = newsAtCurrentLevel.filter(item => item.CATEGORY === 'FALSE');

    if (trueNewsFiltered.length === 0 || falseNewsFiltered.length === 0) {
        const missingType = trueNewsFiltered.length === 0 ? 'verdaderas' : 'falsas';
        setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `¡Vaya! No encontré suficientes noticias ${missingType} de nivel "${difficultyLevel}" para este desafío.` } : msg));
        addBotResponse("¿Quieres intentar con otro nivel o hacer otra cosa?", [
            { id: "btn-tips-again", text: "Ver Tips" }, { id: "btn-talk-again", text: "Sólo Charlar" },
        ], 300);
        setIsLoadingNews(false);
        return;
    }
    const selectedTrueNews = trueNewsFiltered[Math.floor(Math.random() * trueNewsFiltered.length)];
    const selectedFalseNews = falseNewsFiltered[Math.floor(Math.random() * falseNewsFiltered.length)];
    const showTrueOnLeft = Math.random() < 0.5;
    const leftNewsItem = showTrueOnLeft ? selectedTrueNews : selectedFalseNews;
    const rightNewsItem = showTrueOnLeft ? selectedFalseNews : selectedTrueNews;
    const createMobileViewHtml = (newsItem: NewsItem): string => {
        const escapeHtml = (unsafe: string): string => !unsafe ? '' : unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        const formattedTextHtml = escapeHtml(newsItem.TEXT).split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
        return `<div class="mobile-news-view"><div class="mobile-news-content"><h2 class="mobile-news-headline">${escapeHtml(newsItem.HEADLINE)}</h2><div class="mobile-news-text-scroll">${formattedTextHtml || '<p>...</p>'}</div></div><div class="mobile-news-footer"></div></div>`;
    };
    const leftHtml = createMobileViewHtml(leftNewsItem);
    const rightHtml = createMobileViewHtml(rightNewsItem);
    const combinedHtml = `<div class="news-challenge-container">${leftHtml}${rightHtml}</div>`;
    setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `¡Aquí tienes! Una REAL y una FALSA:` } : msg));
    const presentationMessage: ChatMessage = { id: "news-pres-" + Date.now(), sender: 'bot', avatar: BOT_AVATAR_URL, text: null, htmlContent: combinedHtml, timestamp: Date.now() + 300, buttons: [], buttonsDisabled: true, };
    setTimeout(() => { setMessages(prev => [...prev, presentationMessage]); }, 300);
    const selectionMessageId = addBotResponse( "¿Cuál de las dos noticias crees que es la VERDADERA?", [{ id: `select-news-left`, text: "Noticia Izquierda" }, { id: `select-news-right`, text: "Noticia Derecha" }], 800 );
    setNewsChallengeState({ trueNewsOriginalId: selectedTrueNews.ID, leftNewsOriginalId: leftNewsItem.ID, rightNewsOriginalId: rightNewsItem.ID, selectionMessageId: selectionMessageId as string, });
    setIsLoadingNews(false);
  }, [difficultyLevel, addBotResponse, BOT_AVATAR_URL, setIsLoadingNews, setMessages, setNewsChallengeState]);

  // Comentario encima de la función presentNewsChallenge
  const presentNewsChallenge = useCallback(async (forceSingleAnalysisMode: boolean = false) => {
    // ... (tu lógica existente) ...
    if (isLoadingNews) return;
    setIsLoadingNews(true);
    setChatError('');
    resetSingleAnalysisMode();
    setNewsChallengeState(null);

    const shouldUseSingleAnalysis = forceSingleAnalysisMode || (
        (difficultyLevel === 'medio' || difficultyLevel === 'alto') && Math.random() < 0.6
    );

    let introMessage = `Buscando desafío...`;
    if (shouldUseSingleAnalysis) {
        introMessage = `¡Vamos a analizar una noticia a fondo!`;
    }
    const introId = addBotResponse(introMessage, [], 0);

    if (shouldUseSingleAnalysis) {
        try {
            const response = await fetch('/api/activity/guided-analysis/next-news', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Error ${response.status}` }));
                throw new Error(errorData.detail || `No se pudo cargar la noticia para análisis: ${response.status}`);
            }
            const newsToAnalyze: NoticiaParaAnalisis = await response.json();
            setSingleNewsAnalysisData({...newsToAnalyze, initialUserEvaluation: undefined });
            setIsSingleNewsAnalysisMode(true);

            setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `Analicemos esta noticia:` } : msg));

            const newsHtml = `
                <div class="single-news-display" style="background-color: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-top: 10px;">
                    <h2>${newsToAnalyze.headline}</h2>
                    ${newsToAnalyze.source ? `<p style="font-style: italic; color: #555; font-size: 0.9em;">Fuente: ${newsToAnalyze.source}</p>` : ''}
                    <div class="single-news-text-scroll" style="max-height: 200px; overflow-y: auto; margin-top: 10px; line-height: 1.5;">
                        ${newsToAnalyze.text.split('\n').filter((p: string) => p.trim() !== '').map((p: string) => `<p>${p}</p>`).join('')}
                    </div>
                </div>`;
            addBotResponse(null, [], 100, undefined, newsHtml);

            setTimeout(() => {
                addBotResponse(
                    "Léela con atención. Cuando estés listo/a, dime: ¿Crees que esta noticia es Verdadera o Falsa? Y, lo más importante, ¿por qué piensas eso? Escribe tu análisis completo aquí abajo.",
                    [], 300
                );
                setIsAwaitingInitialAnalysis(true);
            }, 1200);

        } catch (error) {
            console.error("Error fetching single news for analysis:", error);
            const errorMsg = error instanceof Error ? error.message : "Error desconocido";
            setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `¡Ups! No pude cargar una noticia para analizar (${errorMsg}).` } : msg));
            addBotResponse("¿Probamos otra cosa?", [
                { id: "btn-news-again", text: "Otro Desafío" }, { id: "btn-talk-again", text: "Sólo Charlar" },
            ], 300);
            resetSingleAnalysisMode();
        } finally {
            setIsLoadingNews(false);
        }
    } else {
        if (!newsData) {
             try {
                const response = await fetch('/api/news/challenge', { headers: { 'Authorization': `Bearer ${authToken}` } });
                if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Error cargando noticias");
                const allFetchedNews: NewsItem[] = await response.json();
                if (!Array.isArray(allFetchedNews) || allFetchedNews.length === 0) throw new Error("No se recibieron noticias válidas");
                setNewsData(allFetchedNews);
                processTwoNewsChallenge(allFetchedNews, introId);
            } catch (error) {
                console.error("Failed to load news data from API:", error);
                const errorMsg = error instanceof Error ? error.message : "Error desconocido";
                setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `¡Ups! Hubo un problema al buscar las noticias (${errorMsg}).` } : msg));
                addBotResponse("¿Probamos otra cosa?", [{ id: "btn-tips-again", text: "Ver Tips" }, { id: "btn-talk-again", text: "Sólo Charlar" }], 300);
                setIsLoadingNews(false);
            }
        } else {
             processTwoNewsChallenge(newsData, introId);
        }
    }
  }, [authToken, isLoadingNews, newsData, difficultyLevel, addBotResponse, resetSingleAnalysisMode, processTwoNewsChallenge]);

  // Comentario encima de la función handleMessageButtonClick
  const handleMessageButtonClick = useCallback(async (messageId: number | string, buttonId: string) => {
    // ... (tu lógica existente sin cambios para esta parte) ...
    console.log(`Button Clicked: MessageID=${messageId}, ButtonID=${buttonId}`);

    if (!buttonId.startsWith("btn-tip-next-") && !buttonId.startsWith("btn-tip-prev-")) {
        setMessages(current => current.map(msg => {
            if (msg.id === messageId) {
                return { ...msg, buttonsDisabled: true };
            }
            if (newsChallengeState && msg.id === newsChallengeState.selectionMessageId && !buttonId.startsWith("select-news-")) {
                 return { ...msg, buttonsDisabled: true };
            }
            return msg;
        }));
    }

    if (buttonId === "btn-finish-analysis" && isSingleNewsAnalysisMode && currentGuidedChatSessionId) {
        addUserChoiceMessage("Terminar análisis y ver solución.");
        setIsBotTyping(true);
        try {
          addBotResponse("Revisando tu análisis y preparando la solución...", [], 0);
          setIsBotTyping(true);
          const response = await fetch(`/api/activity/guided-analysis/finish-news/${currentGuidedChatSessionId}`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }
          });
          setIsBotTyping(false);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: `Error ${response.status}` }));
            throw new Error(errorData.detail || "No se pudo finalizar el análisis y obtener la solución.");
          }
          const result = await response.json();
          addBotResponse(result.message || "¡Análisis completado!", [], 300);

          addBotResponse("¿Qué hacemos ahora?", [
            { id: "btn-news-again", text: "Siguiente Desafío" },
            { id: "btn-talk-again", text: "Sólo Charlar" },
          ], 500);

        } catch (error) {
            setIsBotTyping(false);
            addBotResponse(`Error al finalizar y mostrar solución: ${error instanceof Error ? error.message : 'Desconocido'}.`, [
                { id: "btn-news-again", text: "Otro Desafío" }, { id: "btn-talk-again", text: "Sólo Charlar" },
            ]);
        }
        finally {
            resetSingleAnalysisMode();
        }
        return;
    } else if (buttonId === "btn-finish-analysis-anyway") {
        addUserChoiceMessage("Terminar Análisis Igualmente.");
         if (currentGuidedChatSessionId) {
            addBotResponse("De acuerdo, finalizando este análisis.", [], 0);
         }
        addBotResponse("¿Qué hacemos ahora?", [
            { id: "btn-news-again", text: "Otro Desafío" }, { id: "btn-talk-again", text: "Sólo Charlar" },
        ], 300);
        resetSingleAnalysisMode();
        return;
    }

    if (buttonId.startsWith("btn-tip-next-") || buttonId.startsWith("btn-tip-prev-")) {
      const isNext = buttonId.startsWith("btn-tip-next-");
      const currentIndex = parseInt(buttonId.split("-").pop() || "0", 10);
      const targetIndex = isNext ? currentIndex + 1 : currentIndex - 1;
      if (targetIndex >= 0 && targetIndex < tips.length) {
        const targetTip = tips[targetIndex];
        const newButtons: MessageButton[] = [];
        if (targetIndex > 0) newButtons.push({ id: `btn-tip-prev-${targetIndex}`, icon: faArrowLeft, ariaLabel: 'Anterior' });
        if (targetIndex < tips.length - 1) newButtons.push({ id: `btn-tip-next-${targetIndex}`, icon: faArrowRight, ariaLabel: 'Siguiente' });
        else newButtons.push({ id: "btn-tip-understood", text: "He entendido los consejos" });
        setMessages(current => current.map(msg => msg.id === messageId ? { ...msg, text: `${targetTip.title} ${targetTip.text}`, buttons: newButtons, buttonsDisabled: false, timestamp: Date.now() } : msg));
      }
      return;
    }

    if (buttonId === "btn-tips" || buttonId === "btn-tips-again") {
      setIsFreeChatMode(false); resetSingleAnalysisMode();
      addUserChoiceMessage(buttonId === "btn-tips" ? "TIPS Y CONSEJOS" : "Ver Tips");
      const firstTip = tips[0];
      addBotResponse(`${firstTip.title} ${firstTip.text}`, [{ id: "btn-tip-next-0", icon: faArrowRight, ariaLabel: 'Siguiente' }]);
      setNewsChallengeState(null);
      return;
    }
    if (buttonId === "btn-news" || buttonId === "btn-news-again") {
      setIsFreeChatMode(false);
      addUserChoiceMessage(buttonId === "btn-news" ? "DESCIFRAR NOTICIAS" : (buttonId === "btn-news-again" ? "Siguiente Desafío" : "Otro Desafío"));
      presentNewsChallenge();
      return;
    }
    if (buttonId === "btn-talk" || buttonId === "btn-talk-again") {
      setIsFreeChatMode(true); resetSingleAnalysisMode();
      addUserChoiceMessage(buttonId === "btn-talk" ? "SÓLO CHARLAR" : "Sólo Charlar");
      addBotResponse("¡Claro! ¿De qué te gustaría hablar?", []);
      setNewsChallengeState(null);
      return;
    }

    if (buttonId === "btn-tip-understood") {
      addUserChoiceMessage("He entendido los consejos");
      addBotResponse("¡Estupendo! 👍 ¿Quieres repasarlos o hacer otra cosa?", [
        { id: "btn-repeat-tips-yes", text: "Repasar Tips" },
        { id: "btn-news-again", text: "Descifrar Noticias" },
        { id: "btn-talk-again", text: "Sólo Charlar" }
      ]);
      return;
    }
    if (buttonId === "btn-repeat-tips-yes") {
      setIsFreeChatMode(false); resetSingleAnalysisMode();
      addUserChoiceMessage("Sí, por favor, repasemos");
      const firstTip = tips[0];
      addBotResponse(`${firstTip.title} ${firstTip.text}`, [{ id: "btn-tip-next-0", icon: faArrowRight, ariaLabel: 'Siguiente' }]);
      return;
    }

    if (newsChallengeState && buttonId.startsWith("select-news-")) {
      // ... (tu lógica existente para el desafío de pares) ...
      setMessages(current => current.map(msg => msg.id === newsChallengeState.selectionMessageId ? { ...msg, buttonsDisabled: true } : msg));
      const choseLeft = buttonId === "select-news-left";
      const choiceText = choseLeft ? "Noticia Izquierda" : "Noticia Derecha";
      addUserChoiceMessage(`Creo que la verdadera es: ${choiceText}`);

      const veamosId = addBotResponse("Veamos...", [],0);
      setIsBotTyping(true);

      const selectedNewsId = choseLeft ? newsChallengeState.leftNewsOriginalId : newsChallengeState.rightNewsOriginalId;
      let actualFalseNewsId = "";

      if (!newsChallengeState.trueNewsOriginalId || !newsChallengeState.leftNewsOriginalId || !newsChallengeState.rightNewsOriginalId) {
        console.error("Error: IDs de noticias faltantes en newsChallengeState", newsChallengeState);
        setMessages(prev => prev.filter(m => m.id !== veamosId));
        setIsBotTyping(false);
        addBotResponse("Hubo un problema interno al identificar las noticias. Intenta de nuevo o elige otra opción.", [
            { id: "btn-news-again", text: "Jugar otra vez" }, { id: "btn-talk-again", text: "Sólo Charlar" },
        ]);
        setNewsChallengeState(null); return;
      }
      actualFalseNewsId = newsChallengeState.leftNewsOriginalId === newsChallengeState.trueNewsOriginalId ? newsChallengeState.rightNewsOriginalId : newsChallengeState.leftNewsOriginalId;

      if (typeof newsChallengeState.trueNewsOriginalId !== 'string' || !newsChallengeState.trueNewsOriginalId ||
          typeof actualFalseNewsId !== 'string' || !actualFalseNewsId ||
          typeof selectedNewsId !== 'string' || !selectedNewsId) {
          console.error("Error: Uno o más IDs de noticias para el payload no son válidos.", { /* ... */ });
          setMessages(prev => prev.filter(m => m.id !== veamosId));
          setIsBotTyping(false);
          addBotResponse("Hubo un error al procesar tu elección debido a IDs de noticias inválidos. Por favor, intenta de nuevo.", [
            { id: "btn-news-again", text: "Jugar otra vez" }, { id: "btn-talk-again", text: "Sólo Charlar" },
          ]);
          setNewsChallengeState(null); return;
      }

      const payload: FinishPairChallengePayload = {
        noticia_verdadera_id_json: newsChallengeState.trueNewsOriginalId,
        noticia_falsa_id_json: actualFalseNewsId,
        seleccion_usuario_id_json: selectedNewsId,
      };

      try {
        const response = await fetch('/api/challenge/finish-pair-selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify(payload)
         });
        setMessages(prev => prev.filter(m => m.id !== veamosId));
        setIsBotTyping(false);

        if (!response.ok) {
            let errorContentToThrow = `Error ${response.status}`;
            try {
                const errorData = await response.json();
                errorContentToThrow = errorData.detail || errorContentToThrow;
            } catch (e) { console.error("Error parsing error response:", e); }
            throw new Error(errorContentToThrow);
        }

        const result: FinishPairChallengeResponse = await response.json();
        const isCorrectBackend = result.es_correcto;
        let difficultyChangedMessage: string | null = null;
        let tempCorrectStreak = correctStreak;

        if (isCorrectBackend) {
            tempCorrectStreak++;
            setCorrectStreak(prev => prev + 1);
            setIncorrectStreak(0);
            if (tempCorrectStreak >= 3) {
                if (increaseDifficulty()) {
                    difficultyChangedMessage = "¡Tres seguidas! 😎 ¡Subimos un poco la dificultad!";
                    setCorrectStreak(0);
                } else {
                   if (tempCorrectStreak % 3 === 0) {
                        difficultyChangedMessage = "¡Imparable! Sigues dominando el nivel más alto. 🔥";
                   }
                }
            }
        } else {
            const newIncStreak = incorrectStreak + 1;
            setIncorrectStreak(newIncStreak);
            setCorrectStreak(0);
            tempCorrectStreak = 0;
            if (newIncStreak >= 3) {
                if (decreaseDifficulty()) {
                    difficultyChangedMessage = "¡Ánimo! 💪 Vamos a probar con unas un poco más sencillas.";
                    setIncorrectStreak(0);
                } else {
                    setIncorrectStreak(0);
                }
            }
        }

        let feedbackText = "";
        if (isCorrectBackend) {
            feedbackText = `✅ ¡Correcto! La ${choiceText.toLowerCase()} era la verdadera.`;
        } else {
            const correctPos = (newsChallengeState.leftNewsOriginalId === newsChallengeState.trueNewsOriginalId) ? "la izquierda" : "la derecha";
            feedbackText = `❌ ¡Ups! La ${choiceText.toLowerCase()} era la falsa. La verdadera era ${correctPos}.`;
        }
        if (result.explanation) {
            feedbackText += ` ${result.explanation}`;
        }

        let feedbackPresentationDelay = 300;
        if (difficultyChangedMessage) {
            addBotResponse(difficultyChangedMessage, [], 300);
            feedbackPresentationDelay = 600;
        }
        addBotResponse(feedbackText, [], feedbackPresentationDelay);

        let nextStepButtons: MessageButton[];
        const isThreeStreakSpecialAndLevelUp = isCorrectBackend && tempCorrectStreak > 0 && tempCorrectStreak % 3 === 0 && difficultyChangedMessage && difficultyChangedMessage.includes("¡Subimos un poco la dificultad!");
        const isThreeStreakSpecialMaxLevel = isCorrectBackend && tempCorrectStreak > 0 && tempCorrectStreak % 3 === 0 && difficultyChangedMessage && difficultyChangedMessage.includes("¡Imparable!");

        if (isThreeStreakSpecialAndLevelUp) {
            nextStepButtons = [
                { id: "btn-news-again", text: "Siguiente Desafío (¡Nivel Subido!)" },
                { id: "btn-tips-again", text: "Ver Tips" },
                { id: "btn-talk-again", text: "Sólo Charlar" }
            ];
        } else if (isThreeStreakSpecialMaxLevel) {
            nextStepButtons = [
                { id: "btn-news-again", text: "Siguiente Desafío" },
                { id: "btn-tips-again", text: "Ver Tips" },
                { id: "btn-talk-again", text: "Sólo Charlar" }
            ];
        }
         else {
            nextStepButtons = [
                { id: "btn-news-again", text: "Jugar otra vez" },
                { id: "btn-tips-again", text: "Ver Tips" },
                { id: "btn-talk-again", text: "Sólo Charlar" }
            ];
        }
        addBotResponse("¿Qué quieres hacer ahora?", nextStepButtons, feedbackPresentationDelay + 200);
      } catch (error) {
        setIsBotTyping(false);
        setMessages(prev => prev.filter(m => m.id !== veamosId));
        console.error("Error en desafío de pares:", error);
        addBotResponse(`Error al procesar tu elección: ${error instanceof Error ? error.message : 'Desconocido'}.`, [
            { id: "btn-news-again", text: "Jugar otra vez" }, { id: "btn-talk-again", text: "Sólo Charlar" },
        ]);
      }
      finally { setNewsChallengeState(null); }
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authToken, addUserChoiceMessage, addBotResponse, presentNewsChallenge, newsChallengeState,
    correctStreak, incorrectStreak, increaseDifficulty, decreaseDifficulty, difficultyLevel,
    isSingleNewsAnalysisMode, currentGuidedChatSessionId,
  ]);

  // Comentario encima de la función handleSendMessage
  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim() || !currentUserInfo) return;

    const newUserMessage: ChatMessage = {
      id: Date.now() + Math.random(), sender: "user", text: inputText,
      avatar: currentUserInfo?.avatar_url || USER_AVATAR_URL_DEFAULT, timestamp: Date.now(),
    };
    setMessages(currentMessages => [...currentMessages, newUserMessage]);

    setIsBotTyping(true);

    if (isSingleNewsAnalysisMode && isAwaitingInitialAnalysis && singleNewsAnalysisData) {
      setIsAwaitingInitialAnalysis(false);
      let evaluacion: 'TRUE' | 'FALSE' | 'UNSURE' | null = null;
      const lowerInput = inputText.toLowerCase();
      if (/\b(es\s+)?verdadera\b/.test(lowerInput) && !/\bno\s+(es\s+)?verdadera\b/.test(lowerInput)) evaluacion = 'TRUE';
      else if (/\b(es\s+)?falsa\b/.test(lowerInput) && !/\bno\s+(es\s+)?falsa\b/.test(lowerInput)) evaluacion = 'FALSE';
      else if (/\b(no\s+estoy\s+segur|no\s+s[eé]|dudo)\b/.test(lowerInput)) evaluacion = 'UNSURE';

      if (singleNewsAnalysisData) {
          setSingleNewsAnalysisData(prevData => prevData ? { ...prevData, initialUserEvaluation: evaluacion } : null);
      }

      const payload: ExplicacionInicialPayload = {
        noticia_id_json: singleNewsAnalysisData.noticia_id_json,
        explicacion_usuario: inputText,
        evaluacion_inicial_opcional: evaluacion,
        // Si el backend espera area_de_enfoque_sugerida, y types.ts está actualizado:
        ...(singleNewsAnalysisData.area_de_enfoque_sugerida && { area_de_enfoque_sugerida: singleNewsAnalysisData.area_de_enfoque_sugerida })
      };
      try {
        const response = await fetch('/api/activity/guided-analysis/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify(payload),
        });
        if (!response.ok) { throw new Error((await response.json().catch(() => ({}))).detail || `Error ${response.status}`); }
        const responseData: ChatGuiaResponse = await response.json();

        setCurrentGuidedChatSessionId(responseData.chat_sesion_noticia_id);
        addBotResponse(responseData.respuesta_chatbot, [], 500);

        const newSubmittedCount = guidedAnalysesSubmitted + 1;
        setGuidedAnalysesSubmitted(newSubmittedCount);

        let buttonsForInitialGuidedPhase: MessageButton[] = [
            { id: "btn-finish-analysis", text: "Terminar análisis y ver solución" }
        ];
        if (newSubmittedCount >= 5) {
            buttonsForInitialGuidedPhase.push({ id: "btn-tips-again", text: "Ver Tips" });
        }
        addBotResponse(
            "Puedes seguir preguntándome sobre esta noticia si tienes más dudas, o si ya estás listo/a:",
            buttonsForInitialGuidedPhase,
            600
        );
      } catch (error) {
        setIsBotTyping(false);
        addBotResponse(`Error al procesar tu análisis inicial: ${error instanceof Error ? error.message : 'Desconocido'}.`, [
            { id: "btn-news-again", text: "Otro Desafío" }, { id: "btn-talk-again", text: "Sólo Charlar" }
        ]);
        resetSingleAnalysisMode();
      }

    } else if (isSingleNewsAnalysisMode && currentGuidedChatSessionId && singleNewsAnalysisData) {
      const payload: ContinuarChatGuiaPayload = {
        mensaje_usuario: inputText,
        // Podrías pasar area_de_enfoque_sugerida aquí también si es necesario para el backend
        // ...(singleNewsAnalysisData.area_de_enfoque_sugerida && { area_de_enfoque_sugerida: singleNewsAnalysisData.area_de_enfoque_sugerida })
      };
      try {
        const response = await fetch(`/api/activity/guided-analysis/chat/${currentGuidedChatSessionId}/continue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(payload),
        });
        if (!response.ok) { throw new Error((await response.json().catch(() => ({}))).detail || `Error ${response.status}`);}
        const responseData: ChatGuiaResponse = await response.json();
        addBotResponse(responseData.respuesta_chatbot, [], 500);

        let buttonsForContinuedGuidedPhase: MessageButton[] = [
            { id: "btn-finish-analysis", text: "Terminar análisis y ver solución" }
        ];
        if (guidedAnalysesSubmitted >= 5) {
             buttonsForContinuedGuidedPhase.push({ id: "btn-tips-again", text: "Ver Tips" });
        }
        addBotResponse(
            "Puedes seguir preguntándome, o si prefieres:",
            buttonsForContinuedGuidedPhase,
            600
        );
      } catch (error) {
        setIsBotTyping(false);
        addBotResponse(`Error continuando la conversación guiada: ${error instanceof Error ? error.message : 'Desconocido'}.`, [
            { id: "btn-finish-analysis-anyway", text: "Terminar Análisis Igualmente" },
            { id: "btn-news-again", text: "Otro Desafío" }
        ]);
      }
    } else {
        if (newsChallengeState && newsChallengeState.selectionMessageId) {
             const selectionMessage = messages.find(msg => msg.id === newsChallengeState.selectionMessageId);
             if (selectionMessage && !selectionMessage.buttonsDisabled) {
                 addBotResponse("Elige una de las noticias con los botones antes de escribir, por favor.", [], 0);
                 setIsBotTyping(false);
                 return;
             }
        }
        const currentSystemPrompt = isFreeChatMode ? SYSTEM_PROMPT_FREE_CHAT : SYSTEM_PROMPT_FAKE_NEWS;
        const targetEndpoint = isFreeChatMode ? `/api/bot/chatlibre` : `/api/bot/chat`;

        const messagesForOllama: OllamaMessage[] = [{ role: 'system', content: currentSystemPrompt }];
        const messagesWithNewUser = [...messages, newUserMessage];
        messagesWithNewUser.forEach(msg => {
            if (msg.text && !msg.htmlContent) {
                 if (!(newsChallengeState && msg.id === newsChallengeState.selectionMessageId && !msg.buttonsDisabled)) {
                    messagesForOllama.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
                }
            }
        });

        try {
            const apiResponse = await fetch(targetEndpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' },
                body: JSON.stringify({ messages: messagesForOllama, model: 'gemma3:4b' })
            });
            if (!apiResponse.ok) {
                setIsBotTyping(false);
                const errData = await apiResponse.json().catch(() => ({})); throw new Error(errData.detail || `API Error ${apiResponse.status}`);
            }
            const data = await apiResponse.json();
            addBotResponse(data.reply, [], 300);

            if (!isFreeChatMode) {
                addBotResponse(
                    "Puedes seguir preguntando o:",
                    [
                        { id: "btn-news-again", text: "Ir a Otro Desafío" },
                        { id: "btn-tips-again", text: "Ver Tips" },
                    ],
                    500
                );
            }
        } catch (error) {
            setIsBotTyping(false);
            console.error(`Error sending message via ${targetEndpoint}:`, error);
            addBotResponse(`Lo siento, hubo un problema: ${error instanceof Error ? error.message : 'Desconocido'}`, [], 100);
        }
    }
  };

  // Comentario encima de la función handlePostTestCompleted
  const handlePostTestCompleted = useCallback(async (score: number, aciertos: number, totalQuestions: number) => {
    addBotResponse(
      `¡Terminaste tu evaluación de progreso! 🎉 Tu puntuación fue: **${score.toFixed(2)}%** (${aciertos} de ${totalQuestions} aciertos). ` +
      (score >= 70 ? "¡Excelente trabajo! Has aprendido mucho." : "¡Buen esfuerzo! Sigue practicando y verás cómo mejoras cada día."),
      [],
      300
    );
    addBotResponse(
        "¿Qué te gustaría hacer ahora?",
        [
            { id: "btn-news", text: "Más Desafíos de Noticias" },
            { id: "btn-tips", text: "Repasar Tips" },
            { id: "btn-talk", text: "Sólo Charlar" }
        ],
        600
    );
    setIsPostTestMode(false);
    await fetchUserInfo();
  }, [addBotResponse, fetchUserInfo]);

  // Comentario encima de la función startPostTest
  const startPostTest = useCallback(() => {
    if (currentUserInfo && (currentUserInfo.puntuacion_pre_test === null || currentUserInfo.puntuacion_pre_test === undefined)) {
        addBotResponse("Para evaluar tu progreso, primero necesitas completar un pequeño test inicial. Si no lo has hecho y quieres hacerlo, pregúntame por el 'pre-test'.", [], 300);
        // Considera si aquí deberías ofrecer iniciar el pre-test si no está hecho
        return;
    }
    if (currentUserInfo && currentUserInfo.puntuacion_post_test !== null && currentUserInfo.puntuacion_post_test !== undefined){
        addBotResponse(`¡Genial! Parece que ya completaste tu evaluación de progreso. Tu puntuación fue: **${currentUserInfo.puntuacion_post_test.toFixed(2)}%**. ¿Listo para más desafíos o aprender algo nuevo?`, [], 300);
        return;
    }
    console.log("Iniciando Post-Test desde ChatContainer");
    const welcomeMsg = messages.find(msg => msg.id.toString().startsWith("welcome-msg"));
    setMessages(welcomeMsg ? [welcomeMsg] : []);

    setIsPostTestMode(true);
    setIsFreeChatMode(false);
    resetSingleAnalysisMode();
    setNewsChallengeState(null);
  }, [currentUserInfo, messages, addBotResponse, resetSingleAnalysisMode, setMessages]);


  // Comentario encima de la función handleRefresh
  const handleRefresh = () => {
    if (isPostTestMode) {
        setIsPostTestMode(false);
    }
    if (!isLoadingUserInfo && currentUserInfo) {
      const welcomeMessage = createWelcomeMessage();
      const initialButtonsMessage: ChatMessage = {
        id: "buttons-msg-" + Date.now(), sender: "bot", text: "¿Cómo empezamos?", avatar: BOT_AVATAR_URL, timestamp: Date.now() + 1,
        buttons: [ { id: "btn-tips", text: "TIPS Y CONSEJOS" }, { id: "btn-news", text: "DESCIFRAR NOTICIAS" }, { id: "btn-talk", text: "SÓLO CHARLAR" } ],
        buttonsDisabled: false,
      };
      setIsFreeChatMode(false);
      setMessages([welcomeMessage, initialButtonsMessage]);
      setNewsChallengeState(null);
      resetSingleAnalysisMode();
      setDifficultyLevel('bajo');
      setCorrectStreak(0);
      setIncorrectStreak(0);
      setGuidedAnalysesSubmitted(0);
    }
    closePanel();
  };

  let determinedChatInputDisabled = isLoadingNews || isBotTyping || isPostTestMode;
  if (!isPostTestMode && !determinedChatInputDisabled) {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const hasStrictlyExclusiveChoiceButtons =
        lastMessage?.sender === 'bot' &&
        lastMessage.buttons &&
        lastMessage.buttons.length > 0 &&
        !lastMessage.buttonsDisabled &&
        lastMessage.buttons.some(btn =>
            btn.id === "btn-tips" || btn.id === "btn-news" || btn.id === "btn-talk" ||
            btn.id === "btn-repeat-tips-yes" || btn.id === "btn-tip-understood" ||
            btn.id.startsWith("select-news-")
        );

    if (isSingleNewsAnalysisMode) {
      if (isAwaitingInitialAnalysis) determinedChatInputDisabled = false;
      else if (currentGuidedChatSessionId) determinedChatInputDisabled = false;
      else determinedChatInputDisabled = true;
    } else if (hasStrictlyExclusiveChoiceButtons) {
      determinedChatInputDisabled = true;
    } else {
      determinedChatInputDisabled = false;
    }
  }

  return (
    <div className="chat-container">
      <ChatHeader
        nickname={currentUserInfo?.apodo || 'Usuario'}
        onPanelToggle={togglePanel}
        onRefresh={isPostTestMode ? () => { alert("No puedes refrescar durante la evaluación."); } : handleRefresh}
      />

      {isPostTestMode ? (
        <PostTestFlow
          authToken={authToken}
          onTestComplete={handlePostTestCompleted}
          onCancelTest={() => {
            setIsPostTestMode(false);
            // Volver a los mensajes iniciales o a un estado de "qué hacer ahora"
            const welcomeMsg = messages.find(msg => msg.id.toString().startsWith("welcome-msg"));
            const initialButtonsMessage: ChatMessage = {
                id: "buttons-msg-" + Date.now() +'-cancel', sender: "bot", text: "¿Qué te gustaría hacer ahora?", avatar: BOT_AVATAR_URL, timestamp: Date.now() + 1,
                buttons: [
                  { id: "btn-tips", text: "TIPS Y CONSEJOS" },
                  { id: "btn-news", text: "DESCIFRAR NOTICIAS" },
                  { id: "btn-talk", text: "SÓLO CHARLAR" }, ],
                buttonsDisabled: false,
              };
            setMessages(welcomeMsg ? [welcomeMsg, initialButtonsMessage] : [initialButtonsMessage]);
          }}
        />
      ) : (
        <>
          {chatError && (isLoadingNews || isSingleNewsAnalysisMode) && ( <div style={{ padding: '5px', background: '#fff0f0', color: 'red', textAlign: 'center' }}>Error: {chatError}</div> )}
          <MessageList
            messages={messages}
            onButtonClick={handleMessageButtonClick}
            isBotTyping={isBotTyping}
            botAvatarUrl={BOT_AVATAR_URL}
          />
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={determinedChatInputDisabled}
          />
        </>
      )}

      <SidePanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        userInfo={currentUserInfo}
        authToken={authToken}
        onLogout={onLogout}
        onSettingsSaved={handleSettingsSaved}
        onStartPostTest={startPostTest}
      />
    </div>
  );
}
export default ChatContainer;
