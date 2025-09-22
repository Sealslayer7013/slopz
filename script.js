import { proTurnData } from './pro_model.js';

// Get DOM element references
const videoUpload = document.getElementById('videoUpload');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const inputVideo = document.getElementById('inputVideo');
const outputCanvas = document.getElementById('outputCanvas');
const feedbackText = document.getElementById('feedbackText');
const toggleDebugBtn = document.getElementById('toggleDebugBtn');
const debugPanel = document.getElementById('debugPanel');
const debugText = document.getElementById('debugText');
const resultsVideo = document.getElementById('resultsVideo');
const resultsCanvas = document.getElementById('resultsCanvas');
const videoPlayerContainer = document.getElementById('videoPlayerContainer');
const totalFrames = document.getElementById('totalFrames');
const videoTime = document.getElementById('videoTime');
const currentFrame = document.getElementById('currentFrame');
const frameDataStatus = document.getElementById('frameDataStatus');
const similarityScoreElement = document.getElementById('similarity-score');

const SKI_LANDMARK_INDICES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

const SKI_SKELETON_CONNECTIONS = [
    [11, 12], // Shoulder to shoulder
    [11, 13], // Left arm
    [13, 15],
    [12, 14], // Right arm
    [14, 16],
    [23, 24], // Hip to hip
    [11, 23], // Left torso
    [12, 24], // Right torso
    [23, 25], // Left leg
    [25, 27],
    [24, 26], // Right leg
    [26, 28]
];

// Initialize MediaPipe Pose
const pose = new Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }
});

pose.setOptions({
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    staticImageMode: true
});

pose.onResults(onPoseResults);

// Global variable to hold the uploaded video file
let uploadedFile = null;

// Event listener for the file input
videoUpload.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
        uploadedFile = files[0];
        console.log('File selected:', uploadedFile.name);
    }
});

let allFrameLandmarks = [];
let processingPromise = null;

function onPoseResults(results) {
    if (results.poseLandmarks) {
        // Create a copy of the landmarks so we can modify it.
        const cleanedLandmarks = [...results.poseLandmarks];

        // Loop through all 33 landmarks in the copy.
        for (let i = 0; i < cleanedLandmarks.length; i++) {
            // If the current landmark's index is NOT in our "keep" list...
            if (!SKI_LANDMARK_INDICES.includes(i)) {
                // ...replace its data with null.
                cleanedLandmarks[i] = null;
            }
        }
        // Add the cleaned list of landmarks to our main data set.
        allFrameLandmarks.push(cleanedLandmarks);
    } else {
        // If no landmarks are found, push null to keep the frame count accurate.
        allFrameLandmarks.push(null);
    }
    // Update diagnostic panel
    totalFrames.innerHTML = allFrameLandmarks.length;
}

analyzeBtn.addEventListener('click', () => {
    if (!uploadedFile) {
        alert('Please upload a video file first.');
        return;
    }

    // 1. Reset state for a new analysis
    console.log('Starting analysis...');
    allFrameLandmarks = [];
    videoPlayerContainer.style.display = 'none';
    debugPanel.style.display = 'none';
    toggleDebugBtn.innerText = 'Show Advanced Analytics';

    // 2. Show "Analyzing..." message
    feedbackText.innerHTML = 'Analyzing... please wait. This may take a moment.';
    resultsSection.style.display = 'block';

    // 3. Start the background processing
    const videoUrl = URL.createObjectURL(uploadedFile);
    inputVideo.src = videoUrl;
    inputVideo.addEventListener('loadeddata', processVideo);
});

