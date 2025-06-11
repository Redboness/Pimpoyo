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
from sqlalchemy import func as sqlfunc, BigInteger, Integer, Float, ARRAY, select, update, insert, and_, cast, text, Column, ForeignKey, Text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from fastapi.middleware.cors import CORSMiddleware
import json as py_json
from typing import Optional, List, Any, Dict
import ollama
import random

# --- (CORRECCIÓN) Importamos desde 'data.post_test_data' que ahora contiene las preguntas y la lógica ---
from post_test_data import post_test_questions, post_test_news, score_post_test

from models.models import (
    UsuarioCreate, UsuarioInDB, UsuarioLogin, UsuarioPublic, Token, TokenData,
    UsuarioUpdateProfile, ChatRequest, ChatResponse, GlossaryTermCreate,
    GlossaryTermPublic, OllamaMessage, NoticiaParaAnalisis, ExplicacionInicialRequest,
    ChatGuiaResponse, ContinuarChatGuiaRequest, PostChatAnalysisPayload,
    MejoraComprensionSubModel, ChatSesionNoticiaPublic, MensajeChatGuiaPublic,
    FinishPairChallengeRequest, FinishPairChallengeResponse, UserDetailedStatsResponse,
    PostTestStartResponse, PostTestSubmitPayload, PostTestSubmitResponse
)

load_dotenv()

# --- Constants and Configuration ---
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

LISTA_TIPOS_RAZONAMIENTO = [
    "Evaluación de fuentes", "Identificación de sesgos", "Análisis de datos/evidencia",
    "Verificación de hechos (Fact-checking)", "Detección de manipulación emocional",
    "Análisis de la lógica argumental", "Comparación con conocimiento previo",
    "Evaluación del contexto de la noticia", "Identificación de la intención del autor",
    "Diferenciación entre opinión y hecho"
]

# --- PEGA EL NUEVO DICCIONARIO AQUÍ DEBAJO ---
CONSEJOS_COMPLETOS = [
    {"title": "CONSEJO 1: ¿QUIÉN LO DICE? 🕵️‍♀️", "text": "Fíjate siempre en quién publica la noticia. ¿Es una fuente conocida y fiable o alguien desconocido? Una fuente anónima o extraña es una señal de alerta."},
    {"title": "CONSEJO 2: ¡COMPARA, COMPARA! 🆚", "text": "Verifica la noticia buscando si otros medios conocidos y fiables también la cuentan. Si solo la encuentras en un sitio, duda."},
    {"title": "CONSEJO 3: ¡OJO A LA FECHA! 📅", "text": "Fíjate en la fecha. A veces, noticias muy antiguas se comparten como si fueran nuevas para engañar o crear confusión."},
    {"title": "CONSEJO 4: TITULARES CON TRAMPA 🎣", "text": "Desconfía de los titulares muy exagerados, alarmistas o sorprendentes. A menudo buscan tu clic, no informarte bien (clickbait)."},
    {"title": "CONSEJO 5: ¿ESTÁ BIEN ESCRITO? ✍️", "text": "Los errores de ortografía o una redacción extraña son una pista de que la noticia no es profesional y podría ser falsa."},
    {"title": "CONSEJO 6: ¿PRUEBAS O SOLO PALABRAS? 🔍", "text": "Una noticia fiable te muestra sus pruebas (datos, enlaces, nombres de expertos). Si solo da opiniones sin evidencia, desconfía."},
    {"title": "CONSEJO 7: ¿HISTORIA COMPLETA O A MEDIAS? 🧐", "text": "Intenta descubrir si la noticia cuenta diferentes puntos de vista o solo se enfoca en uno, ignorando los demás (sesgo)."},
    {"title": "CONSEJO 8: ¡CUIDADO CON LAS EMOCIONES FUERTES! 😲😠😂", "text": "Si una noticia te provoca una emoción muy fuerte de golpe (enfado, miedo), podría estar intentando que no pienses con calma y la compartas rápido."},
    {"title": "CONSEJO 9: ¿A QUIÉN LE INTERESA? 🤔", "text": "Pregúntate siempre quién se beneficia de que te creas esa noticia. Esto te puede dar pistas sobre su intención real."}
]

