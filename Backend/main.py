# main.py
import os
from fastapi.concurrency import asynccontextmanager
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone as dt_timezone
from jose import jwt, JWTError
from databases import Database
import sqlalchemy
from sqlalchemy import func as sqlfunc, BigInteger, Integer, Float, ARRAY, select, update, insert, and_, cast, text, Column, ForeignKey, Text # <--- Asegúrate de tener Column, ForeignKey, Text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from fastapi.middleware.cors import CORSMiddleware
import json as py_json
from typing import Optional, List, Any, Dict # <--- Asegúrate de tener Dict, Any
import ollama
import random
# import math # No se usa directamente en este archivo

# Importa tus modelos Pydantic actualizados
from models.models import (
    UsuarioCreate, # Esta ya tiene respuestas_pre_test
    UsuarioInDB,
    UsuarioLogin,
    UsuarioPublic,
    Token,
    TokenData,
    UsuarioUpdateProfile,
    ChatRequest,
    ChatResponse,
    GlossaryTermCreate,
    GlossaryTermPublic,
    OllamaMessage,
    NoticiaParaAnalisis,
    ExplicacionInicialRequest,
    ChatGuiaResponse,
    ContinuarChatGuiaRequest,
    PostChatAnalysisPayload,
    MejoraComprensionSubModel,
    ChatSesionNoticiaPublic,
    MensajeChatGuiaPublic,
    FinishPairChallengeRequest,
    FinishPairChallengeResponse,
    UserDetailedStatsResponse,
    PreguntaPostTestEleccion,
    NoticiaParaPostTest,
    PostTestStartResponse,
    RespuestaPreguntaEleccionItem,
    RespuestaAnalisisNoticiaItem,
    PostTestSubmitPayload,
    PostTestSubmitResponse
)

load_dotenv()

# --- Constants and Configuration (sin cambios) ---
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "un_secreto_muy_fuerte_y_largo_aqui")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
OLLAMA_MODEL_ANALYSIS = os.getenv("OLLAMA_MODEL_ANALYSIS", "gemma3:4b")
NEWS_DATASET_PATH = os.path.join(os.path.dirname(__file__), "datasets", "analyzed_test_with_stats.json")

XP_POR_ACIERTO = 10
XP_POR_FALLO = 2
XP_NIVELES = [50, 150, 300]

if DATABASE_URL is None:
    print("CRITICAL ERROR: DATABASE_URL variable is not defined.")
    exit(1)
if SECRET_KEY == "un_secreto_muy_fuerte_y_largo_aqui":
    print("WARNING: SECRET_KEY is not defined in .env, using potentially insecure default value.")

ALL_NEWS_DATA = []
try:
    with open(NEWS_DATASET_PATH, 'r', encoding='utf-8') as f:
        ALL_NEWS_DATA = py_json.load(f)
    print(f"INFO: Cargadas {len(ALL_NEWS_DATA)} noticias del dataset '{NEWS_DATASET_PATH}'.")
except FileNotFoundError:
    print(f"ADVERTENCIA: El archivo de dataset de noticias '{NEWS_DATASET_PATH}' no fue encontrado.")
except py_json.JSONDecodeError:
    print(f"ADVERTENCIA: El archivo de dataset de noticias '{NEWS_DATASET_PATH}' no es un JSON válido.")

LISTA_INDICADORES_DESINFORMACION = [
    "Fuente Fiable/Reconocida", "Fuente Desconocida/Dudosa", "Fuente Anónima/Sin Autor",
    "Titular Sensacionalista/Clickbait", "Titular Coherente con el Contenido",
    "Tono Emocional/Sesgado", "Tono Neutro/Objetivo", "Lenguaje Cuidado/Profesional",
    "Errores Gramaticales/Ortográficos", "URL/Dominio Sospechoso", "Diseño Web Poco Profesional",
    "Publicidad Excesiva/Engañosa", "Pruebas (fuentes, datos, enlaces)", "Falta de Pruebas (sin fuentes, datos vagos)",
    "Consistencia Interna/Lógica", "Inconsistencia/Falta de Lógica", "Coincide con mi conocimiento previo",
    "Contradice mi conocimiento previo", "Fecha Clara y Reciente", "Sin Fecha/Noticia Antigua",
    "Llamada a Compartir Urgente/Viral", "Confirmado por Otras Fuentes", "Desmentido por Otras Fuentes",
    "Selectividad en Datos/Fuentes (Cherry-picking)", "Fuentes No Verificables", "Autor Desconocido/No Fiable"
]
LISTA_TIPOS_RAZONAMIENTO = [
    "Evaluación de fuentes", "Identificación de sesgos", "Análisis de datos/evidencia",
    "Verificación de hechos (Fact-checking)", "Detección de manipulación emocional",
    "Análisis de la lógica argumental", "Comparación con conocimiento previo",
    "Evaluación del contexto de la noticia", "Identificación de la intención del autor",
    "Diferenciación entre opinión y hecho"
]

PREGUNTAS_POST_TEST_ELECCION = [
    {
        "id_pregunta": "pte1",
        "texto_pregunta": "¿Cuál de estos es un buen indicador de que una fuente de noticias es fiable?",
        "opciones": ["Tiene muchos anuncios llamativos", "Está escrita por expertos reconocidos y cita sus fuentes", "Usa solo mayúsculas para llamar la atención"],
        "respuesta_correcta": "Está escrita por expertos reconocidos y cita sus fuentes"
    },
    {
        "id_pregunta": "pte2",
        "texto_pregunta": "Si una noticia busca hacerte sentir muy enojado rápidamente, ¿qué podría ser?",
        "opciones": ["Un intento de manipulación emocional", "Una noticia siempre objetiva", "Un error sin importancia"],
        "respuesta_correcta": "Un intento de manipulación emocional"
    },
    {
        "id_pregunta": "pte3",
        "texto_pregunta": "Un titular 'clickbait' normalmente...",
        "opciones": ["Es muy aburrido y largo", "Busca que hagas clic usando exageraciones", "Siempre dice la verdad exacta"],
        "respuesta_correcta": "Busca que hagas clic usando exageraciones"
    },
    {
        "id_pregunta": "pte4",
        "texto_pregunta": "¿Qué significa 'verificar' una noticia?",
        "opciones": ["Leerla muy rápido", "Compartirla con todos tus amigos", "Comprobar si es verdadera buscando pruebas"],
        "respuesta_correcta": "Comprobar si es verdadera buscando pruebas"
    },
    {
        "id_pregunta": "pte5",
        "texto_pregunta": "Si ves una noticia con muchos errores de ortografía, ¿qué deberías pensar?",
        "opciones": ["Que el escritor tenía prisa pero la noticia es fiable", "Que podría ser una señal de que la noticia no es muy profesional o es falsa", "Que los errores no importan si la historia es interesante"],
        "respuesta_correcta": "Que podría ser una señal de que la noticia no es muy profesional o es falsa"
    },
]


database = Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

