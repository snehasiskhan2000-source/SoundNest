const audioPlayer = document.getElementById('audioPlayer');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const miniPlayBtn = document.getElementById('miniPlayBtn');
const mainPlayBtn = document.getElementById('mainPlayBtn');
let isPlaying = false;

// Keeps your existing search functionality exactly the same
async function searchMusic() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;

    const container = document.getElementById('resultsContainer');
    container.innerHTML = '<p style="text-align: center; width: 100%; color: #1db954; grid-column: 1 / -1;">Connecting to audio servers...</p>';

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        container.innerHTML = ''; 

        if (data.error) {
            container.innerHTML = `<p style="color: #ff3333; text-align: center; width: 100%; grid-column: 1 / -1;">⚠️ ${data.message}</p>`;
            return;
        }

        if (!data.data || !data.data.results || data.data.results.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center; width: 100%; grid-column: 1 / -1;">No tracks found for "${query}".</p>`;
            return;
        }

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
        container.innerHTML = '<p style="color: #ff3333; text-align: center; width: 100%; grid-column: 1 / -1;">⚠️ Connection failed.</p>';
    }
}

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchMusic();
});

// NEW: Player Logic
function playSong(title, artist, image, audioUrl) {
    // Update Mini Player
    document.getElementById('playerTitle').innerText = title;
    document.getElementById('playerArtist').innerText = artist;
    document.getElementById('playerImage').src = image;
    
    // Update Full Screen Player
    document.getElementById('fsTitle').innerText = title;
    document.getElementById('fsArtist').innerText = artist;
    document.getElementById('fsImage').src = image;
    
    audioPlayer.src = audioUrl;
    audioPlayer.play();
    isPlaying = true;
    updatePlayIcons();
}

function toggleFullScreenPlayer() {
    const fullPlayer = document.getElementById('fullPlayer');
    fullPlayer.classList.toggle('hidden');
}

function togglePlay(event) {
    event.stopPropagation(); // Prevents the full screen player from opening when clicking play on the mini player
    if (audioPlayer.src) {
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

// Format time in mm:ss
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// Update progress bar as song plays
audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.duration) {
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progressPercent;
        currentTimeEl.innerText = formatTime(audioPlayer.currentTime);
        totalTimeEl.innerText = formatTime(audioPlayer.duration);
    }
});

// Seek when user drags the progress bar
progressBar.addEventListener('input', () => {
    const seekTime = (progressBar.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
});
