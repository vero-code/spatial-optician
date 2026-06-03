from pymongo import MongoClient
from pymongo.database import Database

from config import MONGODB_URI

db: Database | None = None

try:
    _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5_000)
    db = _client.get_default_database()
    print("MongoDB connected.")
except Exception as exc:
    print(f"Warning: MongoDB unavailable — running in sandbox mode. ({exc})")
