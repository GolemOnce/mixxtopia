from app.database import get_db

db = get_db("hashtag")
phrases_col = db["kyujin_26"]
clients_col = db["clients"]
stats_col = db["stats"]

KEY_TOTAL = "hashtag:clicks:total"
KEY_CLIENTS = "hashtag:clients:set"
KEY_PHRASES = "hashtag:phrases"
KEY_PAIRS_COUNT = "hashtag:phrases:count"
