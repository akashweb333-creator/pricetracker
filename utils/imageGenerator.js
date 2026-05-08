// utils/imageGenerator.js
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Automatically download and load beautiful modern fonts
async function loadFonts() {
    const fontPath = path.join(__dirname, '../assets/Outfit-Bold.ttf');
    const fontRegPath = path.join(__dirname, '../assets/Outfit-Regular.ttf');
    
    if (!fs.existsSync(fontPath) || !fs.existsSync(fontRegPath)) {
        console.log("Downloading Outfit font for a viby look...");
        try {
            const res = await axios.get('https://github.com/google/fonts/raw/main/ofl/outfit/Outfit-Bold.ttf', { responseType: 'arraybuffer' });
            fs.writeFileSync(fontPath, Buffer.from(res.data));
            const res2 = await axios.get('https://github.com/google/fonts/raw/main/ofl/outfit/Outfit-Regular.ttf', { responseType: 'arraybuffer' });
            fs.writeFileSync(fontRegPath, Buffer.from(res2.data));
        } catch (e) {
            console.error("Failed to download fonts", e);
        }
    }
    
    if (fs.existsSync(fontPath)) GlobalFonts.registerFromPath(fontPath, 'Outfit-Bold');
    if (fs.existsSync(fontRegPath)) GlobalFonts.registerFromPath(fontRegPath, 'Outfit-Regular');
}

// Fire off the font load
loadFonts().catch(console.error);

function formatPrice(price) {
    if (price < 0.01) return price.toPrecision(4);
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDollarChange(changeUsd) {
    const sign = changeUsd >= 0 ? '+' : '';
    let val = Math.abs(changeUsd);
    let strVal = val < 0.01 ? val.toPrecision(4) : val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sign}$${strVal}`;
}

async function generateChartImage(data) {
    const width = 1280;
    const height = 720;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Viby Background - Modern Deep Space/Neon Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#09090e');   // Deep dark blue
    bgGradient.addColorStop(0.5, '#140c26'); // Rich deep purple
    bgGradient.addColorStop(1, '#050a1f');   // Dark blue/cyan tint

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Glowing Orbs in background
    const drawOrb = (x, y, r, color) => {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };

    drawOrb(width * 0.2, height * 0.2, 400, 'rgba(100, 50, 255, 0.15)'); // Purple neon glow
    drawOrb(width * 0.8, height * 0.8, 500, 'rgba(0, 200, 255, 0.1)'); // Cyan neon glow

    // 3. Glassmorphism Card
    const panelX = 150;
    const panelY = 150;
    const panelW = 980;
    const panelH = 420;
    const radius = 40;

    // Card shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 20;

    ctx.fillStyle = 'rgba(20, 20, 35, 0.4)'; // Transparent dark glass
    
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, radius);
    ctx.fill();

    // Reset shadow for inner elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Card subtle shine border
    const borderGrad = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
    borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Token Logo
    const logoSize = 140;
    const logoX = panelX + 70;
    const logoY = panelY + 60;
    const logoCenter = { x: logoX + logoSize/2, y: logoY + logoSize/2 };

    if (data.logo) {
        try {
            const response = await axios.get(data.logo, { responseType: 'arraybuffer', timeout: 5000 });
            const img = await loadImage(Buffer.from(response.data));
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(logoCenter.x, logoCenter.y, logoSize/2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
            ctx.restore();
            
            // Subtle ring around logo
            ctx.beginPath();
            ctx.arc(logoCenter.x, logoCenter.y, logoSize/2, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 3;
            ctx.stroke();
        } catch (e) {
            drawPlaceholderLogo(ctx, data.symbol, logoCenter.x, logoCenter.y, logoSize);
        }
    } else {
        drawPlaceholderLogo(ctx, data.symbol, logoCenter.x, logoCenter.y, logoSize);
    }

    // 5. Typography & Layout
    const textX = logoX + logoSize + 50;
    let currentY = logoY + 30;

    // Fix overlap: Use proper font measuring
    // Symbol (e.g. BTC)
    ctx.fillStyle = '#ffffff';
    ctx.font = '70px "Outfit-Bold", "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.symbol, textX, currentY);

    const symbolWidth = ctx.measureText(data.symbol).width;

    // Name (e.g. Bitcoin) - Place it dynamically next to symbol
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '35px "Outfit-Regular", "Segoe UI", sans-serif';
    ctx.fillText(data.name, textX + symbolWidth + 25, currentY + 10);

    // Huge Price Text
    currentY += 110;
    ctx.fillStyle = '#ffffff';
    ctx.font = '110px "Outfit-Bold", "Segoe UI", sans-serif';
    ctx.fillText('$' + formatPrice(data.price), textX, currentY);

    // 24h Change Badge & Text
    currentY += 100;
    const isPositive = data.priceChange24h >= 0;
    const changeColor = isPositive ? '#00e676' : '#ff3d00'; // Vibrant green/red
    const changeBg = isPositive ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 61, 0, 0.15)';
    const changeSymbol = isPositive ? '▲' : '▼';
    
    const pctChangeText = `${changeSymbol} ${Math.abs(data.priceChange24h).toFixed(2)}%`;
    ctx.font = '40px "Outfit-Bold", "Segoe UI", sans-serif';
    
    // Draw Badge Background
    const badgeW = ctx.measureText(pctChangeText).width + 50;
    const badgeH = 70;
    const badgeY = currentY - badgeH/2;
    
    ctx.fillStyle = changeBg;
    ctx.beginPath();
    ctx.roundRect(textX, badgeY, badgeW, badgeH, 20);
    ctx.fill();

    // Draw Change Text inside Badge
    ctx.fillStyle = changeColor;
    ctx.fillText(pctChangeText, textX + 25, currentY + 3);

    // Dollar Change
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '35px "Outfit-Regular", "Segoe UI", sans-serif';
    ctx.fillText(`(${formatDollarChange(data.priceChange24hUsd)})`, textX + badgeW + 20, currentY);

    // Watermarks removed per user request

    return await canvas.encode('png');
}

function drawPlaceholderLogo(ctx, symbol, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size/2, 0, Math.PI * 2);
    const grad = ctx.createLinearGradient(x-size/2, y-size/2, x+size/2, y+size/2);
    grad.addColorStop(0, '#333');
    grad.addColorStop(1, '#111');
    ctx.fillStyle = grad;
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `60px "Outfit-Bold", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol.charAt(0), x, y + 5);
    ctx.textAlign = 'left'; // reset
}

module.exports = { generateChartImage };
