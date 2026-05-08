# Telegram Crypto Chart Bot

A professional Telegram bot that fetches live cryptocurrency data (from DexScreener & CoinGecko) and generates beautiful, modern glassmorphism image cards directly inside Telegram.

## Features
- Real-time price fetching from DexScreener API
- Intelligent fallback to CoinGecko if token isn't found
- Advanced generated image charts via Node Canvas (1280x720)
- Fully async/await architecture
- Built-in Rate Limiting protection
- Anti-crash error handling built-in
- Dynamic price formatting
- Response caching to avoid API rate limits

---

## Installation Instructions

### Prerequisites
- **Node.js**: v16 or newer is highly recommended.
- **Build Tools**: Because `node-canvas` requires native dependencies for image processing, you may need to install build tools depending on your OS.
  - *Ubuntu/Debian*: `sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
  - *Windows*: Ensure you have installed Visual Studio Build Tools, or you can often rely on pre-built node-canvas binaries by using a standard Node.js version.

### Local Setup
1. Clone the repository or open this project directory.
2. Install the necessary packages:
   ```bash
   npm install
   ```
3. Make sure your `BOT_TOKEN` is set inside the `.env` file.
4. Run the bot:
   ```bash
   npm start
   ```

### VPS Deployment Instructions (Ubuntu / Debian)
Deploying on a VPS ensures the bot is running 24/7.

1. SSH into your VPS server.
2. Update packages and install Node.js (v18 recommended):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. Install PM2 (Process Manager to keep the bot running):
   ```bash
   sudo npm install pm2 -g
   ```
4. Install canvas system dependencies (required for image generation):
   ```bash
   sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev -y
   ```
5. Clone your bot folder to the server and navigate into it.
6. Install NPM dependencies:
   ```bash
   npm install
   ```
7. Start the bot with PM2:
   ```bash
   pm2 start index.js --name "crypto-bot"
   pm2 save
   pm2 startup
   ```
Your bot will now automatically restart on crashes and server reboots!

## Usage
Simply message your bot on Telegram:
- `/start` - Check if bot is alive and get instructions
- `/chart btc` - Generate a chart for Bitcoin
- `/chart ton` - Generate a chart for TON
- `/chart pepe` - Works with memecoins on DEXes too!
