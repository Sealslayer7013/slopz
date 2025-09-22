// Get DOM element references
const videoUpload = document.getElementById('videoUpload');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');

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
