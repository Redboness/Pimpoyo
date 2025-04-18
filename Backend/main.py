# --- main.py ---

import os
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from databases import Database
import sqlalchemy
from fastapi.middleware.cors import CORSMiddleware
import json
from typing import Optional, List, Any
import ollama # Import the Ollama library
# Removed: from pydantic import BaseModel (no longer needed here if all models are external)

# Import ALL necessary models from models.models
from models.models import (
    UsuarioCreate,
    UsuarioInDB,
    UsuarioLogin,
    UsuarioPublic,
    Token,
    TokenData,
    UsuarioUpdateProfile,
    ChatRequest,
    ChatResponse
)

load_dotenv() # Load variables from .env

# --- Constants and Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "un_secreto_muy_fuerte_y_largo_aqui")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480
# OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434") # Optional

NEWS_FILE_PATH = os.path.join(os.path.dirname(__file__), "datasets", "test.json")


if DATABASE_URL is None:
    print("CRITICAL ERROR: DATABASE_URL variable is not defined.")
    exit(1)
if SECRET_KEY == "un_secreto_muy_fuerte_y_largo_aqui":
    print("WARNING: SECRET_KEY is not defined in .env, using potentially insecure default value.")


# --- Database Configuration ---
database = Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

sesiones_table = sqlalchemy.Table(
    "sesiones", metadata,
    sqlalchemy.Column("sesion_id", sqlalchemy.BIGINT, primary_key=True),
    sqlalchemy.Column("apodo", sqlalchemy.String(length=50), nullable=False, unique=True, index=True),
    sqlalchemy.Column("hashed_password", sqlalchemy.String(length=255), nullable=False),
    sqlalchemy.Column("inicio_sesion_ts", sqlalchemy.TIMESTAMP(timezone=True), nullable=False, server_default=sqlalchemy.func.now()),
    sqlalchemy.Column("edad", sqlalchemy.Integer, nullable=False),
    sqlalchemy.Column("genero", sqlalchemy.String(length=50)),
    sqlalchemy.Column("avatar_url", sqlalchemy.String(length=512), nullable=True),
    sqlalchemy.Column("curso_escolar", sqlalchemy.String(length=100)),
    sqlalchemy.Column("consentimiento_obtenido", sqlalchemy.Boolean, nullable=False),
    sqlalchemy.Column("puntuacion_pre_test", sqlalchemy.Float),
    sqlalchemy.Column("fin_sesion_ts", sqlalchemy.TIMESTAMP(timezone=True)),
    sqlalchemy.Column("duracion_total_sesion_seg", sqlalchemy.Integer),
    sqlalchemy.Column("puntuacion_final", sqlalchemy.Float),
    sqlalchemy.Column("interacciones_totales_sesion", sqlalchemy.Integer, server_default='0'),
    sqlalchemy.Column("precision_global_sesion", sqlalchemy.Float),
    sqlalchemy.Column("puntuacion_post_test", sqlalchemy.Float)
)

# --- Password Hashing Configuration ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- FastAPI Instance and CORS ---
app = FastAPI()
origins = ['*']
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Ollama Client Setup ---
ollama_client = ollama.Client() # Default host: http://localhost:11434

# --- Startup/Shutdown Events ---
@app.on_event("startup")
async def startup():
    try: await database.connect(); print("Connected to the PostgreSQL database.")
    except Exception as e: print(f"ERROR: Could not connect to the database: {e}")
@app.on_event("shutdown")
async def shutdown(): await database.disconnect(); print("Disconnected from the database.")

# --- Authentication Helper Functions ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
      to_encode = data.copy()
      if expires_delta: expire = datetime.now(timezone.utc) + expires_delta
      else: expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
      to_encode.update({"exp": expire})
      encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
      return encoded_jwt

async def get_usuario_by_apodo(apodo: str) -> UsuarioInDB | None:
      query = sesiones_table.select().where(sesiones_table.c.apodo == apodo)
      result = await database.fetch_one(query)
      return UsuarioInDB(**result._mapping) if result else None

# --- DEPENDENCY: Get Current User (Token Validation) ---
async def get_current_active_user(token: str = Depends(oauth2_scheme)) -> UsuarioInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        apodo: str | None = payload.get("sub")
        if apodo is None:
            raise credentials_exception
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception

    usuario = await get_usuario_by_apodo(apodo=apodo)
    if usuario is None:
        raise credentials_exception
    return usuario

