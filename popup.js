import { getActiveTabURL } from "./utils.js"; 

// Function to add a new bookmark element to the bookmarks container
const addNewBookmark = (bookmarksElement, bookmark) => {
    // Create elements for the bookmark title, the bookmark container, and controls (play, delete)
    const bookmarkTitleElement = document.createElement("div");
    const newBookmarkElement = document.createElement("div");
    const controlsElement = document.createElement("div");

    // Set the text content of the bookmark to the description provided
    bookmarkTitleElement.textContent = bookmark.desc;
    bookmarkTitleElement.className = "bookmark-title";                          // Assign a class for styling

    controlsElement.className = "bookmark-controls";                            // Assign a class for styling control elements

    // Set unique ID and timestamp attribute for each bookmark using the time value
    newBookmarkElement.id = "bookmark-" + bookmark.time;
    newBookmarkElement.className = "bookmark";                                  // Assign a class for styling
    newBookmarkElement.setAttribute("timestamp", bookmark.time);                // Store timestamp for later use

    // Add "play" and "delete" controls to the bookmark controls element
    setBookmarkAttributes("play", onPlay, controlsElement);
    setBookmarkAttributes("delete", onDelete, controlsElement);

    // Add the title and controls to the bookmark container element
    newBookmarkElement.appendChild(bookmarkTitleElement);
    newBookmarkElement.appendChild(controlsElement);

    // Add the newly created bookmark to the bookmarks container element
    bookmarksElement.appendChild(newBookmarkElement);
};

// Function to display bookmarks in the bookmarks container
const viewBookmarks = (currentBookmarks = []) => {
    const bookmarksElement = document.getElementById("bookmarks");              // Reference to the bookmarks container
    bookmarksElement.innerHTML = "";                                            // Clear any previous bookmarks

    if (currentBookmarks.length > 0) { // Check if there are bookmarks to display
        // Loop through each bookmark and add it to the bookmarks container
        for (let i = 0; i < currentBookmarks.length; i++) {
            const bookmark = currentBookmarks[i];
            addNewBookmark(bookmarksElement, bookmark);                         // Add bookmark
        }
    } else {
        // If no bookmarks, display a message indicating no bookmarks are available
        bookmarksElement.innerHTML = '<i class="row">No bookmarks to show </i>';
    }
};

// Event handler to play a video from the bookmarked time
const onPlay = async (e) => {
    // Retrieve the timestamp attribute from the bookmark to identify playback time
    const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
    const activeTab = await getActiveTabURL(); // Get the current active tab URL

    // Send a message to the content script to play the video at the specified time
    chrome.tabs.sendMessage(activeTab.id, {
        type: "PLAY",
        value: bookmarkTime
    });
};

// Event handler to delete a bookmark from the list and update the view
const onDelete = async (e) => {
    const activeTab = await getActiveTabURL();                                     // Get the current active tab URL
    const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp"); // Get timestamp to delete

    // Find the bookmark element by its ID and remove it from the DOM
    const bookmarkElementToDelete = document.getElementById("bookmark-" + bookmarkTime);
    bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);

    // Send a message to the content script to delete the bookmark from storage
    chrome.tabs.sendMessage(activeTab.id, {
        type: "DELETE",
        value: bookmarkTime
    }, viewBookmarks);                                                          // Update the view after deletion
};

// Function to set up bookmark control attributes (e.g., play, delete) with an event listener
const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
    const controlElement = document.createElement("img");                       // Create an image element for control icons

    controlElement.src = "assets/" + src + ".png";                              // Set the icon image source
    controlElement.title = src;                                      // Set a title for the control icon (e.g., "play" or "delete")
    controlElement.addEventListener("click", eventListener);                   // Attach the event listener for control action
    controlParentElement.append(controlElement);                             // Append control icon to controls container
};

// Event listener for when the page content has loaded
document.addEventListener("DOMContentLoaded", async () => {
    const activeTab = await getActiveTabURL();                                  // Get the active tab URL
    const queryParameters = activeTab.url.split("?")[1];                        // Extract query parameters from URL
    const urlParameters = new URLSearchParams(queryParameters);                 // Parse query parameters

    // Get the video ID parameter from the URL if it's a YouTube watch page
    const currentVideo = urlParameters.get("v");

    // If current tab is a YouTube video, retrieve stored bookmarks for the video
    if (activeTab.url.includes("youtube.com/watch") && currentVideo) {
        chrome.storage.sync.get([currentVideo], (data) => {
            // Parse the bookmarks for the current video if they exist
            const currentVideoBookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
            viewBookmarks(currentVideoBookmarks); // Display retrieved bookmarks
        });
    } else {
        // If not a YouTube video, display a message to the user
        const container = document.getElementsByClassName("container")[0];
        container.innerHTML = '<div class="title">This is not a YouTube video page.</div>';
    }
});
