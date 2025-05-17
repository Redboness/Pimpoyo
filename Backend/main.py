# main.py
import os
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone as dt_timezone
from jose import jwt, JWTError
from databases import Database
import sqlalchemy
# Importaciones SQLAlchemy actualizadas
from sqlalchemy import func as sqlfunc, BigInteger, Integer, Float, ARRAY, select, update, insert, and_, cast
from sqlalchemy.dialects.postgresql import insert as pg_insert
from fastapi.middleware.cors import CORSMiddleware
import json as py_json
from typing import Optional, List, Any
import ollama
import random
import math # Importar math

from models.models import (
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
    NoticiaParaAnalisis, # Asegúrate de que este modelo en models.py tenga area_de_enfoque_sugerida
    ExplicacionInicialRequest,
    ChatGuiaResponse,
    ContinuarChatGuiaRequest,
    PostChatAnalysisPayload,
    ChatSesionNoticiaPublic,
    MensajeChatGuiaPublic,
    FinishPairChallengeRequest,
    UserDetailedStatsResponse
)

load_dotenv()

# --- Constants and Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "un_secreto_muy_fuerte_y_largo_aqui")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
OLLAMA_MODEL_ANALYSIS = os.getenv("OLLAMA_MODEL_ANALYSIS", "gemma3:4b") # Usado para explicaciones de feedback
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
    sqlalchemy.Column("puntuacion_pre_test", Float),
    sqlalchemy.Column("fin_sesion_ts", sqlalchemy.TIMESTAMP(timezone=True)),
    sqlalchemy.Column("duracion_total_sesion_seg", Integer),
    sqlalchemy.Column("puntuacion_final", Float),
    sqlalchemy.Column("interacciones_totales_sesion", Integer, server_default='0'),
    sqlalchemy.Column("aciertos_totales_sesion", Integer, server_default='0'),
    sqlalchemy.Column("fallos_totales_sesion", Integer, server_default='0'),
    sqlalchemy.Column("precision_global_sesion", Float),
    sqlalchemy.Column("xp_actual", Integer, server_default='0'),
    sqlalchemy.Column("tasa_falsos_negativos_global", Float),
    sqlalchemy.Column("tasa_falsos_positivos_global", Float),
    sqlalchemy.Column("puntuacion_post_test", Float)
)

