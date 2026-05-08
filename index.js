// index.js
require('dotenv').config();
const { Bot } = require('grammy');
const { handleChartCommand } = require('./commands/chart');

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
    console.error("CRITICAL ERROR: BOT_TOKEN is not set in the .env file.");
    process.exit(1);
}

const bot = new Bot(botToken);

// --- Rate Limiting Protection ---
// A basic memory cache to prevent users from spamming commands and hitting API limits
const userCooldowns = new Set();
const COOLDOWN_MS = 3000; // 3 seconds cooldown per user

bot.use(async (ctx, next) => {
    if (ctx.from) {
        const userId = ctx.from.id;
        if (userCooldowns.has(userId)) {
            // Silently ignore to prevent spam
            return;
        }
        userCooldowns.add(userId);
        setTimeout(() => userCooldowns.delete(userId), COOLDOWN_MS);
    }
    await next();
});

// --- Commands Setup ---
bot.command('start', async (ctx) => {
    await ctx.reply(
        "👋 **Welcome to the Crypto Chart Bot!**\n\n" +
        "Use `/chart <coin>` to get a beautiful real-time snapshot of any cryptocurrency.\n" +
        "Example: `/chart btc` or `/chart ton`",
        { parse_mode: 'Markdown' }
    );
});

bot.command('chart', handleChartCommand);

// --- Anti-crash handling ---
// Ensures that network errors or unexpected bugs do not crash the bot completely
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    console.error(e);
});

// --- Start the Bot ---
console.log("Starting up Crypto Chart Bot...");
bot.start({
    onStart: (botInfo) => {
        console.log(`✅ Bot successfully started! Running as @${botInfo.username}`);
    }
});
