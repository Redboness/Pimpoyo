// src/types/types.ts
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// --- INTERFACES PARA LOS CONSEJOS INTERACTIVOS ---
export interface MessageButton {
  id: string;
  text?: string;
  icon?: IconDefinition | any; // Ajusta 'any' si tienes un tipo más específico para iconos que no sean FontAwesome
  ariaLabel?: string;
  // 'isCorrect' NO va aquí
}

export interface TipChallengeCard {
  question: string;
  options: MessageButton[]; // Las opciones del reto se renderizarán como MessageButton
}

export interface ChatMessage {
  id: number | string;
  sender: 'user' | 'bot';
  text?: string | null;
  htmlContent?: string | null;
  avatar: string;
  timestamp: number;
  buttons?: MessageButton[]; // Para botones de navegación principales del consejo
  buttonsDisabled?: boolean;
  challengeCard?: TipChallengeCard | null; // Contenedor para el reto del tip
}

// --- OTRAS INTERFACES Y TIPOS DE TU PROYECTO ---
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
  password: string;
  puntuacion_pre_test?: number | null;
  puntuacion_post_test?: number | null;
}

export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: UserInfo | null;
  authToken: string;
  onLogout: () => void;
  onSettingsSaved: () => void;
  onStartPostTest: () => void;
}

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
}

export interface NewsChallengeState {
  trueNewsOriginalId: string;
  leftNewsOriginalId: string;
  rightNewsOriginalId: string;
  selectionMessageId: string | number | null;
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

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GlossaryEntry {
  id?: number;
  term: string;
  definition: string;
  isDefault: boolean;
  userId?: number | string;
  fecha_creacion?: Date;
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

export interface NoticiaParaAnalisis {
  area_de_enfoque_sugerida: { area_de_enfoque_sugerida: any; }; // Considera tipar 'any' mejor
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
    area_de_enfoque_sugerida?: any; // Coincidir con NoticiaParaAnalisis
}

export interface ChatGuiaResponse {
    chat_sesion_noticia_id: number;
    respuesta_chatbot: string;
}

export interface ContinuarChatGuiaPayload {
    mensaje_usuario: string;
}

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

export interface PreguntaPostTestEleccion {
  id_pregunta: string;
  texto_pregunta: string;
  opciones: string[];
}

export interface NoticiaParaAnalisisPostTest {
  noticia_id_json: string;
  headline: string;
  text: string;
  source?: string | null;
}

export interface PostTestStartResponse {
  preguntas_eleccion: PreguntaPostTestEleccion[];
  noticias_para_analizar: NoticiaParaAnalisisPostTest[];
}

export interface RespuestaPreguntaEleccionItem {
  id_pregunta: string;
  respuesta_seleccionada: string;
}

export interface RespuestaAnalisisNoticiaItem {
  noticia_id_json: string;
  evaluacion_usuario: 'TRUE' | 'FALSE';
}

export interface PostTestSubmitPayload {
  respuestas_eleccion: RespuestaPreguntaEleccionItem[];
  respuestas_analisis_noticias: RespuestaAnalisisNoticiaItem[];
}

export interface PostTestSubmitResponse {
  message: string;
  puntuacion_final: number;
  aciertos: number;
  total_preguntas: number;
}

export interface PostTestFlowProps {
  authToken: string;
  onTestComplete: (score: number, aciertos: number, totalQuestions: number) => void;
  onCancelTest?: () => void;
}
