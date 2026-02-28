require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const RAPIDAPI_HOST = 'youtube138.p.rapidapi.com';

// 1. Load all available keys into an array.
const apiKeys = [
    process.env.RAPIDAPI_KEY_1,
    process.env.RAPIDAPI_KEY_2,
    process.env.RAPIDAPI_KEY_3,
    process.env.RAPIDAPI_KEY_4,
    process.env.RAPIDAPI_KEY_5
].filter(key => key !== undefined && key !== ''); 

if (apiKeys.length === 0) {
    console.error("CRITICAL ERROR: No API keys found in environment variables!");
}

let currentKeyIndex = 0;

// 2. The God-Tier Recursive Fetcher for Rate Limits
async function fetchWithKeyRotation(query, cursor, retries = 0) {
    if (retries >= apiKeys.length) {
        throw new Error("ALL_KEYS_EXHAUSTED");
    }

    const currentKey = apiKeys[currentKeyIndex];
    const params = { q: query, hl: 'en', gl: 'US' };
    if (cursor) params.cursor = cursor;

    const options = {
        method: 'GET',
        url: `https://${RAPIDAPI_HOST}/search/`,
        params: params,
        headers: {
            'X-RapidAPI-Key': currentKey,
            'X-RapidAPI-Host': RAPIDAPI_HOST
        }
    };

    try {
        const response = await axios.request(options);
        return response.data; 
    } catch (error) {
        const status = error.response ? error.response.status : null;

        if (status === 429 || status === 403 || (error.response && error.response.data.message && error.response.data.message.includes("exceeded"))) {
            console.warn(`💀 Key ${currentKeyIndex + 1} exhausted! Rotating to next key...`);
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            return fetchWithKeyRotation(query, cursor, retries + 1);
        } else {
            throw error;
        }
    }
}

// --- API ROUTES ---

// YouTube Video Search API
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const cursor = req.query.cursor; 
        
        if (!query) return res.status(400).json({ error: "Query is required" });

        const data = await fetchWithKeyRotation(query, cursor);
        res.json(data);

    } catch (error) {
        if (error.message === "ALL_KEYS_EXHAUSTED") {
            res.status(429).json({ error: true, message: 'All backup servers are currently full. Try again next month.' });
        } else {
            console.error("Search API Error:", error.message);
            res.status(500).json({ error: true, message: 'Server connection failed.' });
        }
    }
});

// Free Google Autocomplete Proxy
app.get('/api/suggest', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);
        
        const response = await axios.get(`http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`);
        res.json(response.data[1]);
    } catch (error) {
        console.error("Suggest API Error:", error.message);
        res.json([]); 
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`YouTube Premium running on port ${PORT}`));
