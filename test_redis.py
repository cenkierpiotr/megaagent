import redis
import os
import json

def test_redis():
    url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    print(f"Connecting to: {url}")
    try:
        r = redis.Redis.from_url(url, decode_responses=True)
        print("PING:", r.ping())
        print("Queues:")
        print("tasks:p1 len:", r.llen("tasks:p1"))
        print("tasks:p2 len:", r.llen("tasks:p2"))
        
        # Check if there are any active stream IDs
        # We can't easily list all keys without scan, but let's check one if we had it.
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_redis()
