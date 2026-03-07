document.addEventListener('DOMContentLoaded', async () => {
    const qrContainer = document.getElementById('qrcode');
    const pageTitleEl = document.getElementById('pageTitle');
    const scrollTextEl = document.getElementById('scrollText');
    const videoTimeTextEl = document.getElementById('videoTimeText');
    const statusBadge = document.getElementById('statusBadge');
    const copyBtn = document.getElementById('copyBtn');

    let currentResumeData = null;
    let finalUrlToShare = "";

    // 1. Get Active Tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        pageTitleEl.textContent = "Cannot resume browser system pages.";
        qrContainer.innerHTML = '<div style="color:var(--text-secondary);text-align:center;padding:20px;">Unsupported Page</div>';
        return;
    }

    pageTitleEl.textContent = tab.title;

    try {
        // 2. Inject Content Script if not already loaded, then get data
        const response = await chrome.tabs.sendMessage(tab.id, { action: "GET_RESUME_DATA" }).catch(async () => {
            // Content script might not be injected yet
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            return await chrome.tabs.sendMessage(tab.id, { action: "GET_RESUME_DATA" });
        });

        if (response && response.data) {
            currentResumeData = response.data;

            // Build final URL to share
            let urlObj = new URL(tab.url);

            // Auto detect and append YouTube timestamps
            if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch' && currentResumeData.videoTime > 0) {
                urlObj.searchParams.set('t', Math.floor(currentResumeData.videoTime) + 's');
            }

            // Add our custom resume payload via hash to avoid messing with server routing
            const payloadString = encodeURIComponent(JSON.stringify(currentResumeData));
            urlObj.hash = `qr_resume=${payloadString}`;

            finalUrlToShare = urlObj.toString();

            // UI Updates
            statusBadge.classList.remove('hidden');

            if (currentResumeData.scroll > 0) {
                scrollTextEl.textContent = `Scroll: ${Math.round(currentResumeData.scroll)}px`;
            }

            if (currentResumeData.videoTime > 0) {
                const mins = Math.floor(currentResumeData.videoTime / 60);
                const secs = Math.floor(currentResumeData.videoTime % 60).toString().padStart(2, '0');
                videoTimeTextEl.textContent = `Video: ${mins}:${secs}`;
            }

            // Generate QR
            qrContainer.innerHTML = ''; // clear skeleton
            new QRCode(qrContainer, {
                text: finalUrlToShare,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.L
            });
        }

    } catch (err) {
        console.error("Error getting resume data:", err);
        pageTitleEl.textContent = "Error grabbing page state.";
        qrContainer.innerHTML = '<div style="color:red;text-align:center;padding:20px;">Error generating QR</div>';
    }

    // Copy button handler
    copyBtn.addEventListener('click', () => {
        if (!finalUrlToShare) return;

        navigator.clipboard.writeText(finalUrlToShare).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" class="btn-icon"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;

            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        });
    });
});
