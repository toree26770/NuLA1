import asyncio
import sys
sys.path.insert(0, "/app/backend")
from database import db


async def main():
    res = await db.form_questions.delete_many({"question_key": "consent"})
    print("Questions consent supprimées:", res.deleted_count)
    remaining = await db.form_questions.count_documents({"question_key": "consent"})
    print("Restantes:", remaining)


asyncio.run(main())
