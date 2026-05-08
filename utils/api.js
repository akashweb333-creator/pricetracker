// utils/api.js
const axios = require('axios');

const cache = new Map();
const CACHE_TTL = 10000; // 10 seconds cache

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
        // 1. Try CoinGecko First (More accurate for prices and 24h change of major coins)
        let cgSearch = null;
        try {
            cgSearch = await fetchWithRetry(`https://api.coingecko.com/api/v3/search?query=${query}`);
        } catch (e) {
            console.error("CoinGecko search error");
        }

        if (cgSearch && cgSearch.coins && cgSearch.coins.length > 0) {
            // Find exact symbol match if possible, otherwise first result
            const exactMatch = cgSearch.coins.find(c => c.symbol.toLowerCase() === query.toLowerCase());
            const coin = exactMatch || cgSearch.coins[0];
            
            const coinId = coin.id;
            const logo = coin.large;
            const symbol = coin.symbol.toUpperCase();
            
            try {
                const cgPriceData = await fetchWithRetry(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
                
                if (cgPriceData && cgPriceData[coinId] && cgPriceData[coinId].usd) {
                    const price = cgPriceData[coinId].usd;
                    const priceChange24h = cgPriceData[coinId].usd_24h_change || 0;
                    const priceChange24hUsd = price * (priceChange24h / 100);

                    const result = {
                        symbol: symbol,
                        name: coin.name,
                        price: price,
                        priceChange24h: priceChange24h,
                        priceChange24hUsd: priceChange24hUsd,
                        logo: logo,
                        source: 'CoinGecko'
                    };
                    
                    // Validate we actually have a price, otherwise fallback
                    if (price > 0) {
                        cache.set(cacheKey, { timestamp: now, data: result });
                        return result;
                    }
                }
            } catch (e) {
                console.error("CoinGecko price fetch error");
            }
        }

        // 2. Fallback to DexScreener (Great for new memecoins missing from CoinGecko)
        const dexData = await fetchWithRetry(`https://api.dexscreener.com/latest/dex/search/?q=${query}`);
        if (dexData && dexData.pairs && dexData.pairs.length > 0) {
            // Sort by liquidity to get real pair instead of scam tokens
            const bestPair = dexData.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
            
            const price = parseFloat(bestPair.priceUsd || 0);
            const priceChange24h = parseFloat(bestPair.priceChange?.h24 || 0);
            const priceChange24hUsd = price * (priceChange24h / 100);

            let logo = bestPair.info?.imageUrl || null;

            // Try grabbing logo from our earlier CoinGecko search if dex logo is missing
            if (!logo && cgSearch && cgSearch.coins && cgSearch.coins.length > 0) {
                const coin = cgSearch.coins.find(c => c.symbol.toLowerCase() === bestPair.baseToken.symbol.toLowerCase()) || cgSearch.coins[0];
                logo = coin.large;
            }

            const result = {
                symbol: bestPair.baseToken.symbol.toUpperCase(),
                name: bestPair.baseToken.name,
                price: price,
                priceChange24h: priceChange24h,
                priceChange24hUsd: priceChange24hUsd,
                logo: logo,
                source: 'DexScreener'
            };

            cache.set(cacheKey, { timestamp: now, data: result });
            return result;
        }

        return null;
    } catch (error) {
        console.error("Error fetching crypto data:", error.message);
        return null;
    }
}

module.exports = { getCryptoData };