CONSEJOS_POR_TITULO = {c["title"]: c["text"] for c in CONSEJOS_COMPLETOS}
INDICATOR_TO_TIP_MAP = {
    # Consejo 1: Fuente
    "Fuente Fiable y Reconocida": "CONSEJO 1: ¿QUIÉN LO DICE? 🕵️‍♀️",
    "Fuente Desconocida o Dudosa": "CONSEJO 1: ¿QUIÉN LO DICE? 🕵️‍♀️",
    "Fuente Anónima o Sin Autor Claro": "CONSEJO 1: ¿QUIÉN LO DICE? 🕵️‍♀️",
    "Autor con Reputación y Credenciales": "CONSEJO 1: ¿QUIÉN LO DICE? 🕵️‍♀️",
    "Autor Sin Credenciales o Desconocido": "CONSEJO 1: ¿QUIÉN LO DICE? 🕵️‍♀️",

    # Consejo 2: Comparar
    "Confirmado por Múltiples Fuentes Fiables": "CONSEJO 2: ¡COMPARA, COMPARA! 🆚",
    "No se Encuentra en Otras Fuentes Fiables (o es desmentido)": "CONSEJO 2: ¡COMPARA, COMPARA! 🆚",

    # Consejo 3: Fecha
    "Información Desactualizada Presentada como Novedad": "CONSEJO 3: ¡OJO A LA FECHA! 📅",
    "Sin Fecha/Noticia Antigua": "CONSEJO 3: ¡OJO A LA FECHA! 📅",

    # Consejo 4: Titulares
    "Titular Sensacionalista o 'Clickbait'": "CONSEJO 4: TITULARES CON TRAMPA 🎣",
    "Titular Informativo y Coherente con el Texto": "CONSEJO 4: TITULARES CON TRAMPA 🎣",

    # Consejo 5: Escritura
    "Errores Gramaticales o de Ortografía Notorios": "CONSEJO 5: ¿ESTÁ BIEN ESCRITO? ✍️",
    "Buena Calidad de Redacción (sin errores graves)": "CONSEJO 5: ¿ESTÁ BIEN ESCRITO? ✍️",

    # Consejo 6: Pruebas
    "Falta de Pruebas o Evidencia Concreta": "CONSEJO 6: ¿PRUEBAS O SOLO PALABRAS? 🔍",
    "Aporta Pruebas Verificables (datos, estudios, enlaces)": "CONSEJO 6: ¿PRUEBAS O SOLO PALABRAS? 🔍",

    # Consejo 7: Sesgo
    "Presenta un Único Punto de Vista (sesgo de selección)": "CONSEJO 7: ¿HISTORIA COMPLETA O A MEDIAS? 🧐",
    "Presenta Diferentes Puntos de Vista (imparcialidad)": "CONSEJO 7: ¿HISTORIA COMPLETA O A MEDIAS? 🧐",

    # Consejo 8: Emociones
    "Tono Emocional, Alarmista o Sesgado": "CONSEJO 8: ¡CUIDADO CON LAS EMOCIONES FUERTES! 😲😠😂",
    "Llamada a la Acción Urgente para Compartir ('¡Pásalo!')": "CONSEJO 8: ¡CUIDADO CON LAS EMOCIONES FUERTES! 😲😠😂",

    # Consejo 9: Interés
    "Posible Conflicto de Interés o Intención Oculta": "CONSEJO 9: ¿A QUIÉN LE INTERESA? 🤔",
    "Exceso de Publicidad Invasiva o Engañosa": "CONSEJO 9: ¿A QUIÉN LE INTERESA? 🤔"
}

# --- (CORRECCIÓN) Se elimina la vieja lista de preguntas del post-test de aquí ---

database = Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

# --- (CORRECCIÓN) Se elimina la vieja lista de preguntas del post-test de aquí ---

database = Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

# --- Definiciones de Tablas (sin cambios) ---
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
respuestas_pre_test_table = sqlalchemy.Table(
    "respuestas_pre_test", metadata,
    Column("respuesta_pre_test_id", BigInteger, primary_key=True, autoincrement=True),
    Column("sesion_id", BigInteger, ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False, index=True),
    Column("id_pregunta", sqlalchemy.String(15), nullable=False, index=True),
    Column("tipo_pregunta", sqlalchemy.String(30), nullable=False),
    Column("respuesta_texto", Text, nullable=True),
    Column("respuestas_array_texto", ARRAY(Text), nullable=True),
    Column("fecha_respuesta", sqlalchemy.TIMESTAMP(timezone=True), server_default=sqlfunc.now(), nullable=False),
    sqlalchemy.UniqueConstraint('sesion_id', 'id_pregunta', name='uq_respuesta_pre_test_usuario_pregunta')
)
respuestas_post_test_table = sqlalchemy.Table(
    "respuestas_post_test", metadata,
    Column("respuesta_post_test_id", BigInteger, primary_key=True, autoincrement=True),
    Column("sesion_id", BigInteger, ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False, index=True),
    Column("id_pregunta_post_test", sqlalchemy.String(30), nullable=False, index=True),
    Column("tipo_pregunta_post_test", sqlalchemy.String(20), nullable=False),
    Column("respuesta_seleccionada", Text, nullable=False),
    Column("es_correcta", sqlalchemy.Boolean, nullable=True),
    Column("fecha_respuesta", sqlalchemy.TIMESTAMP(timezone=True), server_default=sqlfunc.now(), nullable=False),
    sqlalchemy.UniqueConstraint('sesion_id', 'id_pregunta_post_test', name='uq_respuesta_post_test_usuario_pregunta')
)
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

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

