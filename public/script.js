const audioPlayer = document.getElementById('audioPlayer');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const miniPlayBtn = document.getElementById('miniPlayBtn');
const mainPlayBtn = document.getElementById('mainPlayBtn');
let isPlaying = false;

// STEP 1: Search using Apple's highly accurate metadata database
async function searchMusic() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;

    const container = document.getElementById('resultsContainer');
    container.innerHTML = '<p style="text-align: center; width: 100%; color: #1db954; grid-column: 1 / -1;">Searching global database...</p>';

    try {
        // Call iTunes API (Free, No Keys Required)
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`);
        const data = await response.json();
        container.innerHTML = ''; 

        if (data.results.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center; width: 100%; grid-column: 1 / -1;">No tracks found for "${query}".</p>`;
            return;
        }

        data.results.forEach(song => {
            const title = song.trackName;
            const artist = song.artistName;
            // Apple gives 100x100 images by default. This neat trick forces a high-res 500x500 image.
            const hqImage = song.artworkUrl100.replace('100x100bb', '500x500bb');

            const card = document.createElement('div');
            card.className = 'song-card';
            // When clicked, we trigger the hybrid play function
            card.onclick = () => playHybridSong(title, artist, hqImage);
            
            card.innerHTML = `
                <img src="${hqImage}" alt="Cover Art" loading="lazy">
                <h3>${title}</h3>
                <p>${artist}</p>
            `;
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error("Search Error:", error);
        container.innerHTML = '<p style="color: #ff3333; text-align: center; width: 100%; grid-column: 1 / -1;">⚠️ Search failed. Please check your connection.</p>';
    }
}

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchMusic();
});

// STEP 2: Silently fetch audio from JioSaavn using the highly accurate Title + Artist combo
async function playHybridSong(title, artist, image) {
    // 1. Immediately update UI to show it is loading
    document.getElementById('playerTitle').innerText = title;
    document.getElementById('playerArtist').innerText = 'Fetching HQ Audio...';
    document.getElementById('playerImage').src = image;
    
    document.getElementById('fsTitle').innerText = title;
    document.getElementById('fsArtist').innerText = 'Fetching HQ Audio...';
    document.getElementById('fsImage').src = image;

    try {
        // 2. Force JioSaavn to find the exact track by searching "Title Artist"
        const exactQuery = `${title} ${artist}`;
        const response = await fetch(`/api/search?q=${encodeURIComponent(exactQuery)}`);
        const data = await response.json();

        if (data.data && data.data.results && data.data.results.length > 0) {
            // 3. Grab the first result (which will now be highly accurate)
            const matchedSong = data.data.results[0];
            const hqAudio = matchedSong.downloadUrl.find(url => url.quality === '320kbps') || matchedSong.downloadUrl[0];

            // 4. Play the audio and clear the loading text
            document.getElementById('playerArtist').innerText = artist;
            document.getElementById('fsArtist').innerText = artist;
            
            audioPlayer.src = hqAudio.url;
            audioPlayer.play();
            isPlaying = true;
            updatePlayIcons();
        } else {
            // Failsafe if JioSaavn completely lacks the song
            document.getElementById('playerArtist').innerText = 'Audio unavailable 😢';
            document.getElementById('fsArtist').innerText = 'Audio unavailable 😢';
        }
    } catch (error) {
        console.error("Stream Error:", error);
        document.getElementById('playerArtist').innerText = 'Failed to connect to stream';
    }
}

// --- Player Controls Logic (Unchanged) ---
function toggleFullScreenPlayer() {
    const fullPlayer = document.getElementById('fullPlayer');
    fullPlayer.classList.toggle('hidden');
}

function togglePlay(event) {
    event.stopPropagation(); 
    if (audioPlayer.src && audioPlayer.src !== window.location.href) {
        if (isPlaying) { audioPlayer.pause(); } 
        else { audioPlayer.play(); }
        isPlaying = !isPlaying;
        updatePlayIcons();
    }
}

function updatePlayIcons() {
    miniPlayBtn.innerText = isPlaying ? '⏸️' : '▶️';
    mainPlayBtn.innerText = isPlaying ? '⏸️' : '▶️';
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.duration) {
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progressPercent;
        currentTimeEl.innerText = formatTime(audioPlayer.currentTime);
        totalTimeEl.innerText = formatTime(audioPlayer.duration);
    }
});

progressBar.addEventListener('input', () => {
    const seekTime = (progressBar.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
});
