import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///" + os.path.abspath(os.path.join(BASE_DIR, "database.db")),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Secrets (use env vars; keep safe fallback for local dev)
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "your-flask-secret-key")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super-secret-jwt-key")

