# models/models.py
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
import math # Necesario para cálculos si se usan (aunque no se usa directamente aquí)

# --- Modelos para Perfil/Usuario ---

class PerfilBase(BaseModel):
    apodo: str
    genero: str | None = None
    edad: int
    avatar_url: Optional[HttpUrl | str] = None
    curso_escolar: Optional[str] = None
    puntuacion_pre_test: Optional[float] = None
    puntuacion_post_test: Optional[float] = None # Añadido para que UsuarioInDB y UsuarioPublic lo hereden
    precision_global_sesion: Optional[float] = None # <--- AÑADIDO AQUÍ

class UsuarioCreate(PerfilBase): # Hereda curso_escolar y puntuacion_pre_test (opcional)
    password: str
    consentimiento_obtenido: bool
    curso_escolar: str # Lo hacemos requerido aquí, sobrescribiendo el opcional de PerfilBase
    # puntuacion_pre_test ya es opcional desde PerfilBase, se enviará desde el frontend

class UsuarioUpdateProfile(BaseModel):
    apodo: Optional[str] = Field(None, min_length=1, max_length=50)
    avatar_url: Optional[HttpUrl | str | None] = Field(None)

class UsuarioInDB(PerfilBase): # Hereda puntuacion_pre_test, puntuacion_post_test y precision_global_sesion de PerfilBase
    sesion_id: int
    hashed_password: str
    consentimiento_obtenido: bool
    interacciones_totales_sesion: Optional[int] = 0
    aciertos_totales_sesion: Optional[int] = 0
    fallos_totales_sesion: Optional[int] = 0
    # precision_global_sesion ya se hereda de PerfilBase
    xp_actual: Optional[int] = 0
    # Nuevos campos que se poblarán en la tabla sesiones
    duracion_total_sesion_seg: Optional[int] = None
    puntuacion_final: Optional[float] = None # Se poblará como copia de puntuacion_post_test
    tasa_falsos_negativos_global: Optional[float] = None
    tasa_falsos_positivos_global: Optional[float] = None


class UsuarioPublic(PerfilBase): # Hereda puntuacion_pre_test, puntuacion_post_test y precision_global_sesion de PerfilBase
    sesion_id: int
    avatar_url: Optional[str] = None
    # curso_escolar, puntuacion_pre_test, puntuacion_post_test, precision_global_sesion se heredan de PerfilBase

class UserDetailedStatsResponse(BaseModel):
    totalAnalizadas: int
    aciertos: int
    fallos: int
    xp: int
    xpNextLevel: int
    # Podrías añadir aquí más campos si quieres que este endpoint los devuelva,
    # ej. precision_global_sesion, tasa_falsos_negativos, etc.
    # Por ahora, se mantienen como están y la precisión se expone en UsuarioPublic.

class UsuarioLogin(BaseModel):
    apodo: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    apodo: str | None = None
    sesion_id: int | None = None

class OllamaMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[OllamaMessage]
    model: str = 'gemma3:4b'

class ChatResponse(BaseModel):
    reply: str

class GlossaryTermBase(BaseModel):
    termino: str = Field(..., min_length=1, max_length=100, description="La palabra o término del glosario")
    definicion: str = Field(..., min_length=1, description="La definición del término")

class GlossaryTermCreate(GlossaryTermBase):
    pass

class GlossaryTermPublic(GlossaryTermBase):
    id: int
    usuario_sesion_id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True

class InteraccionBase(BaseModel):
    noticia_id_json: str
    noticia_fuente_json: Optional[str] = None
    noticia_verdad_real_json: str
    noticia_tema_json: Optional[str] = None
    noticia_dificultad_json: Optional[str] = None
    noticia_tipos_razonamiento_json: Optional[List[str]] = None
    respuesta_usuario: Optional[str] = None
    es_correcto: Optional[bool] = None
    tiempo_respuesta_ms: Optional[int] = None
    tipo_error: Optional[str] = None
    feedback_mostrado: Optional[str] = None # Se poblará
    criterios_evaluacion_ids: Optional[Dict[str, Any]] = None # Se mantiene opcional, por ahora no se poblará con nueva lógica
    key_elements_json: Optional[List[str]] = None # Se poblará si se añaden a la tabla interacciones
    justification_hints_json: Optional[List[str]] = None # Se poblará si se añaden a la tabla interacciones
    likely_misconceptions_json: Optional[List[str]] = None # Se poblará si se añaden a la tabla interacciones
    indicadores_clave_detectados_noticia_json: Optional[List[str]] = None # Se poblará si se añaden a la tabla interacciones
    indicadores_seleccionados_o_discutidos_usuario: Optional[List[str]] = None
    tipo_interaccion: str

