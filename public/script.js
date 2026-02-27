async function searchMusic() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;

    const container = document.getElementById('resultsContainer');
    // Keep your premium UI loading text
    container.innerHTML = '<p style="text-align: center; width: 100%; color: #00e5ff; grid-column: 1 / -1;">Connecting to audio servers...</p>';

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        container.innerHTML = ''; // Clear loading text

        // NEW: Check if the backend sent us an error message
        if (data.error) {
            container.innerHTML = `<p style="color: #ff3333; text-align: center; width: 100%; grid-column: 1 / -1;">⚠️ ${data.message}</p>`;
            return;
        }

        // NEW: Check if the search worked, but no songs were found
        if (!data.data || !data.data.results || data.data.results.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center; width: 100%; grid-column: 1 / -1;">No tracks found for "${query}".</p>`;
            return;
        }

        // If successful, render the cards
        data.data.results.forEach(song => {
            const hqAudio = song.downloadUrl.find(url => url.quality === '320kbps') || song.downloadUrl[0];
            const hqImage = song.image.find(img => img.quality === '500x500') || song.image[0];
            const artistName = song.artists.primary[0]?.name || 'Unknown Artist';

            const card = document.createElement('div');
            card.className = 'song-card';
            card.onclick = () => playSong(song.name, artistName, hqImage.url, hqAudio.url);
            
            card.innerHTML = `
                <img src="${hqImage.url}" alt="Cover Art" loading="lazy">
                <h3>${song.name}</h3>
                <p>${artistName}</p>
            `;
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error("Frontend Error:", error);
        container.innerHTML = '<p style="color: #ff3333; text-align: center; width: 100%; grid-column: 1 / -1;">⚠️ Connection failed. Please check your internet.</p>';
    }
}

function playSong(title, artist, image, audioUrl) {
    document.getElementById('playerTitle').innerText = title;
    document.getElementById('playerArtist').innerText = artist;
    document.getElementById('playerImage').src = image;
    
    const player = document.getElementById('audioPlayer');
    player.src = audioUrl;
    player.play();
}

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchMusic();
});
