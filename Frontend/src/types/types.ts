// src/types/types.ts
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface UserInfo {
  sesion_id: number;
  apodo: string;
  genero?: string | null;
  edad?: number;
  avatar_url?: string | null;
}

export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: UserInfo | null;
  authToken: string;
  onLogout: () => void;
  onSettingsSaved: () => void;
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

export interface MessageButton {
  id: string;
  text?: string;
  icon?: IconDefinition;
  ariaLabel?: string;
}

export interface ChatMessage {
  id: number | string;
  sender: 'user' | 'bot' | 'system'; // 'system' añadido
  text?: string | null;
  htmlContent?: string | null;
  avatar?: string; // Hecho opcional
  timestamp: number | Date; // Permitir Date
  buttons?: MessageButton[];
  buttonsDisabled?: boolean;
}

export interface MessageListProps {
  messages: ChatMessage[];
  onButtonClick?: (messageId: number | string, buttonId: string) => void; // Hecho opcional
}

export interface ChatInputProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean; // Añadido como opcional
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

// --- Tipos para el Flujo de Análisis Guiado ---
export interface NoticiaParaAnalisis {
  noticia_id_json: string;
  headline: string;
  text: string;
  source?: string | null;
  difficulty_level?: string | null;
}

export interface ChatGuiaResponse {
  chat_sesion_noticia_id: number;
  respuesta_chatbot: string;
}

// --- Tipos para perfiles y autenticación ---
export interface UserProfile extends UserInfo {
  consentimiento_obtenido?: boolean;
  curso_escolar?: string | null;
  interacciones_totales_sesion?: number;
  precision_global_sesion?: number | null;
  tasa_falsos_negativos_global?: number | null;
  tasa_falsos_positivos_global?: number | null;
  puntuacion_pre_test?: number | null;
  puntuacion_post_test?: number | null;
  puntuacion_final?: number | null;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface TokenData {
  apodo?: string | null;
  sesion_id?: number | null;
}

export interface UserUpdateProfilePayload {
  apodo?: string;
  avatar_url?: string | null;
}

export interface UserStatsResponse {
  total_analizadas: number;
  precision_global: number | null;
}