async function processVideo() {
    console.log('Video loaded, starting frame processing.');
    const canvasCtx = outputCanvas.getContext('2d');
    const video = inputVideo;
    video.pause();

    outputCanvas.width = video.videoWidth;
    outputCanvas.height = video.videoHeight;

    const frameRate = 30; // Assuming 30fps for analysis
    const duration = video.duration;
    video.currentTime = 0;

    // Use a new promise for each analysis
    new Promise(resolve => {
        video.addEventListener('seeked', async function onSeeked() {
            if (video.currentTime >= duration) {
                video.removeEventListener('seeked', onSeeked);
                console.log('Finished processing all frames.');
                resolve();
                return;
            }
            canvasCtx.drawImage(video, 0, 0, outputCanvas.width, outputCanvas.height);
            await pose.send({ image: outputCanvas });
            video.currentTime += 1 / frameRate;
        });
        // Start the process
        video.currentTime = 0;
    }).then(() => {
        // 4. Analysis is complete, now show the results.
        console.log('Analysis complete. Preparing results player...');

        // Calculate metrics and generate feedback
        const metrics = calculateSkiMetrics(allFrameLandmarks);
        const feedback = generateFeedback(metrics);

        // --- Pro Model Comparison ---
        const frameScores = [];
        for (let i = 0; i < allFrameLandmarks.length; i++) {
            // Use modulo to loop the pro data if the user's video is longer
            const proFrameIndex = i % proTurnData.length;
            const userPose = allFrameLandmarks[i];
            const proPose = proTurnData[proFrameIndex];
            const score = calculatePoseSimilarity(userPose, proPose);
            frameScores.push(score);
        }
        const averageScore = frameScores.reduce((a, b) => a + b, 0) / (frameScores.length || 1);
        console.log(`Average Pro Similarity Score: ${averageScore}`);
        // --------------------------

        // Update text results
        feedbackText.innerText = feedback;
        similarityScoreElement.innerHTML = "Pro Similarity Score: " + Math.round(averageScore) + "%";
        debugText.innerText = JSON.stringify(metrics, null, 2);

        // Set up the results video player
        const videoUrl = URL.createObjectURL(uploadedFile);
        resultsVideo.src = videoUrl;

        // Add event listeners to the results video to trigger the draw loop
        resultsVideo.addEventListener('play', drawLoop);
        resultsVideo.addEventListener('seeked', drawLoop);
        resultsVideo.addEventListener('loadeddata', () => {
            // Show the player and draw the first frame
            videoPlayerContainer.style.display = 'block';
            drawLoop();
        });
    });
}

function calculateAngle(p1, p2, p3) {
    const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let degrees = Math.abs(angle * (180.0 / Math.PI));
    if (degrees > 180) {
        degrees = 360 - degrees;
    }
    return degrees;
}

function calculateSkiMetrics(landmarksData) {
    const kneeBends = [];
    const torsoAngles = [];

    const p = {
        leftShoulder: 11, rightShoulder: 12,
        leftHip: 23, rightHip: 24,
        leftKnee: 25, rightKnee: 26,
        leftAnkle: 27, rightAnkle: 28,
    };

    for (const frame of landmarksData) {
        if (!frame) continue; // Skip frames where no landmarks were detected

        // Calculate left knee bend
        if (frame[p.leftHip] && frame[p.leftKnee] && frame[p.leftAnkle]) {
            kneeBends.push(calculateAngle(frame[p.leftHip], frame[p.leftKnee], frame[p.leftAnkle]));
        }
        // Calculate right knee bend
        if (frame[p.rightHip] && frame[p.rightKnee] && frame[p.rightAnkle]) {
            kneeBends.push(calculateAngle(frame[p.rightHip], frame[p.rightKnee], frame[p.rightAnkle]));
        }

        // Calculate torso angle (shoulder-hip line relative to vertical)
        if (frame[p.leftShoulder] && frame[p.leftHip]) {
            const verticalPoint = { x: frame[p.leftHip].x, y: frame[p.leftHip].y - 1 };
            torsoAngles.push(calculateAngle(frame[p.leftShoulder], frame[p.leftHip], verticalPoint));
        }
        if (frame[p.rightShoulder] && frame[p.rightHip]) {
            const verticalPoint = { x: frame[p.rightHip].x, y: frame[p.rightHip].y - 1 };
            torsoAngles.push(calculateAngle(frame[p.rightShoulder], frame[p.rightHip], verticalPoint));
        }
    }

    const averageKneeBend = kneeBends.reduce((a, b) => a + b, 0) / (kneeBends.length || 1);
    const averageTorsoAngle = torsoAngles.reduce((a, b) => a + b, 0) / (torsoAngles.length || 1);

    return { averageKneeBend, averageTorsoAngle };
}

