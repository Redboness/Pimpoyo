// src/components/ChatContainer/ChatContainer.tsx
import React, { useState, useEffect, useCallback } from "react";
import MessageList from "../MessageList/MessageList";
import ChatHeader from "../ChatHeader/ChatHeader";
import ChatInput from "../ChatInput/ChatInput";
import SidePanel from "../SidePanel/SidePanel";
import {
  UserInfo,
  ChatMessage,
  MessageButton,
  OllamaMessage,
  NewsItem,
  NewsChallengeState,
  DifficultyLevel, // <-- Import DifficultyLevel type
  difficultyOrder // <-- Import difficultyOrder array
} from "../../types/types"; // Adjust path as needed
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';

// Define OllamaMessage type if not already defined in types/types.ts
// interface OllamaMessage {
//  role: 'system' | 'user' | 'assistant';
//  content: string;
// }

// Props that ChatContainer receives
interface ChatContainerProps {
  authToken: string;
  onLogout: () => void;
}

// --- Constantes ---
const BOT_AVATAR_URL = "https://i.postimg.cc/GpMfkzPx/Rat-n-profesor-Copy.png";
const USER_AVATAR_URL_DEFAULT =
  "https://i.postimg.cc/SQwcn892/Ni-o-avatar-copy.png"; // Fallback default


// --- Tips Data (Example) ---
const tips = [
  {
    title: "Consejo 1:",
    text: "Revisa siempre la fuente de la información. ¿Es conocida? ¿Es fiable?",
  },
  {
    title: "Consejo 2:",
    text: "Busca otras fuentes que confirmen o desmientan la noticia. No te quedes con la primera versión.",
  },
  {
    title: "Consejo 3:",
    text: "Fíjate en la fecha de publicación. A veces, noticias antiguas se hacen pasar por actuales.",
  },
];

// --- System Prompts ---
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
- Ocasionalmente, podrías recibir información sobre las áreas de mejora del usuario. Usa esta información para enfocar sutilmente las preguntas o ejemplos en sus puntos débiles, ayudándole a practicar esas habilidades específicas.
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
// --- End System Prompts ---


