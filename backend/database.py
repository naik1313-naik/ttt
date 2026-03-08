import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


# Database URL should be provided via environment variable, e.g.:
# SQLITE_URL="sqlite:///./smartspend.db"
SQLITE_URL = os.getenv("DATABASE_URL", "sqlite:///./smartspend.db")

engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

