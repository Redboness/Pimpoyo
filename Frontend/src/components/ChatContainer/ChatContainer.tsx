// src/components/ChatContainer/ChatContainer.tsx
import React, { useState, useEffect, useCallback } from "react";
import MessageList from "../MessageList/MessageList";
import ChatHeader from "../ChatHeader/ChatHeader";
import ChatInput from "../ChatInput/ChatInput";
import SidePanel from "../SidePanel/SidePanel";
// Ensure types are correctly defined/imported
// Make sure OllamaMessage is defined in your types file or uncomment below
import { UserInfo, ChatMessage, MessageButton, OllamaMessage } from "../../types/types"; // Adjust path as needed
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
const API_BASE_URL = "http://localhost:8000"; // API Base URL


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
- No afirmes lo que has recibido, es decir, si digo: Explicame que es el modelo llama3.2-1b de Meta, no digas: Claro, te explicaré cómo funciona el Modelo llama 3.2-1B de Meta, simplemente responde a la pregunta sin repetirla.
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
  // State to manage the current chat mode
  const [isFreeChatMode, setIsFreeChatMode] = useState<boolean>(false); // Default to guided mode

  // --- Function to fetch User Info ---
  const fetchUserInfo = useCallback(async () => {
    setChatError('');
    console.log("ChatContainer: Fetching user info (fetchUserInfo)...");
    if (!authToken) {
      console.error("No token found for fetchUserInfo");
      setIsLoadingUserInfo(false);
      return;
    }
    try {
      // Use API_BASE_URL constant
      const response = await fetch(`${API_BASE_URL}/users/me/`, {
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


  // --- Effect for Initial/Refresh User Info Fetch ---
  useEffect(() => {
    console.log("ChatContainer: UserInfo fetch/refresh effect triggered.");
    if (currentUserInfo === null || refreshUserInfoToggle) {
        setIsLoadingUserInfo(true);
    }
    fetchUserInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshUserInfoToggle, authToken]); // fetchUserInfo dependency removed as it's memoized

  // --- Function to create the WELCOME message ---
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

  // --- useEffect to set initial messages ---
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
      // Start in guided mode by default when chat initializes
      setIsFreeChatMode(false);
      setMessages([welcomeMessage, initialButtonsMessage]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingUserInfo, currentUserInfo, createWelcomeMessage]); // messages.length removed as it can cause loops

  // --- Lógica del Panel Lateral / Refresh ---
  const togglePanel = () => setIsPanelOpen(!isPanelOpen);
  const closePanel = () => setIsPanelOpen(false);
  const handleSettingsSaved = () => {
    console.log("ChatContainer: Settings saved, triggering refresh.");
    setRefreshUserInfoToggle((prev) => !prev);
  };

  // --- Handle Button Clicks (Sets Chat Mode) ---
  const handleMessageButtonClick = (
    messageId: number | string,
    buttonId: string
  ) => {
    console.log(`Button Clicked: MessageID=${messageId}, ButtonID=${buttonId}`);

    // Helper Function to add User Choice Message
    const addUserChoiceMessage = (text: string) => {
      if (!currentUserInfo) return;
      const userChoiceMessage: ChatMessage = {
        id: Date.now() + Math.random(),
        sender: "user",
        text: text,
        avatar: currentUserInfo?.avatar_url || USER_AVATAR_URL_DEFAULT,
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, userChoiceMessage]);
    };

    // Helper Function to add Bot Response
    const addBotResponse = (
      text: string,
      buttons: MessageButton[] = [],
      delay: number = 300
    ) => {
      setTimeout(() => {
        const botMsg: ChatMessage = {
          id: Date.now() + Math.random(),
          sender: "bot",
          text: text,
          avatar: BOT_AVATAR_URL,
          timestamp: Date.now(),
          buttons: buttons,
          buttonsDisabled: buttons.length === 0,
        };
        setMessages((prevMessages) => [...prevMessages, botMsg]);
      }, delay);
    };

    // Disable buttons on the original message that was clicked
    setMessages((currentMessages) =>
      currentMessages.map((msg) =>
        msg.id === messageId ? { ...msg, buttonsDisabled: true } : msg
      )
    );

    // Handle different button IDs and set chat mode accordingly

    // Initial Choices / Mode Setting
    if (buttonId === "btn-tips" || buttonId === "btn-news") {
      setIsFreeChatMode(false); // Set mode to guided/fake news
      if (buttonId === "btn-tips") {
        addUserChoiceMessage("TIPS Y CONSEJOS");
        const firstTip = tips[0];
        addBotResponse(
          `${firstTip.title} ${firstTip.text}`,
          [{ id: "btn-tip-next-0", icon: faArrowRight, ariaLabel: 'Siguiente' }]
        );
      }
      if (buttonId === "btn-news") {
        addUserChoiceMessage("DESCIFRAR NOTICIAS FALSAS");
        addBotResponse( "¡Perfecto! Pega la noticia o el titular que quieres que analicemos." );
      }
      return;
    }
    if (buttonId === "btn-talk") {
      setIsFreeChatMode(true); // Set mode to free chat
      addUserChoiceMessage("SÓLO CHARLAR");
      addBotResponse("¡Claro! ¿De qué te gustaría hablar?");
      return;
    }

    // Tips Navigation (doesn't change mode)
    if (buttonId.startsWith("btn-tip-next-")) {
      const currentIndex = parseInt(buttonId.split("-").pop() || "0", 10);
      const nextIndex = currentIndex + 1;
      if (nextIndex < tips.length) {
        const nextTip = tips[nextIndex];
        const buttons: MessageButton[] = [
          { id: `btn-tip-prev-${nextIndex}`, icon: faArrowLeft, ariaLabel: 'Anterior' }
        ];
        if (nextIndex < tips.length - 1) {
          buttons.push({ id: `btn-tip-next-${nextIndex}`, icon: faArrowRight, ariaLabel: 'Siguiente' });
        } else {
          buttons.push({ id: "btn-tip-understood", text: "He entendido los consejos" });
        }
        addBotResponse(`${nextTip.title} ${nextTip.text}`, buttons);
      }
      return;
    }
    if (buttonId.startsWith("btn-tip-prev-")) {
      const currentIndex = parseInt(buttonId.split("-").pop() || "0", 10);
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        const prevTip = tips[prevIndex];
        const buttons: MessageButton[] = [];
        if (prevIndex > 0) {
          buttons.push({ id: `btn-tip-prev-${prevIndex}`, icon: faArrowLeft, ariaLabel: 'Anterior' });
        }
        buttons.push({ id: `btn-tip-next-${prevIndex}`, icon: faArrowRight, ariaLabel: 'Siguiente' });
        addBotResponse(`${prevTip.title} ${prevTip.text}`, buttons);
      }
      return;
    }
    if (buttonId === "btn-tip-understood") {
      addUserChoiceMessage("He entendido los consejos");
      addBotResponse(
        "¡Estupendo que hayas revisado los consejos! 👍 ¿Te gustaría repasarlos de nuevo?",
        [
          { id: "btn-repeat-tips-yes", text: "Sí, por favor" },
          { id: "btn-repeat-tips-no", text: "No, gracias" },
        ]
      );
      return;
    }
    if (buttonId === "btn-repeat-tips-yes") {
      addUserChoiceMessage("Sí, por favor");
      const firstTip = tips[0];
      addBotResponse(`${firstTip.title} ${firstTip.text}`, [
        { id: "btn-tip-next-0", icon: faArrowRight, ariaLabel: 'Siguiente' },
      ]);
      return;
    }
    if (buttonId === "btn-repeat-tips-no") {
      addUserChoiceMessage("No, gracias");
      addBotResponse("De acuerdo. ¿Hay algo más en lo que te pueda ayudar?", [
        { id: "btn-tips-again", text: "Ver Tips" },
        { id: "btn-news-again", text: "Descifrar Noticias Falsas" },
        { id: "btn-talk-again", text: "Sólo Charlar" },
      ]);
      return;
    }

    // General Next Steps / Mode Setting
    if (buttonId === "btn-tips-again" || buttonId === "btn-news-again") {
       setIsFreeChatMode(false); // Set mode to guided/fake news
       if (buttonId === "btn-tips-again") {
           addUserChoiceMessage("Ver Tips");
           const firstTip = tips[0];
           addBotResponse(`${firstTip.title} ${firstTip.text}`, [
              { id: "btn-tip-next-0", icon: faArrowRight, ariaLabel: 'Siguiente' },
           ]);
       }
       if (buttonId === "btn-news-again") {
          addUserChoiceMessage("Descifrar Noticias Falsas");
          addBotResponse( "¡Perfecto! Pega la noticia o el titular que quieres que analicemos." );
       }
       return;
    }
     if (buttonId === "btn-talk-again") {
        setIsFreeChatMode(true); // Set mode to free chat
        addUserChoiceMessage("Sólo Charlar");
        addBotResponse("¡Claro! ¿De qué te gustaría hablar?");
        return;
     }

  }; // End handleMessageButtonClick


  // --- Lógica de Envío de Mensajes (Ollama Integration) --- CORRECTED ---
  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim() || !currentUserInfo) return;

    // 1. Create the new user message object for the UI state
    const newUserMessage: ChatMessage = {
      id: Date.now() + Math.random(),
      sender: "user",
      text: inputText,
      avatar: currentUserInfo?.avatar_url || USER_AVATAR_URL_DEFAULT,
      timestamp: Date.now(),
    };

    // 2. Prepare the updated list of messages *before* setting state
    // Use a functional update to ensure we have the latest messages state
    let updatedMessagesForApi: ChatMessage[] = [];
    setMessages(currentMessages => {
        updatedMessagesForApi = [...currentMessages, newUserMessage];
        return updatedMessagesForApi; // Return the new state
    });

    // Ensure updatedMessagesForApi is populated correctly after state update
    // Note: State updates might be asynchronous, direct use might be slightly stale.
    // For critical timing, consider passing updatedMessagesForApi directly or use useEffect hook.
    // However, for this flow, using the state setter callback is generally safe enough.
    // Let's refine slightly to use the state directly after update (React batches updates)

    // We will use 'updatedMessagesForApi' which was just set.

    // 3. Determine which system prompt and endpoint to use based on state
    // Use the state variable isFreeChatMode directly
    const currentSystemPrompt = isFreeChatMode ? SYSTEM_PROMPT_FREE_CHAT : SYSTEM_PROMPT_FAKE_NEWS;
    const targetEndpoint = isFreeChatMode ? `${API_BASE_URL}/bot/chatlibre` : `${API_BASE_URL}/bot/chat`;

    // 4. Construct the message history for Ollama API
    const ollamaMessages: OllamaMessage[] = [
      // Start with the correct system prompt
      { role: 'system', content: currentSystemPrompt },
      // Map the UI message history (use the calculated updated list)
      ...updatedMessagesForApi
           .map((msg): OllamaMessage | null => {
                if (!msg.text) return null; // Skip messages without text content
                const role = msg.sender === 'user' ? 'user' : 'assistant';
                return { role, content: msg.text };
            })
           .filter((msg): msg is OllamaMessage => msg !== null),
    ];


    // --- OLLAMA INTEGRATION ---
    console.log(`Sending ${ollamaMessages.length} messages to ${targetEndpoint} for Ollama processing.`);
    try {
      const response = await fetch(targetEndpoint, { // Use the determined endpoint URL
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
        },
        // Send the full messages array
        body: JSON.stringify({
            messages: ollamaMessages,
            model: 'llama3.2:1b' // Ensure correct model name:tag
        })
      });

      if (!response.ok) {
        let errorDetail = `Chat API error ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetail = (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) || errorDetail;
        } catch (jsonError) {
            errorDetail = response.statusText || errorDetail;
            console.error("Non-JSON error response:", jsonError, await response.text());
        }
         console.error(`Error response from ${targetEndpoint}: ${response.status} - ${errorDetail}`);
        throw new Error(errorDetail);
      }

      const data = await response.json();
      const botMessage: ChatMessage = {
        id: Date.now() + Math.random() + 1, // Ensure unique ID
        sender: "bot",
        text: data.reply,
        avatar: BOT_AVATAR_URL,
        timestamp: Date.now(),
      };
      // Add the bot's reply to the UI state
      setMessages((prevMessages) => [...prevMessages, botMessage]);

    } catch (error) {
        console.error(`Error sending message via ${targetEndpoint}:`, error);
        // Use the improved error formatting
        let displayError = 'Unknown error';
        if (error instanceof Error) { displayError = error.message; }
        else if (typeof error === 'string') { displayError = error; }
        else { try { displayError = JSON.stringify(error); } catch { /* ignore */ } }

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
  // --- END CORRECTED handleSendMessage ---


  // --- Refresh Chat ---
  const handleRefresh = () => {
    console.log("Reiniciando chat...");
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
          { id: "btn-news", text: "DESCIFRAR NOTICIAS FALSAS" },
          { id: "btn-talk", text: "SÓLO CHARLAR" },
        ],
        buttonsDisabled: false,
      };
      // Reset chat mode to default (guided) on refresh
      setIsFreeChatMode(false);
      setMessages([welcomeMessage, initialButtonsMessage]);
    }
    closePanel(); // Close panel if open on refresh
  };

  // --- Renderizado Principal ---
  if (isLoadingUserInfo && currentUserInfo === null) {
    return <div style={{ padding: '50px', textAlign: 'center', fontSize: '1.2em' }}>Cargando Pimpoyo...</div>;
  }
  if (!currentUserInfo && chatError) {
     return <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}>
       <h2>Error al cargar</h2>
       <p>{chatError}</p>
       <button onClick={onLogout} style={{ padding: '8px 15px', marginTop: '10px' }}>Volver a Inicio</button>
     </div>;
  }
  if (!currentUserInfo) {
     // This case might be hit briefly if logout happens during initial load
     return <div style={{ padding: '50px', textAlign: 'center', color: 'orange' }}>
       <p>No se pudo cargar la información del usuario o la sesión ha terminado.</p>
       <button onClick={onLogout} style={{ padding: '8px 15px', marginTop: '10px' }}>Volver a Inicio</button>
     </div>;
  }

  // Render chat interface only if currentUserInfo is available
  return (
    <div className="chat-container">
      <ChatHeader
        nickname={currentUserInfo.apodo || 'Usuario'}
        onPanelToggle={togglePanel}
        onRefresh={handleRefresh}
      />
      <MessageList
        messages={messages}
        onButtonClick={handleMessageButtonClick}
      />
      <ChatInput onSendMessage={handleSendMessage} />
      <SidePanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        userInfo={currentUserInfo}
        authToken={authToken}
        onLogout={onLogout}
        onSettingsSaved={handleSettingsSaved}
      />
    </div>
  );
}

export default ChatContainer;
