# models/models.py
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl # Asegúrate de que HttpUrl esté importado si lo usas en PerfilBase
from typing import Optional, List, Dict, Any # Dict y Any son útiles para respuestas_pre_test
# import math # No parece usarse directamente aquí, puedes quitarlo si no es necesario en otro lugar del archivo

# --- Modelos para Perfil/Usuario ---

class PerfilBase(BaseModel):
    apodo: str
    genero: str | None = None
    edad: int
    # Si avatar_url puede ser string o HttpUrl, mantenlo. Si solo va a ser string, simplifica.
    avatar_url: Optional[str] = None # Simplificado a str opcional, ajusta si necesitas HttpUrl
    curso_escolar: Optional[str] = None
    puntuacion_pre_test: Optional[float] = None
    puntuacion_post_test: Optional[float] = None
    precision_global_sesion: Optional[float] = None

class UsuarioCreate(PerfilBase):
    password: str
    consentimiento_obtenido: bool
    curso_escolar: str
    # puntuacion_pre_test ya es opcional desde PerfilBase
    respuestas_pre_test: Optional[Dict[str, Any]] = None # <--- CAMBIO PRINCIPAL AQUÍ: Añadir este campo

class UsuarioUpdateProfile(BaseModel):
    apodo: Optional[str] = Field(None, min_length=1, max_length=50)
    avatar_url: Optional[str | None] = Field(None) # Simplificado a str opcional

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
    # El campo para respuestas_pre_test_json se manejará a nivel de tabla, no necesariamente aquí
    # a menos que quieras leerlo y exponerlo a través de este modelo, lo cual no es común para UsuarioInDB.

class UsuarioPublic(PerfilBase):
    sesion_id: int
    # avatar_url ya heredado y simplificado

# ... (el resto de tus modelos permanecen sin cambios) ...
class UserDetailedStatsResponse(BaseModel):
    totalAnalizadas: int
    aciertos: int
    fallos: int
    xp: int
    xpNextLevel: int

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

class PostTestSubmitResponse(BaseModel):
    message: str
    puntuacion_final: float
    aciertos: int
    total_preguntas: int