// --- Componente Principal ---
function ChatContainer({ authToken, onLogout }: ChatContainerProps) {
  // --- Estados ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [currentUserInfo, setCurrentUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState<boolean>(true);
  const [chatError, setChatError] = useState<string>("");
  const [refreshUserInfoToggle, setRefreshUserInfoToggle] = useState<boolean>(false);
  const [isFreeChatMode, setIsFreeChatMode] = useState<boolean>(false);

  // --- State for News Challenge ---
  const [newsData, setNewsData] = useState<NewsItem[] | null>(null); // Cache for fetched news
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(false); // Loading indicator for news fetch
  // Ensure NewsChallengeState type definition reflects the new structure (left/right IDs)
  const [newsChallengeState, setNewsChallengeState] = useState<NewsChallengeState | null>(null); // Holds current challenge info
  // --- NEW State for Difficulty & Streaks ---
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('bajo'); // Start at 'bajo'
  const [correctStreak, setCorrectStreak] = useState<number>(0);
  const [incorrectStreak, setIncorrectStreak] = useState<number>(0);
  // --- END NEW State ---

  // Fetches user information from the backend using the provided auth token.
  const fetchUserInfo = useCallback(async () => {
    setChatError('');
    console.log("ChatContainer: Fetching user info (fetchUserInfo)...");
    if (!authToken) {
      console.error("No token found for fetchUserInfo");
      setIsLoadingUserInfo(false);
      return;
    }
    try {
      const response = await fetch(`/api/users/me/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
        }
      });
      if (!response.ok) {
         if (response.status === 401) {
           console.error("fetchUserInfo: Unauthorized (401). Logging out.");
           onLogout();
         } else {
           const errorData = await response.json().catch(() => ({ detail: `HTTP error ${response.status}` }));
           throw new Error(errorData.detail || `Failed to fetch user info: ${response.status}`);
         }
         return;
      }
      const userData: UserInfo = await response.json();
      setCurrentUserInfo(userData);
      console.log("ChatContainer: User info received:", userData);
    } catch (error) {
      console.error("fetchUserInfo error:", error);
      setChatError(error instanceof Error ? error.message : 'Failed to load user data.');
    } finally {
      setIsLoadingUserInfo(false);
    }
  }, [authToken, onLogout]);


  // Effect runs on component mount and when refreshUserInfoToggle or authToken changes.
  useEffect(() => {
    console.log("ChatContainer: UserInfo fetch/refresh effect triggered.");
    if (currentUserInfo === null || refreshUserInfoToggle) {
        setIsLoadingUserInfo(true);
    }
    fetchUserInfo();
  }, [refreshUserInfoToggle, authToken, fetchUserInfo]); // fetchUserInfo added as dependency

  // Creates the initial welcome message using the current user's nickname.
  const createWelcomeMessage = useCallback((): ChatMessage => {
    const nickname = currentUserInfo?.apodo || "Usuario";
    const welcomeText = `¡Encantado de conocerte, ${nickname}! Soy Pimpoyo. Puedo ayudarte con tips y consejos, descifrar noticias falsas o simplemente conversar un rato.`;
    return {
      id: "welcome-msg-" + Date.now(),
      sender: "bot",
      text: welcomeText,
      avatar: BOT_AVATAR_URL,
      timestamp: Date.now(),
    };
  }, [currentUserInfo]);

  // Effect runs when user info loading completes and if messages are empty.
  useEffect(() => {
    if (!isLoadingUserInfo && currentUserInfo && messages.length === 0) {
      const welcomeMessage = createWelcomeMessage();
      const initialButtonsMessage: ChatMessage = {
        id: "buttons-msg-" + Date.now(),
        sender: "bot",
        text: "¿Cómo empezamos?",
        avatar: BOT_AVATAR_URL,
        timestamp: Date.now() + 1,
        buttons: [
          { id: "btn-tips", text: "TIPS Y CONSEJOS" },
          { id: "btn-news", text: "DESCIFRAR NOTICIAS FALSAS" },
          { id: "btn-talk", text: "SÓLO CHARLAR" },
        ],
        buttonsDisabled: false,
      };
      setIsFreeChatMode(false);
      setMessages([welcomeMessage, initialButtonsMessage]);
    }
  }, [isLoadingUserInfo, currentUserInfo, createWelcomeMessage, messages.length]); // Added messages.length

  // Toggles the visibility of the side panel.
  const togglePanel = () => setIsPanelOpen(!isPanelOpen);
  // Closes the side panel.
  const closePanel = () => setIsPanelOpen(false);
  // Callback function triggered when settings are saved in the SidePanel.
  const handleSettingsSaved = () => {
    console.log("ChatContainer: Settings saved, triggering refresh.");
    setRefreshUserInfoToggle((prev) => !prev);
  };

  // Adds a message bubble representing the user's choice (usually from a button click).
  const addUserChoiceMessage = useCallback((text: string) => {
      if (!currentUserInfo) return;
      const userChoiceMessage: ChatMessage = {
        id: Date.now() + Math.random(),
        sender: "user",
        text: text,
        avatar: currentUserInfo?.avatar_url || USER_AVATAR_URL_DEFAULT,
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, userChoiceMessage]);
  }, [currentUserInfo]);

  // Adds a message bubble from the bot, potentially with buttons, after a specified delay.
  const addBotResponse = useCallback((
      text: string | null, // Allow null text if using htmlContent
      buttons: MessageButton[] = [],
      delay: number = 300,
      onMessageAdded?: (id: string | number) => void,
      htmlContent: string | null = null // Add optional htmlContent
    ): string | number => {
       const botMsgId = "bot-msg-" + Date.now() + Math.random();
       const botMsg: ChatMessage = {
          id: botMsgId,
          sender: "bot",
          text: text, // Can be null
          htmlContent: htmlContent, // Can be set
          avatar: BOT_AVATAR_URL,
          timestamp: Date.now() + delay,
          buttons: buttons,
          buttonsDisabled: buttons.length === 0,
        };
       // Warning if both are somehow set unintentionally
       if (text && htmlContent) {
           console.warn("addBotResponse: Both text and htmlContent provided.");
       }

      setTimeout(() => {
         setMessages((prevMessages) => [...prevMessages, botMsg]);
         if (onMessageAdded) { onMessageAdded(botMsgId); }
      }, delay);
      return botMsgId;
   }, []);

  // --- NEW: Helper functions for difficulty adjustment ---
  const increaseDifficulty = useCallback(() => {
      const currentIndex = difficultyOrder.indexOf(difficultyLevel);
      if (currentIndex < difficultyOrder.length - 1) {
        const nextLevel = difficultyOrder[currentIndex + 1];
        setDifficultyLevel(nextLevel);
        console.log(`Difficulty increased to: ${nextLevel}`);
        return true; // Indicate change occurred
      }
      console.log(`Already at max difficulty: ${difficultyLevel}`);
      return false; // Indicate no change
  }, [difficultyLevel]);

  const decreaseDifficulty = useCallback(() => {
      const currentIndex = difficultyOrder.indexOf(difficultyLevel);
      if (currentIndex > 0) {
        const prevLevel = difficultyOrder[currentIndex - 1];
        setDifficultyLevel(prevLevel);
        console.log(`Difficulty decreased to: ${prevLevel}`);
        return true; // Indicate change occurred
      }
      console.log(`Already at min difficulty: ${difficultyLevel}`);
      return false; // Indicate no change
  }, [difficultyLevel]);
  // --- End Helper Functions ---


  // Fetches news from the BACKEND API, filters by difficulty, selects T/F items, presents side-by-side, then adds selection prompt.
  const presentNewsChallenge = useCallback(async () => {
      if (isLoadingNews) return;
      setIsLoadingNews(true);
      setChatError('');
      // Add intro message first, indicating the level
      const introId = addBotResponse(`Buscando noticias de nivel "${difficultyLevel}"...`, [], 0);

      let fetchedNews: NewsItem[];

      // 1. Fetch or use cached news data
      if (newsData) {
          fetchedNews = newsData;
          console.log("Using cached news data.");
      } else {
          console.log("Fetching news data from backend API: /api/news/challenge...");
          try {
              const response = await fetch('/api/news/challenge');
              if (!response.ok) {
                  let errorDetail = `Error del servidor ${response.status}`;
                  try { const errorData = await response.json(); errorDetail = errorData.detail || errorDetail; }
                  catch (e) { console.error(e); errorDetail = response.statusText || errorDetail; }
                  throw new Error(errorDetail);
              }
              const data = await response.json();
              if (!Array.isArray(data) || data.length === 0) throw new Error("Invalid news data format");
              // Basic validation for required fields
              fetchedNews = data.filter(item => item.ID && item.CATEGORY && item.HEADLINE && item.TEXT && item.DIFFICULTY_LEVEL) as NewsItem[];
              if (fetchedNews.length !== data.length) console.warn("Some fetched items missing fields");
              if (fetchedNews.length === 0) throw new Error("No valid news items fetched");
              setNewsData(fetchedNews); // Cache data
          } catch (error) {
              console.error("Failed to load news data from API:", error);
              const errorMsg = error instanceof Error ? error.message : "Error desconocido";
              setChatError(`No pude cargar las noticias: ${errorMsg}`);
              setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `¡Ups! Hubo un problema al buscar las noticias (${errorMsg}).` } : msg));
              addBotResponse("¿Probamos otra cosa?", [{ id: "btn-tips-again", text: "Ver Tips" }, { id: "btn-talk-again", text: "Sólo Charlar" }], 300);
              setIsLoadingNews(false);
              return;
          }
      }

      // --- Filter by current difficulty level ---
      console.log(`Filtering ${fetchedNews.length} items for difficulty: ${difficultyLevel}`);
      const newsAtCurrentLevel = fetchedNews.filter(item => item.DIFFICULTY_LEVEL === difficultyLevel);
      console.log(`Found ${newsAtCurrentLevel.length} items at level ${difficultyLevel}.`);
      // --- End Filter ---

      // 2. Filter selected difficulty news into TRUE/FALSE
      const trueNewsFiltered = newsAtCurrentLevel.filter(item => item.CATEGORY === 'TRUE');
      const falseNewsFiltered = newsAtCurrentLevel.filter(item => item.CATEGORY === 'FALSE');

      // Check if enough news items exist AT THIS DIFFICULTY LEVEL
      if (trueNewsFiltered.length === 0 || falseNewsFiltered.length === 0) {
        const missingType = trueNewsFiltered.length === 0 ? 'verdaderas' : 'falsas';
        const errorText = `¡Vaya! No encontré suficientes noticias ${missingType} de nivel "${difficultyLevel}" para este desafío.`;
        console.error(errorText);
        setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: errorText } : msg));
        addBotResponse("¿Quieres intentar con otro nivel o hacer otra cosa?", [
          // Future feature idea: { id: "btn-difficulty-change", text: "Cambiar Nivel" },
          { id: "btn-tips-again", text: "Ver Tips" },
          { id: "btn-talk-again", text: "Sólo Charlar" },
        ], 300);
        setChatError(`Not enough news for difficulty ${difficultyLevel}`);
        setIsLoadingNews(false);
        return;
      }

      // Select one random TRUE and one random FALSE from the *filtered* list
      const randomTrueIndex = Math.floor(Math.random() * trueNewsFiltered.length);
      const randomFalseIndex = Math.floor(Math.random() * falseNewsFiltered.length);
      const selectedTrueNews = trueNewsFiltered[randomTrueIndex];
      const selectedFalseNews = falseNewsFiltered[randomFalseIndex];


      // 3. Prepare Presentation (Randomize L/R order & Generate HTML)
      const showTrueOnLeft = Math.random() < 0.5;
      const leftNewsItem = showTrueOnLeft ? selectedTrueNews : selectedFalseNews;
      const rightNewsItem = showTrueOnLeft ? selectedFalseNews : selectedTrueNews;

      // Helper to create HTML for one news view
      const createMobileViewHtml = (newsItem: NewsItem): string => {
          const escapeHtml = (unsafe: string): string => !unsafe ? '' : unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
          const formattedTextHtml = escapeHtml(newsItem.TEXT).split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
          return `<div class="mobile-news-view"><div class="mobile-news-content"><h2 class="mobile-news-headline">${escapeHtml(newsItem.HEADLINE)}</h2><div class="mobile-news-text-scroll">${formattedTextHtml || '<p>...</p>'}</div></div><div class="mobile-news-footer"></div></div>`;
      };
      const leftHtml = createMobileViewHtml(leftNewsItem);
      const rightHtml = createMobileViewHtml(rightNewsItem);
      const combinedHtml = `<div class="news-challenge-container">${leftHtml}${rightHtml}</div>`;

      // 4. Add ONE Message Bubble for the News Presentation
      // Update the intro message with final text
      setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `Nivel: ${difficultyLevel}. ¡Aquí tienes! Una REAL y una FALSA:` } : msg));

      // Generate ID directly for the message object, removing the unused variable
      const presentationMessage: ChatMessage = {
          // REMOVED: const presentationMessageId = "news-pres-" + Date.now();
          id: "news-pres-" + Date.now(), // Assign ID directly here
          sender: 'bot',
          avatar: BOT_AVATAR_URL,
          text: null,
          htmlContent: combinedHtml, // Use the combined HTML for side-by-side view
          timestamp: Date.now() + 300, // Show slightly after updated intro
          buttons: [],
          buttonsDisabled: true,
      };
      // Add the single presentation message using htmlContent
      setTimeout(() => {
          setMessages(prev => [...prev, presentationMessage]);
      }, 300); // Delay slightly


      // 5. Add Selection Prompt and Buttons AFTER presentation
      const selectionMessageId = addBotResponse(
           "¿Cuál de las dos noticias crees que es la VERDADERA?",
           [{ id: `select-news-left`, text: "Noticia Izquierda" }, { id: `select-news-right`, text: "Noticia Derecha" }],
           800 // Delay more
      );

      // 6. Update Challenge State
      setNewsChallengeState({
          trueNewsOriginalId: selectedTrueNews.ID,
          leftNewsOriginalId: leftNewsItem.ID,
          rightNewsOriginalId: rightNewsItem.ID,
          selectionMessageId: selectionMessageId,
      });

      setIsLoadingNews(false);

  }, [newsData, isLoadingNews, addBotResponse, difficultyLevel]); // Added difficultyLevel


  // Handles clicks on buttons within messages...
  const handleMessageButtonClick = useCallback((
    messageId: number | string,
    buttonId: string
  ) => {
    console.log(`Button Clicked: MessageID=${messageId}, ButtonID=${buttonId}`);

    // --- Part 1: Disable buttons ---
    // Only disable if it's NOT a news selection button OR if it IS the selection message
    // This prevents disabling buttons on the news presentation message itself
    if (!buttonId.startsWith("select-news-")) {
         setMessages((currentMessages) =>
            currentMessages.map((msg) =>
                // Disable buttons on the original message OR on the selection prompt if it exists
                (msg.id === messageId || (newsChallengeState && msg.id === newsChallengeState.selectionMessageId))
                 ? { ...msg, buttonsDisabled: true } : msg
            )
         );
    } // L/R Selection button disabling is handled below

    // --- Part 2: Handle different button actions ---

    // --- Tip Navigation ---
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
         setMessages(currentMessages =>
             currentMessages.map(msg => msg.id === messageId ? { ...msg, text: `${targetTip.title} ${targetTip.text}`, buttons: newButtons, buttonsDisabled: false, timestamp: Date.now() } : msg)
         );
       }
      return;
    }

    // --- Mode Selection / Challenge Start ---
    if (buttonId === "btn-tips" || buttonId === "btn-tips-again") {
      setIsFreeChatMode(false);
      addUserChoiceMessage(buttonId === "btn-tips" ? "TIPS Y CONSEJOS" : "Ver Tips");
      const firstTip = tips[0];
      addBotResponse(`${firstTip.title} ${firstTip.text}`, [{ id: "btn-tip-next-0", icon: faArrowRight, ariaLabel: 'Siguiente' }]);
      setNewsChallengeState(null);
      return;
    }
    if (buttonId === "btn-news" || buttonId === "btn-news-again") {
       setIsFreeChatMode(false);
       addUserChoiceMessage(buttonId === "btn-news" ? "DESCIFRAR NOTICIAS FALSAS" : "Jugar otra vez");
       setNewsChallengeState(null); // Reset before starting
       presentNewsChallenge(); // Start the challenge using current difficulty
       return;
    }
    if (buttonId === "btn-talk" || buttonId === "btn-talk-again") {
      setIsFreeChatMode(true);
      addUserChoiceMessage(buttonId === "btn-talk" ? "SÓLO CHARLAR" : "Sólo Charlar");
      addBotResponse("¡Claro! ¿De qué te gustaría hablar?", []); // Removed buttons here for clarity
      setNewsChallengeState(null);
      return;
    }

    // --- Post-Tip Options ---
    if (buttonId === "btn-tip-understood") {
      addUserChoiceMessage("He entendido los consejos");
      addBotResponse("¡Estupendo! 👍 ¿Quieres repasarlos?", [{ id: "btn-repeat-tips-yes", text: "Sí" }, { id: "btn-repeat-tips-no", text: "No" }]);
      return;
    }
    if (buttonId === "btn-repeat-tips-yes") {
      setIsFreeChatMode(false);
      addUserChoiceMessage("Sí, por favor");
      const firstTip = tips[0];
      addBotResponse(`${firstTip.title} ${firstTip.text}`, [{ id: "btn-tip-next-0", icon: faArrowRight, ariaLabel: 'Siguiente' }]);
      return;
    }
    if (buttonId === "btn-repeat-tips-no") {
      addUserChoiceMessage("No, gracias");
      addBotResponse("De acuerdo. ¿Qué hacemos ahora?", [
        { id: "btn-tips-again", text: "Ver Tips" },
        { id: "btn-news-again", text: "Descifrar Noticias" }, // Consistent text
        { id: "btn-talk-again", text: "Sólo Charlar" },
      ]);
       setNewsChallengeState(null); // Ensure reset if leaving tips/news mode
      return;
    }

    // --- News Challenge Selection (Left/Right) with Difficulty ---
    if (newsChallengeState && (buttonId === "select-news-left" || buttonId === "select-news-right")) {
        // Disable selection buttons immediately on the correct prompt message
         setMessages((currentMessages) =>
             currentMessages.map((msg) =>
                 msg.id === newsChallengeState.selectionMessageId ? { ...msg, buttonsDisabled: true } : msg
             )
         );

        const choseLeft = buttonId === "select-news-left";
        const choiceText = choseLeft ? "Noticia Izquierda" : "Noticia Derecha";
        addUserChoiceMessage(`Creo que la verdadera es: ${choiceText}`);

        const chosenOriginalId = choseLeft ? newsChallengeState.leftNewsOriginalId : newsChallengeState.rightNewsOriginalId;
        const isCorrect = chosenOriginalId === newsChallengeState.trueNewsOriginalId;

        // --- Difficulty / Streak Logic ---
        let difficultyChangedMessage: string | null = null;
        if (isCorrect) {
            const newStreak = correctStreak + 1;
            setCorrectStreak(newStreak);
            setIncorrectStreak(0); // Reset incorrect streak
            console.log(`Correct streak: ${newStreak}`);
            if (newStreak >= 3) {
                console.log("Attempting to increase difficulty...");
                if (increaseDifficulty()) { // Try to increase difficulty
                    difficultyChangedMessage = "¡Tres seguidas! 😎 ¡Subimos un poco la dificultad!";
                    setCorrectStreak(0); // Reset streak after level up
                } else {
                    console.log("Already at max difficulty, resetting streak.");
                    setCorrectStreak(0); // Reset streak even at max level
                }
            }
        } else { // Incorrect
            const newStreak = incorrectStreak + 1;
            setIncorrectStreak(newStreak);
            setCorrectStreak(0); // Reset correct streak
            console.log(`Incorrect streak: ${newStreak}`);
            if (newStreak >= 3) {
                console.log("Attempting to decrease difficulty...");
                 if (decreaseDifficulty()) { // Try to decrease difficulty
                     difficultyChangedMessage = "¡Ánimo! 💪 Vamos a probar con unas un poco más sencillas.";
                     setIncorrectStreak(0); // Reset streak after level down
                 } else {
                    console.log("Already at min difficulty, resetting streak.");
                    setIncorrectStreak(0); // Reset streak even at min level
                 }
            }
        }
        // --- End Difficulty Logic ---

        // Prepare standard feedback
        let feedbackText = "";
        if (isCorrect) { feedbackText = `✅ ¡Correcto! La ${choiceText.toLowerCase()} era la verdadera.`; }
        else { const correctPos = (newsChallengeState.leftNewsOriginalId === newsChallengeState.trueNewsOriginalId) ? "la izquierda" : "la derecha"; feedbackText = `❌ ¡Ups! La ${choiceText.toLowerCase()} era la falsa. La verdadera era ${correctPos}.`; }

        // Add difficulty change message first (if any), then feedback
        let feedbackDelay = 500; // Default delay
        if (difficultyChangedMessage) {
            addBotResponse(difficultyChangedMessage, [], 300); // Show difficulty message sooner
            feedbackDelay = 800; // Delay standard feedback more
        }
        // Add standard feedback and next steps
        addBotResponse(feedbackText, [
            { id: "btn-news-again", text: "Jugar otra vez" },
            { id: "btn-tips-again", text: "Ver Tips" },
            { id: "btn-talk-again", text: "Sólo Charlar" },
        ], feedbackDelay);

        setNewsChallengeState(null); // Reset challenge state
        return;
    }
    // --- End News Challenge Selection ---

  }, [
      addUserChoiceMessage, addBotResponse, presentNewsChallenge, newsChallengeState,
      correctStreak, incorrectStreak, increaseDifficulty, decreaseDifficulty // Added ALL dependencies
     ]);


  // Handles sending user-typed text messages to the backend API (Ollama).
  const handleSendMessage = async (inputText: string) => {
    // Prevent sending text while challenge selection is active
    if (newsChallengeState && newsChallengeState.selectionMessageId) {
       const selectionMessage = messages.find(msg => msg.id === newsChallengeState.selectionMessageId);
       if (selectionMessage && !selectionMessage.buttonsDisabled) { addBotResponse("Elige una de las noticias con los botones antes de escribir, por favor.", [], 0); return; }
    }
    if (!inputText.trim() || !currentUserInfo) return;

    const newUserMessage: ChatMessage = {
      id: Date.now() + Math.random(), sender: "user", text: inputText,
      avatar: currentUserInfo?.avatar_url || USER_AVATAR_URL_DEFAULT, timestamp: Date.now(),
    };

    let updatedMessagesForApi: ChatMessage[] = [];
    setMessages(currentMessages => { updatedMessagesForApi = [...currentMessages, newUserMessage]; return updatedMessagesForApi; });

    const currentSystemPrompt = isFreeChatMode ? SYSTEM_PROMPT_FREE_CHAT : SYSTEM_PROMPT_FAKE_NEWS;
    const targetEndpoint = isFreeChatMode ? `/api/bot/chatlibre` : `/api/bot/chat`;

    // Construct Ollama messages - Exclude challenge presentation (htmlContent) and selection prompt
    const ollamaMessages: OllamaMessage[] = [
         { role: 'system', content: currentSystemPrompt },
         ...updatedMessagesForApi
              .filter(msg => !msg.htmlContent && !(newsChallengeState && msg.id === newsChallengeState.selectionMessageId) && msg.text)
              .map((msg): OllamaMessage => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text! }))
    ];


    console.log(`Sending ${ollamaMessages.length} messages to ${targetEndpoint} for Ollama processing.`);
    try {
      const response = await fetch(targetEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' },
        body: JSON.stringify({ messages: ollamaMessages, model: 'gemma3:4b' }) // Ensure model name correct
      });
      if (!response.ok) { /* ... error handling ... */ throw new Error('API Error'); }
      const data = await response.json();
      const botMessage: ChatMessage = {
        id: Date.now() + Math.random() + 1, sender: "bot", text: data.reply,
        avatar: BOT_AVATAR_URL, timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
        console.error(`Error sending message via ${targetEndpoint}:`, error);
        const displayError = error instanceof Error ? error.message : 'Unknown error';
        const errorMsg: ChatMessage = {
            id: Date.now() + Math.random() + 2, sender: 'bot',
            text: `Lo siento, hubo un problema: ${displayError}`,
            avatar: BOT_AVATAR_URL, timestamp: Date.now(),
       };
       setMessages(prev => [...prev, errorMsg]);
    }
  };


  // Resets the chat to its initial state, including difficulty/streaks.
  const handleRefresh = () => {
    console.log("Reiniciando chat...");
    if (!isLoadingUserInfo && currentUserInfo) {
      const welcomeMessage = createWelcomeMessage();
      const initialButtonsMessage: ChatMessage = {
        id: "buttons-msg-" + Date.now(), sender: "bot", text: "¿Cómo empezamos?",
        avatar: BOT_AVATAR_URL, timestamp: Date.now() + 1,
        buttons: [ { id: "btn-tips", text: "TIPS Y CONSEJOS" }, { id: "btn-news", text: "DESCIFRAR NOTICIAS FALSAS" }, { id: "btn-talk", text: "SÓLO CHARLAR" } ],
        buttonsDisabled: false,
      };
      setIsFreeChatMode(false);
      setMessages([welcomeMessage, initialButtonsMessage]);
      setNewsChallengeState(null);
      // Reset difficulty and streaks on full refresh
      setDifficultyLevel('bajo');
      setCorrectStreak(0);
      setIncorrectStreak(0);
      console.log("Difficulty and streaks reset.");
    }
    closePanel();
  };

  // --- Renderizado Principal ---
  if (isLoadingUserInfo && currentUserInfo === null) { return <div style={{ padding: '50px', textAlign: 'center', fontSize: '1.2em' }}>Cargando Pimpoyo...</div>; }
  if (!currentUserInfo && chatError && !isLoadingUserInfo) { return <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}><h2>Error al cargar</h2><p>{chatError}</p><button onClick={onLogout}>Inicio</button></div>; }
  if (!currentUserInfo && !isLoadingUserInfo) { return <div style={{ padding: '50px', textAlign: 'center', color: 'orange' }}><p>No se pudo cargar info / sesión terminada.</p><button onClick={onLogout}>Inicio</button></div>; }
  if (!currentUserInfo) { return <div style={{ padding: '50px', textAlign: 'center', fontSize: '1.2em' }}>Cargando...</div>; } // Fallback

  return (
    <div className="chat-container">
      <ChatHeader nickname={currentUserInfo.apodo || 'Usuario'} onPanelToggle={togglePanel} onRefresh={handleRefresh} />
      {/* Display specific news loading error if relevant */}
      {chatError && isLoadingNews && ( <div style={{ padding: '5px', background: '#fff0f0', color: 'red', textAlign: 'center' }}>Error noticias: {chatError}</div> )}
      <MessageList messages={messages} onButtonClick={handleMessageButtonClick} />
      <ChatInput onSendMessage={handleSendMessage} />
      <SidePanel isOpen={isPanelOpen} onClose={closePanel} userInfo={currentUserInfo} authToken={authToken} onLogout={onLogout} onSettingsSaved={handleSettingsSaved} />
    </div>
  );
}

export default ChatContainer;
