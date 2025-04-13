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
  text?: string;
  htmlContent?: string;
  avatar: string;
  timestamp: number;
  buttons?: MessageButton[];
  buttonsDisabled?: boolean;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'; // The role of the message sender
  content: string;                       // The text content of the message
}
