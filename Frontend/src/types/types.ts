import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface UserInfo {
  sesion_id: number;
  apodo: string;
  genero?: string | null;
  edad?: number;
  avatar_url?: string | null;
}

// Interface for the props that receives SidePanel
export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: UserInfo | null;
  authToken: string;
  onLogout: () => void;
  onSettingsSaved: () => void;
}

export type DifficultyLevel = 'bajo' | 'medio' | 'medio-alto' | 'alto';
export const difficultyOrder: DifficultyLevel[] = ['bajo', 'medio', 'medio-alto', 'alto'];

// Update NewsItem interface
export interface NewsItem {
  ID: string;
  CATEGORY: 'TRUE' | 'FALSE';
  TOPICS: string;
  SOURCE: string;
  HEADLINE: string;
  TEXT: string;
  LINK: string;
  DIFFICULTY_LEVEL: DifficultyLevel; // <-- Make sure this matches JSON
  REASONING_TYPE?: string;         // Optional
  KEY_ELEMENTS?: string[];         // Optional
  JUSTIFICATION_HINTS?: string[];  // Optional
  LIKELY_MISCONCEPTIONS?: string[];// Optional
}

// Update NewsChallengeState interface
export interface NewsChallengeState {
  trueNewsOriginalId: string;
  leftNewsOriginalId: string;
  rightNewsOriginalId: string;
  selectionMessageId: string | number | null;
  // No need to store difficulty here, use component state
}

export interface MessageListProps {
  messages: ChatMessage[];
  onButtonClick: (messageId: number | string, buttonId: string) => void;
}

export interface ChatInputProps {
  onSendMessage: (text: string) => void;
}

export interface MessageButton {
  id: string;
  text?: string; // Make text optional if icon is present
  icon?: IconDefinition; // Optional icon
  ariaLabel?: string; // For accessibility
}

export interface ChatMessage {
  id: number | string;
  sender: 'user' | 'bot';
  text?: string | null;
  htmlContent?: string | null;
  avatar: string;
  timestamp: number;
  buttons?: MessageButton[];
  buttonsDisabled?: boolean;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'; // The role of the message sender
  content: string;                       // The text content of the message
}

// Estructura para el glosario
export interface GlossaryEntry {
  id?: number;
  term: string;
  definition: string;
  isDefault: boolean;
  userId?: number | string;
  fecha_creacion?: Date;
}

export interface GlossaryTermPublic {
  id: number;                 // Equivalente a int
  usuario_sesion_id: number;  // Equivalente a int (o number si era BigInt)
  termino: string;            // Equivalente a str
  definicion: string;         // Equivalente a str
  fecha_creacion: string;     // Equivalente a datetime (JSON lo suele pasar como string ISO 8601)
}

/**
 * Representa la estructura de datos que se envía a la API
 * para crear un nuevo término del glosario.
 * Coincide con el modelo Pydantic GlossaryTermCreate.
 */
export interface GlossaryTermCreate {
    termino: string;
    definicion: string;
}