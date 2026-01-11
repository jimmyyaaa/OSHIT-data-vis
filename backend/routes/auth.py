from fastapi import APIRouter, HTTPException, status, Depends
from .schemas import LoginRequest, LoginResponse
import logging
import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Optional

logger = logging.getLogger(__name__)

# 配置加密/哈希
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 从环境变量读取配置
SECRET_KEY = os.getenv("SECRET_KEY", "oshit-super-secret-key-for-jwt-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

router = APIRouter(prefix="/auth", tags=["Authentication"])

# 模拟用户数据库 (在真实系统中，密码应以哈希形式存储)
# 这里为了演示，我们初始化一个哈希后的数据库
USERS_DB = {
    "admin": {
        "hashed_password": pwd_context.hash("Oshit@2026"),
        "role": "admin"
    },
    "guest": {
        "hashed_password": pwd_context.hash("Oshit2026"),
        "role": "guest"
    }
}

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    username = request.username
    password = request.password
    
    user = USERS_DB.get(username)
    
    # 使用 passlib 验证加盐哈希后的密码
    if not user or not verify_password(password, user["hashed_password"]):
        logger.warning(f"Failed login attempt for user: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码不正确",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"User logged in: {username}")
    
    # 生成真实的 JWT Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": username, "role": user["role"]}, 
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        username=username,
        role=user["role"]
    )
