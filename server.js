const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// UPDATED: The new, more stable instance of the API
const SAAVN_API_BASE = 'https://saavn.sumit.co/api';

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: "Query is required" });
        
        console.log(`Searching for: ${query}`);
        
        // Fetch HQ music data
        const response = await axios.get(`${SAAVN_API_BASE}/search/songs?query=${encodeURIComponent(query)}`);
        res.json(response.data);
    } catch (error) {
        // If the API blocks us or is down, log the exact reason on Render
        console.error("API Error Details:", error.response ? error.response.data : error.message);
        
        // Send a clear error back to the frontend
        res.status(500).json({ 
            error: true, 
            message: 'Audio servers are temporarily offline or blocked. Try again later.' 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App running on port ${PORT}`));
