let player;
let isPlayerReady = false;
let currentCursor = null;
let currentQuery = 'Trending Music';
let isFetching = false;
let progressInterval;

// --- SVG Templates from HTML ---
const svgPlay = document.getElementById('svg-play').innerHTML;
const svgPause = document.getElementById('svg-pause').innerHTML;
const svgVol = document.getElementById('svg-vol').innerHTML;
const svgMute = document.getElementById('svg-mute').innerHTML;

// --- 1. SEARCH BAR ANIMATION LOGIC ---
const searchInput = document.getElementById('searchInput');
const searchContainer = document.getElementById('searchContainer');
const logo = document.querySelector('.logo');

searchInput.addEventListener('focus', () => {
    searchContainer.classList.add('active');
    logo.style.opacity = '0';
});

searchInput.addEventListener('blur', () => {
    searchContainer.classList.remove('active');
    logo.style.opacity = '1';
});

// --- 2. YOUTUBE API SETUP ---
// We leave this empty so it doesn't crash when the hidden player has no size
function onYouTubeIframeAPIReady() {
    console.log("YouTube API loaded. Waiting for user click...");
}

// --- 3. CUSTOM PLAYER LOGIC WITH SVGs ---
function playVideo(videoId, title) {
    const playerSection = document.getElementById('playerSection');
    
    // 1. Unhide the container FIRST so YouTube can calculate its size
    playerSection.classList.remove('hidden');
    document.getElementById('nowPlayingTitle').innerText = title;
    
    // 2. If this is the first click, build the actual player
    if (!player) {
        player = new YT.Player('ytPlayer', {
            height: '100%', width: '100%',
            videoId: videoId, 
            playerVars: { 
                'autoplay': 1, 'controls': 0, 'disablekb': 1, 
                'fs': 0, 'modestbranding': 1, 'rel': 0, 'showinfo': 0 
            },
            events: {
                'onReady': (event) => { 
                    isPlayerReady = true; 
                    event.target.playVideo(); 
                },
                'onStateChange': onPlayerStateChange
            }
        });
    } else {
        // 3. If player is already built, just swap the video
        if (isPlayerReady) {
            player.loadVideoById(videoId);
        }
    }
    
    // Update UI buttons
    document.getElementById('playPauseBtn').innerHTML = svgPause; 
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Flash the custom controls briefly for mobile users
    const controls = document.getElementById('customControls');
    controls.style.opacity = '1';
    setTimeout(() => { controls.style.opacity = ''; }, 3000);
}

function togglePlay() {
    if (!isPlayerReady) return;
    const state = player.getPlayerState();
    const btn = document.getElementById('playPauseBtn');
    
    // Quick pop animation
    btn.style.transform = "scale(0.8)";
    setTimeout(() => btn.style.transform = "", 150);

    if (state === 1 || state === 3) { 
        player.pauseVideo(); 
        btn.innerHTML = svgPlay;
    } else { 
        player.playVideo(); 
        btn.innerHTML = svgPause;
    }
}

function toggleMute() {
    if (!isPlayerReady) return;
    const muteBtn = document.getElementById('muteBtn');
    
    muteBtn.style.transform = "scale(0.8)";
    setTimeout(() => muteBtn.style.transform = "", 150);

    if (player.isMuted()) { 
        player.unMute(); 
        muteBtn.innerHTML = svgVol;
    } else { 
        player.mute(); 
        muteBtn.innerHTML = svgMute;
    }
}

function closePlayer() {
    document.getElementById('playerSection').classList.add('hidden');
    if (isPlayerReady) player.stopVideo();
    clearInterval(progressInterval);
}

function onPlayerStateChange(event) {
    const btn = document.getElementById('playPauseBtn');
    if (event.data === YT.PlayerState.PLAYING) {
        btn.innerHTML = svgPause;
        startProgressBar();
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        btn.innerHTML = svgPlay;
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
    }, 500);
}

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

// --- 4. FETCH & INFINITE SCROLL ---
window.addEventListener('DOMContentLoaded', () => { fetchYouTubeData(currentQuery); });

function handleNewSearch() {
    const query = searchInput.value.trim();
    if (query) {
        currentQuery = query;
        currentCursor = null; 
        document.getElementById('resultsContainer').innerHTML = ''; 
        searchInput.blur(); 
        fetchYouTubeData(currentQuery);
    }
}

searchInput.addEventListener('keypress', e => {
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

        currentCursor = data.cursorNext || null; 
        renderCards(data.contents);
        
    } catch (error) {
        console.error("Network Fetch Error:", error);
    } finally {
        isFetching = false;
        if (!currentCursor) sentinel.classList.add('hidden');
    }
}

// --- 5. RENDER UI CARDS & DURATION ---
function renderCards(contents) {
    const container = document.getElementById('resultsContainer');
    if (!contents) return;

    contents.forEach(item => {
        if (item.video) {
            const vid = item.video;
            const thumbUrl = vid.thumbnails[vid.thumbnails.length - 1].url;
            
            // Format duration accurately
            let durationText = "";
            if (vid.lengthText) {
                durationText = vid.lengthText;
            } else if (vid.lengthSeconds) {
                const hours = Math.floor(vid.lengthSeconds / 3600);
                const minutes = Math.floor((vid.lengthSeconds % 3600) / 60);
                const seconds = vid.lengthSeconds % 60;
                
                if (hours > 0) {
                    durationText = `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                } else {
                    durationText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                }
            }
            
            const card = document.createElement('div');
            card.className = 'video-card';
            card.onclick = () => playVideo(vid.videoId, vid.title);
            
            card.innerHTML = `
                <div class="thumbnail-wrapper">
                    <img src="${thumbUrl}" onload="this.classList.add('loaded')" loading="lazy">
                    ${durationText ? `<span class="duration">${durationText}</span>` : ''}
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

// Infinite Scroll Observer
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && currentCursor && !isFetching) {
        fetchYouTubeData(currentQuery);
    }
}, { rootMargin: '300px' });

observer.observe(document.getElementById('loadingSentinel'));
                                                                                                              