# --- Public Endpoints ---

@app.get("/")
def read_root(): return {"message": "Pimpoyo API running"}

@app.post("/register/", response_model=UsuarioPublic, status_code=status.HTTP_201_CREATED)
async def register_usuario(usuario_in: UsuarioCreate):
    existing_user = await get_usuario_by_apodo(usuario_in.apodo)
    if existing_user:
        raise HTTPException(status_code=400, detail="Apodo already registered.")

    hashed_password = get_password_hash(usuario_in.password)
    query = sesiones_table.insert().values(
        apodo=usuario_in.apodo,
        hashed_password=hashed_password,
        edad=usuario_in.edad,
        genero=usuario_in.genero,
        consentimiento_obtenido=usuario_in.consentimiento_obtenido
    )
    try:
        last_record_id = await database.execute(query)
        if last_record_id is None: raise HTTPException(status_code=500, detail="Error creating user.")
        return UsuarioPublic(
            sesion_id=last_record_id,
            apodo=usuario_in.apodo,
            edad=usuario_in.edad,
            genero=usuario_in.genero,
            avatar_url=None
        )
    except Exception as e:
        print(f"Detailed registration error: {e}")
        raise HTTPException(status_code=400, detail="Could not register user.")


@app.post("/token", response_model=Token)
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


# --- Protected Endpoints ---

@app.get("/users/me/", response_model=UsuarioPublic)
async def read_users_me(current_user: UsuarioInDB = Depends(get_current_active_user)):
    return current_user

@app.patch("/users/me/", response_model=UsuarioPublic)
async def update_usuario_me(
    usuario_update: UsuarioUpdateProfile,
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    update_data = {}
    if usuario_update.apodo is not None and usuario_update.apodo != current_user.apodo:
        existing_user = await get_usuario_by_apodo(usuario_update.apodo)
        if existing_user and existing_user.sesion_id != current_user.sesion_id:
            raise HTTPException(status_code=400, detail="That apodo is already in use.")
        update_data["apodo"] = usuario_update.apodo

    if usuario_update.avatar_url is not None and usuario_update.avatar_url != current_user.avatar_url:
       update_data["avatar_url"] = str(usuario_update.avatar_url).strip() if usuario_update.avatar_url else None

    if not update_data:
        return UsuarioPublic(**current_user.dict())

    query = sesiones_table.update().where(
        sesiones_table.c.sesion_id == current_user.sesion_id
    ).values(**update_data)

    try:
        await database.execute(query)
        updated_apodo = update_data.get("apodo", current_user.apodo)
        updated_user = await get_usuario_by_apodo(updated_apodo)
        if not updated_user:
              raise HTTPException(status_code=404, detail="User not found after update.")
        return UsuarioPublic(**updated_user.dict())
    except Exception as e:
        print(f"Detailed profile update error: {e}")
        raise HTTPException(status_code=400, detail="Could not update profile.")


# Endpoint para crear noticias a partir del json
@app.get("/news/challenge", response_model=List[Any]) # Use List[Any] or create a Pydantic model matching NewsItem
async def get_news_for_challenge():
    """
    Reads the news challenge data from the backend's local JSON file
    and returns it as a list.
    """
    if not os.path.exists(NEWS_FILE_PATH):
        print(f"ERROR: News data file not found at {NEWS_FILE_PATH}")
        # In a real app, you might want to log this error more formally
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="News data source file not found on server."
        )

    try:
        with open(NEWS_FILE_PATH, 'r', encoding='utf-8') as f:
            news_data = json.load(f)
        # Basic validation: Ensure it's a list
        if not isinstance(news_data, list):
             print(f"ERROR: Data in {NEWS_FILE_PATH} is not a JSON list.")
             raise HTTPException(
                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                 detail="Invalid format in news data source."
             )
        return news_data
    except json.JSONDecodeError:
        print(f"ERROR: Failed to decode JSON from {NEWS_FILE_PATH}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse news data source."
        )
    except Exception as e:
        # Catch other potential file reading errors
        print(f"ERROR: An unexpected error occurred while reading news file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An internal server error occurred while accessing news data."
        )


