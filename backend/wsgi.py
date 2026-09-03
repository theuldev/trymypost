# backend/wsgi.py
from app.main import app

# Re-exporta a app já configurada (com router, prefix /api/v1, CORS, lifespan)
wsgi_app = app