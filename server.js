const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());

// Serve the frontend UI from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// The secret sauce: An open-source JioSaavn wrapper
const SAAVN_API_BASE = 'https://saavn.dev/api';

// Proxy route to search songs
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: "Query is required" });
        
        // Fetch HQ music data
        const response = await axios.get(`${SAAVN_API_BASE}/search/songs?query=${encodeURIComponent(query)}`);
        res.json(response.data);
    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch music' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App running on port ${PORT}`));
