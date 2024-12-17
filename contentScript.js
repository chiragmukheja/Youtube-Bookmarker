(() => {
    // Define variables for YouTube controls and player
    let youtubeLeftControls, youtubePlayer;
    
    // Parse URL parameters to get the video ID
    const urlParams = new URLSearchParams(window.location.search);
    const currentVideo = urlParams.get("v"); // Extract video ID from URL
    let currentVideoBookmarks = []; // Array to store bookmarks for the current video

    // Listen for messages from the background script or popup
    chrome.runtime.onMessage.addListener((obj, sender, response) => {
        const { type, value, videoId } = obj;

        // If a new video is loaded, reset bookmarks and update video ID
        if (type === "NEW") {
            currentVideo = videoId;
            newVideoLoaded();
        } 
        // If play command is received, update video current time to the bookmark time
        else if (type === "PLAY") {
            youtubePlayer.currentTime = value;
        } 
        // If delete command is received, filter out the bookmark and update storage
        else if (type === "DELETE") {
            currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time != value);
            chrome.storage.sync.set({ [currentVideo]: JSON.stringify(currentVideoBookmarks) });

            response(currentVideoBookmarks); // Send updated bookmarks as response
        }
    });

    // Function to fetch bookmarks from Chrome storage for the current video
    const fetchBookmarks = () => {
        return new Promise((resolve) => {
            if (!currentVideo || typeof currentVideo !== 'string' || currentVideo.trim() === "") {
                console.error("currentVideo is not defined or is invalid.");
                resolve([]); // Return empty array if `currentVideo` is not valid
                return;
            }

            // Get bookmarks from Chrome storage and handle errors if they occur
            chrome.storage.sync.get([currentVideo], (obj) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    resolve([]); // Handle storage error
                } else {
                    resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []); // Parse bookmarks if available
                }
            });
        });
    };

    // Function to handle new video loading and adding bookmark button
    const newVideoLoaded = async () => {
        // Check if bookmark button already exists
        const bookmarkBtnExists = document.getElementsByClassName("bookmark-btn")[0];
        currentVideoBookmarks = await fetchBookmarks(); // Load existing bookmarks

        if (!bookmarkBtnExists) {
            // Create a new bookmark button and set properties
            const bookmarkBtn = document.createElement("img");
            bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
            bookmarkBtn.className = "ytp-button " + "bookmark-btn";
            bookmarkBtn.title = "Click to Bookmark current timestamp";

            // Locate YouTube controls and player elements
            youtubeLeftControls = document.getElementsByClassName("ytp-right-controls")[0];
            youtubePlayer = document.getElementsByClassName("video-stream")[0];

            // Add bookmark button to YouTube controls
            youtubeLeftControls.appendChild(bookmarkBtn);

            // Add event listener to handle bookmark creation on button click
            bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
        }
    };

    // Event handler to add a new bookmark when the button is clicked
    const addNewBookmarkEventHandler = async () => {
        // Get the current time of the video and create a bookmark object
        const currentTime = youtubePlayer.currentTime;
        const newBookmark = {
            time: currentTime,
            desc: "Bookmark at " + getTime(currentTime),
        };

        currentVideoBookmarks = await fetchBookmarks(); // Get updated list of bookmarks

        // Save the new bookmark to Chrome storage, sorted by time
        chrome.storage.sync.set({
            [currentVideo]: JSON.stringify([...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time))
        });
    };

    // Call the function to initialize bookmark button for the current video
    newVideoLoaded();
})();

// Function to convert seconds to HH:MM:SS format
const getTime = t => {
    var date = new Date(0); // Create a new date object at epoch
    date.setSeconds(t); // Set seconds for the date object

    return date.toISOString().substr(11, 8); // Return formatted time
};
