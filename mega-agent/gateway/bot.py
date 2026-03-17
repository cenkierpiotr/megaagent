import os
import logging
import asyncio
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

    def run(self):
        application = ApplicationBuilder().token(self.token).build()
        
        application.add_handler(CommandHandler('start', self.start))
        application.add_handler(CommandHandler('status', self.status))
        
        print("Telegram Bot is running...")
        application.run_polling()

if __name__ == "__main__":
    bot = ClawBot()
    bot.run()
