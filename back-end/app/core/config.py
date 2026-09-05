import os

from dotenv import load_dotenv

load_dotenv(".env")


class Settings:
    mongodb_uri: str = os.environ["MONGODB_URI"]
    redis_host: str = os.environ.get("REDIS_HOST", "127.0.0.1")
    redis_port: int = int(os.environ.get("REDIS_PORT", "6379"))


settings = Settings()
