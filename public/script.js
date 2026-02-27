let player;
let isPlayerReady = false;
let currentCursor = null;
let currentQuery = 'Trending Music';
let isFetching = false;
let progressInterval;

// --- 1. YOUTUBE API SETUP ---
// This function is automatically called by the script loaded in HTML
function onYouTubeIframeAPIReady() {
    player = new YT.Player('ytPlayer', {
        height: '100%', width: '100%',
        playerVars: { 
            'autoplay': 1, 'controls': 0, 'disablekb': 1, 
            'fs': 0, 'modestbranding': 1, 'rel': 0, 'showinfo': 0 
        },
        events: {
            'onReady': () => { isPlayerReady = true; },
            'onStateChange': onPlayerStateChange
        }
    });
}

// --- 2. CUSTOM PLAYER LOGIC ---
function playVideo(videoId, title) {
    if (!isPlayerReady) return;
    
    document.getElementById('playerSection').classList.remove('hidden');
    document.getElementById('nowPlayingTitle').innerText = title;
    
    player.loadVideoById(videoId);
    document.getElementById('playPauseBtn').innerText = '⏸️';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Flash the custom controls briefly for mobile users
    const controls = document.getElementById('customControls');
    controls.style.opacity = '1';
    setTimeout(() => { controls.style.opacity = ''; }, 3000);
}

function togglePlay() {
    const state = player.getPlayerState();
    if (state === 1 || state === 3) { // 1 = playing, 3 = buffering
        player.pauseVideo(); 
    } else { 
        player.playVideo(); 
    }
}

function toggleMute() {
    const muteBtn = event.currentTarget;
    if (player.isMuted()) { 
        player.unMute(); 
        muteBtn.innerText = '🔊';
    } else { 
        player.mute(); 
        muteBtn.innerText = '🔇';
    }
}

function closePlayer() {
    document.getElementById('playerSection').classList.add('hidden');
    player.stopVideo();
    clearInterval(progressInterval);
}

function onPlayerStateChange(event) {
    const btn = document.getElementById('playPauseBtn');
    if (event.data === YT.PlayerState.PLAYING) {
        btn.innerText = '⏸️';
        startProgressBar();
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        btn.innerText = '▶️';
        clearInterval(progressInterval);
    }
}

function startProgressBar() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (player && player.getCurrentTime) {
            const current = player.getCurrentTime();
            const total = player.getDuration();
            
            if (total > 0) {
                document.getElementById('progressBar').value = (current / total) * 100;
                document.getElementById('currentTime').innerText = formatTime(current);
                document.getElementById('totalTime').innerText = formatTime(total);
            }
        }
    }, 500); // Update every half second for smoothness
}

// Allow user to click the bar to skip ahead
document.getElementById('progressBar').addEventListener('input', function(e) {
    if (player && player.getDuration) {
        const seekTo = (e.target.value / 100) * player.getDuration();
        player.seekTo(seekTo, true);
    }
});

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// --- 3. FETCH & INFINITE SCROLL ---
// Auto-load feed on startup
window.addEventListener('DOMContentLoaded', () => { fetchYouTubeData(currentQuery); });

function handleNewSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        currentQuery = query;
        currentCursor = null; 
        document.getElementById('resultsContainer').innerHTML = ''; 
        fetchYouTubeData(currentQuery);
    }
}

document.getElementById('searchInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') handleNewSearch();
});

async function fetchYouTubeData(query) {
    if (isFetching) return;
    isFetching = true;
    
    const sentinel = document.getElementById('loadingSentinel');
    sentinel.classList.remove('hidden');

    try {
        let url = `/api/search?q=${encodeURIComponent(query)}`;
        if (currentCursor) url += `&cursor=${encodeURIComponent(currentCursor)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error(data.message);
            return;
        }

        // Save the cursor for the next scroll request
        currentCursor = data.cursorNext || null; 
        renderCards(data.contents);
        
    } catch (error) {
        console.error("Network Fetch Error:", error);
    } finally {
        isFetching = false;
        if (!currentCursor) sentinel.classList.add('hidden'); // Hide spinner if there is no more data
    }
}

function renderCards(contents) {
    const container = document.getElementById('resultsContainer');
    if (!contents) return;

    contents.forEach(item => {
        if (item.video) {
            const vid = item.video;
            const thumbUrl = vid.thumbnails[vid.thumbnails.length - 1].url;
            
            const card = document.createElement('div');
            card.className = 'video-card';
            card.onclick = () => playVideo(vid.videoId, vid.title);
            
            card.innerHTML = `
                <div class="thumbnail-wrapper">
                    <img src="${thumbUrl}" onload="this.classList.add('loaded')" loading="lazy">
                    ${vid.lengthText ? `<span class="duration">${vid.lengthText}</span>` : ''}
                </div>
                <div class="video-info">
                    <h3>${vid.title}</h3>
                    <p>${vid.author?.title || 'YouTube'} • ${vid.stats?.views ? formatViews(vid.stats.views) : ''}</p>
                </div>
            `;
            container.appendChild(card);
        }
    });
}

function formatViews(views) {
    if (!views) return '';
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views;
}

// Setup the invisible trigger at the bottom of the page
const observer = new IntersectionObserver((entries) => {
    // If the sentinel element comes into view AND we have a cursor to load more...
    if (entries[0].isIntersecting && currentCursor && !isFetching) {
        fetchYouTubeData(currentQuery);
    }
}, { rootMargin: '300px' }); // Trigger slightly before the user hits the exact bottom

observer.observe(document.getElementById('loadingSentinel'));
