import { proTurnData } from './pro_model.js';

// --- Constants ---
const SKI_LANDMARK_INDICES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const SKI_SKELETON_CONNECTIONS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [23, 24],
    [11, 23], [12, 24], [23, 25], [25, 27], [24, 26], [26, 28]
];

// --- Get HTML Elements ---
const videoUpload = document.getElementById('videoUpload');
const resultsSection = document.getElementById('resultsSection');
const resultsVideo = document.getElementById('resultsVideo');
const resultsCanvas = document.getElementById('resultsCanvas');
const feedbackText = document.getElementById('feedbackText');
const similarityScoreElement = document.getElementById('similarity-score');

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
    resultsVideo.src = URL.createObjectURL(file);
    resultsSection.classList.remove('hidden');
    feedbackText.innerHTML = "Video loaded. Press play to begin analysis.";
  }
});

resultsVideo.addEventListener('play', () => {
  feedbackText.style.display = 'none';
  requestAnimationFrame(animationLoop);
});

// --- Core Functions ---
async function animationLoop() {
  if (resultsVideo.paused || resultsVideo.ended) {
    feedbackText.style.display = 'block';
    feedbackText.innerHTML = "Analysis paused. Press play to resume.";
    return;
  }
  await pose.send({ image: resultsVideo });
  requestAnimationFrame(animationLoop);
}

function onResults(results) {
  const canvasCtx = resultsCanvas.getContext('2d');
  resultsCanvas.width = resultsVideo.videoWidth;
  resultsCanvas.height = resultsVideo.videoHeight;

  canvasCtx.clearRect(0, 0, resultsCanvas.width, resultsCanvas.height);

  if (results.poseLandmarks) {
    // Draw the simplified skeleton
    drawConnectors(canvasCtx, results.poseLandmarks, SKI_SKELETON_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
    const mainBodyLandmarks = SKI_LANDMARK_INDICES.map(i => results.poseLandmarks[i]).filter(lm => lm);
    drawLandmarks(canvasCtx, mainBodyLandmarks, {color: '#FF0000', radius: 5});

    // Perform Live Pro Model Comparison
    const frameIndex = Math.floor(resultsVideo.currentTime * 30);
    const proFrameIndex = frameIndex % proTurnData.length;
    const proPose = proTurnData[proFrameIndex];
    const similarityResult = calculatePoseSimilarity(results.poseLandmarks, proPose);

    similarityScoreElement.innerHTML = "Pro Similarity Score: " + Math.round(similarityResult.similarity) + "%";
  }
}

// --- Helper Functions ---
function calculatePoseSimilarity(poseA, poseB) {
    if (!poseA || !poseB) return { rawDifference: 0, similarity: 0 };
    let totalDifference = 0, landmarksCompared = 0;

    for (const index of SKI_LANDMARK_INDICES) {
        const markA = poseA[index];
        const markB = poseB[index];
        if (markA && markB) {
            totalDifference += Math.sqrt(Math.pow(markA.x - markB.x, 2) + Math.pow(markA.y - markB.y, 2));
            landmarksCompared++;
        }
    }
    if (landmarksCompared === 0) return { rawDifference: 0, similarity: 0 };
    const averageDifference = totalDifference / landmarksCompared;
    const similarity = Math.max(0, 100 - (averageDifference * 200));
    return { rawDifference: averageDifference, similarity: similarity };
}