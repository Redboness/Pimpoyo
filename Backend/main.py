# main.py
import os
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone as dt_timezone # Renombrado para evitar conflicto
from jose import jwt, JWTError
from databases import Database
import sqlalchemy
from sqlalchemy import func as sqlfunc, BigInteger, Integer, ARRAY, select, update, insert, and_ # Importa BigInteger, Integer, ARRAY, y funciones SQL
from sqlalchemy.dialects.postgresql import insert as pg_insert # Para UPSERT
from fastapi.middleware.cors import CORSMiddleware
import json as py_json # Renombrar para evitar conflicto con el 'json' de FastAPI
from typing import Optional, List, Any
import ollama # Import the Ollama library
import random

# Import ALL necessary models from models.models
from models.models import (
    UserStatsResponse,
    UsuarioCreate,
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
    ChatSesionNoticiaPublic,
    MensajeChatGuiaPublic,
    # (NUEVO) Modelo para el request del desafío de dos noticias
    FinishPairChallengeRequest
)

load_dotenv() # Load variables from .env

# --- Constants and Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "un_secreto_muy_fuerte_y_largo_aqui")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
OLLAMA_MODEL_ANALYSIS = os.getenv("OLLAMA_MODEL_ANALYSIS", "gemma3:4b")
NEWS_DATASET_PATH = os.path.join(os.path.dirname(__file__), "datasets", "analyzed_test_with_stats.json")

if DATABASE_URL is None: # pragma: no cover
    print("CRITICAL ERROR: DATABASE_URL variable is not defined.")
    exit(1)
if SECRET_KEY == "un_secreto_muy_fuerte_y_largo_aqui": # pragma: no cover
    print("WARNING: SECRET_KEY is not defined in .env, using potentially insecure default value.")

ALL_NEWS_DATA = []
try:
    with open(NEWS_DATASET_PATH, 'r', encoding='utf-8') as f:
        ALL_NEWS_DATA = py_json.load(f)
    print(f"INFO: Cargadas {len(ALL_NEWS_DATA)} noticias del dataset '{NEWS_DATASET_PATH}'.")
except FileNotFoundError: # pragma: no cover
    print(f"ADVERTENCIA: El archivo de dataset de noticias '{NEWS_DATASET_PATH}' no fue encontrado.")
except py_json.JSONDecodeError: # pragma: no cover
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

database = Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

