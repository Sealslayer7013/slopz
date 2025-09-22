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
    // Store the entire landmarks object for each frame
    allFrameLandmarks.push(results.poseLandmarks);
}

analyzeBtn.addEventListener('click', () => {
    if (uploadedFile) {
        console.log('Starting analysis...');
        resultsSection.style.display = 'none';
        feedbackText.innerHTML = 'Analyzing... please wait.';
        resultsSection.style.display = 'block';

        const videoUrl = URL.createObjectURL(uploadedFile);
        inputVideo.src = videoUrl;

        inputVideo.addEventListener('loadeddata', processVideo);

    } else {
        alert('Please upload a video file first.');
    }
});

async function processVideo() {
    console.log('Video loaded, starting frame processing.');
    const canvasCtx = outputCanvas.getContext('2d');
    const video = inputVideo;
    video.pause();

    outputCanvas.width = video.videoWidth;
    outputCanvas.height = video.videoHeight;

    let frame = 0;
    const frameRate = 30; // Assuming 30fps for analysis
    const duration = video.duration;

    video.currentTime = 0;

    processingPromise = new Promise(resolve => {
        video.addEventListener('seeked', async function onSeeked() {
            if (video.currentTime >= duration) {
                video.removeEventListener('seeked', onSeeked);
                console.log('Finished processing all frames.');
                resolve();
                return;
            }

            canvasCtx.drawImage(video, 0, 0, outputCanvas.width, outputCanvas.height);
            await pose.send({ image: outputCanvas });

            // Seek to the next frame
            video.currentTime += 1 / frameRate;
            frame++;
        });

        // Start the process
        video.currentTime = 0;
    });

    // After processing is done, load video into player and calculate metrics
    processingPromise.then(() => {
        console.log('Analysis complete. Preparing results player...');

        // Load the video for playback
        const videoUrl = URL.createObjectURL(uploadedFile);
        resultsVideo.src = videoUrl;

        // Calculate metrics and generate feedback
        const metrics = calculateSkiMetrics(allFrameLandmarks);
        const feedback = generateFeedback(metrics);

        // Display text results
        feedbackText.innerText = feedback;
        debugText.innerText = JSON.stringify(metrics, null, 2);

        // Make results visible
        resultsSection.style.display = 'block';

        // Add event listeners to the results video to trigger the draw loop
        resultsVideo.addEventListener('play', drawLoop);
        resultsVideo.addEventListener('seeked', drawLoop);

        // Don't clean up landmarks immediately, drawLoop needs them
        // allFrameLandmarks = [];
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
    const video = resultsVideo;

    // Set canvas size to video size
    resultsCanvas.width = video.videoWidth;
    resultsCanvas.height = video.videoHeight;

    const frameIndex = Math.floor(video.currentTime * 30); // Assuming 30fps
    const landmarks = allFrameLandmarks[frameIndex];

    canvasCtx.clearRect(0, 0, resultsCanvas.width, resultsCanvas.height);

    if (landmarks) {
        drawConnectors(canvasCtx, landmarks, Pose.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });
    }

    // Call the next frame
    if (!video.paused && !video.ended) {
        requestAnimationFrame(drawLoop);
    }
}
