from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.access_log import ensure_indexes as ensure_access_log_indexes
from app.core.config import settings
from app.model.bustercall import ensure_indexes as ensure_bustercall_indexes
from app.model.comment import ensure_indexes as ensure_comment_indexes
from app.model.music import ensure_indexes as ensure_music_indexes
from app.model.official import ensure_indexes as ensure_official_indexes
from app.model.playlist import ensure_indexes as ensure_recommended_playlist_indexes
from app.model.post import ensure_indexes as ensure_post_indexes
from app.model.schedule import ensure_indexes as ensure_schedule_indexes
from app.model.suggest import ensure_indexes as ensure_suggest_indexes
from app.model.user import ensure_indexes as ensure_user_indexes
from app.model.vote import ensure_indexes as ensure_vote_indexes
from app.router import (
    access_log,
    bustercall,
    comment,
    link_preview,
    official,
    photo,
    playlist,
    post,
    schedule,
    suggest,
    user,
    vote,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bustercall.router)
app.include_router(user.auth_router)
app.include_router(user.router)
app.include_router(link_preview.router)
app.include_router(official.router)
app.include_router(schedule.router)
app.include_router(vote.router)
app.include_router(post.router)
app.include_router(comment.router)
app.include_router(suggest.router)
app.include_router(photo.router)
app.include_router(playlist.router)
app.include_router(access_log.router)


@app.on_event("startup")
async def on_startup():
    await ensure_user_indexes()
    await ensure_access_log_indexes()
    await ensure_bustercall_indexes()
    await ensure_official_indexes()
    await ensure_suggest_indexes()
    await ensure_schedule_indexes()
    await ensure_vote_indexes()
    await ensure_post_indexes()
    await ensure_comment_indexes()
    await ensure_music_indexes()
    await ensure_recommended_playlist_indexes()
