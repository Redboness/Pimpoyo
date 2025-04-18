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
  NewsChallengeState
} from "../../types/types"; // Adjust path as needed
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';

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
// For Ollama calls when analyzing news or in guided mode (excluding the news challenge presentation)
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

// For Ollama calls when in free chat mode
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
  const [isFreeChatMode, setIsFreeChatMode] = useState<boolean>(false); // Default to guided mode

  // --- State for News Challenge ---
  const [newsData, setNewsData] = useState<NewsItem[] | null>(null); // Cache for fetched news
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(false); // Loading indicator for news fetch
  const [newsChallengeState, setNewsChallengeState] = useState<NewsChallengeState | null>(null); // Holds current challenge info
  // --- End News Challenge State ---

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
           onLogout(); // Logout if token is invalid
         } else {
           const errorData = await response.json().catch(() => ({ detail: `HTTP error ${response.status}` }));
           throw new Error(errorData.detail || `Failed to fetch user info: ${response.status}`);
         }
         return; // Stop if error
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
  // It fetches user info if it's not already loaded or if a refresh is triggered.
  useEffect(() => {
    console.log("ChatContainer: UserInfo fetch/refresh effect triggered.");
    // Trigger loading state only if necessary
    if (currentUserInfo === null || refreshUserInfoToggle) {
        setIsLoadingUserInfo(true);
    }
    fetchUserInfo();
  // We removed fetchUserInfo from deps because it's memoized with useCallback and doesn't change unless its own deps change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshUserInfoToggle, authToken]);

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
  }, [currentUserInfo]); // Depends only on currentUserInfo

  // Effect runs when user info loading completes and if messages are empty.
  // Sets the initial welcome message and the mode selection buttons.
  useEffect(() => {
    // Ensure user info is loaded, not currently loading, and messages array is empty
    if (!isLoadingUserInfo && currentUserInfo && messages.length === 0) {
      const welcomeMessage = createWelcomeMessage();
      const initialButtonsMessage: ChatMessage = {
        id: "buttons-msg-" + Date.now(),
        sender: "bot",
        text: "¿Cómo empezamos?",
        avatar: BOT_AVATAR_URL,
        timestamp: Date.now() + 1, // Ensure it appears after welcome
        buttons: [
          { id: "btn-tips", text: "TIPS Y CONSEJOS" },
          { id: "btn-news", text: "DESCIFRAR NOTICIAS FALSAS" },
          { id: "btn-talk", text: "SÓLO CHARLAR" },
        ],
        buttonsDisabled: false,
      };
      // Start in guided mode by default when chat initializes
      setIsFreeChatMode(false);
      setMessages([welcomeMessage, initialButtonsMessage]);
    }
  // messages.length is included as a dependency to prevent re-adding initial messages if they were cleared for some reason.
  // createWelcomeMessage is memoized and depends on currentUserInfo.
  }, [isLoadingUserInfo, currentUserInfo, createWelcomeMessage, messages.length]);

  // Toggles the visibility of the side panel.
  const togglePanel = () => setIsPanelOpen(!isPanelOpen);
  // Closes the side panel.
  const closePanel = () => setIsPanelOpen(false);
  // Callback function triggered when settings are saved in the SidePanel.
  // It toggles refreshUserInfoToggle to re-fetch user data.
  const handleSettingsSaved = () => {
    console.log("ChatContainer: Settings saved, triggering refresh.");
    setRefreshUserInfoToggle((prev) => !prev);
  };

  // Adds a message bubble representing the user's choice (usually from a button click).
  const addUserChoiceMessage = useCallback((text: string) => {
      if (!currentUserInfo) return;
      const userChoiceMessage: ChatMessage = {
        id: Date.now() + Math.random(), // Simple unique ID generation
        sender: "user",
        text: text,
        avatar: currentUserInfo?.avatar_url || USER_AVATAR_URL_DEFAULT,
        timestamp: Date.now(),
      };
      // Use functional update to ensure state consistency
      setMessages((prevMessages) => [...prevMessages, userChoiceMessage]);
  }, [currentUserInfo]); // Dependency: currentUserInfo for avatar

  // Adds a message bubble from the bot, potentially with buttons, after a specified delay.
  // Returns the ID of the message being added.
  const addBotResponse = useCallback((
      text: string,
      buttons: MessageButton[] = [],
      delay: number = 300,
      onMessageAdded?: (id: string | number) => void // Optional callback for when message is actually added
    ): string | number => { // Return the ID immediately
       const botMsgId = "bot-msg-" + Date.now() + Math.random(); // Generate ID beforehand
       const botMsg: ChatMessage = {
          id: botMsgId,
          sender: "bot",
          text: text,
          avatar: BOT_AVATAR_URL,
          timestamp: Date.now() + delay, // Add delay to timestamp for potential ordering logic
          buttons: buttons,
          // Disable buttons immediately if the array is empty
          buttonsDisabled: buttons.length === 0,
        };

      // Use setTimeout to delay adding the message to the UI state
      setTimeout(() => {
         // Functional update for adding the message
         setMessages((prevMessages) => [...prevMessages, botMsg]);
         // Trigger callback if provided, after message is added to state
         if (onMessageAdded) {
            onMessageAdded(botMsgId);
         }
      }, delay);

      return botMsgId; // Return the generated ID synchronously
   }, []); // BOT_AVATAR_URL is a constant, so no dependencies needed here

   // Fetches news from the BACKEND API, selects one true and one false item,
   // and presents them to the user as a challenge.
   const presentNewsChallenge = useCallback(async () => {
       if (isLoadingNews) return; // Prevent multiple concurrent loads
       setIsLoadingNews(true);
       setChatError(''); // Clear previous errors specific to this component

       // Add an intermediary "loading" message for the user
       addBotResponse("Estoy buscando un par de noticias para ti...", [], 0);

       let fetchedNews: NewsItem[];

       // 1. Fetch or use cached news data
       if (newsData) {
           // Use data previously fetched and cached in state
           fetchedNews = newsData;
           console.log("Using cached news data.");
       } else {
           // Fetch data from the backend API endpoint
           console.log("Fetching news data from backend API: /api/news/challenge...");
           try {
               const response = await fetch('/api/news/challenge'); // Target the backend endpoint

               if (!response.ok) {
                   // Attempt to parse error detail from backend JSON response
                   let errorDetail = `Error del servidor ${response.status}`;
                   try {
                        const errorData = await response.json();
                        // Use the 'detail' field if provided by FastAPI, otherwise fallback
                        errorDetail = errorData.detail || errorDetail;
                   } catch (e) {
                        console.log(e);
                        errorDetail = response.statusText || errorDetail;
                   }
                   throw new Error(errorDetail); // Throw error with details
               }

               fetchedNews = await response.json(); // Parse the JSON response body

               // Basic validation of the fetched data
               if (!Array.isArray(fetchedNews) || fetchedNews.length === 0) {
                   throw new Error("Respuesta inválida o vacía desde la API de noticias.");
               }

               setNewsData(fetchedNews); // Cache the fetched data in state
               console.log(`Workspaceed ${fetchedNews.length} news items from API.`);
           } catch (error) {
               console.error("Failed to load news data from API:", error);
               const errorMsg = error instanceof Error ? error.message : "Error desconocido";
               // Set component-level error state for display
               setChatError(`No pude cargar las noticias: ${errorMsg}`);
               // Add a bot message informing the user and offering alternatives
               addBotResponse(`¡Ups! Hubo un problema al buscar las noticias (${errorMsg}). ¿Probamos otra cosa?`, [
                   { id: "btn-tips-again", text: "Ver Tips" },
                   { id: "btn-talk-again", text: "Sólo Charlar" },
               ]);
               setIsLoadingNews(false); // Reset loading state
               return; // Stop execution if fetch failed
           }
       }

       // 2. Filter and Select News
       const trueNews = fetchedNews.filter(item => item.CATEGORY === 'TRUE');
       const falseNews = fetchedNews.filter(item => item.CATEGORY === 'FALSE');

       // Check if there are enough news items of both types
       if (trueNews.length === 0 || falseNews.length === 0) {
           const errorDetail = trueNews.length === 0 ? "verdaderas" : "falsas";
           console.error("Insufficient news items from API:", { trueCount: trueNews.length, falseCount: falseNews.length });
           setChatError(`No encontré suficientes noticias ${errorDetail} desde el servidor.`);
           // Inform the user and provide alternatives
           addBotResponse(`¡Vaya! Parece que me faltan noticias ${errorDetail} para este desafío. ¿Hacemos otra cosa mientras?`, [
               { id: "btn-tips-again", text: "Ver Tips" },
               { id: "btn-talk-again", text: "Sólo Charlar" },
           ]);
           setIsLoadingNews(false); // Reset loading state
           return; // Stop execution
       }

       // Select one random true and one random false news item
       const randomTrueIndex = Math.floor(Math.random() * trueNews.length);
       const randomFalseIndex = Math.floor(Math.random() * falseNews.length);
       const selectedTrueNews = trueNews[randomTrueIndex];
       const selectedFalseNews = falseNews[randomFalseIndex];

       // 3. Prepare Presentation (Randomize display order)
       const newsItemsToShow = Math.random() < 0.5
           ? [selectedTrueNews, selectedFalseNews] // True news first
           : [selectedFalseNews, selectedTrueNews]; // False news first

       const presentedMessageIds: (string | number)[] = []; // To store the IDs of the message bubbles displaying the news
       const presentedOriginalIds: string[] = []; // To store the original IDs from the JSON for checking the answer

       // Add introductory message before showing the news items
       addBotResponse("¡Aquí tienes! Una de estas noticias es REAL y la otra es FALSA. Léelas con atención:", [], 200);

       // 4. Add News Messages to State (staggered display)
       newsItemsToShow.forEach((newsItem, index) => {
        const messageId = `news-${Date.now()}-${index}`;
        presentedMessageIds.push(messageId);
        presentedOriginalIds.push(newsItem.ID);

        // Basic sanitization helper (escape essential HTML chars)
        // In a production app with user-generated content, use a robust library like DOMPurify.
        // For controlled content like this news text, basic escaping might suffice.
        const escapeHtml = (unsafe: string): string => {
            if (!unsafe) return '';
            return unsafe
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }
        // Convert newlines in the text to <p> tags for better structure
        const formattedTextHtml = escapeHtml(newsItem.TEXT).split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');


        // Construct the HTML string for the mobile view
        const mobileViewHtml = `
          <div class="mobile-news-view">
            <div class="mobile-news-header">
              <span class="mobile-news-dot"></span>
              <span class="mobile-news-dot"></span>
              <span class="mobile-news-dot"></span>
            </div>
            <div class="mobile-news-content">
              <h2 class="mobile-news-headline">${escapeHtml(newsItem.HEADLINE)}</h2>
              <div class="mobile-news-text-scroll">
                ${formattedTextHtml || '<p>...</p>'}
              </div>
            </div>
            <div class="mobile-news-footer"></div>
          </div>
        `;

        const newsMessage: ChatMessage = {
            id: messageId,
            sender: 'bot',
            avatar: BOT_AVATAR_URL,
            text: null,
            htmlContent: mobileViewHtml, // Assign the generated HTML string
            timestamp: Date.now() + 500 + (index * 300),
            buttons: [],
            buttonsDisabled: true,
        };
        // Add the message with HTML content after a delay
        setTimeout(() => {
             setMessages(prev => [...prev, newsMessage]);
        }, 500 + (index * 300));
    });


       // 5. Add Selection Prompt and Buttons AFTER news items are shown (with delay)
       const selectionMessageId = addBotResponse(
            "¿Cuál de las dos noticias crees que es la VERDADERA?",
            [
                // Buttons refer to the message bubbles by their generated IDs
                { id: `select-news-${presentedMessageIds[0]}`, text: "La primera noticia" },
                { id: `select-news-${presentedMessageIds[1]}`, text: "La segunda noticia" },
            ],
            1200 // Delay significantly to ensure news items render first
       );


       // 6. Update Challenge State with all necessary info for checking the answer later
       setNewsChallengeState({
           trueNewsOriginalId: selectedTrueNews.ID, // Store the original JSON ID of the true news shown
           presentedNewsMessageIds: presentedMessageIds as [string | number, string | number], // IDs of the two msg bubbles
           presentedNewsOriginalIds: presentedOriginalIds as [string, string], // Original JSON IDs in the order they were presented
           selectionMessageId: selectionMessageId, // ID of the message containing the selection buttons
       });

       setIsLoadingNews(false); // Reset loading state

   }, [newsData, isLoadingNews, addBotResponse]); // Dependencies for useCallback


  // Handles clicks on buttons within messages, including tip navigation,
  // mode selection, and news challenge interactions.
  const handleMessageButtonClick = useCallback((
    messageId: number | string, // ID of the message containing the clicked button
    buttonId: string // ID of the button that was clicked
  ) => {
    console.log(`Button Clicked: MessageID=${messageId}, ButtonID=${buttonId}`);

    // --- Part 1: Disable buttons on the message that was clicked ---
    // Only disable if it's NOT a news selection button (handled separately)
    // Also check if the message being clicked is the selection message itself during a challenge
    if (!buttonId.startsWith("select-news-")) {
         setMessages((currentMessages) =>
            currentMessages.map((msg) =>
                // Disable buttons on the original message OR on the selection prompt if it exists
                (msg.id === messageId || (newsChallengeState && msg.id === newsChallengeState.selectionMessageId))
                 ? { ...msg, buttonsDisabled: true } : msg
            )
         );
    } // News selection button disabling is handled within its specific logic block below


    // --- Part 2: Handle different button actions based on buttonId ---

    // --- Tip Navigation Logic (Update Existing Message) ---
    if (buttonId.startsWith("btn-tip-next-") || buttonId.startsWith("btn-tip-prev-")) {
       const isNext = buttonId.startsWith("btn-tip-next-");
       const currentIndex = parseInt(buttonId.split("-").pop() || "0", 10);
       const targetIndex = isNext ? currentIndex + 1 : currentIndex - 1;

       // Check if the target index is valid within the tips array
       if (targetIndex >= 0 && targetIndex < tips.length) {
         const targetTip = tips[targetIndex];
         const newButtons: MessageButton[] = [];
         // Add "Previous" button if not the first tip
         if (targetIndex > 0) {
           newButtons.push({ id: `btn-tip-prev-${targetIndex}`, icon: faArrowLeft, ariaLabel: 'Anterior' });
         }
         // Add "Next" button if not the last tip, otherwise add "Entendido" button
         if (targetIndex < tips.length - 1) {
           newButtons.push({ id: `btn-tip-next-${targetIndex}`, icon: faArrowRight, ariaLabel: 'Siguiente' });
         } else {
           newButtons.push({ id: "btn-tip-understood", text: "He entendido los consejos" });
         }
         // Update the existing message in the state instead of adding a new one
         setMessages(currentMessages =>
             currentMessages.map(msg => {
                 if (msg.id === messageId) { // Find the message by the ID passed to the handler
                     return {
                         ...msg, // Spread existing properties
                         text: `${targetTip.title} ${targetTip.text}`, // Update the text
                         buttons: newButtons,                          // Update the buttons
                         buttonsDisabled: false,                       // Re-enable the new buttons
                         timestamp: Date.now()                         // Update timestamp
                     };
                 }
                 return msg; // Return other messages unchanged
             })
         );
       }
      return; // Stop processing further handlers for this click
    } // --- End Tip Navigation Logic ---


    // --- Initial Choices / Mode Setting ---
    if (buttonId === "btn-tips" || buttonId === "btn-tips-again") {
      setIsFreeChatMode(false); // Set to guided mode
      addUserChoiceMessage(buttonId === "btn-tips" ? "TIPS Y CONSEJOS" : "Ver Tips");
      const firstTip = tips[0];
      addBotResponse( // Show the first tip
        `${firstTip.title} ${firstTip.text}`,
        [{ id: "btn-tip-next-0", icon: faArrowRight, ariaLabel: 'Siguiente' }] // Only show "Next"
      );
      setNewsChallengeState(null); // Reset challenge state if switching mode
      return;
    }
    // --- Handle News Challenge Start ---
    if (buttonId === "btn-news" || buttonId === "btn-news-again") {
       setIsFreeChatMode(false); // Ensure guided mode (specific for news challenge)
       addUserChoiceMessage(buttonId === "btn-news" ? "DESCIFRAR NOTICIAS FALSAS" : "Jugar otra vez"); // Adjust text
       setNewsChallengeState(null); // Reset any previous challenge state before starting new one
       presentNewsChallenge(); // <-- START THE NEWS CHALLENGE!
       return;
    }
    // --- End News Challenge Start ---
    if (buttonId === "btn-talk" || buttonId === "btn-talk-again") {
      setIsFreeChatMode(true); // Set mode to free chat
      addUserChoiceMessage(buttonId === "btn-talk" ? "SÓLO CHARLAR" : "Sólo Charlar");
      addBotResponse("¡Claro! ¿De qué te gustaría hablar?");
      setNewsChallengeState(null); // Reset challenge state if switching mode
      return;
    }

    // --- Handling "Entendido" (finished tips) and "Repeat Tips" ---
    if (buttonId === "btn-tip-understood") {
      addUserChoiceMessage("He entendido los consejos");
      addBotResponse( // Ask if user wants to repeat
        "¡Estupendo que hayas revisado los consejos! 👍 ¿Te gustaría repasarlos de nuevo?",
        [
          { id: "btn-repeat-tips-yes", text: "Sí, por favor" },
          { id: "btn-repeat-tips-no", text: "No, gracias" },
        ]
      );
      return;
    }
    if (buttonId === "btn-repeat-tips-yes") {
      // Re-trigger the display of the first tip
      setIsFreeChatMode(false); // Ensure guided mode
      addUserChoiceMessage("Sí, por favor");
      const firstTip = tips[0];
      addBotResponse(`${firstTip.title} ${firstTip.text}`, [
        { id: "btn-tip-next-0", icon: faArrowRight, ariaLabel: 'Siguiente' },
      ]);
      return;
    }
    if (buttonId === "btn-repeat-tips-no") {
      addUserChoiceMessage("No, gracias");
      addBotResponse("De acuerdo. ¿Hay algo más en lo que te pueda ayudar?", [ // Show main options again
        { id: "btn-tips-again", text: "Ver Tips" },
        { id: "btn-news-again", text: "Descifrar Noticias Falsas" }, // Use "Descifrar..." text
        { id: "btn-talk-again", text: "Sólo Charlar" },
      ]);
       setNewsChallengeState(null); // Reset challenge state when choosing other options
      return;
    }

    // --- Handle News Challenge Selection ---
    // Check if the button ID indicates a news selection AND a challenge is active
    if (buttonId.startsWith("select-news-") && newsChallengeState) {
        // Extract the message ID of the chosen news bubble from the button ID
        const selectedMessageId = buttonId.replace("select-news-", "");

        // Disable the selection buttons immediately on the selection prompt message
         setMessages((currentMessages) =>
             currentMessages.map((msg) =>
                 msg.id === newsChallengeState.selectionMessageId ? { ...msg, buttonsDisabled: true } : msg
             )
         );

        // Determine which news was selected (0 for first, 1 for second based on presentation order)
        const selectedIndex = newsChallengeState.presentedNewsMessageIds.indexOf(selectedMessageId);

        // Basic error check if the selected ID wasn't found (shouldn't happen in normal flow)
        if (selectedIndex === -1) {
            console.error("Error: Selected message ID not found in presentedNewsMessageIds array during challenge check.");
            setNewsChallengeState(null); // Reset state on error
            addBotResponse("¡Uy! Algo raro pasó al procesar tu respuesta. ¿Intentamos otra cosa?", [ /* options */ ]);
            return;
        }

        // Add user's choice message
        const choiceText = selectedIndex === 0 ? "La primera noticia" : "La segunda noticia";
        addUserChoiceMessage(`Creo que la verdadera es: ${choiceText}`);

        // Check if the selected news's *original* ID (from JSON) matches the stored true ID
        const selectedOriginalId = newsChallengeState.presentedNewsOriginalIds[selectedIndex];
        const isCorrect = selectedOriginalId === newsChallengeState.trueNewsOriginalId;

        // Prepare feedback message
        let feedbackText = "";
        if (isCorrect) {
            feedbackText = "✅ ¡Correcto! Esa era la noticia verdadera. ¡Muy bien!";
        } else {
            // Find which position (first/second) the correct news was presented in
            const correctIndex = newsChallengeState.presentedNewsOriginalIds.indexOf(newsChallengeState.trueNewsOriginalId);
            const correctChoiceText = correctIndex === 0 ? "la primera" : "la segunda";
            feedbackText = `❌ ¡Ups! Esa era la noticia falsa. La verdadera era ${correctChoiceText}. ¡No te preocupes, seguimos aprendiendo!`;
        }

        // Add feedback bot message and offer next steps
        addBotResponse(feedbackText, [
             { id: "btn-news-again", text: "Jugar otra vez" }, // Re-trigger challenge
             { id: "btn-tips-again", text: "Ver Tips" },
             { id: "btn-talk-again", text: "Sólo Charlar" },
        ], 500); // Slight delay for feedback

        // Reset the challenge state, ready for the next interaction or challenge
        setNewsChallengeState(null);
        return; // Stop processing other handlers
    }
    // --- End News Challenge Selection ---


  }, [addUserChoiceMessage, addBotResponse, presentNewsChallenge, newsChallengeState]); // Include all dependencies used


  // Handles sending user-typed text messages to the backend API (Ollama).
  // Prevents sending if a news challenge selection is currently pending.
  const handleSendMessage = async (inputText: string) => {
    // Check if a news challenge is active and waiting for button selection
    if (newsChallengeState && newsChallengeState.selectionMessageId) {
       // Find the selection message to check if its buttons are still enabled
       const selectionMessage = messages.find(msg => msg.id === newsChallengeState.selectionMessageId);
       // If the message exists and its buttons are NOT disabled, prevent sending text
       if (selectionMessage && !selectionMessage.buttonsDisabled) {
           addBotResponse("Por favor, elige una de las noticias usando los botones de arriba antes de escribir un mensaje. 😉", [], 0);
           return; // Block text input during selection phase
       }
       // If buttons are disabled or message not found, allow text sending (challenge might be over)
    }
    // Ensure input is not empty/whitespace and user info is loaded
    if (!inputText.trim() || !currentUserInfo) return;


    // 1. Create the new user message object for the UI state
    const newUserMessage: ChatMessage = {
      id: Date.now() + Math.random(),
      sender: "user",
      text: inputText,
      avatar: currentUserInfo?.avatar_url || USER_AVATAR_URL_DEFAULT,
      timestamp: Date.now(),
    };

    // 2. Prepare the updated list of messages *before* setting state for API call
    // Use a variable to hold the list that will be sent, derived from current state + new message
    let updatedMessagesForApi: ChatMessage[] = [];
    // Use functional update for setMessages to get the latest state
    setMessages(currentMessages => {
        updatedMessagesForApi = [...currentMessages, newUserMessage];
        return updatedMessagesForApi; // Return the new state for React to update the UI
    });

    // Use 'updatedMessagesForApi' which now contains the new user message

    // 3. Determine which system prompt and endpoint to use based on current chat mode
    const currentSystemPrompt = isFreeChatMode ? SYSTEM_PROMPT_FREE_CHAT : SYSTEM_PROMPT_FAKE_NEWS;
    const targetEndpoint = isFreeChatMode ? `/api/bot/chatlibre` : `/api/bot/chat`; // Different endpoints for different modes

    // 4. Construct the message history for the Ollama API call
    const ollamaMessages: OllamaMessage[] = [
      // Start with the determined system prompt
      { role: 'system', content: currentSystemPrompt },
      // Map the UI message history (using the calculated 'updatedMessagesForApi' list)
      ...updatedMessagesForApi
           // Filter out messages that shouldn't be sent to Ollama
           .filter(msg =>
               !(typeof msg.id === 'string' && msg.id.startsWith('news-')) && // Exclude news challenge presentation bubbles
               !(newsChallengeState && msg.id === newsChallengeState.selectionMessageId) && // Exclude selection prompt bubble
               msg.text // Ensure message has text content
           )
           // Map remaining messages to the Ollama format
           .map((msg): OllamaMessage => ({
               role: msg.sender === 'user' ? 'user' : 'assistant',
               content: msg.text! // Use non-null assertion as we filtered for msg.text
            }))
    ];


    // --- OLLAMA INTEGRATION ---
    console.log(`Sending ${ollamaMessages.length} messages to ${targetEndpoint} for Ollama processing.`);
    try {
      const response = await fetch(targetEndpoint, { // Use the determined endpoint URL
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`, // Include auth token
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            messages: ollamaMessages, // Send the filtered and formatted history
            model: 'gemma3:4b' // Specify the model to use (as used before)
        })
      });

      // Handle non-successful HTTP responses
      if (!response.ok) {
        let errorDetail = `Chat API error ${response.status}`;
        try {
            // Try parsing backend error detail
            const errorData = await response.json();
            errorDetail = (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) || errorDetail;
        } catch (jsonError) {
            // Fallback if response isn't JSON
            errorDetail = response.statusText || errorDetail;
            console.error("Non-JSON error response:", jsonError, await response.text());
        }
         console.error(`Error response from ${targetEndpoint}: ${response.status} - ${errorDetail}`);
        throw new Error(errorDetail); // Throw error to be caught below
      }

      // Parse the successful JSON response from Ollama via backend
      const data = await response.json();

      // Create the bot's reply message object
      const botMessage: ChatMessage = {
        id: Date.now() + Math.random() + 1, // Ensure unique ID
        sender: "bot",
        text: data.reply, // Assuming backend returns { "reply": "..." }
        avatar: BOT_AVATAR_URL,
        timestamp: Date.now(),
      };
      // Add the bot's reply to the UI state
      setMessages((prevMessages) => [...prevMessages, botMessage]);

    } catch (error) {
        // Handle errors during the fetch process or from the API
        console.error(`Error sending message via ${targetEndpoint}:`, error);
        // Format error message for display
        let displayError = 'Unknown error';
        if (error instanceof Error) { displayError = error.message; }
        else if (typeof error === 'string') { displayError = error; }
        else { try { displayError = JSON.stringify(error); } catch { /* ignore */ } }

        // Create an error message bubble for the user
        const errorMsg: ChatMessage = {
            id: Date.now() + Math.random() + 2, // Ensure unique ID
            sender: 'bot',
            text: `Lo siento, no pude procesar tu mensaje ahora. Error: ${displayError}`,
            avatar: BOT_AVATAR_URL,
            timestamp: Date.now(),
       };
       // Use functional update for setting error message state as well
       setMessages(prev => [...prev, errorMsg]);
    }
  };
  // --- END handleSendMessage ---


  // Resets the chat to its initial state (welcome message and mode buttons).
  // Also resets the news challenge state and closes the side panel.
  const handleRefresh = () => {
    console.log("Reiniciando chat...");
    // Proceed only if user info is loaded
    if (!isLoadingUserInfo && currentUserInfo) {
      const welcomeMessage = createWelcomeMessage();
      const initialButtonsMessage: ChatMessage = {
        id: "buttons-msg-" + Date.now(),
        sender: "bot",
        text: "¿Cómo empezamos?",
        avatar: BOT_AVATAR_URL,
        timestamp: Date.now() + 1,
        buttons: [
          { id: "btn-tips", text: "TIPS Y CONSEJOS" },
          { id: "btn-news", text: "DESCIFRAR NOTICIAS FALSAS" }, // Use consistent text
          { id: "btn-talk", text: "SÓLO CHARLAR" },
        ],
        buttonsDisabled: false,
      };
      // Reset chat mode to default (guided) on refresh
      setIsFreeChatMode(false);
      // Reset messages to initial state
      setMessages([welcomeMessage, initialButtonsMessage]);
      // Reset the news challenge state
      setNewsChallengeState(null);
    }
    closePanel(); // Close panel if open on refresh
  };

  // --- Renderizado Principal ---
  // Renders loading indicator while fetching initial user info.
  if (isLoadingUserInfo && currentUserInfo === null) {
    return <div style={{ padding: '50px', textAlign: 'center', fontSize: '1.2em' }}>Cargando Pimpoyo...</div>;
  }
  // Renders error message if user info fetch failed and no user info is available.
  if (!currentUserInfo && chatError && !isLoadingUserInfo) { // Check isLoading to avoid showing during initial load
     return <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}>
       <h2>Error al cargar</h2>
       <p>{chatError}</p>
       <button onClick={onLogout} style={{ padding: '8px 15px', marginTop: '10px' }}>Volver a Inicio</button>
     </div>;
  }
  // Renders a generic message if user info is somehow null after loading (e.g., during logout).
  if (!currentUserInfo && !isLoadingUserInfo) { // Check isLoading to avoid showing during initial load
     return <div style={{ padding: '50px', textAlign: 'center', color: 'orange' }}>
       <p>No se pudo cargar la información del usuario o la sesión ha terminado.</p>
       <button onClick={onLogout} style={{ padding: '8px 15px', marginTop: '10px' }}>Volver a Inicio</button>
     </div>;
  }
  // Fallback check: If somehow still loading or no user info, show loading (should be rare now)
  if (!currentUserInfo) {
     return <div style={{ padding: '50px', textAlign: 'center', fontSize: '1.2em' }}>Cargando...</div>;
  }


  // Renders the main chat interface if user info is loaded successfully.
  return (
    <div className="chat-container">
      <ChatHeader
        nickname={currentUserInfo.apodo || 'Usuario'} // Use loaded nickname
        onPanelToggle={togglePanel}
        onRefresh={handleRefresh} // Pass the refresh handler
      />
      {/* Display general chat error if any (e.g., news loading failed), exclude user info load errors handled above */}
      {chatError && isLoadingNews && ( // Show specific error if news loading failed
            <div style={{ padding: '5px 10px', background: '#ffe0e0', color: '#c00', textAlign: 'center', fontSize: '0.9em', borderBottom: '1px solid #fcc' }}>
                 Error cargando noticias: {chatError}
            </div>
      )}
      <MessageList
        messages={messages}
        onButtonClick={handleMessageButtonClick} // Pass the unified button handler
      />
      <ChatInput onSendMessage={handleSendMessage} /> {/* Pass the send message handler */}
      <SidePanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        userInfo={currentUserInfo}
        authToken={authToken}
        onLogout={onLogout}
        onSettingsSaved={handleSettingsSaved} // Pass the settings saved handler
      />
    </div>
  );
}

export default ChatContainer;