# --- Definición de la Tabla sesiones (SIN la columna respuestas_pre_test_json) ---
sesiones_table = sqlalchemy.Table(
    "sesiones", metadata,
    Column("sesion_id", BigInteger, primary_key=True),
    Column("apodo", sqlalchemy.String(length=50), nullable=False, unique=True, index=True),
    Column("hashed_password", sqlalchemy.String(length=255), nullable=False),
    Column("inicio_sesion_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    Column("edad", Integer, nullable=False),
    Column("genero", sqlalchemy.String(length=50), nullable=True),
    Column("avatar_url", sqlalchemy.String(length=512), nullable=True),
    Column("curso_escolar", sqlalchemy.String(length=100), nullable=True),
    Column("consentimiento_obtenido", sqlalchemy.Boolean, nullable=False),
    # La columna respuestas_pre_test_json se elimina de aquí
    Column("fin_sesion_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=True),
    Column("duracion_total_sesion_seg", Integer, nullable=True),
    Column("puntuacion_final", Float, nullable=True),
    Column("interacciones_totales_sesion", Integer, server_default='0', nullable=False),
    Column("aciertos_totales_sesion", Integer, server_default='0', nullable=False),
    Column("fallos_totales_sesion", Integer, server_default='0', nullable=False),
    Column("precision_global_sesion", Float, nullable=True),
    Column("xp_actual", Integer, server_default='0', nullable=False),
    Column("tasa_falsos_negativos_global", Float, nullable=True),
    Column("tasa_falsos_positivos_global", Float, nullable=True),
     # --- NUEVAS COLUMNAS AÑADIDAS: Respuestas PRE-TEST ---
    Column("pre_s1_p1_horas_internet", Text),
    Column("pre_s1_p2_plataformas", ARRAY(Text)),
    Column("pre_s1_p3_habilidad_tech", Text),
    Column("pre_s1_p4_charla_peligros", Text),
    Column("pre_s2_p5_habilidad_vf", Text),
    Column("pre_s2_p6_dificultad_vf", Text),
    Column("pre_s2_p7_estrategias_fijarse", ARRAY(Text)),
    Column("pre_s2_p8_fuentes_confianza", ARRAY(Text)),
    Column("pre_s2_p9_sospecha_falsa", ARRAY(Text)),
    Column("pre_s2_p10_probabilidad_verdad", ARRAY(Text)),
    Column("pre_s3_p11_vf_apagon", Text),
    Column("pre_s3_p11_expl_apagon", Text),

    # --- NUEVAS COLUMNAS AÑADIDAS: Respuestas POST-TEST ---
    Column("post_s1_p1_habilidad_vf_post", Text),
    Column("post_s1_p2_dificultad_vf_post", Text),
    Column("post_s1_p3_estrategias_post", ARRAY(Text)),
    Column("post_s1_p4_fuentes_post", ARRAY(Text)),
    Column("post_s1_p5_sospecha_falsa_post", ARRAY(Text)),
    Column("post_s1_p6_probabilidad_verdad_post", ARRAY(Text)),
    Column("post_s2_p7_aprendizaje_abierta", Text),
    Column("post_s2_p8_cambio_forma_ver_abierta", Text),
    Column("post_s2_p9_aprendizaje_escala", Text),
    Column("post_s3_p10_vf_sangre_artificial", Text),
    Column("post_s3_p11_vf_apagon_post", Text),
    Column("post_s3_p11_expl_apagon_post", Text),
    Column("post_s4_p12_facilidad_uso_escala", Text),
    Column("post_s4_p13_utilidad_pistas_escala", Text),
    Column("post_s4_p14_que_gusto_abierta", Text),
    Column("post_s4_p15_que_no_gusto_abierta", Text),
    Column("post_s4_p16_personaje_pimpoyo_escala", Text),
    Column("post_s4_p17_utilidad_futura_abierta", Text),
    Column("post_s4_p18_frecuencia_aplicacion_escala", Text),

    # --- NUEVAS COLUMNAS AÑADIDAS: Puntuaciones de los Tests ---
    Column("pre_test_s1_perfil_puntos", Float),
    Column("pre_test_s2_estrategias_puntos", Float),
    Column("pre_test_s3_practica_puntos", Float),
    Column("puntuacion_pre_test_total", Float),
    Column("post_test_s1_estrategias_puntos", Float),
    Column("post_test_s2_aprendizaje_puntos", Float),
    Column("post_test_s3_practica_puntos", Float),
    Column("post_test_s4_ux_puntos", Float),
    Column("puntuacion_post_test_total", Float)
)

# --- NUEVA Definición de la Tabla respuestas_pre_test ---
respuestas_pre_test_table = sqlalchemy.Table(
    "respuestas_pre_test", metadata,
    Column("respuesta_pre_test_id", BigInteger, primary_key=True, autoincrement=True),
    Column("sesion_id", BigInteger, ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False, index=True),
    Column("id_pregunta", sqlalchemy.String(15), nullable=False, index=True), # ej: q1, q5, q9_q, q9_a
    Column("tipo_pregunta", sqlalchemy.String(30), nullable=False), # ej: radio_informativa, checkbox_habilidad, radio_vf_practica, textarea_explicacion
    Column("respuesta_texto", Text, nullable=True),        # Para radio, textarea, o V/F
    Column("respuestas_array_texto", ARRAY(Text), nullable=True), # Para checkbox
    Column("fecha_respuesta", sqlalchemy.TIMESTAMP(timezone=True), server_default=sqlfunc.now(), nullable=False),
    sqlalchemy.UniqueConstraint('sesion_id', 'id_pregunta', name='uq_respuesta_pre_test_usuario_pregunta')
)

# --- NUEVA Definición de la Tabla respuestas_post_test (opcional, pero recomendada) ---
respuestas_post_test_table = sqlalchemy.Table(
    "respuestas_post_test", metadata,
    Column("respuesta_post_test_id", BigInteger, primary_key=True, autoincrement=True),
    Column("sesion_id", BigInteger, ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False, index=True),
    Column("id_pregunta_post_test", sqlalchemy.String(30), nullable=False, index=True),
    Column("tipo_pregunta_post_test", sqlalchemy.String(20), nullable=False), # ej: 'eleccion_multiple', 'analisis_vf'
    Column("respuesta_seleccionada", Text, nullable=False),
    Column("es_correcta", sqlalchemy.Boolean, nullable=True),
    Column("fecha_respuesta", sqlalchemy.TIMESTAMP(timezone=True), server_default=sqlfunc.now(), nullable=False),
    sqlalchemy.UniqueConstraint('sesion_id', 'id_pregunta_post_test', name='uq_respuesta_post_test_usuario_pregunta')
)

# ... (resto de tus definiciones de tablas: interacciones_table, eventos_uso_table, etc., permanecen igual)
interacciones_table = sqlalchemy.Table(
    "interacciones", metadata,
    Column("interaccion_id", BigInteger, primary_key=True),
    Column("sesion_id", BigInteger, ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False),
    Column("interaccion_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    Column("noticia_id", sqlalchemy.String(length=255), nullable=False),
    Column("noticia_fuente", sqlalchemy.String(length=255), nullable=True),
    Column("noticia_verdad_real", sqlalchemy.String(length=50), nullable=False),
    Column("noticia_tema", sqlalchemy.String(length=100), nullable=True),
    Column("noticia_dificultad", sqlalchemy.String(length=50), nullable=True),
    Column("noticia_tipos_razonamiento_json", ARRAY(Text), nullable=True),
    Column("respuesta_usuario", sqlalchemy.String(length=255), nullable=True),
    Column("es_correcto", sqlalchemy.Boolean, nullable=True),
    Column("tiempo_respuesta_ms", Integer, nullable=True),
    Column("puntos_otorgados", Integer, server_default='0', nullable=False),
    Column("tipo_error", sqlalchemy.String(length=100), nullable=True),
    Column("feedback_mostrado", Text, nullable=True),
    Column("secuencia_interaccion", Integer, nullable=False),
    Column("criterios_evaluacion_ids", sqlalchemy.JSON, nullable=True),
    Column("key_elements_json", ARRAY(Text), nullable=True),
    Column("justification_hints_json", ARRAY(Text), nullable=True),
    Column("likely_misconceptions_json", ARRAY(Text), nullable=True),
    Column("indicadores_clave_detectados_noticia_json", ARRAY(Text), nullable=True),
    Column("indicadores_seleccionados_usuario", ARRAY(Text), nullable=True),
    Column("tipo_interaccion", sqlalchemy.String(length=50), nullable=False),
    sqlalchemy.UniqueConstraint('sesion_id', 'secuencia_interaccion', name='uq_sesion_secuencia_interaccion')
)
eventos_uso_table = sqlalchemy.Table(
    "eventos_uso", metadata,
    Column("evento_id", BigInteger, primary_key=True),
    Column("sesion_id", BigInteger, ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False),
    Column("evento_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    Column("funcionalidad_usada", sqlalchemy.String(length=255), nullable=False),
    Column("contexto", Text, nullable=True)
)
glosario_usuario_table = sqlalchemy.Table(
    "glosario_usuario", metadata,
    Column("id", Integer, primary_key=True),
    Column("usuario_sesion_id", BigInteger, ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False, index=True),
    Column("termino", sqlalchemy.String(length=100), nullable=False),
    Column("definicion", Text, nullable=False),
    Column("fecha_creacion", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.UniqueConstraint('usuario_sesion_id', 'termino', name='uq_usuario_termino_glosario')
)
estadisticas_detalladas_usuario_table = sqlalchemy.Table(
    "estadisticasdetalladasusuario", metadata,
    Column("estadistica_detalle_id", BigInteger, primary_key=True),
    Column("sesion_id", BigInteger, ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False),
    Column("tipo_criterio", sqlalchemy.String(length=100), nullable=False),
    Column("valor_criterio", Text, nullable=False),
    Column("numero_intentos", Integer, server_default='0', nullable=False),
    Column("numero_aciertos", Integer, server_default='0', nullable=False),
    Column("tasa_acierto", Float, nullable=True),
    Column("fecha_ultima_actualizacion", sqlalchemy.TIMESTAMP(timezone=True), server_default=sqlfunc.now(), nullable=False),
    sqlalchemy.UniqueConstraint('sesion_id', 'tipo_criterio', 'valor_criterio', name='uq_stats_detalle_usuario_criterio')
)
chat_sesiones_noticia_table = sqlalchemy.Table(
    "chatsesionesnoticia", metadata,
    Column("chat_sesion_noticia_id", BigInteger, primary_key=True),
    Column("sesion_id", BigInteger, ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False),
    Column("noticia_id_json", sqlalchemy.String(length=255), nullable=False),
    Column("fecha_inicio", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    Column("evaluacion_inicial_usuario", sqlalchemy.String(length=50), nullable=True),
    Column("explicacion_inicial_usuario", Text, nullable=False),
    Column("noticia_verdad_real_json", sqlalchemy.String(length=50), nullable=True),
    Column("evaluacion_inicial_correcta", sqlalchemy.Boolean, nullable=True),
    Column("fecha_fin", sqlalchemy.TIMESTAMP(timezone=True), nullable=True),
    Column("indicadores_discutidos", ARRAY(Text), nullable=True),
    Column("conceptos_clave_discutidos", ARRAY(Text), nullable=True),
    Column("mejora_comprension_evaluacion", sqlalchemy.String(length=10), nullable=True),
    Column("mejora_comprension_justificacion", Text, nullable=True)
)
mensajes_chat_guia_table = sqlalchemy.Table(
    "mensajeschatguia", metadata,
    Column("mensaje_guia_id", BigInteger, primary_key=True),
    Column("chat_sesion_noticia_id", BigInteger, ForeignKey("chatsesionesnoticia.chat_sesion_noticia_id", ondelete="CASCADE"), nullable=False),
    Column("emisor", sqlalchemy.String(length=50), nullable=False),
    Column("contenido", Text, nullable=False),
    Column("timestamp_mensaje", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    Column("orden_en_chat", Integer, nullable=False)
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Comentario encima de la función verify_password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Comentario encima de la función get_password_hash
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# app se define después con el lifespan
# app = FastAPI(title="Pimpoyo API", version="1.0.0")

origins = ['*']
# app.add_middleware(...) se hace después de definir app

ollama_client: Optional[ollama.AsyncClient] = None
# La inicialización de ollama_client y la conexión a la BBDD se hacen en lifespan

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ollama_client
    try:
        await database.connect()
        print("INFO: Conectado a la base de datos PostgreSQL.")
    except Exception as e:
        print(f"ERROR CRÍTICO: No se pudo conectar a la base de datos: {e}")
        # Considera si la app debe fallar aquí si la BBDD no está disponible

    # Intenta instanciar y verificar Ollama client dentro del lifespan
    try:
        ollama_client_instance = ollama.AsyncClient()
        await ollama_client_instance.list() # Intenta una operación simple para verificar conexión
        ollama_client = ollama_client_instance # Asigna solo si la conexión es exitosa
        print("INFO: Conexión asíncrona con Ollama establecida correctamente.")
    except Exception as e:
        print(f"ADVERTENCIA: No se pudo conectar con Ollama (Async). Funcionalidad de Chatbot estará limitada. Error: {e}")
        ollama_client = None # Asegúrate de que es None si falla

    yield # La aplicación se ejecuta aquí

    if database.is_connected:
        await database.disconnect()
        print("INFO: Desconectado de la base de datos PostgreSQL.")

app = FastAPI(title="Pimpoyo API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Comentario encima de la función create_access_token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(dt_timezone.utc) + expires_delta
    else:
        expire = datetime.now(dt_timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Comentario encima de la función get_usuario_by_apodo
async def get_usuario_by_apodo(apodo: str) -> Optional[UsuarioInDB]:
    query = sesiones_table.select().where(sesiones_table.c.apodo == apodo)
    result = await database.fetch_one(query)
    if result:
        return UsuarioInDB(**dict(result))
    return None

# Comentario encima de la función get_current_active_user
async def get_current_active_user(token: str = Depends(oauth2_scheme)) -> UsuarioInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        apodo_from_token: Optional[str] = payload.get("sub")
        if apodo_from_token is None:
            raise credentials_exception
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception
    usuario = await get_usuario_by_apodo(apodo=apodo_from_token)
    if usuario is None:
        raise credentials_exception
    return usuario

auth_router = APIRouter(tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["Users"])
news_router = APIRouter(prefix="/news", tags=["News Data"])
chat_router = APIRouter(prefix="/bot", tags=["Chatbot"])
glossary_router = APIRouter(prefix="/glossary", tags=["Glossary"])
guided_analysis_router = APIRouter(tags=["Guided Analysis Activity"])
challenge_router = APIRouter(prefix="/challenge", tags=["Challenges"])
post_test_router = APIRouter(prefix="/activity/post-test", tags=["Post-Test Activity"])


@auth_router.post("/register/", response_model=UsuarioPublic, status_code=status.HTTP_201_CREATED)
async def register_usuario(usuario_in: UsuarioCreate):
    """
    Registra un nuevo usuario, incluyendo el procesamiento y guardado
    de las respuestas del pre-test en las columnas correspondientes de la tabla sesiones.
    """
    existing_user = await get_usuario_by_apodo(usuario_in.apodo)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apodo ya registrado.")

    hashed_password = get_password_hash(usuario_in.password)

    # 1. Mapeo de IDs de preguntas del frontend a columnas de la BBDD
    # Basado en el PDF "Análisis completo_ Encuestas .pdf" y el array preSurveyQuestions de ProfileSetup.tsx
    pre_test_id_to_db_col = {
        'q1': 'pre_s2_p5_habilidad_vf',          # Habilidad para descubrir V/F
        'q2': 'pre_s1_p4_charla_peligros',      # Dificultad para saber si es real (mapeo adaptado)
        'q3': 'pre_s2_p6_dificultad_vf',         # Dificultad para saber si es real (mapeo adaptado)
        'q4': 'pre_s1_p3_habilidad_tech',       # Habilidad con tecnologías (mapeo adaptado)
        'q5': 'pre_s2_p7_estrategias_fijarse',   # En qué te fijas
        'q6': 'pre_s2_p8_fuentes_confianza',     # Fuentes de confianza
        'q7': 'pre_s2_p9_sospecha_falsa',        # Sospecha de FALSA
        'q8': 'pre_s2_p10_probabilidad_verdad', # Probabilidad de VERDAD
        'q9_q': 'pre_s3_p11_vf_apagon',          # Noticia del Apagón ¿V/F?
        'q9_a': 'pre_s3_p11_expl_apagon',        # Explicación de la noticia del Apagón
        'q10_q': 'post_s3_p10_vf_sangre_artificial', # Noticia Sangre Artificial ¿V/F? (Nombre de columna adaptado de post-test)
        'q10_a': 'post_s3_p11_expl_apagon_post' # Explicación Sangre Artificial (Nombre de columna adaptado de post-test)
    }

    # 2. Prepara el diccionario principal de valores para la tabla 'sesiones'
    sesion_values_to_insert = {
        "apodo": usuario_in.apodo,
        "hashed_password": hashed_password,
        "edad": usuario_in.edad,
        "genero": usuario_in.genero,
        "avatar_url": str(usuario_in.avatar_url) if usuario_in.avatar_url else None,
        "consentimiento_obtenido": usuario_in.consentimiento_obtenido,
        "curso_escolar": usuario_in.curso_escolar,
        "inicio_sesion_ts": datetime.now(dt_timezone.utc),
        # Usamos el nombre de columna correcto para la puntuación total
        "puntuacion_pre_test_total": usuario_in.puntuacion_pre_test,
    }

    # 3. Procesa y añade las respuestas del pre-test al diccionario
    if usuario_in.respuestas_pre_test:
        for question_id, answer in usuario_in.respuestas_pre_test.items():
            db_column_name = pre_test_id_to_db_col.get(question_id)
            if db_column_name:
                # El valor ya viene como string o array de strings desde el frontend
                sesion_values_to_insert[db_column_name] = answer

    # 4. Inserta todo en la base de datos en una sola operación
    async with database.transaction():
        try:
            query_sesion = sesiones_table.insert().values(**sesion_values_to_insert).returning(sesiones_table.c.sesion_id)
            last_sesion_id = await database.fetch_val(query_sesion)
            if last_sesion_id is None:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error creando al usuario, no se devolvió ID.")

            # Ya no necesitamos insertar en 'respuestas_pre_test_table'

            created_user_query = sesiones_table.select().where(sesiones_table.c.sesion_id == last_sesion_id)
            created_user_db_map = await database.fetch_one(created_user_query)
            if not created_user_db_map:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo recuperar el usuario tras crearlo.")

            created_user_db = UsuarioInDB(**dict(created_user_db_map))
            return UsuarioPublic.model_validate(created_user_db.model_dump())

        except Exception as e:
            print(f"Error detallado en el registro durante la transacción: {e}")
            # Ofrece un mensaje de error más genérico al usuario final
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"No se pudo registrar al usuario. Ocurrió un error.")

# --- Endpoint para el submit del POST-TEST (guardando respuestas individuales) ---
@post_test_router.post("/submit", response_model=PostTestSubmitResponse)
async def submit_post_test_answers(payload: PostTestSubmitPayload, current_user: UsuarioInDB = Depends(get_current_active_user)):
    if not ALL_NEWS_DATA or not PREGUNTAS_POST_TEST_ELECCION:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Dataset o preguntas de elección para post-test no disponible.")

    total_items_evaluados = 0
    aciertos_calculados = 0
    respuestas_post_test_para_db = []
    fecha_actual_respuesta = datetime.now(dt_timezone.utc)

    # 1. Evaluar y preparar respuestas de elección múltiple
    for resp_e in payload.respuestas_eleccion:
        pregunta_original = next((p for p in PREGUNTAS_POST_TEST_ELECCION if p["id_pregunta"] == resp_e.id_pregunta), None)
        es_correcta_actual = None
        if pregunta_original:
            total_items_evaluados += 1
            if resp_e.respuesta_seleccionada == pregunta_original["respuesta_correcta"]:
                aciertos_calculados += 1
                es_correcta_actual = True
            else:
                es_correcta_actual = False

        respuestas_post_test_para_db.append({
            "sesion_id": current_user.sesion_id,
            "id_pregunta_post_test": resp_e.id_pregunta,
            "tipo_pregunta_post_test": "eleccion_multiple",
            "respuesta_seleccionada": resp_e.respuesta_seleccionada,
            "es_correcta": es_correcta_actual,
            "fecha_respuesta": fecha_actual_respuesta
        })

    # 2. Evaluar y preparar respuestas de análisis de noticias (Verdadero/Falso)
    for resp_a in payload.respuestas_analisis_noticias:
        noticia_original = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == resp_a.noticia_id_json), None)
        es_correcta_actual = None
        if noticia_original:
            total_items_evaluados += 1
            categoria_real_noticia = noticia_original.get("CATEGORY", "UNKNOWN_CATEGORY").upper() # Default para evitar error si falta CATEGORY
            if resp_a.evaluacion_usuario.upper() == categoria_real_noticia:
                aciertos_calculados += 1
                es_correcta_actual = True
            else:
                es_correcta_actual = False

        respuestas_post_test_para_db.append({
            "sesion_id": current_user.sesion_id,
            "id_pregunta_post_test": resp_a.noticia_id_json, # Usamos el ID de la noticia como ID de pregunta
            "tipo_pregunta_post_test": "analisis_vf",
            "respuesta_seleccionada": resp_a.evaluacion_usuario, # TRUE o FALSE
            "es_correcta": es_correcta_actual,
            "fecha_respuesta": fecha_actual_respuesta
        })

    puntuacion_calculada_porcentaje = (aciertos_calculados / total_items_evaluados) * 100 if total_items_evaluados > 0 else 0.0
    puntuacion_final_a_guardar = round(puntuacion_calculada_porcentaje, 2)

    fin_ts = datetime.now(dt_timezone.utc)
    dur_seg = int((fin_ts - current_user.inicio_sesion_ts).total_seconds()) if current_user.inicio_sesion_ts else None

    inter_sesion = await database.fetch_all(interacciones_table.select().where(interacciones_table.c.sesion_id == current_user.sesion_id))
    fn_c, true_c, fp_c, false_c = 0,0,0,0
    for inter_row in inter_sesion:
        if inter_row["noticia_verdad_real"] and inter_row["noticia_verdad_real"].upper() == "TRUE":
            true_c +=1
            if inter_row["tipo_error"] == "FALSO_NEGATIVO": fn_c += 1
        elif inter_row["noticia_verdad_real"] and inter_row["noticia_verdad_real"].upper() == "FALSE":
            false_c +=1
            if inter_row["tipo_error"] == "FALSO_POSITIVO": fp_c += 1

    tasa_fn = (fn_c / true_c) * 100 if true_c > 0 else 0.0
    tasa_fp = (fp_c / false_c) * 100 if false_c > 0 else 0.0

    async with database.transaction():
        try:
            update_q_sesiones = sesiones_table.update().where(sesiones_table.c.sesion_id == current_user.sesion_id).values(
                puntuacion_post_test_total=puntuacion_final_a_guardar,
                puntuacion_final=puntuacion_final_a_guardar,
                fin_sesion_ts=fin_ts,
                duracion_total_sesion_seg=dur_seg,
                tasa_falsos_negativos_global=round(tasa_fn, 2),
                tasa_falsos_positivos_global=round(tasa_fp, 2)
            )
            await database.execute(update_q_sesiones)

            if respuestas_post_test_para_db:
                query_respuestas_post = respuestas_post_test_table.insert()
                await database.execute_many(query_respuestas_post, respuestas_post_test_para_db)

            return PostTestSubmitResponse(
                message="Post-test completado y respuestas guardadas.",
                puntuacion_final=puntuacion_final_a_guardar,
                aciertos=aciertos_calculados,
                total_preguntas=total_items_evaluados
            )
        except Exception as e:
            print(f"Error guardando post-test para {current_user.sesion_id} durante transacción: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo guardar la puntuación y respuestas del post-test.")

# Comentario encima de la función login_for_access_token
@auth_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # ... (código existente)
    usuario = await get_usuario_by_apodo(form_data.username)
    if not usuario or not verify_password(form_data.password, usuario.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect apodo or password", headers={"WWW-Authenticate": "Bearer"})
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": usuario.apodo, "sesion_id": usuario.sesion_id}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

# Comentario encima de la función read_users_me
@users_router.get("/me/", response_model=UsuarioPublic)
async def read_users_me(current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    return UsuarioPublic.model_validate(current_user.model_dump())

# Comentario encima de la función update_usuario_me
@users_router.patch("/me/", response_model=UsuarioPublic)
async def update_usuario_me(usuario_update: UsuarioUpdateProfile, current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    update_data = usuario_update.model_dump(exclude_unset=True)
    if "apodo" in update_data and update_data["apodo"] != current_user.apodo:
        existing_user = await get_usuario_by_apodo(update_data["apodo"])
        if existing_user and existing_user.sesion_id != current_user.sesion_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That apodo is already in use.")
    if "avatar_url" in update_data:
        update_data["avatar_url"] = str(update_data["avatar_url"]).strip() if update_data["avatar_url"] else None
    if not update_data: return UsuarioPublic.model_validate(current_user.model_dump())
    query = sesiones_table.update().where(sesiones_table.c.sesion_id == current_user.sesion_id).values(**update_data)
    try:
        await database.execute(query)
        updated_user_db_map = await database.fetch_one(sesiones_table.select().where(sesiones_table.c.sesion_id == current_user.sesion_id))
        if not updated_user_db_map: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found after update.")
        updated_user = UsuarioInDB(**dict(updated_user_db_map))
        return UsuarioPublic.model_validate(updated_user.model_dump())
    except Exception as e:
        print(f"Detailed profile update error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not update profile.")

# Comentario encima de la función get_user_detailed_stats
@users_router.get("/me/detailed-stats", response_model=UserDetailedStatsResponse)
async def get_user_detailed_stats(current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    total_analizadas = current_user.interacciones_totales_sesion or 0
    aciertos = current_user.aciertos_totales_sesion or 0
    fallos = current_user.fallos_totales_sesion or 0
    xp_actual = current_user.xp_actual or 0
    xp_next_level = XP_NIVELES[-1] * 2
    for level_xp in XP_NIVELES:
        if xp_actual < level_xp: xp_next_level = level_xp; break
    if xp_actual >= XP_NIVELES[-1] and xp_next_level == XP_NIVELES[-1] * 2 :
        xp_next_level = xp_actual + 50
    return UserDetailedStatsResponse(totalAnalizadas=total_analizadas, aciertos=aciertos, fallos=fallos, xp=xp_actual, xpNextLevel=xp_next_level)

# Comentario encima de la función get_news_for_challenge
@news_router.get("/challenge", response_model=List[Any])
async def get_news_for_challenge():
    # ... (código existente)
    if not ALL_NEWS_DATA:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="News data source not available.")
    return ALL_NEWS_DATA

# Comentario encima de la función handle_fake_news_chat
@chat_router.post("/chat", response_model=ChatResponse)
async def handle_fake_news_chat(request: ChatRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    if not ollama_client: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    messages_to_ollama = [msg.model_dump() for msg in request.messages]
    if not messages_to_ollama or messages_to_ollama[0]['role'] != 'system': raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="System message is missing or not first.")
    if len(messages_to_ollama) < 2: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient messages provided.")
    try:
        response = await ollama_client.chat(model=request.model or OLLAMA_MODEL, messages=messages_to_ollama)
        reply_content = response.get('message', {}).get('content', '')
        return ChatResponse(reply=reply_content)
    except Exception as e:
        print(f"Error interacting with Ollama in /bot/chat: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Failed to get response from language model: {str(e)[:100]}")

# Comentario encima de la función handle_free_chat
@chat_router.post("/chatlibre", response_model=ChatResponse)
async def handle_free_chat(request: ChatRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    if not ollama_client: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    messages_to_ollama = [msg.model_dump() for msg in request.messages]
    if not messages_to_ollama or messages_to_ollama[0]['role'] != 'system': raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="System message is missing or not first.")
    if len(messages_to_ollama) < 2: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient messages provided.")
    try:
        response = await ollama_client.chat(model=request.model or OLLAMA_MODEL, messages=messages_to_ollama)
        reply_content = response.get('message', {}).get('content', '')
        return ChatResponse(reply=reply_content)
    except Exception as e:
        print(f"Error interacting with Ollama in /bot/chatlibre: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Failed to get response from language model: {str(e)[:100]}")

# Comentario encima de la función create_glossary_term
@glossary_router.post("/", response_model=GlossaryTermPublic, status_code=status.HTTP_201_CREATED)
async def create_glossary_term(term_in: GlossaryTermCreate, current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    existing_query = glosario_usuario_table.select().where(
        (glosario_usuario_table.c.usuario_sesion_id == current_user.sesion_id) &
        (sqlfunc.lower(glosario_usuario_table.c.termino) == sqlfunc.lower(term_in.termino.strip())))
    if await database.fetch_one(existing_query):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'El término "{term_in.termino}" ya existe en tu glosario.')
    query = glosario_usuario_table.insert().values(
        usuario_sesion_id=current_user.sesion_id, termino=term_in.termino.strip(),
        definicion=term_in.definicion.strip(), fecha_creacion=datetime.now(dt_timezone.utc)
    ).returning(glosario_usuario_table.c.id, glosario_usuario_table.c.fecha_creacion)
    try:
        created_term_result = await database.fetch_one(query)
        if not created_term_result: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al guardar el término.")
        term_dict = {"id": created_term_result["id"], "usuario_sesion_id": current_user.sesion_id,
                     "termino": term_in.termino.strip(), "definicion": term_in.definicion.strip(),
                     "fecha_creacion": created_term_result["fecha_creacion"]}
        return GlossaryTermPublic(**term_dict)
    except Exception as e:
        print(f"Error detallado al crear término del glosario: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo añadir el término.")

# Comentario encima de la función get_user_glossary_terms
@glossary_router.get("/", response_model=List[GlossaryTermPublic])
async def get_user_glossary_terms(current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    query = glosario_usuario_table.select().where(glosario_usuario_table.c.usuario_sesion_id == current_user.sesion_id).order_by(sqlfunc.lower(glosario_usuario_table.c.termino))
    results = await database.fetch_all(query)
    return [GlossaryTermPublic.model_validate(row) for row in results]

# Comentario encima de la función get_next_secuencia_interaccion
async def get_next_secuencia_interaccion(sesion_id: int, db: Database) -> int:
    # ... (código existente)
    query = select(sqlfunc.max(interacciones_table.c.secuencia_interaccion)).where(interacciones_table.c.sesion_id == sesion_id)
    max_secuencia = await db.fetch_val(query)
    return (max_secuencia or 0) + 1

# Comentario encima de la función registrar_interaccion_y_actualizar_estadisticas
async def registrar_interaccion_y_actualizar_estadisticas(
    db: Database, sesion_id: int, noticia_id_json: str, tipo_interaccion: str,
    noticia_data_from_json: dict, respuesta_usuario: Optional[str], es_correcto: Optional[bool],
    tiempo_respuesta_ms: Optional[int] = None, indicadores_discutidos_llm: Optional[List[str]] = None,
    feedback_mostrado_param: Optional[str] = None
):
    # ... (código existente de esta función)
    secuencia = await get_next_secuencia_interaccion(sesion_id, db)
    xp_ganado = XP_POR_ACIERTO if es_correcto is True else (XP_POR_FALLO if es_correcto is False else 0)
    puntos_otorgados = xp_ganado
    reasoning_type_val = noticia_data_from_json.get("REASONING_TYPE", "")
    processed_reasoning = []
    if isinstance(reasoning_type_val, str):
        processed_reasoning = [r.strip() for r in reasoning_type_val.replace(' y ', ',').split(',') if r.strip()]
    elif isinstance(reasoning_type_val, list):
        processed_reasoning = [str(r).strip() for r in reasoning_type_val if str(r).strip()]
    tipo_err = None
    if es_correcto is False:
        if noticia_data_from_json.get("CATEGORY", "").upper() == "TRUE": tipo_err = "FALSO_NEGATIVO"
        elif noticia_data_from_json.get("CATEGORY", "").upper() == "FALSE": tipo_err = "FALSO_POSITIVO"
    inter_data = {
        "sesion_id": sesion_id, "interaccion_ts": datetime.now(dt_timezone.utc), "noticia_id": noticia_id_json,
        "noticia_fuente": noticia_data_from_json.get("SOURCE"),
        "noticia_verdad_real": noticia_data_from_json.get("CATEGORY"),
        "noticia_tema": noticia_data_from_json.get("TOPICS"),
        "noticia_dificultad": noticia_data_from_json.get("DIFFICULTY_LEVEL"),
        "noticia_tipos_razonamiento_json": processed_reasoning,
        "respuesta_usuario": respuesta_usuario, "es_correcto": es_correcto,
        "tiempo_respuesta_ms": tiempo_respuesta_ms, "puntos_otorgados": puntos_otorgados, "tipo_error": tipo_err,
        "feedback_mostrado": feedback_mostrado_param, "secuencia_interaccion": secuencia,
        "criterios_evaluacion_ids": None,
        "key_elements_json": noticia_data_from_json.get("KEY_ELEMENTS"),
        "justification_hints_json": noticia_data_from_json.get("JUSTIFICATION_HINTS"),
        "likely_misconceptions_json": noticia_data_from_json.get("LIKELY_MISCONCEPTIONS"),
        "indicadores_clave_detectados_noticia_json": noticia_data_from_json.get("INDICADORES_CLAVE_DETECTADOS"),
        "indicadores_seleccionados_usuario": indicadores_discutidos_llm,
        "tipo_interaccion": tipo_interaccion,
    }
    await db.execute(interacciones_table.insert().values(**inter_data))
    curr_sess_data = await db.fetch_one(
        select(
            sesiones_table.c.interacciones_totales_sesion,
            sesiones_table.c.aciertos_totales_sesion,
            sesiones_table.c.fallos_totales_sesion,
            sesiones_table.c.xp_actual
        ).where(sesiones_table.c.sesion_id == sesion_id)
    )
    if curr_sess_data:
        interactions_increment = 1 if es_correcto is not None else 0
        correct_increment = 1 if es_correcto is True else 0
        incorrect_increment = 1 if es_correcto is False else 0
        new_inter = (curr_sess_data["interacciones_totales_sesion"] or 0) + interactions_increment
        new_corr = (curr_sess_data["aciertos_totales_sesion"] or 0) + correct_increment
        new_incorr = (curr_sess_data["fallos_totales_sesion"] or 0) + incorrect_increment
        new_xp_val = (curr_sess_data["xp_actual"] or 0) + xp_ganado
        new_prec = (new_corr / new_inter) * 100 if new_inter > 0 else 0.0
        await db.execute(
            sesiones_table.update().where(sesiones_table.c.sesion_id == sesion_id).values(
                interacciones_totales_sesion=new_inter,
                aciertos_totales_sesion=new_corr,
                fallos_totales_sesion=new_incorr,
                precision_global_sesion=round(new_prec, 2),
                xp_actual=new_xp_val
            )
        )
    else:
        print(f"ADVERTENCIA: Sesión {sesion_id} no encontrada para actualizar stats agregadas.")
    criterios_reg = []
    if noticia_data_from_json.get("TOPICS"):
        criterios_reg.append({"tipo_criterio": "TEMA_NOTICIA", "valor_criterio": noticia_data_from_json.get("TOPICS")})
    if noticia_data_from_json.get("DIFFICULTY_LEVEL"):
        criterios_reg.append({"tipo_criterio": "DIFICULTAD_NOTICIA", "valor_criterio": noticia_data_from_json.get("DIFFICULTY_LEVEL")})
    for r_item in processed_reasoning:
        criterios_reg.append({"tipo_criterio": "TIPO_RAZONAMIENTO_NOTICIA", "valor_criterio": r_item})
    if indicadores_discutidos_llm:
        for ind_item in indicadores_discutidos_llm:
            criterios_reg.append({"tipo_criterio": "INDICADOR_USUARIO_O_DISCUTIDO", "valor_criterio": ind_item})
    for crit_item in criterios_reg:
        val_crit_str_item = str(crit_item["valor_criterio"])
        acierto_crit_inc_item = 1 if es_correcto is True else 0
        initial_tasa_val = (1.0 if es_correcto else 0.0) if es_correcto is not None else None
        stmt_crit_item = pg_insert(estadisticas_detalladas_usuario_table).values(
            sesion_id=sesion_id,
            tipo_criterio=crit_item["tipo_criterio"],
            valor_criterio=val_crit_str_item,
            numero_intentos=1,
            numero_aciertos=acierto_crit_inc_item if es_correcto is not None else 0,
            tasa_acierto=initial_tasa_val,
            fecha_ultima_actualizacion=datetime.now(dt_timezone.utc)
        )
        set_vals_on_conflict = {
            "numero_intentos": estadisticas_detalladas_usuario_table.c.numero_intentos + 1,
            "fecha_ultima_actualizacion": datetime.now(dt_timezone.utc)
        }
        if es_correcto is not None:
            set_vals_on_conflict["numero_aciertos"] = estadisticas_detalladas_usuario_table.c.numero_aciertos + acierto_crit_inc_item
            set_vals_on_conflict["tasa_acierto"] = (
                (estadisticas_detalladas_usuario_table.c.numero_aciertos + acierto_crit_inc_item) /
                (cast(estadisticas_detalladas_usuario_table.c.numero_intentos, Float) + 1.0)
            )
        await db.execute(
            stmt_crit_item.on_conflict_do_update(
                constraint='uq_stats_detalle_usuario_criterio',
                set_=set_vals_on_conflict
            )
        )

# Comentario encima de la función get_next_guided_analysis_news_endpoint
@guided_analysis_router.get("/next-news", response_model=NoticiaParaAnalisis)
async def get_next_guided_analysis_news_endpoint(current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    if not ollama_client: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible para análisis guiado.")
    if not ALL_NEWS_DATA: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Dataset de noticias no disponible.")
    query_seen = select(chat_sesiones_noticia_table.c.noticia_id_json).where(chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id)
    seen_ids = {r["noticia_id_json"] for r in await database.fetch_all(query_seen)}
    weak_indic, weak_razon = [], []
    stats_q = estadisticas_detalladas_usuario_table.select().where(estadisticas_detalladas_usuario_table.c.sesion_id == current_user.sesion_id).order_by(estadisticas_detalladas_usuario_table.c.tasa_acierto.asc())
    for r_stat in await database.fetch_all(stats_q):
        if r_stat["tasa_acierto"] is not None and r_stat["tasa_acierto"] < 0.6 and r_stat["numero_intentos"] is not None and r_stat["numero_intentos"] >= 2:
            if r_stat["tipo_criterio"] == "INDICADOR_USUARIO_O_DISCUTIDO": weak_indic.append(r_stat["valor_criterio"])
            elif r_stat["tipo_criterio"] == "TIPO_RAZONAMIENTO_NOTICIA": weak_razon.append(r_stat["valor_criterio"])
    pers_cand, other_elig = [], []
    for news_item_data in ALL_NEWS_DATA:
        if not isinstance(news_item_data, dict): continue
        news_id_val = news_item_data.get("ID")
        if not news_id_val or news_id_val in seen_ids: continue
        focus_val, targets_weak_val = None, False
        if weak_indic:
            key_elems_val = news_item_data.get("KEY_ELEMENTS", [])
            if isinstance(key_elems_val, list):
                for wi_val in weak_indic:
                    if wi_val in key_elems_val: targets_weak_val = True; focus_val = wi_val; break
            if targets_weak_val: pers_cand.append((news_item_data, focus_val)); continue
        if weak_razon:
            reason_str_val = news_item_data.get("REASONING_TYPE", "")
            curr_reason_val = []
            if isinstance(reason_str_val, str): curr_reason_val = [r.strip() for r in reason_str_val.replace(' y ', ',').split(',') if r.strip()]
            elif isinstance(reason_str_val, list): curr_reason_val = [str(r).strip() for r in reason_str_val if str(r).strip()]
            for wr_val in weak_razon:
                if wr_val in curr_reason_val: targets_weak_val = True; focus_val = wr_val; break
            if targets_weak_val: pers_cand.append((news_item_data, focus_val)); continue
        if news_item_data.get("DIFFICULTY_LEVEL", "").lower() in ["medio", "alto", "bajo"]:
            other_elig.append(news_item_data)
    sel_news_data_val, focus_frontend_val = None, None
    if pers_cand:
        print(f"INFO: Usuario {current_user.apodo} - Seleccionando noticia personalizada de {len(pers_cand)} candidatas.")
        sel_news_tuple_val = random.choice(pers_cand); sel_news_data_val, focus_frontend_val = sel_news_tuple_val[0], sel_news_tuple_val[1]
        print(f"INFO: Noticia seleccionada con enfoque en: {focus_frontend_val}")
    elif other_elig:
        print(f"INFO: Usuario {current_user.apodo} - No hay personalizadas, seleccionando de {len(other_elig)} otras elegibles no vistas.")
        sel_news_data_val = random.choice(other_elig)
    else:
        print(f"ADVERTENCIA: Usuario {current_user.apodo} - No quedan noticias inéditas. Considerando repetidas de niveles medio/alto/bajo.")
        fallback_pool_val = [n_item for n_item in ALL_NEWS_DATA if isinstance(n_item, dict) and n_item.get("DIFFICULTY_LEVEL", "").lower() in ["medio", "alto", "bajo"]]
        if fallback_pool_val: sel_news_data_val = random.choice(fallback_pool_val)
        else: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay noticias disponibles en el dataset para esta actividad.")
    if not sel_news_data_val: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se pudo seleccionar una noticia.")
    return NoticiaParaAnalisis(
        noticia_id_json=sel_news_data_val["ID"],
        headline=sel_news_data_val.get("HEADLINE", "Sin titular"),
        text=sel_news_data_val.get("TEXT", "Sin texto"),
        source=sel_news_data_val.get("SOURCE"),
        difficulty_level=sel_news_data_val.get("DIFFICULTY_LEVEL"),
        area_de_enfoque_sugerida=focus_frontend_val
    )

# Comentario encima de la función start_guided_analysis_explanation_endpoint
@guided_analysis_router.post("/explain", response_model=ChatGuiaResponse)
async def start_guided_analysis_explanation_endpoint(request_data: ExplicacionInicialRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    if not ollama_client: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    noticia_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == request_data.noticia_id_json), None)
    if not noticia_data: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Noticia no encontrada.")
    cat_real = noticia_data.get("CATEGORY", "").upper()
    eval_corr_init = None
    if request_data.evaluacion_inicial_opcional and cat_real and request_data.evaluacion_inicial_opcional.upper() != "UNSURE":
        eval_corr_init = (request_data.evaluacion_inicial_opcional.upper() == cat_real)
    chat_sess_q = chat_sesiones_noticia_table.insert().values(
        sesion_id=current_user.sesion_id, noticia_id_json=request_data.noticia_id_json,
        explicacion_inicial_usuario=request_data.explicacion_usuario, evaluacion_inicial_usuario=request_data.evaluacion_inicial_opcional,
        noticia_verdad_real_json=cat_real if cat_real else None, evaluacion_inicial_correcta=eval_corr_init,
        fecha_inicio=datetime.now(dt_timezone.utc)
    ).returning(chat_sesiones_noticia_table.c.chat_sesion_noticia_id)
    chat_sesion_id = await database.fetch_val(chat_sess_q)
    if not chat_sesion_id: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo crear sesión de chat.")
    user_msg_content = f"Evaluación del usuario: {request_data.evaluacion_inicial_opcional or 'No especificada'}. Justificación: {request_data.explicacion_usuario}"
    await database.execute(mensajes_chat_guia_table.insert().values(chat_sesion_noticia_id=chat_sesion_id, emisor='usuario', contenido=user_msg_content, timestamp_mensaje=datetime.now(dt_timezone.utc))) # Falta orden_en_chat aquí
    sys_prompt = ("Rol: Eres 'Pimpoyo', un chatbot guía para niños de 10-12 años. Ayúdalos a analizar una noticia paso a paso. Tarea: El usuario acaba de darte su opinión inicial (si cree que una noticia es Verdadera/Falsa y por qué). Tu misión es NO decirle directamente si acertó o no sobre la veracidad (eso se le mostrará por otro medio si decide finalizar el análisis). Enfócate en su EXPLICACIÓN. Valida su esfuerzo. Si su explicación es buena, elógiala y quizás profundiza un poco o pregunta qué más le hizo pensar así. Si es débil, confusa o se basa en suposiciones, haz preguntas guía SUAVES para que reflexione sobre aspectos de la noticia (fuente, titular, lenguaje, pruebas, etc.) que podrían ayudarle a formar una mejor opinión o a identificar las pistas. Sé breve, amigable y no uses tecnicismos. Mantén la conversación centrada en la noticia que están analizando. Ejemplo si explica bien: '¡Buen análisis! Veo que te fijaste en [algo que dijo]. ¿Qué más te llamó la atención de la noticia?'. Ejemplo si explica mal: 'Entiendo tu punto. Sobre la fuente que menciona la noticia, ¿te parece conocida? ¿Y qué me dices del titular, es muy llamativo o más bien informativo?'")
    if request_data.area_de_enfoque_sugerida: sys_prompt += f" CONSEJO ADICIONAL PARA TI, PIMPOYO: Esta noticia fue seleccionada porque el usuario podría necesitar reforzar su comprensión sobre '{request_data.area_de_enfoque_sugerida}'. Intenta guiar la conversación sutilmente para abordar este aspecto si surge naturalmente en la explicación del usuario o si ves una oportunidad."
    ollama_msgs = [OllamaMessage(role="system", content=sys_prompt), OllamaMessage(role="user", content=user_msg_content)]
    try:
        ollama_resp = await ollama_client.chat(model=OLLAMA_MODEL_ANALYSIS, messages=[msg.model_dump() for msg in ollama_msgs])
        reply_content = ollama_resp['message']['content']
        if not reply_content: reply_content = "¡Entendido! Gracias por compartir tu primer análisis. ¿Hay algo en particular de la noticia que te gustaría que exploráramos juntos? Puedes preguntarme lo que quieras sobre ella."
    except Exception as e:
        print(f"Error Ollama en /explain: {e}"); reply_content = "Vaya, mis circuitos están un poco revueltos ahora mismo. Pero dime, ¿qué te hizo pensar así sobre la noticia?"
    await database.execute(mensajes_chat_guia_table.insert().values(chat_sesion_noticia_id=chat_sesion_id, emisor='chatbot', contenido=reply_content, timestamp_mensaje=datetime.now(dt_timezone.utc))) # Falta orden_en_chat aquí
    return ChatGuiaResponse(chat_sesion_noticia_id=chat_sesion_id, respuesta_chatbot=reply_content)

# Comentario encima de la función continue_guided_analysis_chat_endpoint
@guided_analysis_router.post("/chat/{chat_sesion_noticia_id}/continue", response_model=ChatGuiaResponse)
async def continue_guided_analysis_chat_endpoint(chat_sesion_noticia_id: int, request_data: ContinuarChatGuiaRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    # ¡Asegúrate de incluir 'orden_en_chat' en las inserciones a mensajes_chat_guia_table!
    # Ejemplo:
    # last_order_query = select(sqlfunc.max(mensajes_chat_guia_table.c.orden_en_chat)).where(mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id)
    # last_order = await database.fetch_val(last_order_query) or 0
    # await database.execute(mensajes_chat_guia_table.insert().values(..., orden_en_chat=last_order + 1))
    # ... (y lo mismo para el mensaje del bot)
    if not ollama_client: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    chat_sess_db = await database.fetch_one(chat_sesiones_noticia_table.select().where((chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id) & (chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id)))
    if not chat_sess_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada.")
    if chat_sess_db["fecha_fin"]: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sesión de chat ya finalizada.")

    last_order_query = select(sqlfunc.max(mensajes_chat_guia_table.c.orden_en_chat)).where(mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id)
    last_order = await database.fetch_val(last_order_query) or 0

    await database.execute(mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_noticia_id,
        emisor='usuario',
        contenido=request_data.mensaje_usuario,
        timestamp_mensaje=datetime.now(dt_timezone.utc),
        orden_en_chat=last_order + 1
    ))

    hist_q = mensajes_chat_guia_table.select().where(mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id).order_by(mensajes_chat_guia_table.c.orden_en_chat.asc()) #.c.timestamp_mensaje.asc())
    msg_hist_db = await database.fetch_all(hist_q)
    ollama_hist = [OllamaMessage(role="user" if m["emisor"] == "usuario" else "assistant", content=m["contenido"]) for m in msg_hist_db]

    sys_prompt_cont = ("Rol: Eres 'Pimpoyo', un chatbot guía para niños de 10-12 años. Ayúdalos a analizar una noticia paso a paso. Contexto: Estás continuando una conversación sobre una noticia específica que el usuario está analizando. Ya le diste un feedback conversacional inicial a su primera evaluación. Tarea: Responde a la NUEVA pregunta o comentario del usuario de forma clara y sencilla. Sigue guiándolo para que reflexione sobre la noticia. Evita dar la solución (si es verdadera o falsa la noticia) directamente. Si que puedes contestar otras preguntas sobre la noticia o cómo identificar su respuesta del usuario. Anímalo a encontrar pistas por sí mismo. Sé breve y amigable. Si el usuario parece estar atascado o pide una pista directa, puedes ofrecer una pequeña ayuda sutil.")
    final_ollama_msgs = [OllamaMessage(role="system", content=sys_prompt_cont)] + ollama_hist

    try:
        ollama_resp = await ollama_client.chat(model=OLLAMA_MODEL_ANALYSIS, messages=[msg.model_dump() for msg in final_ollama_msgs])
        reply_content = ollama_resp['message']['content']
        if not reply_content: reply_content = "Entendido. ¿Qué más quieres que veamos de esta noticia o qué otra duda tienes?"
    except Exception as e:
        print(f"Error Ollama en /continue: {e}"); reply_content = "Mis antenas de detective están un poco cruzadas. ¿Podrías preguntarme de otra forma?"

    await database.execute(mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_noticia_id,
        emisor='chatbot',
        contenido=reply_content,
        timestamp_mensaje=datetime.now(dt_timezone.utc),
        orden_en_chat=last_order + 2 # El mensaje del usuario fue last_order + 1
    ))
    return ChatGuiaResponse(chat_sesion_noticia_id=chat_sesion_noticia_id, respuesta_chatbot=reply_content)


# Comentario encima de la función finish_guided_analysis_news_endpoint
@guided_analysis_router.post("/finish-news/{chat_sesion_noticia_id}", status_code=status.HTTP_200_OK)
# @guided_analysis_router.post("/finish-news/{chat_sesion_noticia_id}", status_code=status.HTTP_200_OK) # Duplicado, quitar una
async def finish_guided_analysis_news_endpoint(
    chat_sesion_noticia_id: int,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    # ... (código existente de esta función)
    chat_sesion_db = await database.fetch_one(
        chat_sesiones_noticia_table.select().where(
            (chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id) &
            (chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id)
        )
    )
    if not chat_sesion_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada o no pertenece al usuario.")

    noticia_id_json_actual = chat_sesion_db["noticia_id_json"]
    noticia_original_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == noticia_id_json_actual), None)

    llm_analysis_payload = PostChatAnalysisPayload(
        indicadores_discutidos=[],
        conceptos_abordados=[],
        mejora_comprension=MejoraComprensionSubModel(evaluacion="INCIERTO", justificacion="Análisis LLM no realizado o fallido por defecto.")
    )

    if ollama_client and noticia_original_data and not chat_sesion_db["fecha_fin"]:
        history_query = mensajes_chat_guia_table.select().where(
            mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
        ).order_by(mensajes_chat_guia_table.c.orden_en_chat.asc()) #, mensajes_chat_guia_table.c.timestamp_mensaje.asc())
        message_history_db = await database.fetch_all(history_query)
        conversation_text = "\n".join([f"{msg['emisor'].upper()}: {msg['contenido']}" for msg in message_history_db])

        news_headline = noticia_original_data.get("HEADLINE", "N/A")
        news_indicadores_fuente = noticia_original_data.get("INDICADORES_CLAVE_DETECTADOS", [])
        news_key_elements_fuente = noticia_original_data.get("KEY_ELEMENTS", [])
        news_text_summary = (noticia_original_data.get("TEXT", "")[:500] + "...") if noticia_original_data.get("TEXT") else "Texto no disponible."

        prompt_for_llm_analysis = f"""
Rol: Eres un evaluador experto de conversaciones educativas sobre análisis de noticias para niños (10-12 años).
Tarea: Analiza la siguiente conversación entre un usuario y un guía llamado Pimpoyo sobre una noticia específica.
Debes determinar qué indicadores de desinformación y conceptos clave se discutieron, y si el usuario mejoró su comprensión.

Detalles de la Noticia Original:
- Titular: "{news_headline}"
- Indicadores Clave de la Noticia (según fuente original): {py_json.dumps(news_indicadores_fuente)}
- Elementos Clave de la Noticia (según fuente original): {py_json.dumps(news_key_elements_fuente)}
- Inicio del Texto de la Noticia: "{news_text_summary}"

Conversación Completa:
--- INICIO CONVERSACIÓN ---
{conversation_text}
--- FIN CONVERSACIÓN ---

Basado en la conversación y los detalles de la noticia, responde ÚNICAMENTE en formato JSON válido con la siguiente estructura:
{{
  "indicadores_discutidos": ["lista de strings con indicadores de desinformación mencionados o inferidos de la discusión (ej. 'Fuente Anónima', 'Titular Sensacionalista'). Deben ser relevantes a la conversación y pueden incluir algunos de los 'Indicadores Clave de la Noticia' si fueron tratados, u otros generales de esta lista: {py_json.dumps(LISTA_INDICADORES_DESINFORMACION[:5])}... etc."],
  "conceptos_abordados": ["lista de strings con conceptos clave de pensamiento crítico o temas relacionados con el análisis de noticias que se tocaron (ej. 'evaluación de fuentes', 'sesgo de confirmación', 'importancia del titular', 'diferenciar hecho de opinión'). Puedes usar estos como base: {py_json.dumps(LISTA_TIPOS_RAZONAMIENTO[:3])}... etc."],
  "mejora_comprension": {{
    "evaluacion": "string ('SI', 'NO', o 'INCIERTO', indicando si el usuario demostró una mejora en su habilidad para analizar la noticia o entender conceptos relacionados al final de la conversación)",
    "justificacion": "string (justificación breve de tu evaluación sobre la mejora de la comprensión, basada en la evidencia de la conversación.)"
  }}
}}
Asegúrate de que el JSON sea sintácticamente correcto. No incluyas nada más antes o después del JSON.
"""
        try:
            print(f"DEBUG: Enviando prompt a Ollama para análisis de chat {chat_sesion_noticia_id}")
            ollama_params = {"model": OLLAMA_MODEL_ANALYSIS, "messages": [{"role": "user", "content": prompt_for_llm_analysis}], "format": "json", "stream": False}
            response_llm = await ollama_client.chat(**ollama_params)
            llm_reply_content = response_llm.get('message', {}).get('content', '').strip()
            print(f"DEBUG: Respuesta cruda de Ollama para análisis (después de strip): '{llm_reply_content}'")

            # No es necesario extraer el JSON si format: "json" funciona y devuelve solo el JSON
            parsed_llm_data = py_json.loads(llm_reply_content) # Asumimos que llm_reply_content ya ES el JSON
            llm_analysis_payload = PostChatAnalysisPayload(**parsed_llm_data)
            print(f"DEBUG: Payload de análisis LLM parseado: {llm_analysis_payload.model_dump()}")

        except py_json.JSONDecodeError as json_err:
            print(f"ERROR: Fallo al parsear JSON de Ollama para análisis de chat {chat_sesion_noticia_id}: {json_err}")
            print(f"Respuesta recibida de Ollama que falló el parseo: '{llm_reply_content}'")
            llm_analysis_payload.mejora_comprension.justificacion = f"Error procesando respuesta del análisis (JSON): {str(json_err)}. Respuesta recibida: {llm_reply_content[:200]}"
        except Exception as e:
            print(f"ERROR: Excepción general al llamar/procesar Ollama para análisis de chat {chat_sesion_noticia_id}: {type(e).__name__} - {e}")
            llm_analysis_payload.mejora_comprension.justificacion = f"Error durante el análisis automático: {str(e)[:100]}"

    feedback_message = "¡Análisis completado!"
    titular_noticia_feedback = "esta noticia"
    if noticia_original_data:
        titular_noticia_feedback = noticia_original_data.get("HEADLINE", "esta noticia")
        feedback_message_parts = []
        evaluacion_correcta_db = chat_sesion_db["evaluacion_inicial_correcta"]
        evaluacion_usuario_texto_db = chat_sesion_db["evaluacion_inicial_usuario"]
        categoria_real_noticia_json = noticia_original_data.get("CATEGORY", "Desconocida").upper()
        feedback_message_parts.append(f"¡Análisis de \"{titular_noticia_feedback}\" finalizado! ")
        categoria_real_display_text = "de categoría desconocida"
        if categoria_real_noticia_json == "TRUE": categoria_real_display_text = "**Verdadera**"
        elif categoria_real_noticia_json == "FALSE": categoria_real_display_text = "**Falsa**"
        if evaluacion_usuario_texto_db and evaluacion_usuario_texto_db.upper() == "UNSURE":
            feedback_message_parts.append(f"Al principio no estabas seguro/a. Resulta que la noticia era {categoria_real_display_text}.")
        elif isinstance(evaluacion_correcta_db, bool):
            if evaluacion_correcta_db: feedback_message_parts.append(f"¡Muy bien! 👍 Tu primera impresión fue correcta. La noticia era {categoria_real_display_text}.")
            else: feedback_message_parts.append(f"Tu primera impresión fue diferente. Resulta que la noticia era {categoria_real_display_text}.")
        else: feedback_message_parts.append(f"La noticia era {categoria_real_display_text}.")

        learning_points_md_list = []
        just_hints_val = noticia_original_data.get("JUSTIFICATION_HINTS")
        if just_hints_val:
            hint_text_val = ""
            if isinstance(just_hints_val, list) and just_hints_val: hint_text_val = str(just_hints_val[0]).strip()
            elif isinstance(just_hints_val, str): hint_text_val = just_hints_val.strip()
            if hint_text_val: learning_points_md_list.append(f"* Pista clave: \"{hint_text_val}\"")

        key_elems_val = noticia_original_data.get("KEY_ELEMENTS")
        if key_elems_val and isinstance(key_elems_val, list):
            valid_elems_val = [str(el).strip() for el in key_elems_val if str(el).strip()][:2]
            if valid_elems_val: learning_points_md_list.append(f"* Fíjate en: {', '.join(valid_elems_val)}.")

        if learning_points_md_list:
            feedback_message_parts.append("\n\nPara que lo tengas en cuenta:")
            feedback_message_parts.append("\n" + "\n".join(learning_points_md_list))

        if isinstance(evaluacion_correcta_db, bool) and evaluacion_correcta_db:
            feedback_message_parts.append("\n\n¡Sigue así, vas por buen camino detectando noticias!")
        else:
            feedback_message_parts.append("\n\n¡No te desanimes! Cada noticia es una nueva oportunidad para aprender. ¡Presta atención a estas pistas la próxima vez!")
        feedback_message = "".join(feedback_message_parts)
    else:
        noticia_original_data = {"ID": noticia_id_json_actual, "CATEGORY": "DESCONOCIDA"} # Fallback
        feedback_message = "¡Análisis completado! No se pudieron cargar todos los detalles de la noticia para un feedback extenso, pero tu progreso ha sido guardado."

    if not chat_sesion_db["fecha_fin"]:
        update_values_chat_session = {
            "fecha_fin": datetime.now(dt_timezone.utc),
            "indicadores_discutidos": llm_analysis_payload.indicadores_discutidos,
            "conceptos_clave_discutidos": llm_analysis_payload.conceptos_abordados,
            "mejora_comprension_evaluacion": llm_analysis_payload.mejora_comprension.evaluacion,
            "mejora_comprension_justificacion": llm_analysis_payload.mejora_comprension.justificacion
        }
        await database.execute(
            chat_sesiones_noticia_table.update().where(
                chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
            ).values(**update_values_chat_session)
        )
        respuesta_stats = chat_sesion_db["evaluacion_inicial_usuario"] or "NO_EVALUADO_INICIALMENTE"
        es_corr_stats = chat_sesion_db["evaluacion_inicial_correcta"]
        await registrar_interaccion_y_actualizar_estadisticas(
            db=database, sesion_id=current_user.sesion_id, noticia_id_json=noticia_id_json_actual,
            tipo_interaccion='ANALISIS_INDIVIDUAL_GUIADO_FINALIZADO',
            noticia_data_from_json=noticia_original_data if noticia_original_data else {"ID": noticia_id_json_actual, "CATEGORY": "DESCONOCIDA"}, # Pasar un dict incluso si es fallback
            respuesta_usuario=respuesta_stats, es_correcto=es_corr_stats,
            feedback_mostrado_param=feedback_message,
            indicadores_discutidos_llm=llm_analysis_payload.indicadores_discutidos
        )
    return {"message": feedback_message}

# Comentario encima de la función finish_pair_selection_challenge
@challenge_router.post("/finish-pair-selection", response_model=FinishPairChallengeResponse, status_code=status.HTTP_200_OK)
async def finish_pair_selection_challenge(request_data: FinishPairChallengeRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    sel_id = request_data.seleccion_usuario_id_json
    true_id = request_data.noticia_verdadera_id_json
    false_id = request_data.noticia_falsa_id_json
    sel_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == sel_id), None)
    true_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == true_id), None)
    false_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == false_id), None)

    if not sel_data or not true_data or not false_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Datos no encontrados para una o más noticias del desafío de pares.")

    es_corr = (sel_id == true_id)

    def obtener_pista_explicativa_simple(noticia_dict: Optional[dict], es_verdadera_esperada: bool) -> str:
        if not noticia_dict: return "No se pudo obtener detalle."
        pistas = noticia_dict.get("KEY_ELEMENTS") or noticia_dict.get("JUSTIFICATION_HINTS")
        pista_sel = "Analizar todos los detalles con cuidado"
        if pistas:
            if isinstance(pistas, list) and pistas: pista_sel = str(pistas[0]).strip()
            elif isinstance(pistas, str) and pistas.strip(): pista_sel = pistas
        if "fuente" in pista_sel.lower(): return f"su fuente ('{noticia_dict.get('SOURCE', 'desconocida')}') era importante de revisar."
        if "titular" in pista_sel.lower(): return "la forma en que estaba escrito su titular daba una pista."
        return f"una pista era: \"{pista_sel}\"."

    tit_true_val = true_data.get("HEADLINE", "N/A")
    pista_true_simple_val = obtener_pista_explicativa_simple(true_data, True)
    tit_false_val = false_data.get("HEADLINE", "N/A")
    pista_false_simple_val = obtener_pista_explicativa_simple(false_data, False)

    explicacion_tarea_ollama_val = ""
    if es_corr:
        explicacion_tarea_ollama_val = (f"TAREA: El niño eligió la noticia \"{sel_data.get('HEADLINE', 'N/A')}\" y acertó. Explícale en 1-2 frases por qué era buena elección, enfocándote en la 'razón clave de la noticia verdadera' ({pista_true_simple_val}). Luego, explica por qué la otra noticia (titular: '{tit_false_val}') era la falsa, usando su 'razón clave' ({pista_false_simple_val}). Termina con '¡Bien visto!'.")
    else:
        explicacion_tarea_ollama_val = (f"TAREA: El niño eligió la noticia \"{sel_data.get('HEADLINE', 'N/A')}\", pero era la falsa. La verdadera era \"{tit_true_val}\". Explícale en 1-2 frases por qué la noticia que eligió era la falsa, usando la 'razón clave de la noticia falsa' ({pista_false_simple_val}). Luego, explica por qué la noticia \"{tit_true_val}\" era la verdadera, usando su 'razón clave' ({pista_true_simple_val}). Termina con '¡Ánimo, la próxima vez seguro que lo ves mejor!'.")

    prompt_final_ollama_expl = (
        "Eres Pimpoyo, un ratoncito profesor. Explica a un niño (10-12 años) de forma breve, clara y educativa. Evita ser demasiado efusivo o usar apodos. NO repitas el titular de la noticia que te doy en la tarea, solo da la explicación.\n"
        f"Información de contexto (NO la repitas en tu respuesta, úsala para entender):\n- Pista para la noticia verdadera (titular: '{tit_true_val}'): {pista_true_simple_val}\n- Pista para la noticia falsa (titular: '{tit_false_val}'): {pista_false_simple_val}\n\n{explicacion_tarea_ollama_val}"
    )
    ollama_expl_final_val = "Fíjate bien en las pistas de cada noticia para descubrir la verdad. ¡Tú puedes!"
    if ollama_client:
        try:
            response_ollama = await ollama_client.chat(model=OLLAMA_MODEL_ANALYSIS, messages=[{"role": "user", "content": prompt_final_ollama_expl}])
            ollama_cand = response_ollama.get('message', {}).get('content', '')
            if ollama_cand: ollama_expl_final_val = ollama_cand.strip()
        except Exception as e: print(f"Error Ollama en finish_pair_selection: {e}")

    # Asegurar que noticia_data_from_json no sea None para registrar_interaccion...
    noticia_para_registrar = sel_data if sel_data else {"ID": sel_id, "CATEGORY": "DESCONOCIDA"}

    await registrar_interaccion_y_actualizar_estadisticas(
        db=database, sesion_id=current_user.sesion_id, noticia_id_json=sel_id, tipo_interaccion='DOS_NOTICIAS',
        noticia_data_from_json=noticia_para_registrar,
        respuesta_usuario="TRUE" if sel_id == true_id else "FALSE", # Refleja si eligió la que era verdadera
        es_correcto=es_corr,
        tiempo_respuesta_ms=request_data.tiempo_respuesta_ms, feedback_mostrado_param=ollama_expl_final_val)
    return FinishPairChallengeResponse(message="Resultado del desafío registrado.", es_correcto=es_corr, explanation=ollama_expl_final_val)

# Comentario encima de la función get_post_test_items
@post_test_router.get("/start", response_model=PostTestStartResponse)
async def get_post_test_items(current_user: UsuarioInDB = Depends(get_current_active_user)):
    # ... (código existente)
    if not ALL_NEWS_DATA: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Dataset de noticias no disponible.")
    if not PREGUNTAS_POST_TEST_ELECCION or len(PREGUNTAS_POST_TEST_ELECCION) < 3: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No hay suficientes preguntas de elección para el post-test.")
    num_preg_elec = 5
    preg_sel_raw = random.sample(PREGUNTAS_POST_TEST_ELECCION, min(num_preg_elec, len(PREGUNTAS_POST_TEST_ELECCION)))
    preg_frontend = [PreguntaPostTestEleccion(id_pregunta=p["id_pregunta"], texto_pregunta=p["texto_pregunta"], opciones=p["opciones"]) for p in preg_sel_raw]
    num_not_analisis = 6
    pool_analisis = [n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("DIFFICULTY_LEVEL", "").lower() in ["medio", "alto"]]
    if not pool_analisis: pool_analisis = [n for n in ALL_NEWS_DATA if isinstance(n, dict)] # Fallback a todas si no hay de nivel medio/alto

    if len(pool_analisis) == 0: # Si después del fallback sigue vacío
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay noticias en absoluto en el dataset para análisis en post-test.")

    # Asegurar que no pedimos más muestras de las disponibles
    num_not_analisis = min(num_not_analisis, len(pool_analisis))
    if num_not_analisis == 0 and len(pool_analisis) > 0: # Si pool_analisis tiene algo pero num_not_analisis se volvió 0
        num_not_analisis = 1 # Tomar al menos una si hay
    elif num_not_analisis == 0 and len(pool_analisis) == 0: # No hay nada que tomar
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay noticias disponibles para análisis en post-test tras filtros.")


    sel_not_raw = random.sample(pool_analisis, num_not_analisis)
    random.shuffle(sel_not_raw) # Barajar las seleccionadas
    not_analisis_frontend = [NoticiaParaPostTest(noticia_id_json=n.get("ID", f"unk_{i}"), headline=n.get("HEADLINE", ""), text=n.get("TEXT", ""), source=n.get("SOURCE")) for i, n in enumerate(sel_not_raw) if isinstance(n, dict)]
    return PostTestStartResponse(preguntas_eleccion=preg_frontend, noticias_para_analizar=not_analisis_frontend)

# --- Endpoint submit_post_test_answers (YA MODIFICADO ARRIBA para guardar respuestas) ---

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(news_router)
app.include_router(chat_router)
app.include_router(glossary_router)
app.include_router(guided_analysis_router, prefix="/activity/guided-analysis")
app.include_router(challenge_router)
app.include_router(post_test_router)

@app.get("/", include_in_schema=False)
async def redirect_to_docs():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