ollama_client: Optional[ollama.AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ollama_client
    try:
        await database.connect()
        print("INFO: Conectado a la base de datos PostgreSQL.")
    except Exception as e:
        print(f"ERROR CRÍTICO: No se pudo conectar a la base de datos: {e}")
    try:
        ollama_client_instance = ollama.AsyncClient()
        await ollama_client_instance.list()
        ollama_client = ollama_client_instance
        print("INFO: Conexión asíncrona con Ollama establecida correctamente.")
    except Exception as e:
        print(f"ADVERTENCIA: No se pudo conectar con Ollama (Async). Funcionalidad de Chatbot estará limitada. Error: {e}")
        ollama_client = None
    yield
    if database.is_connected:
        await database.disconnect()
        print("INFO: Desconectado de la base de datos PostgreSQL.")

app = FastAPI(title="Pimpoyo API", version="1.0.0", lifespan=lifespan)

origins = ['*']
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(dt_timezone.utc) + expires_delta
    else:
        expire = datetime.now(dt_timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_usuario_by_apodo(apodo: str) -> Optional[UsuarioInDB]:
    query = sesiones_table.select().where(sesiones_table.c.apodo == apodo)
    result = await database.fetch_one(query)
    if result:
        return UsuarioInDB(**dict(result))
    return None

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
    existing_user = await get_usuario_by_apodo(usuario_in.apodo)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apodo ya registrado.")
    hashed_password = get_password_hash(usuario_in.password)
    pre_test_id_to_db_col = {
        'P1_Horas': 'pre_s1_p1_horas_internet', 'P2_Plataformas': 'pre_s1_p2_plataformas',
        'P3_Habilidad_Tech': 'pre_s1_p3_habilidad_tech', 'P4_Charla_Peligros': 'pre_s1_p4_charla_peligros',
        'P5_Habilidad_VF': 'pre_s2_p5_habilidad_vf', 'P6_Dificultad_VF': 'pre_s2_p6_dificultad_vf',
        'P7_Estrategias': 'pre_s2_p7_estrategias_fijarse', 'P8_Fuentes_Confianza': 'pre_s2_p8_fuentes_confianza',
        'P9_Sospecha_Falsa': 'pre_s2_p9_sospecha_falsa', 'P10_Prob_Verdad': 'pre_s2_p10_probabilidad_verdad',
        'P11_VF': 'pre_s3_p11_vf_apagon', 'P11_Expl': 'pre_s3_p11_expl_apagon',
    }
    sesion_values_to_insert = {
        "apodo": usuario_in.apodo, "hashed_password": hashed_password, "edad": usuario_in.edad,
        "genero": usuario_in.genero, "avatar_url": str(usuario_in.avatar_url) if usuario_in.avatar_url else None,
        "consentimiento_obtenido": usuario_in.consentimiento_obtenido, "curso_escolar": usuario_in.curso_escolar,
        "inicio_sesion_ts": datetime.now(dt_timezone.utc),
        "pre_test_s1_perfil_puntos": usuario_in.pre_test_s1_perfil_puntos,
        "pre_test_s2_estrategias_puntos": usuario_in.pre_test_s2_estrategias_puntos,
        "pre_test_s3_practica_puntos": usuario_in.pre_test_s3_practica_puntos,
        "puntuacion_pre_test_total": usuario_in.puntuacion_pre_test_total,
    }
    if usuario_in.respuestas_pre_test:
        for question_id, answer in usuario_in.respuestas_pre_test.items():
            db_column_name = pre_test_id_to_db_col.get(question_id)
            if db_column_name:
                sesion_values_to_insert[db_column_name] = answer
    async with database.transaction():
        try:
            query_sesion = sesiones_table.insert().values(**sesion_values_to_insert)
            last_sesion_id = await database.execute(query_sesion)
            if not last_sesion_id:
                raise HTTPException(status_code=500, detail="Fallo al crear el usuario en la base de datos.")
            created_user_query = sesiones_table.select().where(sesiones_table.c.sesion_id == last_sesion_id)
            created_user_db_map = await database.fetch_one(created_user_query)
            if not created_user_db_map:
                raise HTTPException(status_code=500, detail="No se pudo recuperar el usuario tras crearlo.")
            created_user_db = UsuarioInDB(**dict(created_user_db_map))
            return UsuarioPublic.model_validate(created_user_db.model_dump())
        except Exception as e:
            print(f"Error detallado en el registro: {e}")
            raise HTTPException(status_code=400, detail="No se pudo registrar al usuario.")

@auth_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    usuario = await get_usuario_by_apodo(form_data.username)
    if not usuario or not verify_password(form_data.password, usuario.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect apodo or password", headers={"WWW-Authenticate": "Bearer"})
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": usuario.apodo, "sesion_id": usuario.sesion_id}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@users_router.get("/me/", response_model=UsuarioPublic)
async def read_users_me(current_user: UsuarioInDB = Depends(get_current_active_user)):
    return UsuarioPublic.model_validate(current_user.model_dump())

@users_router.patch("/me/", response_model=UsuarioPublic)
async def update_usuario_me(usuario_update: UsuarioUpdateProfile, current_user: UsuarioInDB = Depends(get_current_active_user)):
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

@users_router.get("/me/detailed-stats", response_model=UserDetailedStatsResponse)
async def get_user_detailed_stats(current_user: UsuarioInDB = Depends(get_current_active_user)):
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

@news_router.get("/challenge", response_model=List[Any])
async def get_news_for_challenge():
    if not ALL_NEWS_DATA:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="News data source not available.")
    return ALL_NEWS_DATA

@chat_router.post("/chat", response_model=ChatResponse)
async def handle_fake_news_chat(request: ChatRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
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

@chat_router.post("/chatlibre", response_model=ChatResponse)
async def handle_free_chat(request: ChatRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
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

@glossary_router.post("/", response_model=GlossaryTermPublic, status_code=status.HTTP_201_CREATED)
async def create_glossary_term(term_in: GlossaryTermCreate, current_user: UsuarioInDB = Depends(get_current_active_user)):
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

@glossary_router.get("/", response_model=List[GlossaryTermPublic])
async def get_user_glossary_terms(current_user: UsuarioInDB = Depends(get_current_active_user)):
    query = glosario_usuario_table.select().where(glosario_usuario_table.c.usuario_sesion_id == current_user.sesion_id).order_by(sqlfunc.lower(glosario_usuario_table.c.termino))
    results = await database.fetch_all(query)
    return [GlossaryTermPublic.model_validate(row) for row in results]

async def get_next_secuencia_interaccion(sesion_id: int, db: Database) -> int:
    query = select(sqlfunc.max(interacciones_table.c.secuencia_interaccion)).where(interacciones_table.c.sesion_id == sesion_id)
    max_secuencia = await db.fetch_val(query)
    return (max_secuencia or 0) + 1

async def registrar_interaccion_y_actualizar_estadisticas(
    db: Database, sesion_id: int, noticia_id_json: str, tipo_interaccion: str,
    noticia_data_from_json: dict, respuesta_usuario: Optional[str], es_correcto: Optional[bool],
    tiempo_respuesta_ms: Optional[int] = None, indicadores_discutidos_llm: Optional[List[str]] = None,
    feedback_mostrado_param: Optional[str] = None
):
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
        "noticia_fuente": noticia_data_from_json.get("SOURCE"), "noticia_verdad_real": noticia_data_from_json.get("CATEGORY"),
        "noticia_tema": noticia_data_from_json.get("TOPICS"), "noticia_dificultad": noticia_data_from_json.get("DIFFICULTY_LEVEL"),
        "noticia_tipos_razonamiento_json": processed_reasoning, "respuesta_usuario": respuesta_usuario, "es_correcto": es_correcto,
        "tiempo_respuesta_ms": tiempo_respuesta_ms, "puntos_otorgados": puntos_otorgados, "tipo_error": tipo_err,
        "feedback_mostrado": feedback_mostrado_param, "secuencia_interaccion": secuencia, "criterios_evaluacion_ids": None,
        "key_elements_json": noticia_data_from_json.get("KEY_ELEMENTS"), "justification_hints_json": noticia_data_from_json.get("JUSTIFICATION_HINTS"),
        "likely_misconceptions_json": noticia_data_from_json.get("LIKELY_MISCONCEPTIONS"),
        "indicadores_clave_detectados_noticia_json": noticia_data_from_json.get("INDICADORES_CLAVE_DETECTADOS"),
        "indicadores_seleccionados_usuario": indicadores_discutidos_llm, "tipo_interaccion": tipo_interaccion,
    }
    await db.execute(interacciones_table.insert().values(**inter_data))
    curr_sess_data = await db.fetch_one(select(sesiones_table.c.interacciones_totales_sesion, sesiones_table.c.aciertos_totales_sesion, sesiones_table.c.fallos_totales_sesion, sesiones_table.c.xp_actual).where(sesiones_table.c.sesion_id == sesion_id))
    if curr_sess_data:
        interactions_increment = 1 if es_correcto is not None else 0
        correct_increment = 1 if es_correcto is True else 0
        incorrect_increment = 1 if es_correcto is False else 0
        new_inter = (curr_sess_data["interacciones_totales_sesion"] or 0) + interactions_increment
        new_corr = (curr_sess_data["aciertos_totales_sesion"] or 0) + correct_increment
        new_incorr = (curr_sess_data["fallos_totales_sesion"] or 0) + incorrect_increment
        new_xp_val = (curr_sess_data["xp_actual"] or 0) + xp_ganado
        new_prec = (new_corr / new_inter) * 100 if new_inter > 0 else 0.0
        await db.execute(sesiones_table.update().where(sesiones_table.c.sesion_id == sesion_id).values(
            interacciones_totales_sesion=new_inter, aciertos_totales_sesion=new_corr, fallos_totales_sesion=new_incorr,
            precision_global_sesion=round(new_prec, 2), xp_actual=new_xp_val
        ))
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
            sesion_id=sesion_id, tipo_criterio=crit_item["tipo_criterio"], valor_criterio=val_crit_str_item,
            numero_intentos=1, numero_aciertos=acierto_crit_inc_item if es_correcto is not None else 0,
            tasa_acierto=initial_tasa_val, fecha_ultima_actualizacion=datetime.now(dt_timezone.utc)
        )
        set_vals_on_conflict = {
            "numero_intentos": estadisticas_detalladas_usuario_table.c.numero_intentos + 1,
            "fecha_ultima_actualizacion": datetime.now(dt_timezone.utc)
        }
        if es_correcto is not None:
            set_vals_on_conflict["numero_aciertos"] = estadisticas_detalladas_usuario_table.c.numero_aciertos + acierto_crit_inc_item
            set_vals_on_conflict["tasa_acierto"] = ((estadisticas_detalladas_usuario_table.c.numero_aciertos + acierto_crit_inc_item) / (cast(estadisticas_detalladas_usuario_table.c.numero_intentos, Float) + 1.0))
        await db.execute(stmt_crit_item.on_conflict_do_update(constraint='uq_stats_detalle_usuario_criterio', set_=set_vals_on_conflict))

@guided_analysis_router.get("/next-news", response_model=NoticiaParaAnalisis)
async def get_next_guided_analysis_news_endpoint(current_user: UsuarioInDB = Depends(get_current_active_user)):
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
            curr_reason_val = [r.strip() for r in reason_str_val.replace(' y ', ',').split(',') if r.strip()] if isinstance(reason_str_val, str) else [str(r).strip() for r in reason_str_val if str(r).strip()]
            for wr_val in weak_razon:
                if wr_val in curr_reason_val: targets_weak_val = True; focus_val = wr_val; break
            if targets_weak_val: pers_cand.append((news_item_data, focus_val)); continue
        if news_item_data.get("DIFFICULTY_LEVEL", "").lower() in ["medio", "alto", "bajo"]:
            other_elig.append(news_item_data)
    sel_news_data_val, focus_frontend_val = None, None
    if pers_cand:
        sel_news_tuple_val = random.choice(pers_cand); sel_news_data_val, focus_frontend_val = sel_news_tuple_val[0], sel_news_tuple_val[1]
    elif other_elig:
        sel_news_data_val = random.choice(other_elig)
    else:
        fallback_pool_val = [n_item for n_item in ALL_NEWS_DATA if isinstance(n_item, dict) and n_item.get("DIFFICULTY_LEVEL", "").lower() in ["medio", "alto", "bajo"]]
        if fallback_pool_val: sel_news_data_val = random.choice(fallback_pool_val)
        else: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay noticias disponibles.")
    if not sel_news_data_val: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se pudo seleccionar una noticia.")
    return NoticiaParaAnalisis(
        noticia_id_json=sel_news_data_val["ID"], headline=sel_news_data_val.get("HEADLINE", "Sin titular"),
        text=sel_news_data_val.get("TEXT", "Sin texto"), source=sel_news_data_val.get("SOURCE"),
        difficulty_level=sel_news_data_val.get("DIFFICULTY_LEVEL"), topics=sel_news_data_val.get("TOPICS"), area_de_enfoque_sugerida=focus_frontend_val
    )

@guided_analysis_router.post("/explain", response_model=ChatGuiaResponse)
async def start_guided_analysis_explanation_endpoint(request_data: ExplicacionInicialRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    if not ollama_client: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    noticia_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == request_data.noticia_id_json), None)
    if not noticia_data: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Noticia no encontrada.")
    cat_real = noticia_data.get("CATEGORY", "").upper()
    eval_corr_init = (request_data.evaluacion_inicial_opcional.upper() == cat_real) if request_data.evaluacion_inicial_opcional and cat_real and request_data.evaluacion_inicial_opcional.upper() != "UNSURE" else None
    chat_sess_q = chat_sesiones_noticia_table.insert().values(
        sesion_id=current_user.sesion_id, noticia_id_json=request_data.noticia_id_json,
        explicacion_inicial_usuario=request_data.explicacion_usuario, evaluacion_inicial_usuario=request_data.evaluacion_inicial_opcional,
        noticia_verdad_real_json=cat_real if cat_real else None, evaluacion_inicial_correcta=eval_corr_init,
        fecha_inicio=datetime.now(dt_timezone.utc)
    ).returning(chat_sesiones_noticia_table.c.chat_sesion_noticia_id)
    chat_sesion_id = await database.fetch_val(chat_sess_q)
    if not chat_sesion_id: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo crear sesión de chat.")
    user_msg_content = f"Evaluación del usuario: {request_data.evaluacion_inicial_opcional or 'No especificada'}. Justificación: {request_data.explicacion_usuario}"
    await database.execute(mensajes_chat_guia_table.insert().values(chat_sesion_noticia_id=chat_sesion_id, emisor='usuario', contenido=user_msg_content, orden_en_chat=1, timestamp_mensaje=datetime.now(dt_timezone.utc)))
    sys_prompt = (
        "**Persona:** Eres Pimpoyo, un ratoncito detective y profesor, experto en alfabetización mediática. Hablas con un niño de entre 10 y 14 años. Eres amigable, curioso y usas un lenguaje sencillo.\n\n"
        "**Contexto:** Un estudiante te acaba de dar su primera opinión sobre si una noticia es verdadera o falsa, junto con su justificación.\n\n"
        "**Misión Pedagógica:** Tu objetivo es guiar al estudiante para que desarrolle su espíritu crítico, no darle la respuesta. Debes actuar en dos pasos:\n\n"
        "1.  **Analiza su Razonamiento:** Lee su justificación. ¿Se ha fijado en pistas clave (la fuente, el autor, el tono del titular, el lenguaje, la falta de pruebas)? ¿O se ha basado solo en sus sentimientos u opiniones personales?\n\n"
        "2.  **Responde con una Pregunta Guía:**\n"
        "    - **Si el razonamiento es bueno (ha identificado una pista clave):** Felicítale de forma específica por esa pista. Ejemplo: '¡Qué buen ojo de detective! Fijarse en la fuente es una de las pistas más importantes.'. Luego, invítale a seguir investigando con una pregunta abierta. Ejemplo: 'Y además de la fuente, ¿notaste algo curioso en la forma en que está escrito el titular?'.\n"
        "    - **Si el razonamiento es débil o incompleto (basado en opiniones o sentimientos):** Valida su esfuerzo y redirige su atención suavemente hacia una pista concreta que no ha mencionado. Ejemplo: 'Es una primera idea interesante, ¡gracias por compartirla! Para avanzar, a los detectives nos ayuda mucho mirar la fuente. ¿La noticia dice quién la escribe? ¿Nos suena de algo?'. O bien: 'Entiendo lo que quieres decir. Ahora, pongámonos el sombrero de detective y miremos el titular. ¿Te parece que busca informar con calma o llamar mucho la atención con sorpresa o enfado?'.\n\n"
        "**Reglas de Oro:**\n"
        "- **NUNCA reveles si la noticia es Verdadera o Falsa.**\n"
        "- **Sé breve.** Haz solo una pregunta por turno para no agobiar.\n"
        "- **Sé un consejero:** Si el usuario parece atascado, puedes darle un consejo general para el futuro, como: '¡No te preocupes! Recuerda que para la próxima, las pistas más grandes suelen estar en quién escribe la noticia y en si el titular usa un lenguaje muy emocional. ¡Es cuestión de práctica!'."
    )
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

@guided_analysis_router.post("/chat/{chat_sesion_noticia_id}/continue", response_model=ChatGuiaResponse)
async def continue_guided_analysis_chat_endpoint(chat_sesion_noticia_id: int, request_data: ContinuarChatGuiaRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    if not ollama_client: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    chat_sess_db = await database.fetch_one(chat_sesiones_noticia_table.select().where((chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id) & (chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id)))
    if not chat_sess_db: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada.")
    if chat_sess_db["fecha_fin"]: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sesión de chat ya finalizada.")
    last_order_query = select(sqlfunc.max(mensajes_chat_guia_table.c.orden_en_chat)).where(mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id)
    last_order = await database.fetch_val(last_order_query) or 0
    await database.execute(mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_noticia_id, emisor='usuario', contenido=request_data.mensaje_usuario,
        timestamp_mensaje=datetime.now(dt_timezone.utc), orden_en_chat=last_order + 1))
    hist_q = mensajes_chat_guia_table.select().where(mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id).order_by(mensajes_chat_guia_table.c.orden_en_chat.asc())
    msg_hist_db = await database.fetch_all(hist_q)
    ollama_hist = [OllamaMessage(role="user" if m["emisor"] == "usuario" else "assistant", content=m["contenido"]) for m in msg_hist_db]
    sys_prompt_cont = ("Rol: Eres 'Pimpoyo', un chatbot guía para niños de 10-12 años. Ayúdalos a analizar una noticia paso a paso. Contexto: Estás continuando una conversación sobre una noticia específica que el usuario está analizando. Ya le diste un feedback conversacional inicial a su primera evaluación. Tarea: Responde a la NUEVA pregunta o comentario del usuario de forma clara y sencilla. Sigue guiándolo para que reflexione sobre la noticia. Evita dar la solución (si es verdadera o falsa la noticia) directamente. Si que puedes contestar otras preguntas sobre la noticia o cómo identificar su respuesta del usuario. Anímalo a encontrar pistas por sí mismo. Sé breve y amigable. Si el usuario parece estar atascado o pide una pista directa, puedes ofrecer una pequeña ayuda sutil.")
    final_ollama_msgs = [OllamaMessage(role="system", content=sys_prompt_cont)] + ollama_hist
    try:
        ollama_resp = await ollama_client.chat(model=OLLAMA_MODEL_ANALYSIS, messages=[msg.model_dump() for msg in final_ollama_msgs])
        reply_content = ollama_resp['message']['content'] or "Entendido. ¿Qué más quieres que veamos?"
    except Exception as e:
        print(f"Error Ollama en /continue: {e}"); reply_content = "Mis antenas de detective están cruzadas. ¿Podrías preguntarme de otra forma?"
    await database.execute(mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_noticia_id, emisor='chatbot', contenido=reply_content,
        timestamp_mensaje=datetime.now(dt_timezone.utc), orden_en_chat=last_order + 2))
    return ChatGuiaResponse(chat_sesion_noticia_id=chat_sesion_noticia_id, respuesta_chatbot=reply_content)

