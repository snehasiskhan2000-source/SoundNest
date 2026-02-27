async function searchYouTube() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;

    const container = document.getElementById('resultsContainer');
    container.innerHTML = '<p style="text-align: center; color: #ff0000; width: 100%; grid-column: 1/-1;">Searching YouTube servers...</p>';

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        container.innerHTML = ''; 

        if (data.error) {
            container.innerHTML = `<p style="color: #ff3333; text-align: center; width: 100%; grid-column: 1/-1;">⚠️ ${data.message}</p>`;
            return;
        }

        if (data.contents && data.contents.length > 0) {
            data.contents.forEach(item => {
                if (item.video) {
                    const vid = item.video;
                    const videoId = vid.videoId;
                    const title = vid.title;
                    const author = vid.author ? vid.author.title : 'YouTube';
                    const views = vid.stats && vid.stats.views ? formatViews(vid.stats.views) : '';
                    
                    const thumbUrl = vid.thumbnails[vid.thumbnails.length - 1].url;
                    const durationText = vid.lengthText || "Vid";

                    const card = document.createElement('div');
                    card.className = 'video-card';
                    card.onclick = () => playVideo(videoId, title);
                    
                    card.innerHTML = `
                        <div class="thumbnail-wrapper">
                            <img src="${thumbUrl}" alt="Thumbnail" loading="lazy">
                            <span class="duration">${durationText}</span>
                        </div>
                        <div class="video-info">
                            <h3>${title}</h3>
                            <p>${author} • ${views} views</p>
                        </div>
                    `;
                    container.appendChild(card);
                }
            });
        } else {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center; width: 100%; grid-column: 1/-1;">No results found.</p>`;
        }
    } catch (error) {
        console.error("Frontend Error:", error);
        container.innerHTML = '<p style="color: #ff3333; text-align: center; width: 100%; grid-column: 1/-1;">⚠️ Failed to connect to proxy server.</p>';
    }
}

function playVideo(videoId, title) {
    const playerSection = document.getElementById('playerSection');
    const ytPlayer = document.getElementById('ytPlayer');
    const titleEl = document.getElementById('nowPlayingTitle');

    playerSection.classList.remove('hidden');
    titleEl.innerText = title;

    ytPlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatViews(views) {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views;
}

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchYouTube();
});
