// commands/chart.js
const { InputFile } = require('grammy');
const { getCryptoData } = require('../utils/api');
const { generateChartImage } = require('../utils/imageGenerator');

async function handleChartCommand(ctx) {
    const query = ctx.match;

    if (!query) {
        return ctx.reply("❌ Please provide a coin symbol.\nExample: `/chart btc`", { parse_mode: 'Markdown' });
    }

    // Inform user that image is generating
    const loadingMessage = await ctx.reply("⏳ Loading chart...");

    try {
        const data = await getCryptoData(query);

        if (!data) {
            return await ctx.api.editMessageText(
                ctx.chat.id, 
                loadingMessage.message_id, 
                `❌ Could not find data for "${query}". Please check the symbol and try again.`
            );
        }

        // Generate the image buffer
        const imageBuffer = await generateChartImage(data);

        // Send the generated image directly
        await ctx.replyWithPhoto(new InputFile(imageBuffer, 'chart.png'), {
            caption: `📊 **${data.name} (${data.symbol})**\nPrice: $${data.price}\n24h Change: ${data.priceChange24h.toFixed(2)}%`,
            parse_mode: "Markdown"
        });

        // Clean up the loading message
        await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id);

    } catch (error) {
        console.error("Error in chart command:", error);
        
        // Handle gracefully
        try {
            await ctx.api.editMessageText(
                ctx.chat.id, 
                loadingMessage.message_id, 
                "❌ An unexpected error occurred while generating the chart. Please try again later."
            );
        } catch (e) {
            // Ignored, message might already be deleted
        }
    }
}

module.exports = { handleChartCommand };