interacciones_table = sqlalchemy.Table(
    "interacciones", metadata,
    sqlalchemy.Column("interaccion_id", BigInteger, primary_key=True),
    sqlalchemy.Column("sesion_id", BigInteger, sqlalchemy.ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False),
    sqlalchemy.Column("interaccion_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlfunc.now()),
    sqlalchemy.Column("noticia_id", sqlalchemy.String(length=255), nullable=False),
    sqlalchemy.Column("noticia_fuente", sqlalchemy.String(length=255)),
    sqlalchemy.Column("noticia_verdad_real", sqlalchemy.String(length=50), nullable=False),
    sqlalchemy.Column("noticia_tema", sqlalchemy.String(length=100)),
    sqlalchemy.Column("noticia_dificultad", sqlalchemy.String(length=50)),
    sqlalchemy.Column("noticia_tipos_razonamiento_json", ARRAY(sqlalchemy.Text)),
    sqlalchemy.Column("respuesta_usuario", sqlalchemy.String(length=255)), 
    sqlalchemy.Column("es_correcto", sqlalchemy.Boolean, nullable=True), 
    sqlalchemy.Column("tiempo_respuesta_ms", Integer),
    sqlalchemy.Column("puntos_otorgados", Integer, server_default='0'),
    sqlalchemy.Column("tipo_error", sqlalchemy.String(length=100)),
    sqlalchemy.Column("feedback_mostrado", sqlalchemy.Text),
    sqlalchemy.Column("secuencia_interaccion", Integer, nullable=False),
    sqlalchemy.Column("criterios_evaluacion_ids", sqlalchemy.JSON),
    sqlalchemy.Column("indicadores_seleccionados_usuario", ARRAY(sqlalchemy.Text)), 
    sqlalchemy.Column("tipo_interaccion", sqlalchemy.String(length=50), nullable=False),
    sqlalchemy.UniqueConstraint('sesion_id', 'secuencia_interaccion', name='uq_sesion_secuencia_interaccion')
)
eventos_uso_table = sqlalchemy.Table(
    "eventos_uso", metadata,
    sqlalchemy.Column("evento_id", BigInteger, primary_key=True),
    sqlalchemy.Column("sesion_id", BigInteger, sqlalchemy.ForeignKey("sesiones.sesion_id", ondelete="CASCADE"), nullable=False),
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
    sqlalchemy.Column("tasa_acierto", Float),
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
    # Podrías añadir aquí una columna para `area_de_enfoque_sugerida` si quieres persistirla
    # sqlalchemy.Column("area_de_enfoque_sugerida_guardada", sqlalchemy.String(length=255), nullable=True)
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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Comentario encima de la función verify_password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
# Comentario encima de la función get_password_hash
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
except Exception as e:
    ollama_client = None
    print(f"ADVERTENCIA: No se pudo conectar con Ollama. Funcionalidad de Chatbot estará limitada. Error: {e}")

@app.on_event("startup")
async def startup():
    try:
        await database.connect()
        print("INFO: Conectado a la base de datos PostgreSQL.")
    except Exception as e:
        print(f"ERROR CRÍTICO: No se pudo conectar a la base de datos: {e}")

@app.on_event("shutdown")
async def shutdown():
    if database.is_connected:
        await database.disconnect()
        print("INFO: Desconectado de la base de datos PostgreSQL.")

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
    return UsuarioInDB(**dict(result)) if result else None
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

@auth_router.post("/register/", response_model=UsuarioPublic, status_code=status.HTTP_201_CREATED)
async def register_usuario(usuario_in: UsuarioCreate):
    existing_user = await get_usuario_by_apodo(usuario_in.apodo)
    if existing_user:
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
        if last_record_id is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error creating user.")
        created_user_query = sesiones_table.select().where(sesiones_table.c.sesion_id == last_record_id)
        created_user_db = await database.fetch_one(created_user_query)
        if not created_user_db:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve user after creation.")
        return UsuarioPublic(**dict(created_user_db))
    except Exception as e:
        print(f"Detailed registration error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not register user. Error: {str(e)[:100]}")

@auth_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    usuario = await get_usuario_by_apodo(form_data.username)
    if not usuario or not verify_password(form_data.password, usuario.hashed_password):
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
async def update_usuario_me(usuario_update: UsuarioUpdateProfile, current_user: UsuarioInDB = Depends(get_current_active_user)):
    update_data = usuario_update.model_dump(exclude_unset=True)
    if "apodo" in update_data and update_data["apodo"] != current_user.apodo:
        existing_user = await get_usuario_by_apodo(update_data["apodo"])
        if existing_user and existing_user.sesion_id != current_user.sesion_id:
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
        if not updated_user_db:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found after update.")
        return UsuarioPublic(**dict(updated_user_db))
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
        if xp_actual < level_xp:
            xp_next_level = level_xp
            break
    if xp_actual >= XP_NIVELES[-1]: 
        xp_next_level = xp_actual + 50 

    return UserDetailedStatsResponse(
        totalAnalizadas=total_analizadas,
        aciertos=aciertos,
        fallos=fallos,
        xp=xp_actual,
        xpNextLevel=xp_next_level
    )

@news_router.get("/challenge", response_model=List[Any])
async def get_news_for_challenge():
    if not ALL_NEWS_DATA:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="News data source not available.")
    return ALL_NEWS_DATA

@chat_router.post("/chat", response_model=ChatResponse)
async def handle_fake_news_chat(request: ChatRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    if not ollama_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    messages_to_ollama = [msg.model_dump() for msg in request.messages]
    if not messages_to_ollama or messages_to_ollama[0]['role'] != 'system':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="System message is missing or not first.")
    if len(messages_to_ollama) < 2: 
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient messages provided.")
    try:
        response = ollama_client.chat(model=request.model, messages=messages_to_ollama)
        reply_content = response.get('message', {}).get('content', '')
        if not reply_content:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Received empty response from language model.")
        return ChatResponse(reply=reply_content)
    except Exception as e:
        print(f"Error interacting with Ollama in /bot/chat: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Failed to get response from language model: {str(e)}")

@chat_router.post("/chatlibre", response_model=ChatResponse)
async def handle_free_chat(request: ChatRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    if not ollama_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    messages_to_ollama = [msg.model_dump() for msg in request.messages]
    if not messages_to_ollama or messages_to_ollama[0]['role'] != 'system':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="System message is missing or not first.")
    if len(messages_to_ollama) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient messages provided.")
    try:
        response = ollama_client.chat(model=request.model, messages=messages_to_ollama)
        reply_content = response.get('message', {}).get('content', '')
        if not reply_content:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Received empty response from language model.")
        return ChatResponse(reply=reply_content)
    except Exception as e:
        print(f"Error interacting with Ollama in /bot/chatlibre: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Failed to get response from language model: {str(e)}")


@glossary_router.post("/", response_model=GlossaryTermPublic, status_code=status.HTTP_201_CREATED)
async def create_glossary_term(term_in: GlossaryTermCreate, current_user: UsuarioInDB = Depends(get_current_active_user)):
    existing_query = glosario_usuario_table.select().where(
        (glosario_usuario_table.c.usuario_sesion_id == current_user.sesion_id) &
        (sqlfunc.lower(glosario_usuario_table.c.termino) == sqlfunc.lower(term_in.termino.strip()))
    )
    existing_term = await database.fetch_one(existing_query)
    if existing_term:
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
        if last_record_id is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al guardar el término en la base de datos.")
        created_query = glosario_usuario_table.select().where(glosario_usuario_table.c.id == last_record_id)
        created_term_db = await database.fetch_one(created_query)
        if not created_term_db:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo recuperar el término después de crearlo.")
        return GlossaryTermPublic.model_validate(created_term_db)
    except Exception as e:
        print(f"Error detallado al crear término del glosario: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo añadir el término al glosario.")

@glossary_router.get("/", response_model=List[GlossaryTermPublic])
async def get_user_glossary_terms(current_user: UsuarioInDB = Depends(get_current_active_user)):
    query = glosario_usuario_table.select().where(
        glosario_usuario_table.c.usuario_sesion_id == current_user.sesion_id
    ).order_by(sqlfunc.lower(glosario_usuario_table.c.termino))
    results = await database.fetch_all(query)
    return [GlossaryTermPublic.model_validate(row) for row in results]

# Comentario encima de la función get_next_secuencia_interaccion
async def get_next_secuencia_interaccion(sesion_id: int) -> int:
    query = select(sqlfunc.max(interacciones_table.c.secuencia_interaccion))\
        .where(interacciones_table.c.sesion_id == sesion_id)
    max_secuencia = await database.fetch_val(query)
    return (max_secuencia or 0) + 1

# Comentario encima de la función registrar_interaccion_y_actualizar_estadisticas
async def registrar_interaccion_y_actualizar_estadisticas(
    db: Database,
    sesion_id: int,
    noticia_id_json: str, 
    tipo_interaccion: str,
    noticia_data_from_json: dict, 
    respuesta_usuario: Optional[str],
    es_correcto: Optional[bool], # Puede ser None si el usuario estaba inseguro y la BD lo permite
    tiempo_respuesta_ms: Optional[int] = None,
    indicadores_discutidos_llm: Optional[List[str]] = None 
):
    secuencia = await get_next_secuencia_interaccion(sesion_id)
    xp_ganado_interaccion = 0
    puntos_otorgados_interaccion = 0
    if es_correcto is True:
        xp_ganado_interaccion = XP_POR_ACIERTO
        puntos_otorgados_interaccion = XP_POR_ACIERTO
    elif es_correcto is False:
        xp_ganado_interaccion = XP_POR_FALLO
        puntos_otorgados_interaccion = XP_POR_FALLO

    reasoning_type_value = noticia_data_from_json.get("REASONING_TYPE")
    processed_reasoning_types = []
    if isinstance(reasoning_type_value, str):
        processed_reasoning_types = [r.strip() for r in reasoning_type_value.replace(' y ', ',').split(',') if r.strip()]
    elif isinstance(reasoning_type_value, list):
        processed_reasoning_types = [str(r).strip() for r in reasoning_type_value if str(r).strip()]

    interaccion_data = {
        "sesion_id": sesion_id,
        "interaccion_ts": datetime.now(dt_timezone.utc),
        "noticia_id": noticia_id_json,
        "noticia_fuente": noticia_data_from_json.get("SOURCE"),
        "noticia_verdad_real": noticia_data_from_json.get("CATEGORY"),
        "noticia_tema": noticia_data_from_json.get("TOPICS"),
        "noticia_dificultad": noticia_data_from_json.get("DIFFICULTY_LEVEL"),
        "noticia_tipos_razonamiento_json": processed_reasoning_types,
        "respuesta_usuario": respuesta_usuario,
        "es_correcto": es_correcto, # Se insertará None si es None y la BD lo permite
        "tiempo_respuesta_ms": tiempo_respuesta_ms,
        "puntos_otorgados": puntos_otorgados_interaccion,
        "tipo_error": None,
        "feedback_mostrado": None, 
        "secuencia_interaccion": secuencia,
        "criterios_evaluacion_ids": None,
        "indicadores_seleccionados_usuario": indicadores_discutidos_llm,
        "tipo_interaccion": tipo_interaccion,
    }
    if es_correcto is False: # Solo si es explícitamente False
        if noticia_data_from_json.get("CATEGORY") == "TRUE":
            interaccion_data["tipo_error"] = "FALSO_NEGATIVO"
        elif noticia_data_from_json.get("CATEGORY") == "FALSE":
            interaccion_data["tipo_error"] = "FALSO_POSITIVO"

    insert_interaccion_query = interacciones_table.insert().values(**interaccion_data)
    await db.execute(insert_interaccion_query)

    current_session_data = await db.fetch_one(
        select(
            sesiones_table.c.interacciones_totales_sesion,
            sesiones_table.c.aciertos_totales_sesion,
            sesiones_table.c.fallos_totales_sesion,
            sesiones_table.c.xp_actual
        ).where(sesiones_table.c.sesion_id == sesion_id)
    )

    if current_session_data:
        current_interactions = current_session_data["interacciones_totales_sesion"] or 0
        current_correct = current_session_data["aciertos_totales_sesion"] or 0
        current_incorrect = current_session_data["fallos_totales_sesion"] or 0
        current_xp = current_session_data["xp_actual"] or 0

        interactions_to_count = 0
        correct_increment = 0
        incorrect_increment = 0
        if es_correcto is not None: 
             interactions_to_count = 1
             if es_correcto: 
                 correct_increment = 1
             else: 
                 incorrect_increment = 1

        new_interactions = current_interactions + interactions_to_count
        new_correct = current_correct + correct_increment
        new_incorrect = current_incorrect + incorrect_increment
        new_xp = current_xp + xp_ganado_interaccion
        new_precision = (new_correct / new_interactions) if new_interactions > 0 else 0.0

        update_sesion_query = sesiones_table.update()\
            .where(sesiones_table.c.sesion_id == sesion_id)\
            .values(
                interacciones_totales_sesion=new_interactions,
                aciertos_totales_sesion=new_correct,
                fallos_totales_sesion=new_incorrect,
                precision_global_sesion=new_precision,
                xp_actual=new_xp
            )
        await db.execute(update_sesion_query)
    else:
        print(f"ADVERTENCIA: No se encontró la sesión {sesion_id} para actualizar estadísticas.")
    
    criterios_a_registrar = []
    if noticia_data_from_json.get("TOPICS"):
        criterios_a_registrar.append({"tipo_criterio": "TEMA_NOTICIA", "valor_criterio": noticia_data_from_json.get("TOPICS")})
    if noticia_data_from_json.get("DIFFICULTY_LEVEL"):
        criterios_a_registrar.append({"tipo_criterio": "DIFICULTAD_NOTICIA", "valor_criterio": noticia_data_from_json.get("DIFFICULTY_LEVEL")})
    if processed_reasoning_types:
        for razonamiento in processed_reasoning_types:
            criterios_a_registrar.append({"tipo_criterio": "TIPO_RAZONAMIENTO_NOTICIA", "valor_criterio": razonamiento})
    if indicadores_discutidos_llm: 
        for indicador_usr in indicadores_discutidos_llm:
            criterios_a_registrar.append({"tipo_criterio": "INDICADOR_USUARIO_O_DISCUTIDO", "valor_criterio": indicador_usr})

    for criterio in criterios_a_registrar:
        valor_criterio_str = str(criterio["valor_criterio"])
        
        acierto_criterio = 0
        if es_correcto is True: # Solo contar como acierto de criterio si la interacción general fue correcta
            acierto_criterio = 1
        
        # Para la tasa de acierto inicial, si es_correcto es None, la tasa_acierto también debería ser None.
        # Si es_correcto es booleano, entonces la tasa es 1.0 o 0.0.
        initial_tasa_acierto = None
        if isinstance(es_correcto, bool):
            initial_tasa_acierto = 1.0 if es_correcto else 0.0

        stmt = pg_insert(estadisticas_detalladas_usuario_table).values(
            sesion_id=sesion_id,
            tipo_criterio=criterio["tipo_criterio"],
            valor_criterio=valor_criterio_str,
            numero_intentos=1,
            numero_aciertos=acierto_criterio, 
            tasa_acierto=initial_tasa_acierto, 
            fecha_ultima_actualizacion=datetime.now(dt_timezone.utc)
        )
        
        # Para la actualización, solo actualizamos la tasa si hay un valor booleano para es_correcto.
        # Si es_correcto es None, no actualizamos la tasa, solo los intentos.
        current_aciertos_for_rate = estadisticas_detalladas_usuario_table.c.numero_aciertos
        current_intentos_for_rate = estadisticas_detalladas_usuario_table.c.numero_intentos
        
        if es_correcto is not None: # Si hay una evaluación booleana
            new_aciertos_for_rate = current_aciertos_for_rate + acierto_criterio
            new_intentos_for_rate = current_intentos_for_rate + 1.0 # Asegurar float para división
            updated_tasa_acierto_expr = new_aciertos_for_rate / new_intentos_for_rate
            set_values = {
                "numero_intentos": estadisticas_detalladas_usuario_table.c.numero_intentos + 1,
                "numero_aciertos": estadisticas_detalladas_usuario_table.c.numero_aciertos + acierto_criterio,
                "tasa_acierto": updated_tasa_acierto_expr,
                "fecha_ultima_actualizacion": datetime.now(dt_timezone.utc)
            }
        else: # Si es_correcto es None, solo actualizamos intentos y dejamos la tasa como estaba (o nula si era el primer intento)
             set_values = {
                "numero_intentos": estadisticas_detalladas_usuario_table.c.numero_intentos + 1,
                # "tasa_acierto": estadisticas_detalladas_usuario_table.c.tasa_acierto, # Mantiene la tasa anterior
                "fecha_ultima_actualizacion": datetime.now(dt_timezone.utc)
            }
            # Si es el primer intento y es_correcto es None, la tasa_acierto ya se insertó como None.
            # Si no es el primer intento y es_correcto es None, queremos mantener la tasa_acierto existente.
            # La cláusula on_conflict_do_update solo actualiza los campos en `set_`.
            # Si `tasa_acierto` no está en `set_values` cuando `es_correcto` es `None`, no se actualizará,
            # lo cual es correcto si ya había un valor o si se insertó como None.
            # Sin embargo, para ser explícitos si queremos mantenerla sin cambios:
            # if 'tasa_acierto' not in set_values:
            #      set_values['tasa_acierto'] = estadisticas_detalladas_usuario_table.c.tasa_acierto

        on_conflict_stmt = stmt.on_conflict_do_update(
            constraint='uq_stats_detalle_usuario_criterio',
            set_=set_values
        )
        await db.execute(on_conflict_stmt)

# Comentario encima de la función get_next_guided_analysis_news_endpoint
@guided_analysis_router.get("/next-news", response_model=NoticiaParaAnalisis)
async def get_next_guided_analysis_news_endpoint(current_user: UsuarioInDB = Depends(get_current_active_user)):
    if not ollama_client: 
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible para análisis guiado.")
    if not ALL_NEWS_DATA: 
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Dataset de noticias no disponible.")
    
    query_seen_news = select(chat_sesiones_noticia_table.c.noticia_id_json).where(
        chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id
    )
    seen_news_records = await database.fetch_all(query_seen_news)
    seen_news_ids = {record["noticia_id_json"] for record in seen_news_records}

    identified_weaknesses_indicadores = []
    identified_weaknesses_razonamiento = []
    
    stats_query = estadisticas_detalladas_usuario_table.select().where(
        estadisticas_detalladas_usuario_table.c.sesion_id == current_user.sesion_id
    ).order_by(estadisticas_detalladas_usuario_table.c.tasa_acierto.asc())
    
    user_stats_records = await database.fetch_all(stats_query)

    if user_stats_records:
        for record in user_stats_records:
            if record["tasa_acierto"] is not None and record["tasa_acierto"] < 0.6 and \
               record["numero_intentos"] is not None and record["numero_intentos"] >= 2:
                if record["tipo_criterio"] == "INDICADOR_USUARIO_O_DISCUTIDO":
                    identified_weaknesses_indicadores.append(record["valor_criterio"])
                elif record["tipo_criterio"] == "TIPO_RAZONAMIENTO_NOTICIA":
                    identified_weaknesses_razonamiento.append(record["valor_criterio"])

    personalized_candidates_with_focus = []
    other_eligible_unseen_news = []
    
    for news_item in ALL_NEWS_DATA:
        if not isinstance(news_item, dict): continue
        news_id = news_item.get("ID")
        if not news_id or news_id in seen_news_ids:
            continue

        focus_reason_for_this_news = None
        targets_specific_weakness = False

        if identified_weaknesses_indicadores:
            key_elements = news_item.get("KEY_ELEMENTS", [])
            if isinstance(key_elements, list):
                for weakness_indicador in identified_weaknesses_indicadores:
                    if weakness_indicador in key_elements:
                        targets_specific_weakness = True
                        focus_reason_for_this_news = weakness_indicador 
                        break 
            if targets_specific_weakness:
                personalized_candidates_with_focus.append((news_item, focus_reason_for_this_news))
                continue

        if identified_weaknesses_razonamiento:
            reasoning_type_in_news_str = news_item.get("REASONING_TYPE", "")
            current_news_reasoning_types = []
            if isinstance(reasoning_type_in_news_str, str):
                current_news_reasoning_types = [r.strip() for r in reasoning_type_in_news_str.replace(' y ', ',').split(',') if r.strip()]
            elif isinstance(reasoning_type_in_news_str, list):
                current_news_reasoning_types = [str(r).strip() for r in reasoning_type_in_news_str if str(r).strip()]

            for weakness_razonamiento in identified_weaknesses_razonamiento:
                if weakness_razonamiento in current_news_reasoning_types:
                    targets_specific_weakness = True
                    focus_reason_for_this_news = weakness_razonamiento
                    break
            if targets_specific_weakness:
                personalized_candidates_with_focus.append((news_item, focus_reason_for_this_news))
                continue
        
        if news_item.get("DIFFICULTY_LEVEL", "").lower() in ["medio", "alto", "bajo"]:
            other_eligible_unseen_news.append(news_item)

    selected_news_data = None
    area_de_enfoque_para_frontend = None

    if personalized_candidates_with_focus:
        print(f"INFO: Usuario {current_user.apodo} - Seleccionando noticia personalizada de {len(personalized_candidates_with_focus)} candidatas.")
        selected_news_tuple = random.choice(personalized_candidates_with_focus)
        selected_news_data = selected_news_tuple[0]
        area_de_enfoque_para_frontend = selected_news_tuple[1] 
        print(f"INFO: Noticia seleccionada con enfoque en: {area_de_enfoque_para_frontend}")
    elif other_eligible_unseen_news:
        print(f"INFO: Usuario {current_user.apodo} - No hay personalizadas, seleccionando de {len(other_eligible_unseen_news)} otras elegibles no vistas.")
        selected_news_data = random.choice(other_eligible_unseen_news)
    else:
        print(f"ADVERTENCIA: Usuario {current_user.apodo} - No quedan noticias inéditas. Considerando repetidas de niveles medio/alto/bajo.")
        fallback_pool = [news for news in ALL_NEWS_DATA if isinstance(news,dict) and news.get("DIFFICULTY_LEVEL", "").lower() in ["medio", "alto", "bajo"]]
        if fallback_pool:
            selected_news_data = random.choice(fallback_pool)
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay noticias disponibles en el dataset para esta actividad.")

    if not selected_news_data:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se pudo seleccionar una noticia.")

    return NoticiaParaAnalisis(
        noticia_id_json=selected_news_data["ID"], 
        headline=selected_news_data.get("HEADLINE", "Sin titular"), 
        text=selected_news_data.get("TEXT", "Sin texto"), 
        source=selected_news_data.get("SOURCE"), 
        difficulty_level=selected_news_data.get("DIFFICULTY_LEVEL"),
        area_de_enfoque_sugerida=area_de_enfoque_para_frontend
    )

# Comentario encima de la función start_guided_analysis_explanation_endpoint
@guided_analysis_router.post("/explain", response_model=ChatGuiaResponse)
async def start_guided_analysis_explanation_endpoint(request_data: ExplicacionInicialRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    if not ollama_client: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    
    noticia_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == request_data.noticia_id_json), None)
    if not noticia_data: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Noticia no encontrada en el dataset.")
    
    noticia_category = noticia_data.get("CATEGORY", "").upper()
    eval_correcta = None
    if request_data.evaluacion_inicial_opcional and noticia_category and request_data.evaluacion_inicial_opcional.upper() != "UNSURE": 
        eval_correcta = (request_data.evaluacion_inicial_opcional.upper() == noticia_category)
    
    area_de_enfoque_recibida = None
    if hasattr(request_data, 'area_de_enfoque_sugerida') and request_data.area_de_enfoque_sugerida:
         area_de_enfoque_recibida = request_data.area_de_enfoque_sugerida
    # También puedes obtenerla de noticia_data si fue como la noticia fue seleccionada
    # area_de_enfoque_de_seleccion = noticia_data.get("area_de_enfoque_sugerida") # Este campo no existe en ALL_NEWS_DATA per se
                                                                                # sino que se añade en get_next_guided_analysis_news_endpoint

    insert_chat_sesion_query = chat_sesiones_noticia_table.insert().values(
        sesion_id=current_user.sesion_id, 
        noticia_id_json=request_data.noticia_id_json, 
        explicacion_inicial_usuario=request_data.explicacion_usuario, 
        evaluacion_inicial_usuario=request_data.evaluacion_inicial_opcional, 
        noticia_verdad_real_json=noticia_category if noticia_category else None, 
        evaluacion_inicial_correcta=eval_correcta, 
        fecha_inicio=datetime.now(dt_timezone.utc)
        # Si tuvieras columna en DB:
        # area_de_enfoque_sugerida_guardada=area_de_enfoque_recibida o area_de_enfoque_de_seleccion
    )
    chat_sesion_id = await database.execute(insert_chat_sesion_query)
    if not chat_sesion_id: 
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo crear la sesión de chat.")
    
    user_first_message_content = f"Evaluación del usuario: {request_data.evaluacion_inicial_opcional or 'No especificada'}. Justificación: {request_data.explicacion_usuario}"
    user_message_query = mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_id, 
        emisor='usuario', 
        contenido=user_first_message_content, 
        timestamp_mensaje=datetime.now(dt_timezone.utc)
    )
    await database.execute(user_message_query)
    
    system_prompt_content_base = ( 
        "Rol: Eres 'Pimpoyo', un chatbot guía para niños de 10-12 años. Ayúdalos a analizar una noticia paso a paso. "
        "Tarea: El usuario acaba de darte su opinión inicial (si cree que una noticia es Verdadera/Falsa y por qué). "
        "Tu misión es NO decirle directamente si acertó o no sobre la veracidad (eso se le mostrará por otro medio si decide finalizar el análisis). "
        "Enfócate en su EXPLICACIÓN. Valida su esfuerzo. Si su explicación es buena, elógiala y quizás profundiza un poco o pregunta qué más le hizo pensar así. "
        "Si es débil, confusa o se basa en suposiciones, haz preguntas guía SUAVES para que reflexione sobre aspectos de la noticia (fuente, titular, lenguaje, pruebas, etc.) "
        "que podrían ayudarle a formar una mejor opinión o a identificar las pistas. Sé breve, amigable y no uses tecnicismos. "
        "Mantén la conversación centrada en la noticia que están analizando. "
        "Ejemplo si explica bien: '¡Buen análisis! Veo que te fijaste en [algo que dijo]. ¿Qué más te llamó la atención de la noticia?' "
        "Ejemplo si explica mal: 'Entiendo tu punto. Sobre la fuente que menciona la noticia, ¿te parece conocida? ¿Y qué me dices del titular, es muy llamativo o más bien informativo?'"
    )
    
    final_system_prompt = system_prompt_content_base
    if hasattr(request_data, 'area_de_enfoque_sugerida') and request_data.area_de_enfoque_sugerida: # Si el frontend lo envió
        final_system_prompt += f" CONSEJO ADICIONAL PARA TI, PIMPOYO: Esta noticia fue seleccionada porque el usuario podría necesitar reforzar su comprensión sobre '{request_data.area_de_enfoque_sugerida}'. Intenta guiar la conversación sutilmente para abordar este aspecto si surge naturalmente en la explicación del usuario o si ves una oportunidad."


    ollama_messages = [
        OllamaMessage(role="system", content=final_system_prompt), 
        OllamaMessage(role="user", content=user_first_message_content)
    ]
    try:
        chat_ollama_response = ollama_client.chat(
            model=OLLAMA_MODEL_ANALYSIS, 
            messages=[msg.model_dump() for msg in ollama_messages]
        )
        chatbot_reply_content = chat_ollama_response['message']['content']
        if not chatbot_reply_content: 
             chatbot_reply_content = "¡Entendido! Gracias por compartir tu primer análisis. ¿Hay algo en particular de la noticia que te gustaría que exploráramos juntos? Puedes preguntarme lo que quieras sobre ella."
    except Exception as e:
        print(f"Error al contactar Ollama en /explain: {e}")
        chatbot_reply_content = "Vaya, mis circuitos están un poco revueltos ahora mismo. Pero dime, ¿qué te hizo pensar así sobre la noticia?"
    
    chatbot_message_query = mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_id, 
        emisor='chatbot', 
        contenido=chatbot_reply_content, 
        timestamp_mensaje=datetime.now(dt_timezone.utc)
    )
    await database.execute(chatbot_message_query)
    
    return ChatGuiaResponse(chat_sesion_noticia_id=chat_sesion_id, respuesta_chatbot=chatbot_reply_content)

