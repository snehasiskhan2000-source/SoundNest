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
// The .filter() secretly removes any empty lines in case you only add 2 or 3 keys to start!
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

// 2. The tracker
let currentKeyIndex = 0;

// 3. The God-Tier Recursive Fetcher
async function fetchWithKeyRotation(query, cursor, retries = 0) {
    // Failsafe: If we tried all 5 keys and they are ALL dead, we stop to prevent infinite loops.
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
        return response.data; // Success! Return the data.
    } catch (error) {
        const status = error.response ? error.response.status : null;

        // RapidAPI uses 429 (Rate Limit) or 403 (Quota Exceeded)
        if (status === 429 || status === 403 || (error.response && error.response.data.message && error.response.data.message.includes("exceeded"))) {
            console.warn(`💀 Key ${currentKeyIndex + 1} exhausted! Rotating to next key...`);
            
            // Move to the next key. The '%' operator automatically loops it back to 0 if it hits the end!
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            
            // Immediately retry the request with the new key without telling the frontend
            return fetchWithKeyRotation(query, cursor, retries + 1);
        } else {
            // If it's a different error (like RapidAPI servers being down completely), throw it
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

        // Trigger our secret failover system
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

// Free Google Autocomplete Proxy (Doesn't use RapidAPI keys!)
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
