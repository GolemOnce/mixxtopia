from fastapi import FastAPI

from app.router import bustercall, photo, post, schedule, user, vote

app = FastAPI()

app.include_router(bustercall.router)
app.include_router(user.router)
app.include_router(schedule.router)
app.include_router(vote.router)
app.include_router(post.router)
app.include_router(photo.router)