# Comentario encima de la función continue_guided_analysis_chat_endpoint
@guided_analysis_router.post("/chat/{chat_sesion_noticia_id}/continue", response_model=ChatGuiaResponse)
async def continue_guided_analysis_chat_endpoint(chat_sesion_noticia_id: int, request_data: ContinuarChatGuiaRequest, current_user: UsuarioInDB = Depends(get_current_active_user)):
    if not ollama_client: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Chatbot no disponible.")
    chat_sesion_query = chat_sesiones_noticia_table.select().where(
        (chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id) & 
        (chat_sesiones_noticia_table.c.sesion_id == current_user.sesion_id)
    )
    chat_sesion_db = await database.fetch_one(chat_sesion_query)
    if not chat_sesion_db: 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada o no pertenece al usuario.")
    if chat_sesion_db["fecha_fin"]: 
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta sesión de chat ya ha finalizado. No se pueden añadir más mensajes.")
    
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
    ollama_messages_history = []
    for msg_db in message_history_db:
        role_for_ollama = "user" if msg_db["emisor"] == "usuario" else "assistant"
        ollama_messages_history.append(OllamaMessage(role=role_for_ollama, content=msg_db["contenido"]))
    
    system_prompt_content_base = (
         "Rol: Eres 'Pimpoyo', un chatbot guía para niños de 10-12 años. Ayúdalos a analizar una noticia paso a paso. "
        "Contexto: Estás continuando una conversación sobre una noticia específica que el usuario está analizando. Ya le diste un feedback conversacional inicial a su primera evaluación. "
        "Tarea: Responde a la NUEVA pregunta o comentario del usuario de forma clara y sencilla. Sigue guiándolo para que reflexione sobre la noticia. "
        "Evita dar la solución (si es V/F) directamente. Anímalo a encontrar pistas por sí mismo. Sé breve y amigable."
        "Si el usuario parece estar atascado o pide una pista directa, puedes ofrecer una pequeña ayuda sutil."
    )
    
    final_system_prompt = system_prompt_content_base
    # Si el `area_de_enfoque_sugerida` se guardó en chat_sesion_db o se reenvía en request_data
    # if hasattr(request_data, 'area_de_enfoque_sugerida') and request_data.area_de_enfoque_sugerida:
    #     final_system_prompt += f" CONSEJO ADICIONAL PARA TI, PIMPOYO: Recuerda que esta noticia se seleccionó para trabajar sobre '{request_data.area_de_enfoque_sugerida}'. Si es relevante a la conversación actual, intenta guiar hacia allí."
    # elif chat_sesion_db.get("area_de_enfoque_sugerida_guardada"): # Suponiendo que lo guardaste en la tabla
    #      final_system_prompt += f" CONSEJO ADICIONAL PARA TI, PIMPOYO: Recuerda que esta noticia se seleccionó para trabajar sobre '{chat_sesion_db.get('area_de_enfoque_sugerida_guardada')}'. Si es relevante, guía hacia allí."


    final_ollama_messages = [OllamaMessage(role="system", content=final_system_prompt)] + ollama_messages_history
    
    try:
        chat_ollama_response = ollama_client.chat(
            model=OLLAMA_MODEL_ANALYSIS, 
            messages=[msg.model_dump() for msg in final_ollama_messages]
        )
        chatbot_reply_content = chat_ollama_response['message']['content']
        if not chatbot_reply_content:
            chatbot_reply_content = "Entendido. ¿Qué más quieres que veamos de esta noticia o qué otra duda tienes?"
    except Exception as e:
        print(f"Error al contactar Ollama en /continue: {e}")
        chatbot_reply_content = "Mis antenas de detective están un poco cruzadas. ¿Podrías preguntarme de otra forma?"
    
    chatbot_message_query = mensajes_chat_guia_table.insert().values(
        chat_sesion_noticia_id=chat_sesion_noticia_id, 
        emisor='chatbot', 
        contenido=chatbot_reply_content, 
        timestamp_mensaje=datetime.now(dt_timezone.utc)
    )
    await database.execute(chatbot_message_query)
    
    return ChatGuiaResponse(chat_sesion_noticia_id=chat_sesion_noticia_id, respuesta_chatbot=chatbot_reply_content)

