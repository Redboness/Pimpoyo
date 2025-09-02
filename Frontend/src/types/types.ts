// src/types/types.ts
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import React from 'react';

// --- INTERFACES DE USUARIO Y ESTADÍSTICAS ---

/**
 * Define la estructura de las estadísticas detalladas de un usuario.
 */
export interface UserDetailedStats {
    totalAnalizadas: number;
    aciertos: number;
    fallos: number;
    xp: number;
    xpNextLevel: number;
}

/**
 * Representa la información del perfil principal de un usuario autenticado.
 */
export interface UserInfo {
    sesion_id: number;
    apodo: string;
    genero?: string | null;
    edad?: number;
    avatar_url?: string | null;
    curso_escolar: string;
    puntuacion_pre_test_total?: number | null;
    puntuacion_post_test_total?: number | null;
}

// --- INTERFACES PARA COMPONENTES ---

/**
 * Define las props para el componente `SidePanel`.
 */
export interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    userInfo: UserInfo | null;
    authToken: string;
    onLogout: () => void;
    onSettingsSaved: () => void;
    onStartPostTest: () => void;
    selectedTerm?: string | null;
    initialSection?: string | null;
}

/**
 * Define las props para el componente `MessageList`.
 */
export interface MessageListProps {
    messages: ChatMessage[];
    onButtonClick: (messageId: number | string, buttonId: string) => void;
    isBotTyping?: boolean;
    botAvatarUrl?: string;
}

/**
 * Define las props para el componente `ChatInput`.
 */
export interface ChatInputProps {
    onSendMessage: (text: string) => void;
    disabled?: boolean;
}

// --- INTERFACES PARA EL CHAT Y NOTICIAS ---

/**
 * Define los niveles de dificultad posibles para los desafíos.
 */
export type DifficultyLevel = 'bajo' | 'medio' | 'alto';
export const difficultyOrder: DifficultyLevel[] = ['bajo', 'medio', 'alto'];

/**
 * Representa la estructura completa de un artículo de noticia utilizado en los desafíos.
 */
export interface NewsItem {
    ID: string;
    CATEGORY: 'TRUE' | 'FALSE';
    TOPICS: string;
    SOURCE: string;
    HEADLINE: string;
    TEXT: string;
    LINK: string;
    DIFFICULTY_LEVEL: DifficultyLevel;
    REASONING_TYPE?: string;
    KEY_ELEMENTS?: string[];
    JUSTIFICATION_HINTS?: string[];
    LIKELY_MISCONCEPTIONS?: string[];
    PUBLICATION_DATE?: string;
}

/**
 * Almacena el estado de un desafío de noticias de tipo "selección por pares".
 */
export interface NewsChallengeState {
    trueNewsOriginalId: string;
    leftNewsOriginalId: string;
    rightNewsOriginalId: string;
    selectionMessageId: string | number | null;
}

/**
 * Define la estructura de un botón interactivo dentro de un mensaje de chat.
 */
export interface MessageButton {
    id: string;
    text?: string;
    icon?: IconDefinition;
    ariaLabel?: string;
}

/**
 * Define la estructura de una tarjeta de desafío que acompaña a un consejo.
 */
export interface TipChallengeCard {
    question: string;
    options: MessageButton[];
}

/**
 * Representa un único mensaje en el historial del chat, con todas sus posibles propiedades.
 */
export interface ChatMessage {
    id: number | string;
    sender: 'user' | 'bot';
    text?: string | null;
    htmlContent?: string | null;
    interactiveContent?: React.ReactNode;
    avatar: string;
    timestamp: number;
    buttons?: MessageButton[];
    buttonsDisabled?: boolean;
    challengeCard?: TipChallengeCard | null;
}

/**
 * Define el formato de un mensaje para ser enviado a la API de Ollama.
 */
export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// --- INTERFACES PARA EL GLOSARIO ---

/**
 * Representa un término del glosario dentro del estado de la aplicación.
 */
export interface GlossaryEntry {
    id?: number;
    term: string;
    definition: string;
    isDefault: boolean;
    userId?: number | string;
    fecha_creacion?: Date | string;
}

/**
 * Representa la estructura de un término del glosario tal como se recibe de la API.
 */
export interface GlossaryTermPublic {
    id: number;
    usuario_sesion_id: number;
    termino: string;
    definicion: string;
    fecha_creacion: string;
}

/**
 * Define el payload para crear un nuevo término en el glosario.
 */
export interface GlossaryTermCreate {
    termino: string;
    definicion: string;
}

// --- INTERFACES PARA EL FLUJO DE ANÁLISIS GUIADO ---