# Seleccionar fake news bot env:
@app.post("/bot/chat", response_model=ChatResponse)
async def handle_fake_news_chat( # Renamed function slightly for clarity (optional)
    request: ChatRequest, # Uses model expecting messages: List[OllamaMessage] from client
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    """
    Handles Fake News focused chat requests. Prepends the system prompt
    to the history received from the client before sending to Ollama.
    Requires authentication.
    """
    print(f"Received '/bot/chat' request from user {current_user.apodo} for model {request.model} with {len(request.messages)} history messages.")

    # --- Define the System Prompt for THIS endpoint ---
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
    # --- End System Prompt Definition ---

    # Construct the full message list for Ollama
    messages_to_ollama = [
        {'role': 'system', 'content': system_message_content} # Start with system prompt
    ]
    # Append the history received from the client (converting Pydantic models to dicts)
    messages_to_ollama.extend([msg.dict() for msg in request.messages])

    if len(messages_to_ollama) < 2: # Should have at least system + 1 user message
         raise HTTPException(status_code=400, detail="Insufficient messages provided.")

    try:
        # Pass the combined list to Ollama
        response = ollama_client.chat(
            model=request.model,
            messages=messages_to_ollama
        )

        reply_content = response.get('message', {}).get('content', '')
        if not reply_content:
             print(f"Warning: Ollama response structure might be different: {response}")
             raise HTTPException(status_code=500, detail="Received empty or unexpected response from language model.")

        print(f"Sending reply to user {current_user.apodo} from /bot/chat")
        return ChatResponse(reply=reply_content)

    except Exception as e:
        print(f"Error interacting with Ollama in /bot/chat: {e}")
        raise HTTPException(status_code=503, detail=f"Failed to get response from language model: {e}")
# --- END FAKE NEWS CHAT ENDPOINT ---


# --- FREE CHAT ENDPOINT ---
@app.post("/bot/chatlibre", response_model=ChatResponse)
async def handle_free_chat( # Renamed function to avoid conflict
    request: ChatRequest, # Uses model expecting messages: List[OllamaMessage] from client
    current_user: UsuarioInDB = Depends(get_current_active_user)
):
    """
    Handles general ('libre') chat requests. Prepends the system prompt
    to the history received from the client before sending to Ollama.
    Requires authentication.
    """
    print(f"Received '/bot/chatlibre' request from user {current_user.apodo} for model {request.model} with {len(request.messages)} history messages.")

    # --- Define the System Prompt for THIS endpoint ---
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
- No afirmes lo que has recibido, es decir, si digo: Explicame que es el modelo llama3.2-1b de Meta, no digas: Claro, te explicaré cómo funciona el Modelo llama 3.2-1B de Meta, simplemente responde a la pregunta sin repetirla.
- Tampoco afirmes que has escuchado al usuario, es decir, no digas cosas tipo ---¡Claro! Entiendo lo que quieres decir.--- o similar, simplemente di el resto.
Objetivo Final: Que el usuario aprenda sobre la información que te pregunta, mediante un proceso interactivo y guiado.

Es IMPERATIVO que evites alucinaciones, si te hacen una pregunta no pongas información que no sea sobre la que ha dicho el usuario.
"""
    # --- End System Prompt Definition ---

     # Construct the full message list for Ollama
    messages_to_ollama = [
        {'role': 'system', 'content': system_message_content} # Start with system prompt
    ]
    # Append the history received from the client (converting Pydantic models to dicts)
    messages_to_ollama.extend([msg.dict() for msg in request.messages])

    if len(messages_to_ollama) < 2: # Should have at least system + 1 user message
         raise HTTPException(status_code=400, detail="Insufficient messages provided.")

    try:
        # Pass the combined list to Ollama
        response = ollama_client.chat(
            model=request.model,
            messages=messages_to_ollama
        )

        reply_content = response.get('message', {}).get('content', '')
        if not reply_content:
             print(f"Warning: Ollama response structure might be different: {response}")
             raise HTTPException(status_code=500, detail="Received empty or unexpected response from language model.")

        print(f"Sending reply to user {current_user.apodo} from /bot/chatlibre")
        return ChatResponse(reply=reply_content)

    except Exception as e:
        print(f"Error interacting with Ollama in /bot/chatlibre: {e}")
        raise HTTPException(status_code=503, detail=f"Failed to get response from language model: {e}")
# --- END FREE CHAT ENDPOINT ---

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
