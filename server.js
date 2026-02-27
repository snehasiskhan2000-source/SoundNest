require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const RAPIDAPI_HOST = 'youtube138.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const cursor = req.query.cursor; 
        
        if (!query) return res.status(400).json({ error: "Query is required" });

        const params = { q: query, hl: 'en', gl: 'US' };
        // Attach the cursor to the API call if it exists
        if (cursor) params.cursor = cursor; 

        const options = {
            method: 'GET',
            url: `https://${RAPIDAPI_HOST}/search/`,
            params: params,
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            }
        };

        const response = await axios.request(options);
        
        // Send the data and the next cursor back to your frontend
        res.json(response.data);
    } catch (error) {
        console.error("API Error Details:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: true, message: 'Server connection failed or rate limit reached.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`YouTube Premium running on port ${PORT}`));
