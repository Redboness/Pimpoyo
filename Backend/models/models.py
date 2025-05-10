# models/models.py
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any # Asegúrate que Any esté importado

# --- Modelos para Perfil/Usuario ---

class PerfilBase(BaseModel):
    apodo: str
    genero: str | None = None
    edad: int
    avatar_url: Optional[HttpUrl | str] = None

class UsuarioCreate(PerfilBase):
    password: str = Field(..., min_length=8)
    consentimiento_obtenido: bool

class UsuarioUpdateProfile(BaseModel):
    apodo: Optional[str] = Field(None, min_length=1, max_length=50)
    avatar_url: Optional[HttpUrl | str | None] = Field(None)

class UsuarioInDB(PerfilBase):
    sesion_id: int # Debería ser int si mapea a BIGSERIAL, Pydantic maneja la conversión
    hashed_password: str
    consentimiento_obtenido: bool
    # Campos de estadísticas que ya tienes en tu modelo UsuarioInDB (si los tienes)
    interacciones_totales_sesion: Optional[int] = 0
    precision_global_sesion: Optional[float] = None
    # Añade otros campos si existen en tu tabla sesiones y los necesitas en UsuarioInDB

class UsuarioPublic(PerfilBase):
    sesion_id: int
    avatar_url: Optional[str] = None # Asegurando que sea string o None para la salida

# --- Modelos para Autenticación (Login/Token) ---
class UsuarioLogin(BaseModel):
    apodo: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    apodo: str | None = None
    sesion_id: int | None = None

# --- Modelos para Chat (Existentes) ---
class OllamaMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[OllamaMessage]
    model: str = 'llama3.1b' # Modelo por defecto, puede ser sobrescrito

class ChatResponse(BaseModel):
    reply: str

# --- Modelos para el Glosario (Existentes) ---
class GlossaryTermBase(BaseModel):
    termino: str = Field(..., min_length=1, max_length=100, description="La palabra o término del glosario")
    definicion: str = Field(..., min_length=1, description="La definición del término")

class GlossaryTermCreate(GlossaryTermBase):
    pass

class GlossaryTermPublic(GlossaryTermBase):
    id: int
    usuario_sesion_id: int # O el tipo correcto si sesion_id es BigInt
    fecha_creacion: datetime

    class Config:
        from_attributes = True

# --- Modelo para Estadísticas (Existente) ---
class UserStatsResponse(BaseModel):
    total_analizadas: int = 0
    precision_global: Optional[float] = None

# --- (NUEVO) Modelos para el Flujo de Análisis Guiado ---

class NoticiaParaAnalisis(BaseModel):
    noticia_id_json: str
    headline: str
    text: str
    source: Optional[str] = None
    difficulty_level: Optional[str] = None
    # Añade otros campos de la noticia que quieras enviar al frontend

class ExplicacionInicialRequest(BaseModel):
    noticia_id_json: str
    explicacion_usuario: str = Field(..., min_length=1)
    evaluacion_inicial_opcional: Optional[str] = Field(None, pattern="^(TRUE|FALSE|UNSURE)$")

class ChatGuiaResponse(BaseModel):
    chat_sesion_noticia_id: int
    respuesta_chatbot: str
    # orden_respuesta_chatbot: int # Opcional, si el frontend lo necesita explícitamente

class ContinuarChatGuiaRequest(BaseModel):
    mensaje_usuario: str = Field(..., min_length=1)

class MejoraComprensionSubModel(BaseModel):
    evaluacion: str # SI, NO, INCIERTO
    justificacion: str

class PostChatAnalysisPayload(BaseModel):
    indicadores_discutidos: List[str]
    conceptos_abordados: List[str]
    mejora_comprension: MejoraComprensionSubModel

class ChatSesionNoticiaPublic(BaseModel):
    chat_sesion_noticia_id: int
    sesion_id: int
    noticia_id_json: str
    fecha_inicio: datetime
    evaluacion_inicial_usuario: Optional[str] = None
    explicacion_inicial_usuario: str
    noticia_verdad_real_json: Optional[str] = None
    evaluacion_inicial_correcta: Optional[bool] = None
    fecha_fin: Optional[datetime] = None
    indicadores_discutidos: Optional[List[str]] = None
    conceptos_clave_discutidos: Optional[List[str]] = None
    mejora_comprension_evaluacion: Optional[str] = None
    mejora_comprension_justificacion: Optional[str] = None

    class Config:
        from_attributes = True

class MensajeChatGuiaPublic(BaseModel):
    mensaje_guia_id: int
    chat_sesion_noticia_id: int
    emisor: str
    contenido: str
    timestamp_mensaje: datetime
    orden_en_chat: int # El valor SERIAL de la BD

    class Config:
        from_attributes = True
