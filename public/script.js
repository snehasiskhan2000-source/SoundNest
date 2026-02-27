async function searchMusic() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;

    const container = document.getElementById('resultsContainer');
    container.innerHTML = '<p style="text-align: center; width: 100%; color: #00e5ff; grid-column: 1 / -1;">Connecting to audio servers...</p>';

    try {
        // Calls your Render backend
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        container.innerHTML = ''; 

        if (data.data && data.data.results) {
            data.data.results.forEach(song => {
                // Automatically fetch the highest 320kbps quality
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
        }
    } catch (error) {
        console.error("Error:", error);
        container.innerHTML = '<p style="color: red; text-align: center; width: 100%; grid-column: 1 / -1;">Database offline. Please try again.</p>';
    }
}

function playSong(title, artist, image, audioUrl) {
    // Update the bottom UI
    document.getElementById('playerTitle').innerText = title;
    document.getElementById('playerArtist').innerText = artist;
    document.getElementById('playerImage').src = image;
    
    // Play the 320kbps stream
    const player = document.getElementById('audioPlayer');
    player.src = audioUrl;
    player.play();
}

// Allow pressing "Enter" to search
document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchMusic();
});
