import os

from dotenv import load_dotenv

load_dotenv(".env")


class Settings:
    mongodb_uri: str = os.environ["MONGODB_URI"]
    redis_host: str = os.environ.get("REDIS_HOST", "127.0.0.1")
    redis_port: int = int(os.environ.get("REDIS_PORT", "6379"))

    jwt_secret_key: str = os.environ["JWT_SECRET_KEY"]
    access_token_expire_minutes: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    refresh_token_expire_days: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    frontend_origin: str = os.environ.get("FRONTEND_ORIGIN", "https://mixxtopia.site")
    cookie_secure: bool = os.environ.get("COOKIE_SECURE", "true").lower() == "true"

    aws_region: str = os.environ.get("AWS_REGION", "ap-northeast-2")


settings = Settings()
