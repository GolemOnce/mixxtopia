"""수집한 트윗 → 정리글(제목/본문). mixxtopia 연동 시 이 dict를 백엔드로 넘기면 됨."""
import json
from pathlib import Path
from zoneinfo import ZoneInfo

from .models import Media, Tweet

KST = ZoneInfo("Asia/Seoul")


def _post_type(tweet: Tweet) -> str:
    """retweet(리트윗) / reply(남한테 단 답글) / thread(자기 타래의 연속 트윗) /
    standalone(단일 트윗 또는 타래의 첫 트윗 — 둘 다 conversation_id == tweet_id라 구분 불가)."""
    if tweet.is_retweet:
        return "retweet"
    if tweet.is_reply:
        return "reply"
    if tweet.conversation_id and tweet.conversation_id != tweet.id:
        return "thread"
    return "standalone"


def build_post(tweet: Tweet, files: list[tuple[int, Media, Path]], label: str) -> dict:
    kst = tweet.created_at.astimezone(KST)  # UTC 그대로 쓰면 자정 근처 날짜가 밀림
    source_url = f"https://x.com/{tweet.username}/status/{tweet.id}"

    lines = [tweet.text, ""] if tweet.text else []
    for i, m, path in files:
        if m.type == "photo":
            lines.append(f"![image {i}]({path.as_posix()})")
        else:
            lines.append(f"[video {i}]({path.as_posix()})")
    lines += ["", f"출처: {source_url}"]

    return {
        "tweet_id": tweet.id,
        "account": tweet.username,
        "title": f"[{kst:%y%m%d}] {label} 트위터 업데이트",
        "body": "\n".join(lines).strip(),
        "posted_at": kst.isoformat(),
        "source_url": source_url,
        "conversation_id": tweet.conversation_id,  # 타래 묶을 때 사용
        "post_type": _post_type(tweet),
        "is_retweet": tweet.is_retweet,
        "is_reply": tweet.is_reply,
    }


def save_post(post: dict, out_dir: Path) -> Path:
    path = out_dir / post["account"] / f"{post['tweet_id']}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(post, ensure_ascii=False, indent=2), encoding="utf-8")
    return path
