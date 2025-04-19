# models/models.py
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl # Import HttpUrl for optional validation
from typing import Optional, List # Import Optional and List

# --- Modelos para Perfil/Usuario ---

class PerfilBase(BaseModel):
    apodo: str
    genero: str | None = None
    edad: int
    avatar_url: Optional[HttpUrl | str] = None # Use HttpUrl for validation, allow basic string too, make optional

# Modelo para recibir datos durante la creación/registro
class UsuarioCreate(PerfilBase):
    password: str = Field(..., min_length=8)
    consentimiento_obtenido: bool


# Allows updating apodo, avatar_url, or both. Fields are optional.
class UsuarioUpdateProfile(BaseModel):
    apodo: Optional[str] = Field(None, min_length=1, max_length=50)
    avatar_url: Optional[HttpUrl | str | None] = Field(None) # Allow setting to null/empty or a valid URL/string

# Modelo que representa al usuario tal como está en la DB
class UsuarioInDB(PerfilBase):
    sesion_id: int
    hashed_password: str
    consentimiento_obtenido: bool
    # avatar_url is inherited from PerfilBase

# Modelo para devolver datos seguros del usuario
class UsuarioPublic(PerfilBase):
    sesion_id: int
    # apodo, edad, genero, avatar_url inherited from PerfilBase


# --- Modelos para Autenticación (Login/Token) ---
# (No changes needed here)
class UsuarioLogin(BaseModel):
    apodo: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    apodo: str | None = None
    sesion_id: int | None = None

# --- Modelos para Chat ---

class OllamaMessage(BaseModel): # Optional: Define structure for clarity
    role: str # 'system', 'user', or 'assistant'
    content: str

class ChatRequest(BaseModel):
    # Remove 'prompt', add 'messages'
    # prompt: str <-- Remove this
    messages: List[OllamaMessage] # <-- Add this: expects list like [{'role':'user', 'content':'...'}, ...]
    model: str = 'llama3.2:1b' # Default model if not provided by frontend

class ChatResponse(BaseModel):
    reply: str

# --- (NUEVO) Modelos para el Glosario ---

class GlossaryTermBase(BaseModel):
    termino: str = Field(..., min_length=1, max_length=100, description="La palabra o término del glosario")
    definicion: str = Field(..., min_length=1, description="La definición del término")

class GlossaryTermCreate(GlossaryTermBase):
    pass # No necesita más campos para crear

class GlossaryTermPublic(GlossaryTermBase):
    id: int
    usuario_sesion_id: int # O el tipo correcto si sesion_id es BigInt
    fecha_creacion: datetime

    class Config:
        from_attributes = True