class InteraccionCreate(InteraccionBase):
    sesion_id: int

class InteraccionInDB(InteraccionCreate):
    interaccion_id: int
    interaccion_ts: datetime
    secuencia_interaccion: int
    puntos_otorgados: Optional[int] = 0

class InteraccionPublic(InteraccionInDB):
    pass

class NoticiaParaAnalisis(BaseModel): # Para análisis guiado normal
    noticia_id_json: str
    headline: str
    text: str
    source: Optional[str] = None
    difficulty_level: Optional[str] = None
    area_de_enfoque_sugerida: Optional[str] = None

class ExplicacionInicialRequest(BaseModel):
    noticia_id_json: str
    explicacion_usuario: str = Field(..., min_length=1)
    evaluacion_inicial_opcional: Optional[str] = Field(None, pattern="^(TRUE|FALSE|UNSURE)$")
    area_de_enfoque_sugerida: Optional[str] = None

class ChatGuiaResponse(BaseModel):
    chat_sesion_noticia_id: int
    respuesta_chatbot: str

class ContinuarChatGuiaRequest(BaseModel):
    mensaje_usuario: str = Field(..., min_length=1)
    area_de_enfoque_sugerida: Optional[str] = None

class MejoraComprensionSubModel(BaseModel):
    evaluacion: str # SI, NO, INCIERTO
    justificacion: str

class PostChatAnalysisPayload(BaseModel): # Este modelo ya existe y está bien para el nuevo endpoint
    indicadores_discutidos: List[str]
    conceptos_abordados: List[str] # Corresponde a conceptos_clave_discutidos
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
    indicadores_discutidos: Optional[List[str]] = None # Se poblarán con el nuevo endpoint
    conceptos_clave_discutidos: Optional[List[str]] = None # Se poblarán con el nuevo endpoint
    mejora_comprension_evaluacion: Optional[str] = None # Se poblarán con el nuevo endpoint
    mejora_comprension_justificacion: Optional[str] = None # Se poblarán con el nuevo endpoint
    class Config:
        from_attributes = True

class MensajeChatGuiaPublic(BaseModel):
    mensaje_guia_id: int
    chat_sesion_noticia_id: int
    emisor: str
    contenido: str
    timestamp_mensaje: datetime
    orden_en_chat: int
    class Config:
        from_attributes = True

class FinishPairChallengeRequest(BaseModel):
    noticia_verdadera_id_json: str
    noticia_falsa_id_json: str
    seleccion_usuario_id_json: str
    tiempo_respuesta_ms: Optional[int] = None

class FinishPairChallengeResponse(BaseModel):
    message: str
    es_correcto: bool
    explanation: Optional[str] = None # Este es el feedback que se guardará en interacciones.feedback_mostrado


# --- Modelos para el Post-Test ---

class PreguntaPostTestEleccion(BaseModel):
    id_pregunta: str
    texto_pregunta: str
    opciones: List[str]

class NoticiaParaPostTest(BaseModel):
    noticia_id_json: str
    headline: str
    text: str
    source: Optional[str] = None

class PostTestStartResponse(BaseModel):
    preguntas_eleccion: List[PreguntaPostTestEleccion]
    noticias_para_analizar: List[NoticiaParaPostTest]

class RespuestaPreguntaEleccionItem(BaseModel):
    id_pregunta: str
    respuesta_seleccionada: str

class RespuestaAnalisisNoticiaItem(BaseModel):
    noticia_id_json: str
    evaluacion_usuario: str # 'TRUE' o 'FALSE'

class PostTestSubmitPayload(BaseModel):
    respuestas_eleccion: List[RespuestaPreguntaEleccionItem]
    respuestas_analisis_noticias: List[RespuestaAnalisisNoticiaItem]

class PostTestSubmitResponse(BaseModel): # Ya lo tienes y está bien
    message: str
    puntuacion_final: float # Este es puntuacion_post_test
    aciertos: int
    total_preguntas: int
    # Podrías añadir aquí las nuevas tasas si quieres devolverlas inmediatamente
    # tasa_falsos_negativos: Optional[float] = None
    # tasa_falsos_positivos: Optional[float] = None
    # duracion_sesion_seg: Optional[int] = None