# Comentario encima de la función finish_guided_analysis_news_endpoint
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
    if not chat_sesion_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada o no pertenece al usuario.")

    noticia_id_json_actual = chat_sesion_db["noticia_id_json"]
    noticia_original_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == noticia_id_json_actual), None)
    
    if not noticia_original_data:
        print(f"ADVERTENCIA CRÍTICA: Datos originales de la noticia {noticia_id_json_actual} no encontrados para feedback en finish-news para sesion_id {current_user.sesion_id}.")
        if not chat_sesion_db["fecha_fin"]:
            update_fecha_fin_query = chat_sesiones_noticia_table.update().where(
                chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
            ).values(fecha_fin=datetime.now(dt_timezone.utc))
            await database.execute(update_fecha_fin_query)
            
            pseudo_noticia_data = {"ID": noticia_id_json_actual, "CATEGORY": "DESCONOCIDA"} 
            respuesta_usuario_stats = chat_sesion_db["evaluacion_inicial_usuario"] or "NO_EVALUADO_INICIALMENTE"
            es_correcto_db_value = chat_sesion_db["evaluacion_inicial_correcta"]
            es_correcto_stats = es_correcto_db_value

            await registrar_interaccion_y_actualizar_estadisticas(
                db=database, sesion_id=current_user.sesion_id,
                noticia_id_json=noticia_id_json_actual,
                tipo_interaccion='ANALISIS_INDIVIDUAL_GUIADO_FINALIZADO_ERR_DATA',
                noticia_data_from_json=pseudo_noticia_data,
                respuesta_usuario=respuesta_usuario_stats,
                es_correcto=es_correcto_stats, 
                indicadores_discutidos_llm=None
            )
        return {"message": "¡Análisis completado! No se pudieron cargar todos los detalles de la noticia para un feedback extenso, pero tu progreso ha sido guardado."}

    feedback_message_parts = []
    evaluacion_correcta = chat_sesion_db["evaluacion_inicial_correcta"] 
    evaluacion_usuario_texto = chat_sesion_db["evaluacion_inicial_usuario"] 
    
    categoria_real_noticia = noticia_original_data.get("CATEGORY", "Desconocida").upper()
    titular_noticia = noticia_original_data.get("HEADLINE", "esta noticia") 
    
    justification_hints = noticia_original_data.get("JUSTIFICATION_HINTS")
    key_elements = noticia_original_data.get("KEY_ELEMENTS")
    reasoning_type_data = noticia_original_data.get("REASONING_TYPE")
    likely_misconceptions = noticia_original_data.get("LIKELY_MISCONCEPTIONS")

    feedback_message_parts.append(f"¡Análisis de \"{titular_noticia}\" finalizado! ")

    categoria_real_display_text = "de categoría desconocida"
    if categoria_real_noticia == "TRUE":
        categoria_real_display_text = "**Verdadera**"
    elif categoria_real_noticia == "FALSE":
        categoria_real_display_text = "**Falsa**"

    if evaluacion_usuario_texto and evaluacion_usuario_texto.upper() == "UNSURE":
        feedback_message_parts.append(f"Al principio no estabas seguro/a. Resulta que la noticia era {categoria_real_display_text}.")
    elif isinstance(evaluacion_correcta, bool): 
        if evaluacion_correcta:
            feedback_message_parts.append(f"¡Muy bien! 👍 Tu primera impresión fue correcta. La noticia era {categoria_real_display_text}.")
        else:
            feedback_message_parts.append(f"Tu primera impresión fue diferente. Resulta que la noticia era {categoria_real_display_text}.")
    else: 
        feedback_message_parts.append(f"La noticia era {categoria_real_display_text}.")

    learning_points = []

    if justification_hints:
        hint_text = ""
        if isinstance(justification_hints, list) and justification_hints:
            valid_hints = [str(h).strip() for h in justification_hints if str(h).strip()]
            if valid_hints: hint_text = valid_hints[0]
        elif isinstance(justification_hints, str) and justification_hints.strip():
            hint_text = justification_hints
        if hint_text: learning_points.append(f"Pista clave: \"{hint_text}\"")

    if key_elements and isinstance(key_elements, list):
        valid_elements = [str(el).strip() for el in key_elements if str(el).strip()][:2]
        if valid_elements: learning_points.append(f"Fíjate en: {', '.join(valid_elements)}.")

    if reasoning_type_data:
        reasoning_text = ""
        processed_reasoning_types = []
        if isinstance(reasoning_type_data, str):
            processed_reasoning_types = [r.strip() for r in reasoning_type_data.replace(' y ', ',').split(',') if r.strip()]
        elif isinstance(reasoning_type_data, list):
            processed_reasoning_types = [str(r).strip() for r in reasoning_type_data if str(r).strip()]
        if processed_reasoning_types:
            reasoning_text = processed_reasoning_types[0].lower()
            learning_points.append(f"Aquí era importante la '{reasoning_text}'.")
    
    if likely_misconceptions and isinstance(likely_misconceptions, list):
        valid_misconceptions = [str(m).strip() for m in likely_misconceptions if str(m).strip()]
        if valid_misconceptions: learning_points.append(f"A veces uno puede pensar erróneamente que \"{valid_misconceptions[0]}\".")

    if learning_points:
        feedback_message_parts.append("Para que lo tengas en cuenta: " + " ".join(learning_points))
    
    if isinstance(evaluacion_correcta, bool) and evaluacion_correcta:
        feedback_message_parts.append("¡Sigue así, vas por buen camino detectando noticias!")
    else:
        feedback_message_parts.append("¡No te desanimes! Cada noticia es una nueva oportunidad para aprender. ¡Presta atención a estas pistas la próxima vez!")
    
    feedback_message = " ".join(feedback_message_parts)
    feedback_message = ' '.join(feedback_message.split())


    if not chat_sesion_db["fecha_fin"]:
        update_fecha_fin_query = chat_sesiones_noticia_table.update().where(
            chat_sesiones_noticia_table.c.chat_sesion_noticia_id == chat_sesion_noticia_id
        ).values(fecha_fin=datetime.now(dt_timezone.utc))
        await database.execute(update_fecha_fin_query)

        respuesta_usuario_stats = chat_sesion_db["evaluacion_inicial_usuario"]
        if respuesta_usuario_stats is None or respuesta_usuario_stats.upper() == "UNSURE":
            respuesta_usuario_stats = "NO_EVALUADO_INICIALMENTE"
        
        es_correcto_db_value = chat_sesion_db["evaluacion_inicial_correcta"]
        es_correcto_stats = es_correcto_db_value

        await registrar_interaccion_y_actualizar_estadisticas(
            db=database,
            sesion_id=current_user.sesion_id,
            noticia_id_json=noticia_id_json_actual,
            tipo_interaccion='ANALISIS_INDIVIDUAL_GUIADO_FINALIZADO', 
            noticia_data_from_json=noticia_original_data,
            respuesta_usuario=respuesta_usuario_stats,
            es_correcto=es_correcto_stats, 
            indicadores_discutidos_llm=None 
        )
        return {"message": feedback_message} 
    else:
        return {"message": f"(Análisis de \"{titular_noticia}\" ya concluido) {feedback_message}"}