sesiones_table = sqlalchemy.Table(
    "sesiones", metadata,
    sqlalchemy.Column("sesion_id", BigInteger, primary_key=True),
    sqlalchemy.Column("apodo", sqlalchemy.String(length=50), nullable=False, unique=True, index=True),
    sqlalchemy.Column("hashed_password", sqlalchemy.String(length=255), nullable=False),
    sqlalchemy.Column("inicio_sesion_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.Column("edad", Integer, nullable=False),
    sqlalchemy.Column("genero", sqlalchemy.String(length=50)),
    sqlalchemy.Column("avatar_url", sqlalchemy.String(length=512), nullable=True),
    sqlalchemy.Column("curso_escolar", sqlalchemy.String(length=100)),
    sqlalchemy.Column("consentimiento_obtenido", sqlalchemy.Boolean, nullable=False),
    sqlalchemy.Column("puntuacion_pre_test", sqlalchemy.Float),
    sqlalchemy.Column("fin_sesion_ts", sqlalchemy.TIMESTAMP(timezone=True)),
    sqlalchemy.Column("duracion_total_sesion_seg", Integer),
    sqlalchemy.Column("puntuacion_final", sqlalchemy.Float),
    sqlalchemy.Column("interacciones_totales_sesion", Integer, server_default='0'),
    sqlalchemy.Column("precision_global_sesion", sqlalchemy.Float),
    sqlalchemy.Column("tasa_falsos_negativos_global", sqlalchemy.Float),
    sqlalchemy.Column("tasa_falsos_positivos_global", sqlalchemy.Float),
    sqlalchemy.Column("puntuacion_post_test", sqlalchemy.Float)
)

interacciones_table = sqlalchemy.Table(
    "interacciones", metadata,
    sqlalchemy.Column("interaccion_id", BigInteger, primary_key=True),
    sqlalchemy.Column("sesion_id", BigInteger, sqlalchemy.ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False), # CASCADE
    sqlalchemy.Column("interaccion_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.Column("noticia_id_json", sqlalchemy.String(length=255), nullable=False),
    sqlalchemy.Column("noticia_fuente_json", sqlalchemy.String(length=255)),
    sqlalchemy.Column("noticia_verdad_real_json", sqlalchemy.String(length=50), nullable=False),
    sqlalchemy.Column("noticia_tema_json", sqlalchemy.String(length=100)),
    sqlalchemy.Column("noticia_dificultad_json", sqlalchemy.String(length=50)),
    sqlalchemy.Column("noticia_tipos_razonamiento_json", ARRAY(sqlalchemy.Text)),
    sqlalchemy.Column("respuesta_usuario", sqlalchemy.String(length=255)), # Aumentado para "NO_EVALUADO_INICIALMENTE"
    sqlalchemy.Column("es_correcto", sqlalchemy.Boolean, nullable=True), # Permitir NULL
    sqlalchemy.Column("tiempo_respuesta_ms", Integer),
    sqlalchemy.Column("puntos_otorgados", Integer, server_default='0'),
    sqlalchemy.Column("tipo_error", sqlalchemy.String(length=100)),
    sqlalchemy.Column("feedback_mostrado", sqlalchemy.Text),
    sqlalchemy.Column("secuencia_interaccion", Integer, nullable=False),
    sqlalchemy.Column("criterios_evaluacion_ids", sqlalchemy.JSON), # Debería ser JSONB en la BD
    # Nuevas columnas de tu script SQL de CREATE TABLE
    sqlalchemy.Column("key_elements_json", ARRAY(sqlalchemy.Text)),
    sqlalchemy.Column("justification_hints_json", ARRAY(sqlalchemy.Text)),
    sqlalchemy.Column("likely_misconceptions_json", ARRAY(sqlalchemy.Text)),
    sqlalchemy.Column("indicadores_clave_detectados_noticia_json", ARRAY(sqlalchemy.Text)),
    sqlalchemy.Column("indicadores_seleccionados_o_discutidos_usuario", ARRAY(sqlalchemy.Text)),
    sqlalchemy.Column("tipo_interaccion", sqlalchemy.String(length=50), nullable=False),
    sqlalchemy.UniqueConstraint('sesion_id', 'secuencia_interaccion', name='uq_sesion_secuencia_interaccion')
)

eventos_uso_table = sqlalchemy.Table(
    "eventos_uso", metadata,
    sqlalchemy.Column("evento_id", BigInteger, primary_key=True),
    sqlalchemy.Column("sesion_id", BigInteger, sqlalchemy.ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False), # CASCADE
    sqlalchemy.Column("evento_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.Column("funcionalidad_usada", sqlalchemy.String(length=255), nullable=False),
    sqlalchemy.Column("contexto", sqlalchemy.Text)
)

glosario_usuario_table = sqlalchemy.Table(
    "glosario_usuario", metadata,
    sqlalchemy.Column("id", Integer, primary_key=True), # SERIAL en BD
    sqlalchemy.Column("usuario_sesion_id", BigInteger, sqlalchemy.ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False, index=True),
    sqlalchemy.Column("termino", sqlalchemy.String(length=100), nullable=False),
    sqlalchemy.Column("definicion", sqlalchemy.Text, nullable=False),
    sqlalchemy.Column("fecha_creacion", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.UniqueConstraint('usuario_sesion_id', 'termino', name='uq_usuario_termino_glosario') # Nombre corregido
)

estadisticas_detalladas_usuario_table = sqlalchemy.Table(
    "estadisticasdetalladasusuario", metadata,
    sqlalchemy.Column("estadistica_detalle_id", BigInteger, primary_key=True),
    sqlalchemy.Column("sesion_id", BigInteger, sqlalchemy.ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False),
    sqlalchemy.Column("tipo_criterio", sqlalchemy.String(length=100), nullable=False),
    sqlalchemy.Column("valor_criterio", sqlalchemy.Text, nullable=False),
    sqlalchemy.Column("numero_intentos", Integer, server_default='0'),
    sqlalchemy.Column("numero_aciertos", Integer, server_default='0'),
    sqlalchemy.Column("tasa_acierto", sqlalchemy.Float),
    sqlalchemy.Column("fecha_ultima_actualizacion", sqlalchemy.TIMESTAMP(timezone=True), server_default=sqlfunc.now()),
    sqlalchemy.UniqueConstraint('sesion_id', 'tipo_criterio', 'valor_criterio', name='uq_stats_detalle_usuario_criterio')
)

chat_sesiones_noticia_table = sqlalchemy.Table(
    "chatsesionesnoticia", metadata,
    sqlalchemy.Column("chat_sesion_noticia_id", BigInteger, primary_key=True),
    sqlalchemy.Column("sesion_id", BigInteger, sqlalchemy.ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False),
    sqlalchemy.Column("noticia_id_json", sqlalchemy.String(length=255), nullable=False),
    sqlalchemy.Column("fecha_inicio", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.Column("evaluacion_inicial_usuario", sqlalchemy.String(length=50), nullable=True),
    sqlalchemy.Column("explicacion_inicial_usuario", sqlalchemy.Text, nullable=False),
    sqlalchemy.Column("noticia_verdad_real_json", sqlalchemy.String(length=50), nullable=True),
    sqlalchemy.Column("evaluacion_inicial_correcta", sqlalchemy.Boolean, nullable=True),
    sqlalchemy.Column("fecha_fin", sqlalchemy.TIMESTAMP(timezone=True), nullable=True),
    sqlalchemy.Column("indicadores_discutidos", ARRAY(sqlalchemy.Text), nullable=True),
    sqlalchemy.Column("conceptos_clave_discutidos", ARRAY(sqlalchemy.Text), nullable=True),
    sqlalchemy.Column("mejora_comprension_evaluacion", sqlalchemy.String(length=10), nullable=True), # CHECK constraint en BD
    sqlalchemy.Column("mejora_comprension_justificacion", sqlalchemy.Text, nullable=True)
)

mensajes_chat_guia_table = sqlalchemy.Table(
    "mensajeschatguia", metadata,
    sqlalchemy.Column("mensaje_guia_id", BigInteger, primary_key=True),
    sqlalchemy.Column("chat_sesion_noticia_id", BigInteger, sqlalchemy.ForeignKey("chatsesionesnoticia.chat_sesion_noticia_id", ondelete="CASCADE"), nullable=False),
    sqlalchemy.Column("emisor", sqlalchemy.String(length=50), nullable=False), # CHECK constraint en BD
    sqlalchemy.Column("contenido", sqlalchemy.Text, nullable=False),
    sqlalchemy.Column("timestamp_mensaje", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.Column("orden_en_chat", Integer, nullable=False, autoincrement=True, unique=False) # SERIAL en BD
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

app = FastAPI(title="Pimpoyo API", version="1.0.0")
origins = ['*']
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    ollama_client = ollama.Client()
    ollama_client.list()
    print("INFO: Conexión con Ollama establecida correctamente.")
except Exception as e: # pragma: no cover
    ollama_client = None
    print(f"ADVERTENCIA: No se pudo conectar con Ollama. Funcionalidad de Chatbot estará limitada. Error: {e}")

@app.on_event("startup")
async def startup():
    try:
        await database.connect()
        print("INFO: Conectado a la base de datos PostgreSQL.")
    except Exception as e: # pragma: no cover
        print(f"ERROR CRÍTICO: No se pudo conectar a la base de datos: {e}")

@app.on_event("shutdown")
async def shutdown(): # pragma: no cover
    if database.is_connected:
        await database.disconnect()
        print("INFO: Desconectado de la base de datos PostgreSQL.")

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
    return UsuarioInDB(**dict(result)) if result else None

async def get_current_active_user(token: str = Depends(oauth2_scheme)) -> UsuarioInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        apodo: Optional[str] = payload.get("sub")
        if apodo is None: # pragma: no cover
            raise credentials_exception
    except JWTError as e: # pragma: no cover
        print(f"JWT Error: {e}")
        raise credentials_exception
    usuario = await get_usuario_by_apodo(apodo=apodo)
    if usuario is None: # pragma: no cover
        raise credentials_exception
    return usuario

auth_router = APIRouter(tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["Users"])
news_router = APIRouter(prefix="/news", tags=["News Data"])
chat_router = APIRouter(prefix="/bot", tags=["Chatbot"])
glossary_router = APIRouter(prefix="/glossary", tags=["Glossary"])
guided_analysis_router = APIRouter(tags=["Guided Analysis Activity"])
challenge_router = APIRouter(prefix="/challenge", tags=["Challenges"]) # Nuevo router

@auth_router.post("/register/", response_model=UsuarioPublic, status_code=status.HTTP_201_CREATED)
async def register_usuario(usuario_in: UsuarioCreate):
    existing_user = await get_usuario_by_apodo(usuario_in.apodo)
    if existing_user: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apodo already registered.")
    hashed_password = get_password_hash(usuario_in.password)
    query = sesiones_table.insert().values(
        apodo=usuario_in.apodo,
        hashed_password=hashed_password,
        edad=usuario_in.edad,
        genero=usuario_in.genero,
        avatar_url=str(usuario_in.avatar_url) if usuario_in.avatar_url else None,
        consentimiento_obtenido=usuario_in.consentimiento_obtenido,
    )
    try:
        last_record_id = await database.execute(query)
        if last_record_id is None: # pragma: no cover
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error creating user.")
        created_user_query = sesiones_table.select().where(sesiones_table.c.sesion_id == last_record_id)
        created_user_db = await database.fetch_one(created_user_query)
        if not created_user_db: # pragma: no cover
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve user after creation.")
        return UsuarioPublic(**dict(created_user_db))
    except Exception as e: # pragma: no cover
        print(f"Detailed registration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not register user. Error: {str(e)[:100]}")

@auth_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    usuario = await get_usuario_by_apodo(form_data.username)
    if not usuario or not verify_password(form_data.password, usuario.hashed_password): # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect apodo or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": usuario.apodo, "sesion_id": usuario.sesion_id},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}

@users_router.get("/me/", response_model=UsuarioPublic)
async def read_users_me(current_user: UsuarioInDB = Depends(get_current_active_user)):
    return UsuarioPublic.model_validate(current_user.model_dump())

@users_router.patch("/me/", response_model=UsuarioPublic)
async def update_usuario_me(
    usuario_update: UsuarioUpdateProfile,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    update_data = usuario_update.model_dump(exclude_unset=True)
    if "apodo" in update_data and update_data["apodo"] != current_user.apodo:
        existing_user = await get_usuario_by_apodo(update_data["apodo"])
        if existing_user and existing_user.sesion_id != current_user.sesion_id: # pragma: no cover
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That apodo is already in use.")
    if "avatar_url" in update_data:
        update_data["avatar_url"] = str(update_data["avatar_url"]).strip() if update_data["avatar_url"] else None
    if not update_data:
        return UsuarioPublic.model_validate(current_user.model_dump())
    query = sesiones_table.update().where(
        sesiones_table.c.sesion_id == current_user.sesion_id
    ).values(**update_data)
    try:
        await database.execute(query)
        updated_user_query = sesiones_table.select().where(sesiones_table.c.sesion_id == current_user.sesion_id)
        updated_user_db = await database.fetch_one(updated_user_query)
        if not updated_user_db: # pragma: no cover
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found after update.")
        return UsuarioPublic(**dict(updated_user_db))
    except Exception as e: # pragma: no cover
        print(f"Detailed profile update error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not update profile.")

@users_router.get("/me/stats", response_model=UserStatsResponse)
async def get_user_stats(current_user: UsuarioInDB = Depends(get_current_active_user)):
    total = current_user.interacciones_totales_sesion if current_user.interacciones_totales_sesion is not None else 0
    precision = current_user.precision_global_sesion
    return UserStatsResponse(total_analizadas=total, precision_global=precision)

@news_router.get("/challenge", response_model=List[Any]) # Este endpoint ya devuelve todo el dataset.
async def get_news_for_challenge(): # El frontend filtra por dificultad y selecciona pares.
    if not ALL_NEWS_DATA: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="News data source not available.")
    return ALL_NEWS_DATA

@chat_router.post("/chat", response_model=ChatResponse)
async def handle_fake_news_chat(
    request: ChatRequest,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    if not ollama_client: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    system_message_content = """
Rol: Eres un chatbot educativo y amigable llamado Pimpoyo, diseñado para niños de 10-12 años.
Misión Principal: Enseñar a identificar noticias falsas y comprender sus consecuencias.
Flujo de Interacción:
1. Tutorial Inicial: Si es apropiado, comienza con una guía rápida o consejos clave (píldoras informativas) para detectar noticias dudosas. Usa lenguaje sencillo y ejemplos claros. Sé muy breve.
2. Práctica Interactiva / Análisis de Noticias: Cuando el usuario presente una noticia o intente explicar por qué una noticia es falsa:
   - No des la respuesta directa (verdadero/falso) inmediatamente.
   - Guía sutilmente: Anímale a reflexionar haciendo preguntas sobre aspectos específicos. Ej: "¿Has revisado bien la fuente?", "¿Qué te dice la fecha de la noticia?", "¿El titular parece muy exagerado?".
   - Refuerza el esfuerzo: Valida su intento aunque no sea correcto del todo.
Estilo de Comunicación:
- Tono: Entusiasta, paciente y motivador. Como un compañero de aprendizaje.
- Extensión: Mensajes cortos y directos. Prioriza la claridad. Evita párrafos largos.
- Lenguaje: Simple, adecuado para niños de 10-12 años. Evita tecnicismos complejos.
- No afirmes lo que has recibido, es decir, si digo: Explicame como funciona X cosa, no digas: Claro, te explicaré cómo funciona X cosa (respuesta), simplemente responde a la pregunta sin repetirla.
Adaptación Personalizada (Contexto Backend):
- Ocasionalmente, podrías recibir información sobre las áreas de mejora del usuario. Usa esta información para enfocar sutilmente las preguntas o ejemplos en sus puntos débiles, ayudándole a practicar esas habilidades específicas.
Objetivo Final: Que el usuario aprenda a verificar información de forma crítica y autónoma, mediante un proceso interactivo y guiado.
"""
    messages_to_ollama = [{'role': 'system', 'content': system_message_content}]
    messages_to_ollama.extend([msg.model_dump() for msg in request.messages])
    if len(messages_to_ollama) < 2: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient messages provided.")
    try:
        response = ollama_client.chat(model=request.model, messages=messages_to_ollama)
        reply_content = response.get('message', {}).get('content', '')
        if not reply_content: # pragma: no cover
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Received empty or unexpected response from language model.")
        return ChatResponse(reply=reply_content)
    except Exception as e: # pragma: no cover
        print(f"Error interacting with Ollama in /bot/chat: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Failed to get response from language model: {e}")

@chat_router.post("/chatlibre", response_model=ChatResponse)
async def handle_free_chat(
    request: ChatRequest,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    if not ollama_client: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    system_message_content = """
Rol: Eres un chatbot educativo y amigable llamado Pimpoyo, diseñado para niños de 10-12 años.
Misión Principal: Enseñar o ayudar al usuario sobre las preguntas que tiene.
Flujo de Interacción:
1. El usuario te hará preguntas sobre temas variados, como matemáticas, historia, ciencia, etc.
2. Responde de manera clara y sencilla, proporcionando ejemplos si es necesario.
Estilo de Comunicación:
- Tono: Entusiasta, paciente y motivador. Como un compañero de aprendizaje.
- Extensión: Mensajes cortos y directos. Prioriza la claridad. Evita párrafos largos.
- Lenguaje: Simple, adecuado para niños de 10-12 años. Evita tecnicismos complejos.
- No afirmes lo que has recibido, es decir, si digo: Explicame que es el modelo llama3.1b de Meta, no digas: Claro, te explicaré cómo funciona el Modelo llama 3.1b de Meta, simplemente responde a la pregunta sin repetirla.
- Tampoco afirmes que has escuchado al usuario, es decir, no digas cosas tipo ---¡Claro! Entiendo lo que quieres decir.--- o similar, simplemente di el resto.
Objetivo Final: Que el usuario aprenda sobre la información que te pregunta, mediante un proceso interactivo y guiado.
Es IMPERATIVO que evites alucinaciones, si te hacen una pregunta no pongas información que no sea sobre la que ha dicho el usuario.
"""
    messages_to_ollama = [{'role': 'system', 'content': system_message_content}]
    messages_to_ollama.extend([msg.model_dump() for msg in request.messages])
    if len(messages_to_ollama) < 2: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient messages provided.")
    try:
        response = ollama_client.chat(model=request.model, messages=messages_to_ollama)
        reply_content = response.get('message', {}).get('content', '')
        if not reply_content: # pragma: no cover
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Received empty or unexpected response from language model.")
        return ChatResponse(reply=reply_content)
    except Exception as e: # pragma: no cover
        print(f"Error interacting with Ollama in /bot/chatlibre: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Failed to get response from language model: {e}")

@glossary_router.post("/", response_model=GlossaryTermPublic, status_code=status.HTTP_201_CREATED)
async def create_glossary_term(
    term_in: GlossaryTermCreate,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    existing_query = glosario_usuario_table.select().where(
        (glosario_usuario_table.c.usuario_sesion_id == current_user.sesion_id) &
        (sqlfunc.lower(glosario_usuario_table.c.termino) == sqlfunc.lower(term_in.termino.strip()))
    )
    existing_term = await database.fetch_one(existing_query)
    if existing_term: # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'El término "{term_in.termino}" ya existe en tu glosario.'
        )
    query = glosario_usuario_table.insert().values(
        usuario_sesion_id=current_user.sesion_id,
        termino=term_in.termino.strip(),
        definicion=term_in.definicion.strip(),
        fecha_creacion=datetime.now(dt_timezone.utc)
    )
    try:
        last_record_id = await database.execute(query)
        if last_record_id is None: # pragma: no cover
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al guardar el término en la base de datos.")
        created_query = glosario_usuario_table.select().where(glosario_usuario_table.c.id == last_record_id)
        created_term_db = await database.fetch_one(created_query)
        if not created_term_db: # pragma: no cover
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo recuperar el término después de crearlo.")
        return GlossaryTermPublic.model_validate(created_term_db) # Usar model_validate
    except Exception as e: # pragma: no cover
        print(f"Error detallado al crear término del glosario: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo añadir el término al glosario.")

@glossary_router.get("/", response_model=List[GlossaryTermPublic])
async def get_user_glossary_terms(current_user: UsuarioInDB = Depends(get_current_active_user)):
    query = glosario_usuario_table.select().where(
        glosario_usuario_table.c.usuario_sesion_id == current_user.sesion_id
    ).order_by(sqlfunc.lower(glosario_usuario_table.c.termino))
    results = await database.fetch_all(query)
    return [GlossaryTermPublic.model_validate(row) for row in results] # Usar model_validate

@guided_analysis_router.get("/next-news", response_model=NoticiaParaAnalisis)
async def get_next_guided_analysis_news_endpoint(
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    if not ollama_client: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible para análisis guiado.")
    if not ALL_NEWS_DATA: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Dataset de noticias no disponible.")
    query_seen_news = select(chat_sesiones_noticia_table.c.noticia_id_json)\
        .where(chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id)
    seen_news_records = await database.fetch_all(query_seen_news)
    seen_news_ids = {record["noticia_id_json"] for record in seen_news_records}
    eligible_news = [
        news for news in ALL_NEWS_DATA
        if news.get("DIFFICULTY_LEVEL", "").lower() in ["medio", "alto"] and news.get("ID") not in seen_news_ids
    ]
    if not eligible_news: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay más noticias de nivel medio/alto disponibles para esta actividad.")
    selected_news_data = random.choice(eligible_news)
    return NoticiaParaAnalisis(
        noticia_id_json=selected_news_data["ID"],
        headline=selected_news_data.get("HEADLINE", "Sin titular"),
        text=selected_news_data.get("TEXT", "Sin texto"),
        source=selected_news_data.get("SOURCE"),
        difficulty_level=selected_news_data.get("DIFFICULTY_LEVEL")
    )

@guided_analysis_router.post("/explain", response_model=ChatGuiaResponse)
async def start_guided_analysis_explanation_endpoint(
    request_data: ExplicacionInicialRequest,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    if not ollama_client: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    noticia_data = next((n for n in ALL_NEWS_DATA if n.get("ID") == request_data.noticia_id_json), None)
    if not noticia_data: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Noticia no encontrada en el dataset.")

    noticia_category = noticia_data.get("CATEGORY", "").upper()
    eval_correcta = None
    if request_data.evaluacion_inicial_opcional and noticia_category and request_data.evaluacion_inicial_opcional.upper() != "UNSURE":
        eval_correcta = (request_data.evaluacion_inicial_opcional.upper() == noticia_category)

    insert_chat_sesion_query = chat_sesiones_noticia_table.insert().values(
        sesion_id=current_user.sesion_id,
        noticia_id_json=request_data.noticia_id_json,
        explicacion_inicial_usuario=request_data.explicacion_usuario,
        evaluacion_inicial_usuario=request_data.evaluacion_inicial_opcional,
        noticia_verdad_real_json=noticia_category if noticia_category else None,
        evaluacion_inicial_correcta=eval_correcta,
        fecha_inicio=datetime.now(dt_timezone.utc)
    )
    chat_sesion_id = await database.execute(insert_chat_sesion_query)
    if not chat_sesion_id: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo crear la sesión de chat.")

    user_first_message_content = f"Evaluación: {request_data.evaluacion_inicial_opcional or 'No especificada'}. Análisis: {request_data.explicacion_usuario}"
    user_message_query = mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_id,
        emisor='usuario', # Guardas 'usuario' en la BD
        contenido=user_first_message_content,
        timestamp_mensaje=datetime.now(dt_timezone.utc)
    )
    await database.execute(user_message_query)

    system_prompt_content = (
        "Rol: Eres 'Pimpoyo', un chatbot educativo y amigable para niños de 10-12 años. "
        "Contexto: El usuario acaba de leer una noticia y te ha dado su evaluación inicial (si es verdadera o falsa) y un análisis de por qué lo piensa."
        "Tu Misión Principal: NO debes decirle si su evaluación o análisis son correctos o incorrectos. "
        "En lugar de eso, actúa como un guía socrático. Revisa cuidadosamente su explicación. "
        "Si identificas puntos débiles, omisiones importantes o razonamientos que podrían mejorarse, hazle preguntas abiertas y específicas que le inviten a reflexionar más profundamente sobre esos aspectos. "
        "Si menciona algo particularmente acertado o un buen punto de análisis, puedes reforzarlo positivamente de forma sutil (ej: 'Es interesante que te hayas fijado en...'). "
        "Anímale a considerar elementos como la fuente de la noticia, el lenguaje utilizado, la evidencia presentada (o la falta de ella), posibles sesgos, etc. "
        "El objetivo es que el usuario, a través de tus preguntas, refine su propio análisis y desarrolle su pensamiento crítico. "
        "Estilo de Comunicación: Mantén un tono entusiasta, paciente y motivador. Usa un lenguaje sencillo y adecuado para su edad. Sé breve en tus respuestas y prioriza hacer preguntas."
        "ABSOLUTAMENTE PROHIBIDO: Revelar la veracidad (verdadera o falsa) de la noticia o juzgar directamente la respuesta del usuario como 'bien' o 'mal'."
        "Ejemplo de inicio de conversación (después de que el usuario ha hablado): '¡Gracias por compartir tu análisis! Has mencionado que [algo que dijo el usuario]. ¿Qué te hace pensar específicamente eso sobre [aspecto de la noticia]?' o 'Has evaluado la noticia como [V/F]. Respecto a [un indicador como la fuente o el titular], ¿hay algo que te llame la atención?'"
    )

    # Al construir el mensaje para Ollama, usa el rol correcto
    ollama_messages = [
        OllamaMessage(role="system", content=system_prompt_content),
        OllamaMessage(role="user", content=user_first_message_content) # 'user' para Ollama
    ]

    try:
        chat_ollama_response = ollama_client.chat(
            model=OLLAMA_MODEL,
            messages=[msg.model_dump() for msg in ollama_messages]
        )
        chatbot_reply_content = chat_ollama_response['message']['content']
    except Exception as e: # pragma: no cover
        print(f"Error al contactar Ollama en /explain: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al obtener respuesta inicial del chatbot guía: {str(e)}")

    chatbot_message_query = mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_id,
        emisor='chatbot', # Guardas 'chatbot' en la BD
        contenido=chatbot_reply_content,
        timestamp_mensaje=datetime.now(dt_timezone.utc)
    )
    await database.execute(chatbot_message_query)

    return ChatGuiaResponse(
        chat_sesion_noticia_id=chat_sesion_id,
        respuesta_chatbot=chatbot_reply_content
    )

@guided_analysis_router.post("/chat/{chat_sesion_noticia_id}/continue", response_model=ChatGuiaResponse)
async def continue_guided_analysis_chat_endpoint(
    chat_sesion_noticia_id: int,
    request_data: ContinuarChatGuiaRequest,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    if not ollama_client: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")

    chat_sesion_query = chat_sesiones_noticia_table.select().where(
        (chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id) &
        (chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id)
    )
    chat_sesion_db = await database.fetch_one(chat_sesion_query)
    if not chat_sesion_db: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada o no pertenece al usuario.")
    if chat_sesion_db["fecha_fin"]: # pragma: no cover
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta sesión de chat ya ha finalizado.")

    user_message_query = mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_noticia_id,
        emisor='usuario', # Guardas 'usuario' en la BD
        contenido=request_data.mensaje_usuario,
        timestamp_mensaje=datetime.now(dt_timezone.utc)
    )
    await database.execute(user_message_query)

    history_query = mensajes_chat_guia_table.select().where(
        mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
    ).order_by(mensajes_chat_guia_table.c.mensaje_guia_id)

    message_history_db = await database.fetch_all(history_query)

    # MAPEAR ROLES CORRECTAMENTE PARA OLLAMA
    ollama_messages_history = []
    for msg_db in message_history_db:
        role_for_ollama = "user" if msg_db["emisor"] == "usuario" else "assistant"
        ollama_messages_history.append(OllamaMessage(role=role_for_ollama, content=msg_db["contenido"]))

    system_prompt_content = (
        "Rol: Eres 'Pimpoyo', un chatbot educativo y amigable para niños de 10-12 años. "
        "Contexto: Estás continuando una conversación donde guías al usuario en el análisis de una noticia. El usuario acaba de enviar un nuevo mensaje."
        "Tu Misión Principal: Sigue actuando como un guía socrático. NO debes decirle si su evaluación o análisis son correctos o incorrectos. "
        "Responde a su último mensaje y, si es apropiado, haz más preguntas para ayudarle a profundizar en su razonamiento, a considerar nuevos ángulos o a aclarar conceptos. "
        "Recuerda el objetivo: que el usuario refine su propio análisis sobre la veracidad de la noticia y desarrolle su pensamiento crítico. "
        "Estilo de Comunicación: Mantén un tono entusiasta, paciente y motivador. Lenguaje sencillo. Sé breve y prioriza preguntas."
        "ABSOLUTAMENTE PROHIBIDO: Revelar la veracidad (verdadera o falsa) de la noticia o juzgar directamente la respuesta del usuario como 'bien' o 'mal'."
        "Si el usuario pregunta directamente si está bien o mal, o cuál es la respuesta, redirige la pregunta con algo como: 'Esa es una buena pregunta, pero ¿qué te hace dudar?' o 'Antes de decirte, ¿qué pistas has encontrado tú en la noticia que te orienten?'"
    )
    final_ollama_messages = [OllamaMessage(role="system", content=system_prompt_content)] + ollama_messages_history

    try:
        chat_ollama_response = ollama_client.chat(
            model=OLLAMA_MODEL,
            messages=[msg.model_dump() for msg in final_ollama_messages]
        )
        chatbot_reply_content = chat_ollama_response['message']['content']
    except Exception as e: # pragma: no cover
        print(f"Error al contactar Ollama en /continue: {e}") # El error original venía de aquí
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al obtener respuesta del chatbot guía: {str(e)}")

    chatbot_message_query = mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_noticia_id,
        emisor='chatbot', # Guardas 'chatbot' en la BD
        contenido=chatbot_reply_content,
        timestamp_mensaje=datetime.now(dt_timezone.utc)
    )
    await database.execute(chatbot_message_query)

    return ChatGuiaResponse(
        chat_sesion_noticia_id=chat_sesion_noticia_id,
        respuesta_chatbot=chatbot_reply_content
    )

async def get_next_secuencia_interaccion(sesion_id: int) -> int:
    query = select(sqlfunc.max(interacciones_table.c.secuencia_interaccion))\
        .where(interacciones_table.c.sesion_id == sesion_id)
    max_secuencia = await database.fetch_val(query)
    return (max_secuencia or 0) + 1

async def registrar_interaccion_y_actualizar_estadisticas(
    db: Database,
    sesion_id: int,
    noticia_id_json: str,
    tipo_interaccion: str,
    noticia_data_from_json: dict, # CORREGIDO: Movido antes de los argumentos con default
    respuesta_usuario: Optional[str],
    es_correcto: Optional[bool],
    tiempo_respuesta_ms: Optional[int] = None,
    puntos_otorgados: int = 0,
    indicadores_discutidos_llm: Optional[List[str]] = None
):
    # ... (código existente para secuencia e interaccion_data) ...
    secuencia = await get_next_secuencia_interaccion(sesion_id)

    # Convertir REASONING_TYPE a lista si es una string
    reasoning_type_value = noticia_data_from_json.get("REASONING_TYPE")
    processed_reasoning_types = []
    if isinstance(reasoning_type_value, str):
        processed_reasoning_types = [r.strip() for r in reasoning_type_value.replace(' y ', ',').split(',') if r.strip()]
    elif isinstance(reasoning_type_value, list):
        processed_reasoning_types = [str(r).strip() for r in reasoning_type_value if str(r).strip()]


    interaccion_data = {
        "sesion_id": sesion_id,
        "interaccion_ts": datetime.now(dt_timezone.utc),
        "noticia_id_json": noticia_id_json,
        "noticia_fuente_json": noticia_data_from_json.get("SOURCE"),
        "noticia_verdad_real_json": noticia_data_from_json.get("CATEGORY"),
        "noticia_tema_json": noticia_data_from_json.get("TOPICS"),
        "noticia_dificultad_json": noticia_data_from_json.get("DIFFICULTY_LEVEL"),
        "noticia_tipos_razonamiento_json": processed_reasoning_types, # Usar la lista procesada
        "respuesta_usuario": respuesta_usuario,
        "es_correcto": es_correcto,
        "tiempo_respuesta_ms": tiempo_respuesta_ms,
        "puntos_otorgados": puntos_otorgados,
        "tipo_error": None,
        "feedback_mostrado": None,
        "secuencia_interaccion": secuencia,
        "key_elements_json": noticia_data_from_json.get("KEY_ELEMENTS"),
        "justification_hints_json": noticia_data_from_json.get("JUSTIFICATION_HINTS"),
        "likely_misconceptions_json": noticia_data_from_json.get("LIKELY_MISCONCEPTIONS"),
        "indicadores_clave_detectados_noticia_json": noticia_data_from_json.get("INDICADORES_CLAVE_DETECTADOS"),
        "indicadores_seleccionados_o_discutidos_usuario": indicadores_discutidos_llm,
        "tipo_interaccion": tipo_interaccion,
    }
    # ... (resto de la lógica de tipo_error e inserts) ...
    if es_correcto is False:
        if noticia_data_from_json.get("CATEGORY") == "TRUE":
            interaccion_data["tipo_error"] = "FALSO_NEGATIVO"
        elif noticia_data_from_json.get("CATEGORY") == "FALSE":
            interaccion_data["tipo_error"] = "FALSO_POSITIVO"

    insert_interaccion_query = interacciones_table.insert().values(**interaccion_data)
    await db.execute(insert_interaccion_query)

    # ... (actualización de 'sesiones') ...
    total_interacciones_query = select(sqlfunc.count(interacciones_table.c.interaccion_id))\
        .where(interacciones_table.c.sesion_id == sesion_id)
    nuevas_interacciones_totales = await db.fetch_val(total_interacciones_query) or 0

    total_aciertos_query = select(sqlfunc.count(interacciones_table.c.interaccion_id))\
        .where(and_(interacciones_table.c.sesion_id == sesion_id, interacciones_table.c.es_correcto == True))
    total_aciertos = await db.fetch_val(total_aciertos_query) or 0

    nueva_precision = (total_aciertos / nuevas_interacciones_totales) if nuevas_interacciones_totales > 0 else 0.0
    update_sesion_query = sesiones_table.update()\
        .where(sesiones_table.c.sesion_id == sesion_id)\
        .values(
            interacciones_totales_sesion=nuevas_interacciones_totales,
            precision_global_sesion=nueva_precision,
        )
    await db.execute(update_sesion_query)

    # Actualizar EstadisticasDetalladasUsuario
    criterios_a_registrar = []
    if noticia_data_from_json.get("TOPICS"):
        criterios_a_registrar.append({"tipo_criterio": "TEMA_NOTICIA", "valor_criterio": noticia_data_from_json["TOPICS"]})
    if noticia_data_from_json.get("DIFFICULTY_LEVEL"):
        criterios_a_registrar.append({"tipo_criterio": "DIFICULTAD_NOTICIA", "valor_criterio": noticia_data_from_json["DIFFICULTY_LEVEL"]})

    # Usar la lista ya procesada de razonamientos
    if processed_reasoning_types:
        for razonamiento in processed_reasoning_types:
            criterios_a_registrar.append({"tipo_criterio": "TIPO_RAZONAMIENTO_NOTICIA", "valor_criterio": razonamiento})

    if noticia_data_from_json.get("INDICADORES_CLAVE_DETECTADOS"):
        for indicador in noticia_data_from_json["INDICADORES_CLAVE_DETECTADOS"]: # Esto ya debería ser una lista según tu JSON
            criterios_a_registrar.append({"tipo_criterio": "INDICADOR_CLAVE_NOTICIA", "valor_criterio": indicador})

    if indicadores_discutidos_llm:
        for indicador_usr in indicadores_discutidos_llm:
            criterios_a_registrar.append({"tipo_criterio": "INDICADOR_USUARIO_O_DISCUTIDO", "valor_criterio": indicador_usr})

    for criterio in criterios_a_registrar:
        # Asegurarse que valor_criterio no sea demasiado largo si la columna tiene límite
        valor_criterio_str = str(criterio["valor_criterio"]) # Convertir a string por si acaso

        stmt = pg_insert(estadisticas_detalladas_usuario_table).values(
            sesion_id=sesion_id,
            tipo_criterio=criterio["tipo_criterio"],
            valor_criterio=valor_criterio_str, # Usar el string
            numero_intentos=1,
            numero_aciertos=1 if es_correcto else 0,
            tasa_acierto=1.0 if es_correcto else 0.0,
            fecha_ultima_actualizacion=datetime.now(dt_timezone.utc)
        )
        on_conflict_stmt = stmt.on_conflict_do_update(
            constraint='uq_stats_detalle_usuario_criterio',
            set_=dict(
                numero_intentos=estadisticas_detalladas_usuario_table.c.numero_intentos + 1,
                numero_aciertos=estadisticas_detalladas_usuario_table.c.numero_aciertos + (1 if es_correcto else 0),
                tasa_acierto=(sqlfunc.cast(estadisticas_detalladas_usuario_table.c.numero_aciertos, sqlalchemy.Float) + (1.0 if es_correcto else 0.0)) /
                             (estadisticas_detalladas_usuario_table.c.numero_intentos + 1.0),
                fecha_ultima_actualizacion=datetime.now(dt_timezone.utc)
            )
        )
        await db.execute(on_conflict_stmt)
    print(f"Estadísticas actualizadas para sesión {sesion_id} tras interacción con noticia {noticia_id_json}")

@guided_analysis_router.post("/finish-news/{chat_sesion_noticia_id}", status_code=status.HTTP_200_OK)
async def finish_guided_analysis_news_endpoint(
    chat_sesion_noticia_id: int,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    chat_sesion_query = chat_sesiones_noticia_table.select().where(
        (chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id) &
        (chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id)
    )
    chat_sesion_db = await database.fetch_one(chat_sesion_query)
    if not chat_sesion_db: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada o no pertenece al usuario.")

    noticia_id_json_actual = chat_sesion_db["noticia_id_json"]
    noticia_original_data = next((n for n in ALL_NEWS_DATA if n.get("ID") == noticia_id_json_actual), None)
    if not noticia_original_data: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Datos originales de la noticia {noticia_id_json_actual} no encontrados.")

    if not chat_sesion_db["fecha_fin"]:
        update_fecha_fin_query = chat_sesiones_noticia_table.update().where(
            chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
        ).values(fecha_fin=datetime.now(dt_timezone.utc))
        await database.execute(update_fecha_fin_query)

        history_query = mensajes_chat_guia_table.select().where(
            mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
        ).order_by(mensajes_chat_guia_table.c.mensaje_guia_id) # o por orden_en_chat
        message_history_db = await database.fetch_all(history_query)
        conversation_log_str = "\n".join([f"{msg['emisor']}: {msg['contenido']}" for msg in message_history_db])
        noticia_text_for_analysis = f"Titular: {noticia_original_data.get('HEADLINE', '')}\nTexto: {noticia_original_data.get('TEXT', '')[:500]}..."
        noticia_verdad_real = chat_sesion_db["noticia_verdad_real_json"] or "Desconocida"
        explicacion_inicial_usuario = chat_sesion_db["explicacion_inicial_usuario"]
        post_chat_system_prompt = (
            "Eres un asistente de análisis de conversaciones experto en desinformación. Analiza la siguiente interacción "
            "entre un usuario (niño) y un chatbot guía sobre una noticia. La noticia original fue: "
            f"'{noticia_text_for_analysis}'. La veracidad real de la noticia es: '{noticia_verdad_real}'. "
            f"La explicación inicial del usuario (que puede incluir su evaluación V/F) fue: '{explicacion_inicial_usuario}'.\n"
            "Lista de Indicadores de Desinformación a considerar (selecciona SOLAMENTE de esta lista los que fueron CLARAMENTE discutidos o muy relevantes en la conversación): " + "; ".join(LISTA_INDICADORES_DESINFORMACION) + ".\n"
            "Lista de Tipos de Razonamiento a considerar (selecciona SOLAMENTE de esta lista los que se abordaron CLARAMENTE en la conversación): " + "; ".join(LISTA_TIPOS_RAZONAMIENTO) + ".\n"
            "Responde ÚNICAMENTE con un objeto JSON válido que contenga los campos: "
            "'indicadores_discutidos' (lista de strings de los indicadores de la lista proporcionada), "
            "'conceptos_abordados' (lista de strings de los conceptos de razonamiento de la lista proporcionada), y "
            "'mejora_comprension' (un objeto con 'evaluacion' (string: 'SI', 'NO', o 'INCIERTO') y 'justificacion' (string: breve texto))."
        )
        analysis_messages = [
            OllamaMessage(role="system", content=post_chat_system_prompt),
            OllamaMessage(role="user", content=f"Log de la conversación:\n{conversation_log_str}\n\nRealiza el análisis solicitado y proporciona la salida JSON.")
        ]
        indicadores_res_llm, conceptos_res_llm, mejora_eval_res_llm, mejora_just_res_llm = [], [], "INCIERTO", "Análisis LLM no disponible."
        try:
            analysis_ollama_response = ollama_client.chat(
                model=OLLAMA_MODEL_ANALYSIS,
                messages=[msg.model_dump() for msg in analysis_messages],
                format='json'
            )
            analysis_content_str = analysis_ollama_response['message']['content']
            try:
                analysis_data_dict = py_json.loads(analysis_content_str)
                parsed_payload = PostChatAnalysisPayload.model_validate(analysis_data_dict)
                indicadores_res_llm = parsed_payload.indicadores_discutidos
                conceptos_res_llm = parsed_payload.conceptos_abordados
                mejora_eval_res_llm = parsed_payload.mejora_comprension.evaluacion
                mejora_just_res_llm = parsed_payload.mejora_comprension.justificacion
            except (py_json.JSONDecodeError, TypeError, KeyError, Exception) as e_parse:
                print(f"Error al parsear/validar JSON del LLM para análisis post-chat: {e_parse}\nRespuesta recibida: {analysis_content_str}")
                mejora_just_res_llm = f"Error al procesar análisis del LLM: {str(e_parse)[:150]}."
        except Exception as e_ollama:
            print(f"Error al contactar Ollama para análisis post-chat: {e_ollama}")
            mejora_just_res_llm = f"Error en llamada a LLM para análisis: {str(e_ollama)[:150]}."

        analysis_update_query = chat_sesiones_noticia_table.update().where(
            chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
        ).values(
            indicadores_discutidos=indicadores_res_llm if indicadores_res_llm else None,
            conceptos_clave_discutidos=conceptos_res_llm if conceptos_res_llm else None,
            mejora_comprension_evaluacion=mejora_eval_res_llm,
            mejora_comprension_justificacion=mejora_just_res_llm
        )
        await database.execute(analysis_update_query)

        respuesta_usuario_stats = chat_sesion_db["evaluacion_inicial_usuario"]
        es_correcto_stats = chat_sesion_db["evaluacion_inicial_correcta"]
        if respuesta_usuario_stats is None or respuesta_usuario_stats.upper() == "UNSURE":
            respuesta_usuario_stats = "NO_EVALUADO_INICIALMENTE"
            es_correcto_stats = None

        await registrar_interaccion_y_actualizar_estadisticas(
            db=database,
            sesion_id=current_user.sesion_id,
            noticia_id_json=noticia_id_json_actual,
            tipo_interaccion='ANALISIS_INDIVIDUAL_GUIADO',
            noticia_data_from_json=noticia_original_data,
            respuesta_usuario=respuesta_usuario_stats,
            es_correcto=es_correcto_stats,
            indicadores_discutidos_llm=list(set((indicadores_res_llm or []) + (conceptos_res_llm or []))) # Combinar y eliminar duplicados
        )
        return {"message": "Análisis de la noticia finalizado, resultados del post-chat procesados y estadísticas actualizadas."}
    else: # pragma: no cover
        return {"message": "El análisis para esta noticia ya había finalizado."}

@challenge_router.post("/finish-pair-selection", status_code=status.HTTP_200_OK)
async def finish_pair_selection_challenge(
    request_data: FinishPairChallengeRequest, # Usar el modelo Pydantic definido
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    noticia_seleccionada_data = next((n for n in ALL_NEWS_DATA if n.get("ID") == request_data.seleccion_usuario_id_json), None)
    noticia_verdadera_del_par_data = next((n for n in ALL_NEWS_DATA if n.get("ID") == request_data.noticia_verdadera_id_json), None)

    if not noticia_seleccionada_data or not noticia_verdadera_del_par_data: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Una o ambas noticias del desafío no fueron encontradas en el dataset.")

    es_correcto_usuario = (request_data.seleccion_usuario_id_json == request_data.noticia_verdadera_id_json)

    # La respuesta del usuario es su *creencia* sobre la noticia que seleccionó.
    # Si seleccionó X, y la noticia X era CATEGORY="TRUE", su `respuesta_usuario` implícita para X es "TRUE".
    # Si seleccionó Y, y la noticia Y era CATEGORY="FALSE", su `respuesta_usuario` implícita para Y es "TRUE" (porque la eligió como verdadera).
    # Para la tabla de interacciones, registramos la interacción con la noticia que el usuario *evaluó* (la que seleccionó).

    # `respuesta_usuario_para_tabla` debería ser la V/F que el usuario asignó a la `noticia_seleccionada_data`
    # Como el usuario siempre selecciona la que CREE que es verdadera, su respuesta para ESA noticia es "TRUE"
    respuesta_usuario_para_tabla = "TRUE"

    # `es_correcto_para_tabla` es si esa creencia ("TRUE") coincide con la CATEGORY real de `noticia_seleccionada_data`
    es_correcto_para_tabla = (noticia_seleccionada_data.get("CATEGORY") == "TRUE")

    await registrar_interaccion_y_actualizar_estadisticas(
        db=database,
        sesion_id=current_user.sesion_id,
        noticia_id_json=request_data.seleccion_usuario_id_json, # Registrar la noticia que el usuario evaluó
        tipo_interaccion='DOS_NOTICIAS',
        noticia_data_from_json=noticia_seleccionada_data, # Usar los datos de la noticia seleccionada
        respuesta_usuario=respuesta_usuario_para_tabla,
        es_correcto=es_correcto_para_tabla,
        tiempo_respuesta_ms=request_data.tiempo_respuesta_ms
    )
    return {"message": "Resultado del desafío de dos noticias registrado y estadísticas actualizadas.", "es_correcto": es_correcto_usuario} # Devolver si acertó el par

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(news_router)
app.include_router(chat_router)
app.include_router(glossary_router)
app.include_router(guided_analysis_router, prefix="/activity/guided-analysis")
app.include_router(challenge_router) # Asegúrate de que este router esté incluido

@app.get("/", include_in_schema=False)
async def redirect_to_docs():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

if __name__ == "__main__": # pragma: no cover
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
