// Get DOM element references
const videoUpload = document.getElementById('videoUpload');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const inputVideo = document.getElementById('inputVideo');
const outputCanvas = document.getElementById('outputCanvas');
const feedbackText = document.getElementById('feedbackText');

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

let allLandmarks = [];
let processingPromise = null;

function onPoseResults(results) {
    if (results.poseLandmarks) {
        const landmarks = results.poseLandmarks;
        allLandmarks.push({
            leftShoulder: landmarks[11],
            rightShoulder: landmarks[12],
            leftHip: landmarks[23],
            rightHip: landmarks[24],
            leftKnee: landmarks[25],
            rightKnee: landmarks[26],
            leftAnkle: landmarks[27],
            rightAnkle: landmarks[28],
        });
    }
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

    // After processing is done, calculate metrics and generate feedback
    processingPromise.then(() => {
        console.log('Calculating metrics...');
        const metrics = calculateSkiMetrics(allLandmarks);
        console.log('Metrics:', metrics);
        const feedback = generateFeedback(metrics);
        console.log('Feedback:', feedback);

        // Display the results
        feedbackText.innerText = feedback;
        resultsSection.style.display = 'block';

        // Clean up for next run
        allLandmarks = [];
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

    for (const frame of landmarksData) {
        // Calculate left knee bend
        if (frame.leftHip && frame.leftKnee && frame.leftAnkle) {
            kneeBends.push(calculateAngle(frame.leftHip, frame.leftKnee, frame.leftAnkle));
        }
        // Calculate right knee bend
        if (frame.rightHip && frame.rightKnee && frame.rightAnkle) {
            kneeBends.push(calculateAngle(frame.rightHip, frame.rightKnee, frame.rightAnkle));
        }

        // Calculate torso angle (shoulder-hip line relative to vertical)
        // We'll average the left and right sides
        if (frame.leftShoulder && frame.leftHip) {
            const verticalPoint = { x: frame.leftHip.x, y: frame.leftHip.y - 1 }; // A point directly above the hip
            torsoAngles.push(calculateAngle(frame.leftShoulder, frame.leftHip, verticalPoint));
        }
        if (frame.rightShoulder && frame.rightHip) {
            const verticalPoint = { x: frame.rightHip.x, y: frame.rightHip.y - 1 };
            torsoAngles.push(calculateAngle(frame.rightShoulder, frame.rightHip, verticalPoint));
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