# Comentario encima de la función finish_pair_selection_challenge
@challenge_router.post("/finish-pair-selection", status_code=status.HTTP_200_OK)
async def finish_pair_selection_challenge(
    request_data: FinishPairChallengeRequest,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    seleccion_usuario_id = request_data.seleccion_usuario_id_json
    noticia_verdadera_id = request_data.noticia_verdadera_id_json
    noticia_falsa_id = request_data.noticia_falsa_id_json 

    noticia_seleccionada_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == seleccion_usuario_id), None)
    noticia_verdadera_del_par_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == noticia_verdadera_id), None)
    noticia_falsa_del_par_data: Optional[dict] = next((n for n in ALL_NEWS_DATA if isinstance(n, dict) and n.get("ID") == noticia_falsa_id), None)

    if not noticia_seleccionada_data or not noticia_verdadera_del_par_data or not noticia_falsa_del_par_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Datos no encontrados para una o más noticias del desafío de pares.")

    es_correcto_par = (seleccion_usuario_id == noticia_verdadera_id)
    
    # --- Información clave de las noticias para el prompt ---
    # (Usaremos una función auxiliar para extraer y formatear las pistas de forma más legible para el LLM)
    def format_pistas_para_llm(noticia_dict: Optional[dict], prefijo: str) -> str:
        if not noticia_dict:
            return f"{prefijo}: No hay datos.\n"
        
        pistas_str_parts = []
        key_elements = noticia_dict.get("KEY_ELEMENTS", [])
        if isinstance(key_elements, list) and key_elements:
            elementos_validos = [str(el).strip() for el in key_elements if str(el).strip()]
            if elementos_validos:
                pistas_str_parts.append(f"Elementos clave observables: [{', '.join(elementos_validos)}]")
        
        just_hints = noticia_dict.get("JUSTIFICATION_HINTS", [])
        if isinstance(just_hints, list) and just_hints:
            pistas_validas = [str(p).strip() for p in just_hints if str(p).strip()]
            if pistas_validas:
                pistas_str_parts.append(f"Justificación/Pista adicional: [{', '.join(pistas_validas)}]")
        elif isinstance(just_hints, str) and just_hints.strip(): # Si es una sola cadena
             pistas_str_parts.append(f"Justificación/Pista adicional: [{just_hints}]")


        reasoning = noticia_dict.get("REASONING_TYPE", "")
        if reasoning:
            pistas_str_parts.append(f"Tipo de razonamiento importante: [{reasoning}]")
            
        misconceptions = noticia_dict.get("LIKELY_MISCONCEPTIONS", [])
        if isinstance(misconceptions, list) and misconceptions:
            errores_comunes_validos = [str(m).strip() for m in misconceptions if str(m).strip()]
            if errores_comunes_validos:
                pistas_str_parts.append(f"Errores comunes de pensamiento asociados: [{', '.join(errores_comunes_validos)}]")

        if not pistas_str_parts:
            return f"{prefijo} (Titular: '{noticia_dict.get('HEADLINE', 'N/A')}'): No se especificaron pistas detalladas.\n"
        
        return f"{prefijo} (Titular: '{noticia_dict.get('HEADLINE', 'N/A')}'): {'; '.join(pistas_str_parts)}.\n"

    contexto_noticia_verdadera = format_pistas_para_llm(noticia_verdadera_del_par_data, "Información sobre la NOTICIA VERDADERA")
    contexto_noticia_falsa = format_pistas_para_llm(noticia_falsa_del_par_data, "Información sobre la NOTICIA FALSA")

    prompt_contexto_general = (
        "Eres Pimpoyo, un ratoncito profesor muy amigable y sabio que ayuda a niños de 10-12 años a entender noticias. "
        "Un niño acaba de participar en un desafío donde tenía que elegir cuál de dos noticias era la verdadera. "
        "Te voy a dar la información de ambas noticias y te diré si el niño acertó o no. "
        "Tu tarea es generar una explicación breve (2-4 frases como máximo, concisas y fáciles de entender), en un tono positivo y motivador. "
        "IMPORTANTE: NO copies textualmente las 'Pistas' o 'Elementos clave' que te proporciono. En lugar de eso, usa esa información para explicar el *porqué* una noticia era verdadera o falsa con tus propias palabras. "
        "Intenta que el niño reflexione. Por ejemplo, si una noticia falsa usaba lenguaje muy emocional, podrías decir: '¿Notaste cómo la noticia X usaba palabras que te hacían sentir muy fuerte? A veces eso es una señal...'. O si la fuente de la verdadera era fiable: 'La noticia Y venía de [nombre de fuente si es conocida y relevante, o 'una fuente más seria'], ¡eso da confianza!'.\n\n"
        "Aquí está el contexto de las noticias:\n"
        f"{contexto_noticia_verdadera}"
        f"{contexto_noticia_falsa}\n"
    )

    instruccion_especifica_para_ollama = ""
    if es_correcto_par:
        instruccion_especifica_para_ollama = (
            f"El niño eligió la noticia con titular \"{noticia_seleccionada_data.get('HEADLINE', 'N/A')}\" y ¡ACERTÓ! Era la noticia verdadera.\n"
            "Basándote en la información de arriba, felicítalo y explícale con tus palabras por qué su elección fue buena, destacando una o dos razones principales por las que la noticia verdadera era confiable y/o la falsa no lo era. "
            "Anímale por su buen trabajo."
        )
    else: # El usuario se equivocó
        instruccion_especifica_para_ollama = (
            f"El niño eligió la noticia con titular \"{noticia_seleccionada_data.get('HEADLINE', 'N/A')}\", pero esa era la noticia FALSA. La verdadera era la otra.\n"
            "Basándote en la información de arriba, explícale con tus palabras por qué se equivocó, enfocándote en una o dos razones clave por las que la noticia que eligió era falsa y/o por qué la otra era la verdadera. "
            "Hazlo de forma amable y anímale a no desanimarse y a seguir aprendiendo."
        )
    
    prompt_completo_ollama = f"{prompt_contexto_general}Tarea Específica para Pimpoyo:\n{instruccion_especifica_para_ollama}"
    
    ollama_explanation = "¡Analizar noticias es como ser un detective, cada vez lo harás mejor!" # Fallback inicial
    if ollama_client:
        try:
            print(f"DEBUG: Prompt para Ollama (comparación noticias):\n{prompt_completo_ollama}") 
            response_ollama = ollama_client.chat(
                model=OLLAMA_MODEL_ANALYSIS, 
                messages=[
                    # El system prompt ahora está integrado en el prompt_completo_ollama para darle más contexto directo.
                    # Podrías tener un system prompt muy corto aquí si prefieres, como:
                    # {"role": "system", "content": "Actúa como Pimpoyo, un ratoncito profesor amigable."},
                    {"role": "user", "content": prompt_completo_ollama} 
                ]
            )
            ollama_explanation_candidate = response_ollama.get('message', {}).get('content', '')
            if ollama_explanation_candidate:
                ollama_explanation = ollama_explanation_candidate.strip()
            else: # Si Ollama da respuesta vacía pero no error
                print("ADVERTENCIA: Ollama devolvió contenido vacío para la explicación del desafío de pares.")
                # Usar un fallback más específico al caso
                if es_correcto_par:
                    ollama_explanation = f"¡Muy bien! Acertaste al elegir \"{noticia_seleccionada_data.get('HEADLINE', 'la noticia correcta')}\" como la verdadera. ¡Buen ojo!"
                else:
                    ollama_explanation = f"¡Vaya! Parece que \"{noticia_seleccionada_data.get('HEADLINE', 'la noticia que elegiste')}\" no era la verdadera esta vez. La correcta era la otra. ¡Sigue practicando!"

        except Exception as e:
            print(f"Error al generar explicación con Ollama para desafío de pares: {e}")
            if es_correcto_par:
                ollama_explanation = f"¡Correcto! Has identificado la noticia verdadera (\"{(noticia_seleccionada_data.get('HEADLINE', 'N/A'))}\"). ¡Muy bien!"
            else:
                ollama_explanation = f"¡Ups! Esa no era. La verdadera era \"{(noticia_verdadera_del_par_data.get('HEADLINE', 'N/A'))}\". ¡No te preocupes, sigue intentándolo!"
    else: 
        print("ADVERTENCIA: Ollama client no disponible para generar explicación en desafío de pares.")
        if es_correcto_par:
            ollama_explanation = f"¡Muy bien, acertaste! La noticia \"{noticia_seleccionada_data.get('HEADLINE', '')}\" era la verdadera."
        else:
            ollama_explanation = f"Esta vez no fue, la noticia \"{noticia_seleccionada_data.get('HEADLINE', '')}\" era la falsa. ¡Ánimo para la próxima!"

    # Construir el mensaje de feedback inicial (antes de la explicación detallada de Ollama)
    feedback_inicial_para_frontend = ""
    if es_correcto_par:
        feedback_inicial_para_frontend = f"La noticia \"{noticia_seleccionada_data.get('HEADLINE', 'que elegiste')}\" era la verdadera."
    else:
        feedback_inicial_para_frontend = f"❌ ¡Ups! La noticia \"{noticia_seleccionada_data.get('HEADLINE', 'que elegiste')}\" era la falsa. La verdadera era \"{noticia_verdadera_del_par_data.get('HEADLINE', 'la otra')}\"."
    
    final_explanation_to_send = f"{feedback_inicial_para_frontend} {ollama_explanation}"
    final_explanation_to_send = ' '.join(final_explanation_to_send.split())

    await registrar_interaccion_y_actualizar_estadisticas(
        db=database,
        sesion_id=current_user.sesion_id,
        noticia_id_json=seleccion_usuario_id, 
        tipo_interaccion='DOS_NOTICIAS',
        noticia_data_from_json=noticia_seleccionada_data, 
        respuesta_usuario="TRUE" if es_correcto_par else "FALSE", 
        es_correcto=es_correcto_par, 
        tiempo_respuesta_ms=request_data.tiempo_respuesta_ms
    )
    
    return {
        "message": "Resultado del desafío registrado.", 
        "es_correcto": es_correcto_par,
        "explanation": final_explanation_to_send 
    }

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(news_router)
app.include_router(chat_router)
app.include_router(glossary_router)
app.include_router(guided_analysis_router, prefix="/activity/guided-analysis")
app.include_router(challenge_router)

@app.get("/", include_in_schema=False)
async def redirect_to_docs():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)