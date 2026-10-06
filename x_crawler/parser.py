"""UserTweets GraphQL 응답 파싱.

X 내부 응답 구조는 예고 없이 바뀐다. 경로가 안 맞으면
DevTools > Network > 'UserTweets' 응답을 열어서 아래 경로를 수정할 것.
"""
import html
from datetime import datetime
from typing import Any, Iterator

from .models import Media, Tweet

TWITTER_DATE_FMT = "%a %b %d %H:%M:%S %z %Y"  # "Wed Oct 01 09:00:00 +0000 2026"


def parse_user_tweets(data: dict) -> list[Tweet]:
    instructions = _find_instructions(data)
    if instructions is None:
        return []
    tweets = []
    for result in _iter_tweet_results(instructions):
        tweet = _to_tweet(result)
        if tweet:
            tweets.append(tweet)
    return tweets


# ---------- 탐색 ----------

def _find_instructions(obj: Any) -> list | None:
    """data.user.result.timeline.timeline.instructions 경로가 자주 바뀌어서 재귀로 찾는다."""
    if isinstance(obj, dict):
        if isinstance(obj.get("instructions"), list):
            return obj["instructions"]
        values = obj.values()
    elif isinstance(obj, list):
        values = obj
    else:
        return None
    for v in values:
        found = _find_instructions(v)
        if found is not None:
            return found
    return None


def _iter_tweet_results(instructions: list) -> Iterator[dict]:
    for ins in instructions:
        # TimelinePinEntry = 고정 트윗. 최신 글이 아니라서 since 판정을 망치므로 제외
        if ins.get("type") != "TimelineAddEntries":
            continue
        for entry in ins.get("entries", []):
            entry_id = entry.get("entryId", "")
            content = entry.get("content", {})
            if entry_id.startswith("tweet-"):
                # promoted-tweet-*, cursor-*, who-to-follow-* 는 여기서 자연스럽게 걸러짐
                result = _dig(content, "itemContent", "tweet_results", "result")
                if result:
                    yield result
            elif "-conversation-" in entry_id:
                # 자기 타래(연속 트윗) 묶음. 과거엔 profile-conversation-*였는데
                # 2026-10 확인 결과 profile-originals-conversation-*로 바뀜(끝에
                # -tweet-{id}가 붙기도 함) — 이름이 또 바뀔 수 있어 정확한 접두어
                # 대신 "conversation" 포함 여부로 느슨하게 잡는다. 묶음형(items 배열)과
                # 단일형(itemContent 직접) 둘 다 올 수 있어서 둘 다 시도.
                for item in content.get("items", []):
                    result = _dig(item, "item", "itemContent", "tweet_results", "result")
                    if result:
                        yield result
                result = _dig(content, "itemContent", "tweet_results", "result")
                if result:
                    yield result


# ---------- 변환 ----------

def _to_tweet(result: dict) -> Tweet | None:
    typename = result.get("__typename")
    if typename == "TweetWithVisibilityResults":
        result = result.get("tweet", {})
    elif typename == "TweetTombstone":  # 삭제/비공개
        return None

    legacy = result.get("legacy")
    tweet_id = result.get("rest_id")
    if not legacy or not tweet_id:
        return None

    username = _screen_name(result)
    reply_to = legacy.get("in_reply_to_screen_name")

    return Tweet(
        id=tweet_id,
        username=username,
        text=_text(result, legacy),
        created_at=datetime.strptime(legacy["created_at"], TWITTER_DATE_FMT),
        media=_media(legacy),
        is_retweet="retweeted_status_result" in legacy,
        is_reply=bool(reply_to) and reply_to.lower() != username.lower(),
        quoted_id=legacy.get("quoted_status_id_str"),
        conversation_id=legacy.get("conversation_id_str"),
        raw=result,
    )


def _screen_name(result: dict) -> str:
    user = _dig(result, "core", "user_results", "result") or {}
    # 신규 구조는 user.core.screen_name, 구 구조는 user.legacy.screen_name
    return _dig(user, "core", "screen_name") or _dig(user, "legacy", "screen_name") or ""


def _text(result: dict, legacy: dict) -> str:
    # 280자 넘는 장문은 note_tweet에 전문이 있음 (full_text는 잘림)
    note = _dig(result, "note_tweet", "note_tweet_results", "result") or {}
    text = note.get("text") or legacy.get("full_text", "")
    entities = note.get("entity_set") or legacy.get("entities", {})

    for u in entities.get("urls", []):  # t.co → 원래 링크
        text = text.replace(u["url"], u.get("expanded_url", u["url"]))
    for m in legacy.get("extended_entities", {}).get("media", []):  # 본문 끝 미디어 t.co 제거
        text = text.replace(m.get("url", ""), "")

    return html.unescape(text).strip()  # &amp; 같은 엔티티 복원


def _media(legacy: dict) -> list[Media]:
    out: list[Media] = []
    for m in legacy.get("extended_entities", {}).get("media", []):
        if m.get("type") == "photo":
            stem, ext = m["media_url_https"].rsplit(".", 1)
            out.append(Media("photo", f"{stem}?format={ext}&name=orig", ext))
        else:  # video, animated_gif
            mp4s = [v for v in _dig(m, "video_info", "variants") or []
                    if v.get("content_type") == "video/mp4"]
            if mp4s:
                best = max(mp4s, key=lambda v: v.get("bitrate", 0))
                out.append(Media(m["type"], best["url"], "mp4"))
    return out


def _dig(obj: Any, *keys: str) -> Any:
    for k in keys:
        if not isinstance(obj, dict):
            return None
        obj = obj.get(k)
    return obj