function generateFeedback(metrics) {
    let feedback = 'Your analysis is complete! Here are some tips:\n\n';

    if (metrics.averageKneeBend > 160) {
        feedback += '- Great job keeping your legs mostly straight, but for better control in turns, try to bend your knees more. A good target is around 130-140 degrees.\n';
    } else if (metrics.averageKneeBend > 140) {
        feedback += '- You have a slight bend in your knees. Try to bend them more deeply in your turns to absorb bumps and maintain balance.\n';
    } else if (metrics.averageKneeBend < 90) {
        feedback += '- You have a very deep knee bend! While this is great for aggressive skiing, make sure it\'s not causing you to sit back too much.\n';
    } else {
        feedback += '- Your knee bend is in a good range. Keep it up!\n';
    }

    if (metrics.averageTorsoAngle > 20) {
        feedback += '- Your torso is leaning back a bit. Try to keep your shoulders forward, over your toes, to stay balanced.\n';
    } else if (metrics.averageTorsoAngle < 10) {
        feedback += '- You are leaning forward significantly. While an athletic stance is good, make sure you are not bending at the waist too much.\n';
    } else {
        feedback += '- Your torso angle looks good. You are maintaining a solid, athletic stance.\n';
    }

    return feedback;
}

toggleDebugBtn.addEventListener('click', () => {
    // Check the computed style to get the actual display status
    const isHidden = window.getComputedStyle(debugPanel).display === 'none';
    if (isHidden) {
        debugPanel.style.display = 'block';
        toggleDebugBtn.innerText = 'Hide Advanced Analytics';
    } else {
        debugPanel.style.display = 'none';
        toggleDebugBtn.innerText = 'Show Advanced Analytics';
    }
});

function drawLoop() {
    const canvasCtx = resultsCanvas.getContext('2d');

    // Calculate the current frame index
    const frameIndex = Math.floor(resultsVideo.currentTime * 30); // Assuming 30fps

    // Update diagnostics
    videoTime.innerHTML = resultsVideo.currentTime.toFixed(2);
    currentFrame.innerHTML = frameIndex;

    // Get the landmark data for the current frame
    const landmarks = allFrameLandmarks[frameIndex];

    // Update the status diagnostic
    frameDataStatus.innerHTML = landmarks ? 'Yes' : 'No';

    // Setup the canvas
    resultsCanvas.width = resultsVideo.videoWidth;
    resultsCanvas.height = resultsVideo.videoHeight;

    // Clear the canvas and draw the skeleton IF landmarks exist
    canvasCtx.clearRect(0, 0, resultsCanvas.width, resultsCanvas.height);
    if (landmarks) {
        // Use our simplified skeleton connections
        drawConnectors(canvasCtx, landmarks, SKI_SKELETON_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });

        // Filter out null landmarks before drawing the dots
        const mainBodyLandmarks = landmarks.filter(landmark => landmark !== null);
        drawLandmarks(canvasCtx, mainBodyLandmarks, { color: '#FF0000', radius: 5 });
    }

    // Keep the loop running if the video is playing
    if (!resultsVideo.paused && !resultsVideo.ended) {
        requestAnimationFrame(drawLoop);
    }
}

function calculatePoseSimilarity(poseA, poseB) {
    if (!poseA || !poseB) {
        return 0; // Cannot compare if one pose is missing
    }

    let totalDistance = 0;
    let landmarksCompared = 0;

    for (const i of SKI_LANDMARK_INDICES) {
        const landmarkA = poseA[i];
        const landmarkB = poseB[i];

        if (landmarkA && landmarkB) {
            const dx = landmarkA.x - landmarkB.x;
            const dy = landmarkA.y - landmarkB.y;
            const dz = landmarkA.z - landmarkB.z;
            totalDistance += Math.sqrt(dx*dx + dy*dy + dz*dz);
            landmarksCompared++;
        }
    }

    if (landmarksCompared === 0) {
        return 0;
    }

    // Normalize the distance. The average distance per landmark.
    const averageDistance = totalDistance / landmarksCompared;

    // Convert distance to a similarity score (0-100).
    // This is a heuristic. A smaller averageDistance should result in a higher score.
    // We'll say an average distance of 0.1 is "pretty bad" (e.g., 50% similar)
    // and 0.2 or more is "very different" (e.g., 0% similar).
    const similarity = Math.max(0, 100 - (averageDistance * 500)); // Multiplier 500 is a magic number

    return similarity;
}
