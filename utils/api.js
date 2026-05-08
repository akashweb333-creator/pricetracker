// utils/api.js
const axios = require('axios');

const cache = new Map();
const CACHE_TTL = 10000; // 10 seconds cache

// Retry wrapper for robust API fetching
async function fetchWithRetry(url, retries = 3, delayMs = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, { timeout: 7000 });
            return response.data;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(res => setTimeout(res, delayMs));
        }
    }
}

async function getCryptoData(query) {
    const cacheKey = query.toLowerCase();
    const now = Date.now();

    // 1. Check in-memory cache
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (now - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        // 2. Try DexScreener First
        const dexData = await fetchWithRetry(`https://api.dexscreener.com/latest/dex/search/?q=${query}`);
        if (dexData && dexData.pairs && dexData.pairs.length > 0) {
            // Sort by USD liquidity to get the most relevant/real pair instead of a scam token
            const bestPair = dexData.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
            
            const price = parseFloat(bestPair.priceUsd || 0);
            const priceChange24h = parseFloat(bestPair.priceChange?.h24 || 0);
            const priceChange24hUsd = price * (priceChange24h / 100);

            const result = {
                symbol: bestPair.baseToken.symbol.toUpperCase(),
                name: bestPair.baseToken.name,
                price: price,
                priceChange24h: priceChange24h,
                priceChange24hUsd: priceChange24hUsd,
                logo: bestPair.info?.imageUrl || null,
                source: 'DexScreener'
            };
            
            // If DexScreener doesn't provide a logo, attempt fallback to CoinGecko search for logo only
            if (!result.logo) {
                try {
                    const cgSearch = await fetchWithRetry(`https://api.coingecko.com/api/v3/search?query=${query}`);
                    if (cgSearch && cgSearch.coins && cgSearch.coins.length > 0) {
                        const coin = cgSearch.coins.find(c => c.symbol.toLowerCase() === result.symbol.toLowerCase()) || cgSearch.coins[0];
                        if (coin && coin.large) result.logo = coin.large;
                    }
                } catch (e) {
                    console.error("CoinGecko search fallback failed for logo");
                }
            }

            cache.set(cacheKey, { timestamp: now, data: result });
            return result;
        }

        // 3. Fallback to CoinGecko if not found on DexScreener
        const cgSearch = await fetchWithRetry(`https://api.coingecko.com/api/v3/search?query=${query}`);
        if (cgSearch && cgSearch.coins && cgSearch.coins.length > 0) {
            const coinId = cgSearch.coins[0].id;
            const logo = cgSearch.coins[0].large;
            const symbol = cgSearch.coins[0].symbol.toUpperCase();
            
            const cgPriceData = await fetchWithRetry(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
            
            if (cgPriceData && cgPriceData[coinId]) {
                const price = cgPriceData[coinId].usd;
                const priceChange24h = cgPriceData[coinId].usd_24h_change || 0;
                const priceChange24hUsd = price * (priceChange24h / 100);

                const result = {
                    symbol: symbol,
                    name: cgSearch.coins[0].name,
                    price: price,
                    priceChange24h: priceChange24h,
                    priceChange24hUsd: priceChange24hUsd,
                    logo: logo,
                    source: 'CoinGecko'
                };
                
                cache.set(cacheKey, { timestamp: now, data: result });
                return result;
            }
        }

        return null;
    } catch (error) {
        console.error("Error fetching crypto data:", error.message);
        return null;
    }
}

module.exports = { getCryptoData };
