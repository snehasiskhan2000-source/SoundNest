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

// --- 1. SEARCH BAR & AUTOCOMPLETE LOGIC ---
const searchInput = document.getElementById('searchInput');
const searchWrapper = document.getElementById('searchWrapper');
const logo = document.querySelector('.logo');
const suggestionsBox = document.getElementById('suggestionsBox');
let debounceTimer;

searchInput.addEventListener('focus', () => {
    searchWrapper.classList.add('active');
    logo.style.opacity = '0';
    if (suggestionsBox.innerHTML.trim() !== '') {
        suggestionsBox.classList.remove('hidden');
    }
});

document.addEventListener('click', (e) => {
    if (!searchWrapper.contains(e.target)) {
        searchWrapper.classList.remove('active');
        logo.style.opacity = '1';
        suggestionsBox.classList.add('hidden');
    }
});

searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (!query) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    debounceTimer = setTimeout(async () => {
        try {
            const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
            const suggestions = await res.json();
            renderSuggestions(suggestions);
        } catch (err) {
            console.error("Autocomplete failed:", err);
        }
    }, 300); 
});

function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    suggestionsBox.innerHTML = '';
    suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        li.innerHTML = `<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg> ${suggestion}`;
        
        li.onclick = () => {
            searchInput.value = suggestion;
            suggestionsBox.classList.add('hidden');
            handleNewSearch();
        };
        suggestionsBox.appendChild(li);
    });
    suggestionsBox.classList.remove('hidden');
}

// --- 2. YOUTUBE API SETUP ---
// 💀 THE FIX: We build the player IMMEDIATELY on load to bypass mobile restrictions
function onYouTubeIframeAPIReady() {
    player = new YT.Player('ytPlayer', {
        height: '100%', width: '100%',
        videoId: 'M7lc1UVf-VE', // Dummy video ID required to initialize correctly
        playerVars: { 
            'autoplay': 0, 'controls': 0, 'disablekb': 1, 
            'fs': 0, 'modestbranding': 1, 'rel': 0, 'showinfo': 0, 'playsinline': 1 
        },
        events: {
            'onReady': (event) => { 
                isPlayerReady = true; 
                event.target.mute(); // Muting it satisfies mobile autoplay policies
                console.log("Player fully loaded & muted in background.");
            },
            'onStateChange': onPlayerStateChange
        }
    });
}

// --- 3. CUSTOM PLAYER LOGIC WITH SVGs ---
function playVideo(videoId, title) {
    if (!isPlayerReady) {
        console.warn("YouTube API not ready yet. Retrying in 500ms...");
        setTimeout(() => playVideo(videoId, title), 500);
        return;
    }

    const playerSection = document.getElementById('playerSection');
    
    // Teleport player onto screen
    playerSection.classList.remove('hidden');
    document.getElementById('nowPlayingTitle').innerText = title;
    
    // Unmute the player now that the user explicitly clicked
    player.unMute();
    document.getElementById('muteBtn').innerHTML = svgVol;

    // Load and play the specific video
    player.loadVideoById({videoId: videoId});
    
    document.getElementById('playPauseBtn').innerHTML = svgPause; 
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const controls = document.getElementById('customControls');
    controls.style.opacity = '1';
    setTimeout(() => { controls.style.opacity = ''; }, 3000);
}

function handleVideoTap(event) {
    if (event.target.closest('.custom-controls')) return;
    togglePlay();
}

function togglePlay() {
    if (!isPlayerReady) return;
    const state = player.getPlayerState();
    const btn = document.getElementById('playPauseBtn');
    
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

function toggleFullScreen() {
    const playerElem = document.getElementById('playerSection');
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (playerElem.requestFullscreen) {
            playerElem.requestFullscreen();
        } else if (playerElem.webkitRequestFullscreen) { 
            playerElem.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { 
            document.webkitExitFullscreen();
        }
    }
}

function closePlayer() {
    document.getElementById('playerSection').classList.add('hidden');
    if (isPlayerReady) player.stopVideo();
    clearInterval(progressInterval);
}

function onPlayerStateChange(event) {
    const btn = document.getElementById('playPauseBtn');
    
    // Request HD
    if (event.data === YT.PlayerState.BUFFERING || event.data === YT.PlayerState.PLAYING) {
        if (player.setPlaybackQuality) {
            player.setPlaybackQuality('hd1080'); 
        }
    }

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
        searchWrapper.classList.remove('active');
        logo.style.opacity = '1';
        suggestionsBox.classList.add('hidden');
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
            
            // 💀 THE HD THUMBNAIL FIX: Constructing the crisp YouTube URL manually
            let thumbUrl = '';
            if (vid.thumbnails && vid.thumbnails.length > 0) {
                // Sort array to get the biggest width available
                const sortedThumbs = vid.thumbnails.sort((a, b) => (b.width || 0) - (a.width || 0));
                thumbUrl = sortedThumbs[0].url;

                // If API gives us the blurry 4:3 default, rewrite the URL to force the 16:9 HD version
                if (thumbUrl.includes('hqdefault.jpg') && !thumbUrl.includes('sqp')) {
                    thumbUrl = `https://i.ytimg.com/vi/${vid.videoId}/hq720.jpg`;
                }
            } else {
                // Absolute fallback
                thumbUrl = `https://i.ytimg.com/vi/${vid.videoId}/hq720.jpg`;
            }
            
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

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && currentCursor && !isFetching) {
        fetchYouTubeData(currentQuery);
    }
}, { rootMargin: '300px' });

observer.observe(document.getElementById('loadingSentinel'));
