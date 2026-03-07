// Listen for requests from popup to grab current state
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_RESUME_DATA") {
        const data = {
            url: window.location.href.split('#')[0], // base url
            title: document.title,
            scroll: window.scrollY,
            videoTime: 0,
            timestamp: Date.now()
        };

        // Try to find the most relevant playing/paused video for time extraction
        const videos = Array.from(document.querySelectorAll('video'));
        let targetVideo = null;

        if (videos.length > 0) {
            // Prioritize playing videos or the largest video on screen
            targetVideo = videos.find(v => !v.paused && v.currentTime > 0) || videos[0];
            if (targetVideo) {
                data.videoTime = targetVideo.currentTime;
            }
        }

        sendResponse({ data });
    }
    return true;
});


// Auto-Restore Logic when loaded
(function checkResume() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#qr_resume=')) {
        try {
            const payloadString = decodeURIComponent(hash.substring(11));
            const resumeData = JSON.parse(payloadString);

            // Restore Scroll
            if (resumeData.scroll > 0) {
                // give page a moment to format layout
                setTimeout(() => {
                    window.scrollTo({
                        top: resumeData.scroll,
                        behavior: 'smooth'
                    });
                }, 500);

                // Try again for slow loading SPAs
                setTimeout(() => {
                    window.scrollTo(0, resumeData.scroll);
                }, 2000);
            }

            // Restore Video time if not YouTube (YouTube is handled via URL &t= param earlier)
            if (resumeData.videoTime > 0 && !window.location.hostname.includes('youtube.com')) {
                const trySeekVideo = setInterval(() => {
                    const video = document.querySelector('video');
                    if (video && video.readyState >= 1) { // metadata loaded
                        video.currentTime = resumeData.videoTime;
                        clearInterval(trySeekVideo);
                    }
                }, 500);

                // stop trying after 10s
                setTimeout(() => clearInterval(trySeekVideo), 10000);
            }

            // Clean up the URL cosmetically (optional but clean)
            history.replaceState(null, null, ' ');

        } catch (e) {
            console.error("Failed to parse QR resume payload:", e);
        }
    }
})();
