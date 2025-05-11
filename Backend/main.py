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
from sqlalchemy import func as sqlfunc, BigInteger, Integer, ARRAY # Importa BigInteger, Integer, ARRAY
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
    OllamaMessage, # Asegúrate que OllamaMessage esté aquí
    # (NUEVO) Modelos para el Flujo de Análisis Guiado
    NoticiaParaAnalisis,
    ExplicacionInicialRequest,
    ChatGuiaResponse,
    ContinuarChatGuiaRequest,
    PostChatAnalysisPayload,
    ChatSesionNoticiaPublic, # Si planeas devolver estos objetos
    MensajeChatGuiaPublic     # Si planeas devolver estos objetos
)

load_dotenv() # Load variables from .env

# --- Constants and Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "un_secreto_muy_fuerte_y_largo_aqui") # ¡Cambia esto en producción!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1b") # Modelo para chat interactivo
OLLAMA_MODEL_ANALYSIS = os.getenv("OLLAMA_MODEL_ANALYSIS", "llama3.1b") # Modelo para análisis post-chat

# Ruta al dataset de noticias (ajusta si es necesario)
NEWS_DATASET_PATH = os.path.join(os.path.dirname(__file__), "datasets", "analyzed_test_with_stats.json")

if DATABASE_URL is None: # pragma: no cover
    print("CRITICAL ERROR: DATABASE_URL variable is not defined.")
    exit(1)
if SECRET_KEY == "un_secreto_muy_fuerte_y_largo_aqui": # pragma: no cover
    print("WARNING: SECRET_KEY is not defined in .env, using potentially insecure default value.")

# --- Carga del Dataset de Noticias ---
ALL_NEWS_DATA = []
try:
    with open(NEWS_DATASET_PATH, 'r', encoding='utf-8') as f:
        ALL_NEWS_DATA = py_json.load(f)
    print(f"INFO: Cargadas {len(ALL_NEWS_DATA)} noticias del dataset '{NEWS_DATASET_PATH}'.")
except FileNotFoundError: # pragma: no cover
    print(f"ADVERTENCIA: El archivo de dataset de noticias '{NEWS_DATASET_PATH}' no fue encontrado.")
except py_json.JSONDecodeError: # pragma: no cover
    print(f"ADVERTENCIA: El archivo de dataset de noticias '{NEWS_DATASET_PATH}' no es un JSON válido.")


# --- Listas de Indicadores y Tipos de Razonamiento (COMPLETA ESTAS LISTAS DESDE TU PDF) ---
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
    # ... (añade todos los indicadores de tu PDF)
]
LISTA_TIPOS_RAZONAMIENTO = [
    "Evaluación de fuentes", "Identificación de sesgos", "Análisis de datos/evidencia",
    "Verificación de hechos (Fact-checking)", "Detección de manipulación emocional",
    "Análisis de la lógica argumental", "Comparación con conocimiento previo",
    "Evaluación del contexto de la noticia", "Identificación de la intención del autor",
    "Diferenciación entre opinión y hecho"
    # ... (añade todos los tipos de razonamiento de tu PDF)
]

# --- Database Configuration ---
database = Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

