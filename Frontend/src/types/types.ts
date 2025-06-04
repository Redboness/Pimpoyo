// src/types/types.ts
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';


// --- NUEVA INTERFAZ PARA ESTADÍSTICAS DETALLADAS ---
export interface UserDetailedStats {
  totalAnalizadas: number;
  aciertos: number;
  fallos: number;
  xp: number;
  xpNextLevel: number;
}
// --- FIN NUEVA INTERFAZ ---

export interface UserInfo {
  sesion_id: number;
  apodo: string;
  genero?: string | null;
  edad?: number;
  avatar_url?: string | null;
  curso_escolar: string
  password: string;
  puntuacion_pre_test?: number | null; // Lo añadimos antes
  puntuacion_post_test?: number | null; // Para el resultado del post-test
}

// Interface for the props that receives SidePanel
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

// Update NewsItem interface
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

// Update NewsChallengeState interface
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

// Estructura para el glosario
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

/**
 * Representa la estructura de datos que se envía a la API
 * para crear un nuevo término del glosario.
 * Coincide con el modelo Pydantic GlossaryTermCreate.
 */
export interface GlossaryTermCreate {
    termino: string;
    definicion: string;
}

export interface NoticiaParaAnalisis {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  area_de_enfoque_sugerida: { area_de_enfoque_sugerida: any; };
  noticia_id_json: string;
  headline: string;
  text: string;
  source?: string | null;
  difficulty_level?: string | null;
  // INICIO DE LA MODIFICACIÓN NECESARIA
  initialUserEvaluation?: 'TRUE' | 'FALSE' | 'UNSURE' | null; // Para recordar la evaluación V/F del usuario
  // FIN DE LA MODIFICACIÓN NECESARIA
}

// Para el request de /explain
export interface ExplicacionInicialPayload {
    noticia_id_json: string;
    explicacion_usuario: string;
    evaluacion_inicial_opcional?: 'TRUE' | 'FALSE' | 'UNSURE' | null;
}

// Para la respuesta de /explain y /continue
export interface ChatGuiaResponse {
    chat_sesion_noticia_id: number;
    respuesta_chatbot: string;
}

// Para el request de /continue
export interface ContinuarChatGuiaPayload {
    mensaje_usuario: string;
}

// Para el request de /challenge/finish-pair-selection
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

// src/types/types.ts
// ... (otros tipos que ya tienes) ...
export interface PreguntaPostTestEleccion {
  id_pregunta: string;
  texto_pregunta: string;
  opciones: string[];
  // No se incluye la respuesta correcta aquí, ya que es para el frontend durante el test
}

// Para cada noticia que se muestra en la fase de análisis del post-test
export interface NoticiaParaAnalisisPostTest {
  noticia_id_json: string;
  headline: string;
  text: string;
  source?: string | null;
  // No se incluye CATEGORY para no revelar la respuesta durante el test
}

// Estructura de la respuesta del backend cuando se inicia el post-test
export interface PostTestStartResponse {
  preguntas_eleccion: PreguntaPostTestEleccion[];
  noticias_para_analizar: NoticiaParaAnalisisPostTest[];
}

// Para enviar la respuesta a una pregunta de elección múltiple
export interface RespuestaPreguntaEleccionItem {
  id_pregunta: string;
  respuesta_seleccionada: string;
}

// Para enviar la evaluación de una noticia en el post-test
export interface RespuestaAnalisisNoticiaItem {
  noticia_id_json: string;
  evaluacion_usuario: 'TRUE' | 'FALSE'; // El usuario indica si cree que es Verdadera o Falsa
}

// Payload que el frontend envía al backend al finalizar el post-test
export interface PostTestSubmitPayload {
  respuestas_eleccion: RespuestaPreguntaEleccionItem[];
  respuestas_analisis_noticias: RespuestaAnalisisNoticiaItem[];
}

// Estructura de la respuesta del backend después de enviar el post-test
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

export interface TipChallengeCard {
  question: string;
  options: MessageButton[];
}
export interface FakeNewsAnalysisPayload {
    original_news: string;
    analysis: string;
    score: number;
    explanation: string;
}
