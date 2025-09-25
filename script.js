// --- Get HTML Elements ---
const videoUpload = document.getElementById('videoUpload');
const playerContainer = document.getElementById('playerContainer');
const resultsVideo = document.getElementById('resultsVideo');
const resultsCanvas = document.getElementById('resultsCanvas');

// --- AI Model Setup ---
const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapose/pose/${file}`
});
pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
pose.onResults(onResults);

// --- Event Listeners ---
videoUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        playerContainer.classList.remove('hidden');
        resultsVideo.src = URL.createObjectURL(file);
        resultsVideo.load();
    }
});

resultsVideo.addEventListener('play', () => {
    // This function will run repeatedly as the video plays
    const processVideo = async () => {
        if (resultsVideo.paused || resultsVideo.ended) {
            return;
        }
        await pose.send({ image: resultsVideo });
        // Call the next frame
        requestAnimationFrame(processVideo);
    };
    requestAnimationFrame(processVideo);
});

// --- Core Function: This is called by the AI after it processes a frame ---
function onResults(results) {
    const canvasCtx = resultsCanvas.getContext('2d');
    resultsCanvas.width = resultsVideo.videoWidth;
    resultsCanvas.height = resultsVideo.videoHeight;
    canvasCtx.clearRect(0, 0, resultsCanvas.width, resultsCanvas.height);

    if (results.poseLandmarks) {
        // This draws the full, default skeleton. It's the most reliable option.
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', radius: 2 });
    }
}