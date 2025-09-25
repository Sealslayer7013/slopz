import { proTurnData } from './pro_model.js';

// --- Global Constants ---
const SKI_LANDMARK_INDICES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const SKI_SKELETON_CONNECTIONS = [[11, 12], [23, 24], [11, 23], [12, 24], [23, 25], [24, 26], [25, 27], [26, 28], [11, 13], [12, 14], [13, 15], [14, 16]];

// --- Get HTML Elements ---
const videoUpload = document.getElementById('videoUpload');
const resultsSection = document.getElementById('resultsSection');
const resultsVideo = document.getElementById('resultsVideo');
const resultsCanvas = document.getElementById('resultsCanvas');
const toggleDebugBtn = document.getElementById('toggleDebugBtn');
const debugPanel = document.getElementById('debugPanel');

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
        resultsSection.classList.remove('hidden');
        resultsVideo.src = URL.createObjectURL(file);
        resultsVideo.load();
    }
});

resultsVideo.addEventListener('play', () => {
    // Start the AI processing when the video plays
    const processVideo = async () => {
        if (resultsVideo.paused || resultsVideo.ended) {
            return;
        }
        await pose.send({ image: resultsVideo });
        requestAnimationFrame(processVideo);
    };
    requestAnimationFrame(processVideo);
});

toggleDebugBtn.addEventListener('click', () => {
    const isHidden = debugPanel.classList.toggle('hidden');
    toggleDebugBtn.innerHTML = isHidden ? "Show Advanced Analytics" : "Hide Advanced Analytics";
});

// --- Core Function: This is called by the AI after it processes a frame ---
function onResults(results) {
    const canvasCtx = resultsCanvas.getContext('2d');
    resultsCanvas.width = resultsVideo.videoWidth;
    resultsCanvas.height = resultsVideo.videoHeight;
    canvasCtx.clearRect(0, 0, resultsCanvas.width, resultsCanvas.height);

    // Update diagnostics panel
    document.getElementById('videoTime').innerHTML = resultsVideo.currentTime.toFixed(2);
    document.getElementById('frameDataStatus').innerHTML = results.poseLandmarks ? 'Yes' : 'No';

    if (results.poseLandmarks) {
        // Draw the simplified skeleton
        drawConnectors(canvasCtx, results.poseLandmarks, SKI_SKELETON_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        const mainLandmarks = SKI_LANDMARK_INDICES.map(i => results.poseLandmarks[i]);
        drawLandmarks(canvasCtx, mainLandmarks, { color: '#FF0000', radius: 5 });

        // Perform and display live analysis
        performLiveAnalysis(results.poseLandmarks);
    }
}

function performLiveAnalysis(landmarks) {
    // --- Advanced Analytics Panel ---
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    document.getElementById('kneeAngleValue').innerHTML = Math.round(kneeAngle);
    // ... (Add other metric calculations here)

    // --- Pro Similarity Score ---
    const frameIndex = Math.floor(resultsVideo.currentTime * 30); // Assuming 30fps
    const proPose = proTurnData[frameIndex % proTurnData.length];
    if (proPose) {
        const similarity = calculatePoseSimilarity(landmarks, proPose);
        document.getElementById('similarity-score').innerHTML = "Pro Similarity Score: " + Math.round(similarity.similarity) + "%";
    }
}

// --- Helper Functions ---
function calculateAngle(a, b, c) {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

function calculatePoseSimilarity(poseA, poseB) {
    let totalDifference = 0;
    let landmarksCompared = 0;
    for (const index of SKI_LANDMARK_INDICES) {
        const markA = poseA[index];
        const markB = poseB[index];
        if (markA && markB) {
            let diff = Math.sqrt(Math.pow(markA.x - markB.x, 2) + Math.pow(markA.y - markB.y, 2));
            totalDifference += diff;
            landmarksCompared++;
        }
    }
    if (landmarksCompared === 0) return { rawDifference: 0, similarity: 0 };
    const avgDiff = totalDifference / landmarksCompared;
    const similarity = Math.max(0, 100 - (avgDiff * 200));
    return { rawDifference: avgDiff, similarity: similarity };
}