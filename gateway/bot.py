import os
import logging
import asyncio
import json
import redis
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)

class ClawBot:
    def __init__(self):
        self.token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.admin_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID")
        self.redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))

    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text("👋 Welcome to Claw-Omni-OS. Awaiting commands.")

    async def status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        # Fetch system status from Redis
        status_info = self.redis_client.get("system_status") or "Running"
        await update.message.reply_text(f"📊 System Status: {status_info}")

    async def request_confirmation(self, command: str):
        """Send a push confirmation for critical commands."""
        keyboard = [
            [
                InlineKeyboardButton("✅ Approve", callback_data=f"confirm_{command}"),
                InlineKeyboardButton("❌ Deny", callback_data=f"deny_{command}"),
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        # This would be called by other internal services via Redis/Bridge
        pass

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if str(update.effective_chat.id) != str(self.admin_id) and self.admin_id:
            return # Ignore non-admin messages

        text = update.message.text
        await update.message.reply_text("🤖 Working on it... I'll let you know when I have progress.")
        
        # Push to Redis P2 Queue (Standard Interactive Task)
        task = {
            "source": "telegram",
            "chat_id": update.effective_chat.id,
            "prompt": text,
            "priority": "P2"
        }
        self.redis_client.lpush("tasks:p2", str(task))

    async def listen_for_results(self, application):
        pubsub = self.redis_client.pubsub()
        pubsub.subscribe("task_results")
        print("Telegram result listener started...")
        while True:
            message = pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                try:
                    data = json.loads(message['data'])
                    if data.get("source") == "telegram":
                        chat_id = data.get("chat_id")
                        result = data.get("result")
                        await application.bot.send_message(chat_id=chat_id, text=f"✅ Result:\n\n{result}")
                except Exception as e:
                    print(f"Error sending telegram response: {e}")
            await asyncio.sleep(1)

    def run(self):
        application = ApplicationBuilder().token(self.token).build()
        
        application.add_handler(CommandHandler('start', self.start))
        application.add_handler(CommandHandler('status', self.status))
        from telegram.ext import MessageHandler, filters
        application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), self.handle_message))
        
        print("Telegram Bot is running...")
        
        # Start the result listener in the background
        loop = asyncio.get_event_loop()
        loop.create_task(self.listen_for_results(application))
        
        application.run_polling()

if __name__ == "__main__":
    bot = ClawBot()
    bot.run()