/**
 * Define la estructura de una noticia para el modo de análisis guiado.
 */
export interface NoticiaParaAnalisis {
    area_de_enfoque_sugerida: { area_de_enfoque_sugerida: string };
    noticia_id_json: string;
    headline: string;
    text: string;
    source?: string | null;
    topics?: string | null;
    difficulty_level?: string | null;
    initialUserEvaluation?: 'TRUE' | 'FALSE' | 'UNSURE' | null;
}

/**
 * Payload para enviar la explicación inicial del usuario en el análisis guiado.
 */
export interface ExplicacionInicialPayload {
    noticia_id_json: string;
    explicacion_usuario: string;
    evaluacion_inicial_opcional?: 'TRUE' | 'FALSE' | 'UNSURE' | null;
}

/**
 * Define la respuesta de la API del chat de análisis guiado.
 */
export interface ChatGuiaResponse {
    chat_sesion_noticia_id: number;
    respuesta_chatbot: string;
}

/**
 * Payload para continuar una conversación en el chat de análisis guiado.
 */
export interface ContinuarChatGuiaPayload {
    mensaje_usuario: string;
}

// --- INTERFACES PARA LOS DESAFÍOS ---

/**
 * Payload para finalizar un desafío de selección de noticias por pares.
 */
export interface FinishPairChallengePayload {
    noticia_verdadera_id_json: string;
    noticia_falsa_id_json: string;
    seleccion_usuario_id_json: string;
    tiempo_respuesta_ms?: number;
}

/**
 * Define la respuesta de la API al finalizar un desafío por pares.
 */
export interface FinishPairChallengeResponse {
    message: string;
    es_correcto: boolean;
    explanation?: string;
}

/**
 * Payload para el análisis de una noticia falsa.
 */
export interface FakeNewsAnalysisPayload {
    original_news: string;
    analysis: string;
    score: number;
    explanation: string;
}

// --- TIPOS PARA EL FLUJO DE POST-TEST ---

/**
 * Props para el componente principal `PostTestFlow`.
 */
export interface PostTestFlowProps {
    authToken: string;
    onTestComplete: (
        puntuacionTotal: number,
        puntuacionMaxima: number,
        puntuacionesPorSeccion: PuntuacionSeccion[]
    ) => void;
    onCancelTest?: () => void;
}

/**
 * Estructura de una opción de respuesta para preguntas de elección.
 */
export interface PostTestOption {
    id: string;
    text: string;
}

/**
 * Estructura de una pregunta del post-test recibida del backend.
 */
export interface PostTestQuestion {
    id_pregunta: string;
    texto_pregunta: string;
    tipo: 'eleccion_unica' | 'eleccion_multiple' | 'texto_libre';
    opciones?: PostTestOption[];
    seccion_id: string;
}

/**
 * Estructura de una noticia a analizar dentro del post-test.
 */
export interface NoticiaParaAnalisisPostTest {
    noticia_id_json: string;
    headline: string;
    source?: string;
    text: string;
}

/**
 * Estructura de la respuesta inicial al comenzar el post-test.
 */
export interface PostTestStartResponse {
    preguntas: PostTestQuestion[];
    noticias_para_analizar: NoticiaParaAnalisisPostTest[];
}

/**
 * Estructura para una respuesta de elección del usuario.
 */
export interface RespuestaPreguntaEleccionItem {
    id_pregunta: string;
    respuestas_seleccionadas: string[];
}

/**
 * Estructura para una respuesta de texto libre del usuario.
 */
export interface RespuestaPreguntaTextoItem {
    id_pregunta: string;
    texto_respuesta: string;
}

/**
 * Estructura para la respuesta de análisis de una noticia.
 */
export interface RespuestaAnalisisNoticiaItem {
    noticia_id_json: string;
    evaluacion_usuario: 'Verdadero' | 'Falso';
    justificacion: string;
}

/**
 * Define el payload completo a enviar al finalizar el post-test.
 */
export interface PostTestSubmitPayload {
    respuestas_eleccion: RespuestaPreguntaEleccionItem[];
    respuestas_texto: RespuestaPreguntaTextoItem[];
    respuestas_analisis: RespuestaAnalisisNoticiaItem[];
}

/**
 * Define la puntuación obtenida en una sección del test.
 */
export interface PuntuacionSeccion {
    seccion_id: string;
    puntos_obtenidos: number;
    puntos_maximos: number;
}

/**
 * Define la respuesta final de la API tras enviar el post-test.
 */
export interface PostTestSubmitResponse {
    message: string;
    puntuacion_total: number;
    puntuacion_maxima_posible: number;
    puntuaciones_por_seccion: PuntuacionSeccion[];
}
