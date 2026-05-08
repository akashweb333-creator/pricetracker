// utils/imageGenerator.js
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');

// Dynamic price formatting rules
function formatPrice(price) {
    if (price < 1) {
        // Less than a dollar: show more decimals (e.g., 0.000123)
        return price.toPrecision(4);
    } else {
        // Over a dollar: standard 2 decimals
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

function formatDollarChange(changeUsd) {
    const sign = changeUsd >= 0 ? '+' : '';
    let val = Math.abs(changeUsd);
    let strVal = val < 1 ? val.toPrecision(4) : val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sign}$${strVal}`;
}

async function generateChartImage(data) {
    const width = 1280;
    const height = 720;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Dark black/red gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0a0a0a');   // Very dark gray/black
    bgGradient.addColorStop(0.5, '#120505'); // Dark red tint
    bgGradient.addColorStop(1, '#2b0a0a');   // Deep red

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Professional glow effect
    const glow = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/1.5);
    glow.addColorStop(0, 'rgba(255, 50, 50, 0.08)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // 3. Rounded UI Panel (Glassmorphism)
    const panelX = 140;
    const panelY = 160;
    const panelW = 1000;
    const panelH = 400;
    const radius = 30;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(panelX + radius, panelY);
    ctx.lineTo(panelX + panelW - radius, panelY);
    ctx.quadraticCurveTo(panelX + panelW, panelY, panelX + panelW, panelY + radius);
    ctx.lineTo(panelX + panelW, panelY + panelH - radius);
    ctx.quadraticCurveTo(panelX + panelW, panelY + panelH, panelX + panelW - radius, panelY + panelH);
    ctx.lineTo(panelX + radius, panelY + panelH);
    ctx.quadraticCurveTo(panelX, panelY + panelH, panelX, panelY + panelH - radius);
    ctx.lineTo(panelX, panelY + radius);
    ctx.quadraticCurveTo(panelX, panelY, panelX + radius, panelY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Token Logo
    const logoSize = 200;
    const logoX = panelX + 80;
    const logoY = panelY + 100;
    const logoCenter = { x: logoX + logoSize/2, y: logoY + logoSize/2 };

    if (data.logo) {
        try {
            // Fetch image arraybuffer
            const response = await axios.get(data.logo, { responseType: 'arraybuffer', timeout: 5000 });
            const img = await loadImage(Buffer.from(response.data));
            
            // Render logo inside a circular clip
            ctx.save();
            ctx.beginPath();
            ctx.arc(logoCenter.x, logoCenter.y, logoSize/2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
            ctx.restore();
            
            // Glowing ring around logo
            ctx.beginPath();
            ctx.arc(logoCenter.x, logoCenter.y, logoSize/2, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 4;
            ctx.stroke();
        } catch (e) {
            console.error("Failed to load logo image:", e.message);
            drawPlaceholderLogo(ctx, data.symbol, logoCenter.x, logoCenter.y, logoSize);
        }
    } else {
        drawPlaceholderLogo(ctx, data.symbol, logoCenter.x, logoCenter.y, logoSize);
    }

    // 5. Typography & Data
    const textStartX = logoX + logoSize + 80;
    
    // Symbol
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 90px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(data.symbol, textStartX, panelY + 70);

    // Name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '40px sans-serif';
    const nameWidth = ctx.measureText(data.symbol).width;
    ctx.fillText(data.name, textStartX + nameWidth + 30, panelY + 110);

    // Current Price
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 110px sans-serif';
    ctx.fillText('$' + formatPrice(data.price), textStartX, panelY + 190);

    // 24h Change
    const isPositive = data.priceChange24h >= 0;
    const changeColor = isPositive ? '#00ff88' : '#ff3344'; // Green or Red
    const changeSymbol = isPositive ? '▲' : '▼';

    ctx.fillStyle = changeColor;
    ctx.font = 'bold 45px sans-serif';
    const pctChangeText = `${changeSymbol} ${Math.abs(data.priceChange24h).toFixed(2)}%`;
    ctx.fillText(pctChangeText, textStartX, panelY + 310);

    // 24h Dollar Change
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '40px sans-serif';
    const pctWidth = ctx.measureText(pctChangeText).width;
    ctx.fillText(`(${formatDollarChange(data.priceChange24hUsd)})`, textStartX + pctWidth + 30, panelY + 315);

    // 6. Watermarks
    // Small watermark text at top
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Generated by Crypto Tracker Bot', width / 2, 40);

    // Data source watermark inside panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Data source: ${data.source}`, panelX + panelW - 30, panelY + panelH - 30);

    return canvas.toBuffer('image/png');
}

function drawPlaceholderLogo(ctx, symbol, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size/2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol.charAt(0), x, y);
}

module.exports = { generateChartImage };
