// background.js - Service worker for Manifest V3

chrome.runtime.onInstalled.addListener(() => {
    console.log("QR Resume Anywhere Extension Installed!");
});

// Future possibilities: Context menu to "Generate QR for link/image"