# --- Definiciones de Tablas SQLAlchemy (Basadas en tu DDL) ---
sesiones_table = sqlalchemy.Table(
    "sesiones", metadata,
    sqlalchemy.Column("sesion_id", BigInteger, primary_key=True), # BIGSERIAL
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
    sqlalchemy.Column("sesion_id", BigInteger, sqlalchemy.ForeignKey("sesiones.sesion_id", ondelete="RESTRICT"), nullable=False),
    sqlalchemy.Column("interaccion_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.Column("noticia_id_json", sqlalchemy.String(length=255), nullable=False),
    sqlalchemy.Column("noticia_fuente_json", sqlalchemy.String(length=255)),
    sqlalchemy.Column("noticia_verdad_real_json", sqlalchemy.String(length=50), nullable=False),
    sqlalchemy.Column("noticia_tema_json", sqlalchemy.String(length=100)),
    sqlalchemy.Column("noticia_dificultad_json", sqlalchemy.String(length=50)),
    sqlalchemy.Column("noticia_tipos_razonamiento_json", ARRAY(sqlalchemy.Text)),
    sqlalchemy.Column("respuesta_usuario", sqlalchemy.String(length=50), nullable=False),
    sqlalchemy.Column("es_correcto", sqlalchemy.Boolean, nullable=False),
    sqlalchemy.Column("tiempo_respuesta_ms", Integer),
    sqlalchemy.Column("puntos_otorgados", Integer, server_default='0'),
    sqlalchemy.Column("tipo_error", sqlalchemy.String(length=100)),
    sqlalchemy.Column("feedback_mostrado", sqlalchemy.Text),
    sqlalchemy.Column("secuencia_interaccion", Integer, nullable=False),
    sqlalchemy.Column("criterios_evaluacion_ids", sqlalchemy.JSON), 
    sqlalchemy.Column("indicadores_seleccionados_usuario", ARRAY(sqlalchemy.Text)),
    sqlalchemy.UniqueConstraint('sesion_id', 'secuencia_interaccion', name='uq_sesion_secuencia_interaccion')
)

eventos_uso_table = sqlalchemy.Table(
    "eventos_uso", metadata,
    sqlalchemy.Column("evento_id", BigInteger, primary_key=True), 
    sqlalchemy.Column("sesion_id", BigInteger, sqlalchemy.ForeignKey("sesiones.sesion_id", ondelete="RESTRICT"), nullable=False),
    sqlalchemy.Column("evento_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.Column("funcionalidad_usada", sqlalchemy.String(length=255), nullable=False),
    sqlalchemy.Column("contexto", sqlalchemy.Text)
)

glosario_usuario_table = sqlalchemy.Table(
    "glosario_usuario", metadata,
    sqlalchemy.Column("id", Integer, primary_key=True), 
    sqlalchemy.Column("usuario_sesion_id", BigInteger, sqlalchemy.ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False, index=True), 
    sqlalchemy.Column("termino", sqlalchemy.String(length=100), nullable=False),
    sqlalchemy.Column("definicion", sqlalchemy.Text, nullable=False),
    sqlalchemy.Column("fecha_creacion", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.UniqueConstraint('usuario_sesion_id', 'termino', name='uq_usuario_termino_glosario')
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
    sqlalchemy.Column("mejora_comprension_evaluacion", sqlalchemy.String(length=10), nullable=True),
    sqlalchemy.Column("mejora_comprension_justificacion", sqlalchemy.Text, nullable=True)
)

mensajes_chat_guia_table = sqlalchemy.Table(
    "mensajeschatguia", metadata, 
    sqlalchemy.Column("mensaje_guia_id", BigInteger, primary_key=True), 
    sqlalchemy.Column("chat_sesion_noticia_id", BigInteger, sqlalchemy.ForeignKey("chatsesionesnoticia.chat_sesion_noticia_id", ondelete="CASCADE"), nullable=False),
    sqlalchemy.Column("emisor", sqlalchemy.String(length=50), nullable=False),
    sqlalchemy.Column("contenido", sqlalchemy.Text, nullable=False),
    sqlalchemy.Column("timestamp_mensaje", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.Column("orden_en_chat", Integer, nullable=False, autoincrement=True, unique=False)
)

# --- Password Hashing Configuration ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- FastAPI Instance and CORS ---
app = FastAPI(title="Pimpoyo API", version="1.0.0")
origins = ['*'] 
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Ollama Client Setup ---
try:
    ollama_client = ollama.Client()
    ollama_client.list() # Test connection
    print("INFO: Conexión con Ollama establecida correctamente.")
except Exception as e: # pragma: no cover
    ollama_client = None
    print(f"ADVERTENCIA: No se pudo conectar con Ollama. Funcionalidad de Chatbot estará limitada. Error: {e}")

# --- Startup/Shutdown Events ---
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

# --- Authentication Helper Functions ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") # Relative URL for token endpoint

# Define create_access_token function HERE
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

# --- Routers ---
auth_router = APIRouter(tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["Users"])
news_router = APIRouter(prefix="/news", tags=["News Data"])
chat_router = APIRouter(prefix="/bot", tags=["Chatbot"])
glossary_router = APIRouter(prefix="/glossary", tags=["Glossary"])
guided_analysis_router = APIRouter(tags=["Guided Analysis Activity"]) # Prefix will be added when including

# --- Authentication Endpoints ---
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

@auth_router.post("/token", response_model=Token) # This is the tokenUrl for OAuth2PasswordBearer
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    usuario = await get_usuario_by_apodo(form_data.username)
    if not usuario or not verify_password(form_data.password, usuario.hashed_password): # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect apodo or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token( # This function must be defined
        data={"sub": usuario.apodo, "sesion_id": usuario.sesion_id},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- User Endpoints ---
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

# --- News Data Endpoint ---
@news_router.get("/challenge", response_model=List[Any])
async def get_news_for_challenge():
    if not ALL_NEWS_DATA: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="News data source not available.")
    return ALL_NEWS_DATA

# --- Chatbot Endpoints ---
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

# --- Glossary Endpoints ---
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
        return GlossaryTermPublic.model_validate(created_term_db)
    except Exception as e: # pragma: no cover
        print(f"Error detallado al crear término del glosario: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo añadir el término al glosario.")

@glossary_router.get("/", response_model=List[GlossaryTermPublic])
async def get_user_glossary_terms(current_user: UsuarioInDB = Depends(get_current_active_user)):
    query = glosario_usuario_table.select().where(
        glosario_usuario_table.c.usuario_sesion_id == current_user.sesion_id
    ).order_by(sqlfunc.lower(glosario_usuario_table.c.termino))
    results = await database.fetch_all(query)
    return [GlossaryTermPublic.model_validate(row) for row in results]

# --- (NUEVO) Endpoints para el Flujo de Análisis Guiado ---
@guided_analysis_router.get("/next-news", response_model=NoticiaParaAnalisis)
async def get_next_guided_analysis_news_endpoint(
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    if not ollama_client: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible para análisis guiado.")
    if not ALL_NEWS_DATA: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Dataset de noticias no disponible.")

    query_seen_news = sqlalchemy.select(chat_sesiones_noticia_table.c.noticia_id_json)\
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
    if request_data.evaluacion_inicial_opcional and noticia_category:
        eval_correcta = (request_data.evaluacion_inicial_opcional == noticia_category)

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

    user_message_query = mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_id,
        emisor='usuario',
        contenido=request_data.explicacion_usuario,
        timestamp_mensaje=datetime.now(dt_timezone.utc)
    )
    await database.execute(user_message_query)

    system_prompt_content = (
        "Eres 'Pimpoyo', un chatbot guía amigable para niños de 10-12 años. Ayúdales a analizar noticias. "
        "No des respuestas directas sobre si la noticia es V/F. Usa preguntas socráticas. Anímales a considerar la fuente, "
        "el lenguaje, la evidencia, etc., basándote en estos 'Indicadores Clave de Desinformación': "
        f"{'; '.join(LISTA_INDICADORES_DESINFORMACION[:7])}... (y más) y estos 'Tipos de Razonamiento': "
        f"{'; '.join(LISTA_TIPOS_RAZONAMIENTO[:4])}... (y más). Refuerza el buen razonamiento y guía suavemente las ideas erróneas."
    )
    
    ollama_messages = [
        OllamaMessage(role="system", content=system_prompt_content),
        OllamaMessage(role="user", content=f"He leído esta noticia (Fuente: {noticia_data.get('SOURCE', 'N/A')} Titular: '{noticia_data.get('HEADLINE', '')}'). Mi explicación inicial es: {request_data.explicacion_usuario}")
    ]

    try:
        chat_ollama_response = ollama_client.chat(
            model=OLLAMA_MODEL,
            messages=[msg.model_dump() for msg in ollama_messages]
        )
        chatbot_reply_content = chat_ollama_response['message']['content']
    except Exception as e: # pragma: no cover
        print(f"Error al contactar Ollama: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al obtener respuesta del chatbot.")

    chatbot_message_query = mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_id,
        emisor='chatbot',
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
        emisor='usuario',
        contenido=request_data.mensaje_usuario,
        timestamp_mensaje=datetime.now(dt_timezone.utc)
    )
    await database.execute(user_message_query)

    history_query = mensajes_chat_guia_table.select().where(
        mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
    ).order_by(mensajes_chat_guia_table.c.orden_en_chat) 
    
    message_history_db = await database.fetch_all(history_query)
    
    ollama_messages_history = [
        OllamaMessage(role=msg["emisor"], content=msg["contenido"]) for msg in message_history_db
    ]
    
    system_prompt_content = (
        "Eres 'PimPoyo'. Continúa guiando al usuario en su análisis de la noticia. "
        "Haz preguntas socráticas y fomenta el pensamiento crítico sobre los indicadores de desinformación y los tipos de razonamiento. "
        "Mantén un tono amigable y paciente, dirigido a un público entre 9-12 años"
    )
    
    final_ollama_messages = [OllamaMessage(role="system", content=system_prompt_content)] + ollama_messages_history

    try:
        chat_ollama_response = ollama_client.chat(
            model=OLLAMA_MODEL,
            messages=[msg.model_dump() for msg in final_ollama_messages]
        )
        chatbot_reply_content = chat_ollama_response['message']['content']
    except Exception as e: # pragma: no cover
        print(f"Error al contactar Ollama: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al obtener respuesta del chatbot.")

    chatbot_message_query = mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_noticia_id,
        emisor='chatbot',
        contenido=chatbot_reply_content,
        timestamp_mensaje=datetime.now(dt_timezone.utc)
    )
    await database.execute(chatbot_message_query)

    return ChatGuiaResponse(
        chat_sesion_noticia_id=chat_sesion_noticia_id,
        respuesta_chatbot=chatbot_reply_content
    )

@guided_analysis_router.post("/finish-news/{chat_sesion_noticia_id}", status_code=status.HTTP_200_OK)
async def finish_guided_analysis_news_endpoint(
    chat_sesion_noticia_id: int,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    if not ollama_client: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible para análisis post-chat.")

    chat_sesion_query = chat_sesiones_noticia_table.select().where(
        (chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id) &
        (chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id)
    )
    chat_sesion_db = await database.fetch_one(chat_sesion_query)
    if not chat_sesion_db: # pragma: no cover
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada o no pertenece al usuario.")
    if chat_sesion_db["fecha_fin"]: # pragma: no cover
        return {"message": "El análisis para esta noticia ya había finalizado."}

    update_fecha_fin_query = chat_sesiones_noticia_table.update().where(
        chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
    ).values(fecha_fin=datetime.now(dt_timezone.utc))
    await database.execute(update_fecha_fin_query)

    history_query = mensajes_chat_guia_table.select().where(
        mensajes_chat_guia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
    ).order_by(mensajes_chat_guia_table.c.orden_en_chat)
    message_history_db = await database.fetch_all(history_query)
    
    conversation_log_str = "\n".join([f"{msg['emisor']}: {msg['contenido']}" for msg in message_history_db])
    
    noticia_data = next((n for n in ALL_NEWS_DATA if n.get("ID") == chat_sesion_db["noticia_id_json"]), None)
    noticia_text_for_analysis = f"Titular: {noticia_data.get('HEADLINE', '')}\nTexto: {noticia_data.get('TEXT', '')[:500]}..." if noticia_data else "Información de la noticia no disponible."
    noticia_verdad_real = chat_sesion_db["noticia_verdad_real_json"] or "Desconocida"
    explicacion_inicial = chat_sesion_db["explicacion_inicial_usuario"]

    post_chat_system_prompt = (
        "Eres un asistente de análisis de conversaciones experto en desinformación. Analiza la siguiente interacción "
        "entre un usuario (niño) y un chatbot guía sobre una noticia. La noticia original fue: "
        f"'{noticia_text_for_analysis}'. La veracidad real de la noticia es: '{noticia_verdad_real}'. "
        f"La explicación inicial del usuario fue: '{explicacion_inicial}'.\n"
        "Lista de Indicadores de Desinformación a considerar (selecciona de esta lista): " + "; ".join(LISTA_INDICADORES_DESINFORMACION) + ".\n"
        "Lista de Tipos de Razonamiento a considerar (selecciona de esta lista): " + "; ".join(LISTA_TIPOS_RAZONAMIENTO) + ".\n"
        "Responde ÚNICAMENTE con un objeto JSON válido que contenga los campos: "
        "'indicadores_discutidos' (lista de strings de los indicadores de la lista proporcionada que fueron relevantes o discutidos), "
        "'conceptos_abordados' (lista de strings de los conceptos de razonamiento de la lista proporcionada que se abordaron), y "
        "'mejora_comprension' (un objeto con 'evaluacion' (string: 'SI', 'NO', o 'INCIERTO') y 'justificacion' (string: breve texto))."
    )
    
    analysis_messages = [
        OllamaMessage(role="system", content=post_chat_system_prompt),
        OllamaMessage(role="user", content=f"Log de la conversación:\n{conversation_log_str}\n\nRealiza el análisis solicitado y proporciona la salida JSON.")
    ]

    indicadores_res, conceptos_res, mejora_eval_res, mejora_just_res = [], [], "INCIERTO", "Análisis no disponible."
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

            indicadores_res = parsed_payload.indicadores_discutidos
            conceptos_res = parsed_payload.conceptos_abordados
            mejora_eval_res = parsed_payload.mejora_comprension.evaluacion
            mejora_just_res = parsed_payload.mejora_comprension.justificacion

        except (py_json.JSONDecodeError, TypeError, KeyError, Exception) as e: # pragma: no cover
            print(f"Error al parsear/validar JSON del LLM para análisis post-chat: {e}\nRespuesta recibida: {analysis_content_str}")
            mejora_just_res = f"Error al procesar análisis del LLM: {str(e)[:150]}. Respuesta LLM: {analysis_content_str[:100]}"

    except Exception as e: # pragma: no cover
        print(f"Error al contactar Ollama para análisis post-chat: {e}")
        mejora_just_res = f"Error en llamada a LLM para análisis: {str(e)[:150]}"

    analysis_update_query = chat_sesiones_noticia_table.update().where(
        chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
    ).values(
        indicadores_discutidos=indicadores_res if indicadores_res else None,
        conceptos_clave_discutidos=conceptos_res if conceptos_res else None,
        mejora_comprension_evaluacion=mejora_eval_res,
        mejora_comprension_justificacion=mejora_just_res
    )
    await database.execute(analysis_update_query)
    
    return {"message": "Análisis de la noticia finalizado y resultados del post-chat procesados."}

# --- Registrar Routers ---
app.include_router(auth_router) # Sin prefijo /api/v1
app.include_router(users_router) # Sin prefijo /api/v1
app.include_router(news_router) # Sin prefijo /api/v1
app.include_router(chat_router) # Sin prefijo /api/v1
app.include_router(glossary_router) # Sin prefijo /api/v1
app.include_router(guided_analysis_router, prefix="/activity/guided-analysis") # Ajustado

# --- Redirección a docs ---
@app.get("/", include_in_schema=False)
async def redirect_to_docs():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

# --- Punto de entrada principal ---
if __name__ == "__main__": # pragma: no cover
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
