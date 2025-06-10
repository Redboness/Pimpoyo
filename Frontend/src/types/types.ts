// src/types/types.ts
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import React from 'react';


// --- INTERFACES DE USUARIO Y ESTADÍSTICAS ---
export interface UserDetailedStats {
    totalAnalizadas: number;
    aciertos: number;
    fallos: number;
    xp: number;
    xpNextLevel: number;
}

export interface UserInfo {
    sesion_id: number;
    apodo: string;
    genero?: string | null;
    edad?: number;
    avatar_url?: string | null;
    curso_escolar: string;
    password?: string; // Es raro tener el password aquí, pero respeto la estructura
    puntuacion_pre_test_total?: number | null;
    puntuacion_post_test_total?: number | null;
}

// --- INTERFACES PARA COMPONENTES ---

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

export interface MessageListProps {
    messages: ChatMessage[];
    onButtonClick: (messageId: number | string, buttonId: string) => void;
    isBotTyping?: boolean;
    botAvatarUrl?: string;
}

export interface ChatInputProps {
    onSendMessage: (text: string) => void;
    disabled?: boolean;
}

// --- INTERFACES PARA EL CHAT Y NOTICIAS ---

export type DifficultyLevel = 'bajo' | 'medio' | 'alto';
export const difficultyOrder: DifficultyLevel[] = ['bajo', 'medio', 'alto'];

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

export interface NewsChallengeState {
    trueNewsOriginalId: string;
    leftNewsOriginalId: string;
    rightNewsOriginalId: string;
    selectionMessageId: string | number | null;
}

export interface MessageButton {
    id: string;
    text?: string;
    icon?: IconDefinition;
    ariaLabel?: string;
}

export interface TipChallengeCard {
    question: string;
    options: MessageButton[];
}

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

export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// --- INTERFACES PARA EL GLOSARIO ---

export interface GlossaryEntry {
    id?: number;
    term: string;
    definition: string;
    isDefault: boolean;
    userId?: number | string;
    fecha_creacion?: Date | string;
}

export interface GlossaryTermPublic {
    id: number;
    usuario_sesion_id: number;
    termino: string;
    definicion: string;
    fecha_creacion: string;
}

export interface GlossaryTermCreate {
    termino: string;
    definicion: string;
}

// --- INTERFACES PARA EL FLUJO DE ANÁLISIS GUIADO ---

export interface NoticiaParaAnalisis {
    area_de_enfoque_sugerida: { area_de_enfoque_sugerida: string };
    noticia_id_json: string;
    headline: string;
    text: string;
    source?: string | null;
    difficulty_level?: string | null;
    initialUserEvaluation?: 'TRUE' | 'FALSE' | 'UNSURE' | null;
}

export interface ExplicacionInicialPayload {
    noticia_id_json: string;
    explicacion_usuario: string;
    evaluacion_inicial_opcional?: 'TRUE' | 'FALSE' | 'UNSURE' | null;
}

export interface ChatGuiaResponse {
    chat_sesion_noticia_id: number;
    respuesta_chatbot: string;
}

export interface ContinuarChatGuiaPayload {
    mensaje_usuario: string;
}

// --- INTERFACES PARA LOS DESAFÍOS ---

export interface FinishPairChallengePayload {
    noticia_verdadera_id_json: string;
    noticia_falsa_id_json: string;
    seleccion_usuario_id_json: string;
    tiempo_respuesta_ms?: number;
}

export interface FinishPairChallengeResponse {
    message: string;
    es_correcto: boolean;
    explanation?: string;
}

export interface FakeNewsAnalysisPayload {
    original_news: string;
    analysis: string;
    score: number;
    explanation: string;
}

// --- (NUEVO Y UNIFICADO) Tipos para el Flujo de Post-Test ---

// Props para el componente principal del flow
export interface PostTestFlowProps {
    authToken: string;
    onTestComplete: (
        puntuacionTotal: number,
        puntuacionMaxima: number,
        puntuacionesPorSeccion: PuntuacionSeccion[]
    ) => void;
    onCancelTest?: () => void;
}

// Estructura de una opción de respuesta (para elección única o múltiple)
export interface PostTestOption {
    id: string; // ID único de la opción, p.ej. "s1_p1_o1"
    text: string;
}

// Estructura de una pregunta que viene del backend
export interface PostTestQuestion {
    id_pregunta: string; // ID único de la pregunta, p.ej. "s1_p1"
    texto_pregunta: string;
    tipo: 'eleccion_unica' | 'eleccion_multiple' | 'texto_libre';
    opciones?: PostTestOption[]; // Solo para 'eleccion_unica' y 'eleccion_multiple'
    seccion_id: string; // p. ej. 's1', 's2', 's4'
}

// Estructura de una noticia a analizar que viene del backend
export interface NoticiaParaAnalisisPostTest {
    noticia_id_json: string;
    headline: string;
    source?: string;
    text: string;
}

// Lo que se recibe de /api/activity/post-test/start
export interface PostTestStartResponse {
    preguntas: PostTestQuestion[];
    noticias_para_analizar: NoticiaParaAnalisisPostTest[];
}

// --- Estructuras para el PAYLOAD que se envía a /post-test/submit ---

export interface RespuestaPreguntaEleccionItem {
    id_pregunta: string;
    respuestas_seleccionadas: string[]; // Array con los IDs de las opciones elegidas
}

export interface RespuestaPreguntaTextoItem {
    id_pregunta: string;
    texto_respuesta: string;
}

export interface RespuestaAnalisisNoticiaItem {
    noticia_id_json: string;
    evaluacion_usuario: 'Verdadero' | 'Falso';
    justificacion: string;
}

export interface PostTestSubmitPayload {
    respuestas_eleccion: RespuestaPreguntaEleccionItem[];
    respuestas_texto: RespuestaPreguntaTextoItem[];
    respuestas_analisis: RespuestaAnalisisNoticiaItem[];
}

// --- Estructura de la RESPUESTA que se recibe de /post-test/submit ---

export interface PuntuacionSeccion {
    seccion_id: string;
    puntos_obtenidos: number;
    puntos_maximos: number;
}

export interface PostTestSubmitResponse {
    message: string;
    puntuacion_total: number;
    puntuacion_maxima_posible: number;
    puntuaciones_por_seccion: PuntuacionSeccion[];
}
