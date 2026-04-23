chrome.action.onClicked.addListener((tab) => {
    if (!tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: "togglePanel" }, () => {
        if (chrome.runtime.lastError) {
            console.log("Content script not ready yet");
        }
    });
});