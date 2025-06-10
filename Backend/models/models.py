# models/models.py
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

# --- Modelos para Perfil/Usuario ---

class PerfilBase(BaseModel):
    apodo: str
    genero: str | None = None
    edad: int
    avatar_url: Optional[str] = None
    curso_escolar: Optional[str] = None
    puntuacion_pre_test_total: Optional[float] = None
    puntuacion_post_test_total: Optional[float] = None
    precision_global_sesion: Optional[float] = None

class UsuarioCreate(PerfilBase):
    password: str
    consentimiento_obtenido: bool
    curso_escolar: str
    respuestas_pre_test: Optional[Dict[str, Any]] = None
    pre_test_s1_perfil_puntos: Optional[float] = None
    pre_test_s2_estrategias_puntos: Optional[float] = None
    pre_test_s3_practica_puntos: Optional[float] = None

class UsuarioUpdateProfile(BaseModel):
    apodo: Optional[str] = Field(None, min_length=1, max_length=50)
    avatar_url: Optional[str | None] = Field(None)

class UsuarioInDB(PerfilBase):
    sesion_id: int
    hashed_password: str
    consentimiento_obtenido: bool
    interacciones_totales_sesion: Optional[int] = 0
    aciertos_totales_sesion: Optional[int] = 0
    fallos_totales_sesion: Optional[int] = 0
    xp_actual: Optional[int] = 0
    duracion_total_sesion_seg: Optional[int] = None
    puntuacion_final: Optional[float] = None
    tasa_falsos_negativos_global: Optional[float] = None
    tasa_falsos_positivos_global: Optional[float] = None

class UsuarioPublic(PerfilBase):
    sesion_id: int

# --- Modelos de Estadísticas ---
class UserDetailedStatsResponse(BaseModel):
    totalAnalizadas: int
    aciertos: int
    fallos: int
    xp: int
    xpNextLevel: int

# --- Modelos de Autenticación y Chat Básico ---
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
    model: str = 'gemma:2b' # Modelo actualizado

class ChatResponse(BaseModel):
    reply: str

# --- Modelos para el Glosario ---
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

# --- Modelos para Interacciones y Análisis Guiado ---
# (Estos son los modelos que recuperamos)

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
    feedback_mostrado: Optional[str] = None
    criterios_evaluacion_ids: Optional[Dict[str, Any]] = None
    key_elements_json: Optional[List[str]] = None
    justification_hints_json: Optional[List[str]] = None
    likely_misconceptions_json: Optional[List[str]] = None
    indicadores_clave_detectados_noticia_json: Optional[List[str]] = None
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

class NoticiaParaAnalisis(BaseModel):
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
    evaluacion: str
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
    explanation: Optional[str] = None

# --- (NUEVO Y AÑADIDO) Modelos para el Post-Test ---

# Estructura de las preguntas que se envían al frontend
class PostTestOption(BaseModel):
    id: str
    text: str

class PostTestQuestion(BaseModel):
    id_pregunta: str
    texto_pregunta: str
    tipo: str
    opciones: Optional[List[PostTestOption]] = None
    seccion_id: str

class NoticiaParaAnalisisPostTest(BaseModel):
    noticia_id_json: str
    headline: str
    text: str
    source: Optional[str] = None

class PostTestStartResponse(BaseModel):
    preguntas: List[PostTestQuestion]
    noticias_para_analizar: List[NoticiaParaAnalisisPostTest]


# Estructura de las respuestas que se reciben del frontend
class RespuestaPreguntaEleccionItem(BaseModel):
    id_pregunta: str
    respuestas_seleccionadas: List[str]

class RespuestaPreguntaTextoItem(BaseModel):
    id_pregunta: str
    texto_respuesta: str

class RespuestaAnalisisNoticiaItem(BaseModel):
    noticia_id_json: str
    evaluacion_usuario: str # 'Verdadero' o 'Falso'
    justificacion: str

class PostTestSubmitPayload(BaseModel):
    respuestas_eleccion: List[RespuestaPreguntaEleccionItem]
    respuestas_texto: List[RespuestaPreguntaTextoItem]
    respuestas_analisis: List[RespuestaAnalisisNoticiaItem]


# Estructura de la respuesta del backend tras corregir
class PuntuacionSeccion(BaseModel):
    seccion_id: str
    puntos_obtenidos: float
    puntos_maximos: float

class PostTestSubmitResponse(BaseModel):
    message: str
    puntuacion_total: float
    puntuacion_maxima_posible: float
    puntuaciones_por_seccion: List[PuntuacionSeccion]