#
# Finaliza la sesión de análisis guiado. Esta función realiza dos acciones principales con el LLM:
# 1. Analiza toda la conversación para evaluar la mejora en la comprensión del usuario y los
#    conceptos discutidos, guardando estos datos internamente para estadísticas.
# 2. Genera una explicación pedagógica final y de alta calidad sobre por qué la noticia
#    era verdadera o falsa, la cual se muestra directamente al usuario.
# Finalmente, actualiza la base de datos con todos los resultados y devuelve el mensaje final.
#
@guided_analysis_router.post("/finish-news/{chat_sesion_noticia_id}", status_code=status.HTTP_200_OK)
async def finish_guided_analysis_news_endpoint(
    chat_sesion_noticia_id: int,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    chat_sesion_db = await database.fetch_one(
        chat_sesiones_noticia_table.select().where(
            (chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id) &
            (chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id)
        )
    )
    if not chat_sesion_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada.")

    noticia_id_json_actual = chat_sesion_db["noticia_id_json"]
    noticia_original_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == noticia_id_json_actual), None)

    llm_analysis_payload = PostChatAnalysisPayload(
        indicadores_discutidos=[],
        conceptos_abordados=[],
        mejora_comprension=MejoraComprensionSubModel(evaluacion="INCIERTO", justificacion="Análisis LLM no realizado o fallido.")
    )
    pedagogical_explanation = ""

    # --- TAREA 1: ANÁLISIS DE LA CONVERSACIÓN (PARA GUARDAR EN BBDD) ---
    if ollama_client and noticia_original_data and not chat_sesion_db["fecha_fin"]:
        history_query = mensajes_chat_guia_table.select().where(
            mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
        ).order_by(mensajes_chat_guia_table.c.orden_en_chat.asc())
        message_history_db = await database.fetch_all(history_query)
        conversation_text = "\n".join([f"{msg['emisor'].upper()}: {msg['contenido']}" for msg in message_history_db])

        prompt_for_llm_analysis = f"""
Rol: Eres un evaluador experto de conversaciones educativas sobre análisis de noticias para niños (10-12 años).
Tarea: Analiza la siguiente conversación entre un usuario y un guía. Determina qué indicadores y conceptos se discutieron, y si el usuario mejoró su comprensión.
Detalles de la Noticia: Titular: "{noticia_original_data.get("HEADLINE", "N/A")}"
Conversación:
---
{conversation_text}
---
Basado en la conversación, responde ÚNICAMENTE en formato JSON válido con la siguiente estructura:
{{
  "indicadores_discutidos": ["lista de indicadores de desinformación mencionados (ej. 'Fuente Anónima', 'Titular Sensacionalista')"],
  "conceptos_abordados": ["lista de conceptos de pensamiento crítico (ej. 'evaluación de fuentes', 'diferenciar hecho de opinión')"],
  "mejora_comprension": {{
    "evaluacion": "string ('SI', 'NO', o 'INCIERTO')",
    "justificacion": "string (justificación breve de tu evaluación sobre la mejora de la comprensión)"
  }}
}}
"""
        try:
            ollama_params = {"model": OLLAMA_MODEL_ANALYSIS, "messages": [{"role": "user", "content": prompt_for_llm_analysis}], "format": "json", "stream": False}
            response_llm = await ollama_client.chat(**ollama_params)
            llm_reply_content = response_llm.get('message', {}).get('content', '').strip()
            parsed_llm_data = py_json.loads(llm_reply_content)
            llm_analysis_payload = PostChatAnalysisPayload(**parsed_llm_data)
        except Exception as e:
            print(f"ERROR: Fallo en TAREA 1 (Análisis de chat) para chat {chat_sesion_noticia_id}: {e}")
            # Se usará el payload por defecto inicializado arriba

    # --- TAREA 2: GENERACIÓN DE LA EXPLICACIÓN PEDAGÓGICA (PARA MOSTRAR AL USUARIO) ---
    if ollama_client and noticia_original_data and noticia_original_data.get("CATEGORY") != "DESCONOCIDA":
        try:
            is_true = noticia_original_data.get("CATEGORY", "").upper() == "TRUE"
            verdad_falsedad_text = "Verdadera" if is_true else "Falsa"
            key_indicators = noticia_original_data.get("INDICADORES_CLAVE_DETECTADOS", [])
            relevant_tips = list(set([INDICATOR_TO_TIP_MAP[ind] for ind in key_indicators if ind in INDICATOR_TO_TIP_MAP]))
            relevant_tips_text = ", ".join(relevant_tips) if relevant_tips else "Ninguno específico."
            context_data = {"Titular": noticia_original_data.get('HEADLINE', ''), "Pistas para Justificar": ", ".join(noticia_original_data.get('JUSTIFICATION_HINTS', []))}
            context_text = "\n".join([f"- {key}: {value}" for key, value in context_data.items() if value])

            # PROMPT FINAL, ENFOCADO EN DIÁLOGO VS. ACCIÓN
            explanation_prompt = (
                "**Persona:** Eres Pimpoyo, un profesor y detective experto que da la conclusión final de un caso a un niño de 10-14 años.\n\n"
                "**Misión:** Explicar de forma pedagógica por qué una noticia era {verdad_falsedad_text}, conectando la explicación con los 'Consejos de Detective' relevantes.\n\n"
                "**Formato de Respuesta:**\n"
                "Tu respuesta debe ser exclusivamente el diálogo del personaje, como si fuera la línea de un guion. No incluyas acotaciones escénicas, descripciones de acciones o gestos (ej: '(sonríe)', '(mira fijamente)'). Céntrate solo en las palabras que diría el personaje.\n\n"
                "**Datos del Caso para tu Análisis:**\n"
                "```\n"
                "Resultado: La noticia es {verdad_falsedad_text}\n"
                "Contexto de la noticia: {context_text}\n"
                "Consejos de Detective más Relevantes para este caso: {relevant_tips_text}\n"
                "```\n\n"
                "**Reglas Adicionales:**\n"
                "1.  **SÉ DIRECTO Y CONCISO:** Usa 2-4 frases como máximo.\n"
                "2.  **NOMBRA LOS CONSEJOS:** Debes mencionar explícitamente el nombre del 'Consejo de Detective' más relevante para este caso.\n\n"
                "**Ejemplo de Respuesta Perfecta (solo diálogo):** La pista más importante aquí era la fuente. Al ser un 'informe filtrado' anónimo, no podíamos confiar en ella. ¡Aquí se aplicaba perfectamente el **CONSEJO 1: ¿QUIÉN LO DICE? 🕵️‍♀️** y el **CONSEJO 4: TITULARES CON TRAMPA 🎣**!\n"
            ).format(
                verdad_falsedad_text=verdad_falsedad_text,
                context_text=context_text,
                relevant_tips_text=relevant_tips_text
            )

            response_llm_exp = await ollama_client.chat(model=OLLAMA_MODEL_ANALYSIS, messages=[{"role": "user", "content": explanation_prompt}])
            # La respuesta ahora se usa directamente, sin limpieza de código.
            pedagogical_explanation = response_llm_exp.get('message', {}).get('content', '').strip()

        except Exception as e:
            print(f"ERROR: Fallo en TAREA 2 (Generación de explicación) para chat {chat_sesion_noticia_id}: {e}")
            pedagogical_explanation = "Recuerda siempre analizar las pistas con cuidado."

    # --- CONSTRUCCIÓN DEL MENSAJE FINAL Y GUARDADO EN BBDD ---
    feedback_message_parts = []
    if noticia_original_data:
        titular_noticia_feedback = noticia_original_data.get("HEADLINE", "esta noticia")
        evaluacion_correcta_db = chat_sesion_db["evaluacion_inicial_correcta"]
        categoria_real_noticia_json = noticia_original_data.get("CATEGORY", "Desconocida").upper()
        feedback_message_parts.append(f"¡Análisis de \"{titular_noticia_feedback}\" finalizado! ")
        categoria_real_display_text = "**Verdadera**" if categoria_real_noticia_json == "TRUE" else "**Falsa**"
        if isinstance(evaluacion_correcta_db, bool):
            if evaluacion_correcta_db: feedback_message_parts.append(f"¡Muy bien! 👍 Tu primera impresión fue correcta. La noticia era {categoria_real_display_text}.")
            else: feedback_message_parts.append(f"Tu primera impresión fue diferente. Resulta que la noticia era {categoria_real_display_text}.")
        else: feedback_message_parts.append(f"La noticia era {categoria_real_display_text}.")
    else:
        noticia_original_data = {"ID": noticia_id_json_actual, "CATEGORY": "DESCONOCIDA"}
        feedback_message_parts.append("¡Análisis completado!")

    if pedagogical_explanation:
        feedback_message_parts.append(f"\n\n**¿Y por qué?**\n>{pedagogical_explanation}")

    if isinstance(chat_sesion_db["evaluacion_inicial_correcta"], bool) and chat_sesion_db["evaluacion_inicial_correcta"]:
        feedback_message_parts.append("\n\n¡Sigue así, vas por buen camino detectando noticias!")
    else:
        feedback_message_parts.append("\n\n¡No te desanimes! Cada noticia es una nueva oportunidad para aprender.")

    final_feedback_message = "".join(feedback_message_parts)

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

        await registrar_interaccion_y_actualizar_estadisticas(
            db=database, sesion_id=current_user.sesion_id, noticia_id_json=noticia_id_json_actual,
            tipo_interaccion='ANALISIS_INDIVIDUAL_GUIADO_FINALIZADO',
            noticia_data_from_json=noticia_original_data,
            respuesta_usuario=chat_sesion_db["evaluacion_inicial_usuario"] or "NO_EVALUADO",
            es_correcto=chat_sesion_db["evaluacion_inicial_correcta"],
            feedback_mostrado_param=final_feedback_message,
            indicadores_discutidos_llm=llm_analysis_payload.indicadores_discutidos
        )

    return {"message": final_feedback_message}

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



