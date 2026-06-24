import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SECRET_KEY = "rag-platform-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

engine = create_engine("sqlite:///data/users.db")
Base = declarative_base()
SessionLocal = sessionmaker(bind=engine)

class User(Base):
    __tablename__ = "users"
    email = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)
    role = Column(String, default="viewer")
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

def get_user(email: str) -> Optional[dict]:
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    db.close()
    if not user:
        return None
    return {
        "email": user.email,
        "username": user.username,
        "role": user.role
    }

def register_user(email: str, username: str, password: str, role: str = "editor") -> dict:
    db = SessionLocal()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        db.close()
        return {"error": "Email already registered"}
    existing_username = db.query(User).filter(User.username == username).first()
    if existing_username:
        db.close()
        return {"error": "Username already taken"}

    # First user becomes admin
    user_count = db.query(User).count()
    if user_count == 0:
        role = "admin"

    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
        role=role
    )
    db.add(user)
    db.commit()
    db.close()
    token = create_token({"sub": email})
    return {"token": token, "username": username, "email": email, "role": role}

def login_user(email: str, password: str) -> dict:
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    db.close()
    if not user or not verify_password(password, user.hashed_password):
        return {"error": "Invalid email or password"}
    token = create_token({"sub": email})
    return {"token": token, "username": user.username, "email": email, "role": user.role}

def get_all_users() -> list:
    db = SessionLocal()
    users = db.query(User).all()
    db.close()
    return [{"email": u.email, "username": u.username, "role": u.role} for u in users]

def update_user_role(email: str, role: str) -> dict:
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        db.close()
        return {"error": "User not found"}
    user.role = role
    db.commit()
    db.close()
    return {"message": f"Role updated to {role} for {email}"}