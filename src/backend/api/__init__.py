"""API package containing modular FastAPI endpoints for authentication, documents, and chat streaming."""
from .auth import router as auth_router
from .documents import router as documents_router
from .chat import router as chat_router
from .vault import router as vault_router