@post_test_router.get("/start", response_model=PostTestStartResponse)
async def get_post_test_items(current_user: UsuarioInDB = Depends(get_current_active_user)):
    """
    Entrega al frontend el conjunto completo y ordenado de preguntas y noticias
    necesarias para realizar el Post-Test, tal como se define en el PDF.
    """
    # La lógica ahora es simple: devolver los datos importados del fichero de configuración.
    # Ya no hay selección aleatoria aquí.
    return PostTestStartResponse(
        preguntas=post_test_questions,
        noticias_para_analizar=post_test_news
    )

@post_test_router.post("/submit", response_model=PostTestSubmitResponse)
async def submit_post_test_answers(
    payload: PostTestSubmitPayload,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    """
    Recibe las respuestas del Post-Test, las corrige usando la lógica
    centralizada, guarda las puntuaciones y respuestas en la BBDD,
    y devuelve el resultado desglosado.
    """
    # 1. Corregir el test usando la lógica de 'data/post_test_data.py'
    resultados = score_post_test(payload)

    # 2. Preparar los datos para guardar en la base de datos
    db_update_data = {
        "puntuacion_post_test_total": resultados["puntuacion_total"],
        "puntuacion_final": resultados["puntuacion_total"],  # Actualizamos también la puntuación final general
        "fin_sesion_ts": datetime.now(dt_timezone.utc),
    }

    # Mapeo de puntuaciones por sección a las columnas de la BBDD
    for seccion in resultados["puntuaciones_por_seccion"]:
        if seccion["seccion_id"] == "s1":
            db_update_data["post_test_s1_estrategias_puntos"] = seccion["puntos_obtenidos"]
        elif seccion["seccion_id"] == "s2":
            db_update_data["post_test_s2_aprendizaje_puntos"] = seccion["puntos_obtenidos"]
        elif seccion["seccion_id"] == "s3":
            db_update_data["post_test_s3_practica_puntos"] = seccion["puntos_obtenidos"]
        elif seccion["seccion_id"] == "s4":
            db_update_data["post_test_s4_ux_puntos"] = seccion["puntos_obtenidos"]

    # Mapeo de respuestas de texto (abiertas y de elección) a sus columnas
    all_options_map = {opt['id']: opt['text'] for q in post_test_questions if q.get('opciones') for opt in q['opciones']}

    single_choice_map = {
        "s1_p1": "post_s1_p1_habilidad_vf_post", "s1_p2": "post_s1_p2_dificultad_vf_post",
        "s2_p9": "post_s2_p9_aprendizaje_escala", "s4_p12": "post_s4_p12_facilidad_uso_escala",
        "s4_p13": "post_s4_p13_utilidad_pistas_escala", "s4_p18": "post_s4_p18_frecuencia_aplicacion_escala",
    }
    multi_choice_map = {
        "s1_p3": "post_s1_p3_estrategias_post", "s1_p4": "post_s1_p4_fuentes_post",
        "s1_p5": "post_s1_p5_sospecha_falsa_post", "s1_p6": "post_s1_p6_probabilidad_verdad_post",
    }

    for resp in payload.respuestas_eleccion:
        if resp.id_pregunta in single_choice_map:
            col_db = single_choice_map[resp.id_pregunta]
            respuesta_texto = all_options_map.get(resp.respuestas_seleccionadas[0], "N/A")
            db_update_data[col_db] = respuesta_texto
        elif resp.id_pregunta in multi_choice_map:
            col_db = multi_choice_map[resp.id_pregunta]
            respuestas_texto = [all_options_map.get(opt_id, "N/A") for opt_id in resp.respuestas_seleccionadas]
            db_update_data[col_db] = respuestas_texto

    for resp in payload.respuestas_texto:
        if resp.id_pregunta == "s2_p7": db_update_data["post_s2_p7_aprendizaje_abierta"] = resp.texto_respuesta
        if resp.id_pregunta == "s2_p8": db_update_data["post_s2_p8_cambio_forma_ver_abierta"] = resp.texto_respuesta
        if resp.id_pregunta == "s4_p14_15":
            db_update_data["post_s4_p14_que_gusto_abierta"] = resp.texto_respuesta
            db_update_data["post_s4_p15_que_no_gusto_abierta"] = resp.texto_respuesta

    for resp in payload.respuestas_analisis:
        if resp.noticia_id_json == "post_test_apagon_falsa":
            db_update_data["post_s3_p11_vf_apagon_post"] = resp.evaluacion_usuario
            db_update_data["post_s3_p11_expl_apagon_post"] = resp.justificacion

    # 3. Actualizar la base de datos
    try:
        query = sesiones_table.update().where(sesiones_table.c.sesion_id == current_user.sesion_id).values(**db_update_data)
        await database.execute(query)
    except Exception as e:
        print(f"Error al guardar los resultados del post-test en la BBDD para usuario {current_user.sesion_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron guardar los resultados del test.")

    # 4. Devolver la respuesta completa al frontend
    return PostTestSubmitResponse(**resultados, message="Test completado y guardado con éxito.")

# --- (FIN DE LA SECCIÓN A MODIFICAR) ---

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
