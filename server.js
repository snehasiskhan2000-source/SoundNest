// Load environment variables securely
require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const RAPIDAPI_HOST = 'youtube138.p.rapidapi.com';
// Read the key securely from the environment (.env locally, or Render dashboard live)
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; 

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: "Query is required" });
        
        console.log(`Searching YouTube for: ${query}`);

        const options = {
            method: 'GET',
            url: `https://${RAPIDAPI_HOST}/search/`,
            params: { q: query, hl: 'en', gl: 'US' },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            }
        };

        const response = await axios.request(options);
        res.json(response.data);
    } catch (error) {
        console.error("API Error Details:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: true, message: 'YouTube API failed or rate limit reached.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TubeNest running on port ${PORT}`));
