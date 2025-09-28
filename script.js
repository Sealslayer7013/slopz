// Find our HTML elements from the page
const video = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const feedbackElement = document.getElementById("feedback");
const statusElement = document.getElementById("status");

// MediaPipe pose landmark indices (for clarity)
const POSE_LANDMARKS = {
  LEFT_HIP: 23,
  LEFT_KNEE: 25,
  LEFT_ANKLE: 27,
  RIGHT_HIP: 24,
  RIGHT_KNEE: 26,
  RIGHT_ANKLE: 28
};

// Performance tracking
let lastFrameTime = 0;
const FRAME_RATE_LIMIT = 30; // Max 30 FPS
const FRAME_INTERVAL = 1000 / FRAME_RATE_LIMIT;

// State management
let isInitialized = false;
let pose = null;
let camera = null;

// Browser compatibility check
function checkBrowserSupport() {
  const errors = [];

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    errors.push("Webcam access not supported");
  }

  if (!HTMLCanvasElement.prototype.getContext) {
    errors.push("Canvas not supported");
  }

  return errors;
}

// Wait for MediaPipe libraries to load
function waitForMediaPipe() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait

    const checkForMediaPipe = () => {
      // Check for the actual objects MediaPipe exposes
      const hasCamera = typeof window.Camera === 'function';
      const hasPose = typeof window.Pose === 'function';
      const hasDrawingUtils = typeof window.drawConnectors === 'function' && typeof window.drawLandmarks === 'function';
      const hasConnections = typeof window.POSE_CONNECTIONS !== 'undefined';

      console.log('MediaPipe check:', { hasCamera, hasPose, hasDrawingUtils, hasConnections });

      if (hasCamera && hasPose && hasDrawingUtils && hasConnections) {
        console.log('All MediaPipe libraries loaded successfully');
        resolve();
      } else if (attempts >= maxAttempts) {
        const missing = [];
        if (!hasCamera) missing.push('Camera');
        if (!hasPose) missing.push('Pose');
        if (!hasDrawingUtils) missing.push('Drawing utilities');
        if (!hasConnections) missing.push('Pose connections');
        reject(new Error(`MediaPipe libraries failed to load. Missing: ${missing.join(', ')}`));
      } else {
        attempts++;
        setTimeout(checkForMediaPipe, 100);
      }
    };

    checkForMediaPipe();
  });
}

// Status update helper
function updateStatus(message, type = 'loading') {
  statusElement.textContent = message;
  statusElement.className = `status-${type}`;
}

// Error handling helper
function handleError(error, userMessage) {
  console.error(error);
  updateStatus(userMessage, 'error');
  feedbackElement.innerHTML = "Error: Unable to analyze pose";
}

// This is our helper function to calculate an angle between three dots
function calculateAngle(a, b, c) {
  try {
    if (!a || !b || !c || typeof a.x !== 'number' || typeof a.y !== 'number' ||
        typeof b.x !== 'number' || typeof b.y !== 'number' ||
        typeof c.x !== 'number' || typeof c.y !== 'number') {
      return null;
    }

    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);

    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  } catch (error) {
    console.error("Error calculating angle:", error);
    return null;
  }
}

// This main function runs every time the AI sees a person
function onResults(results) {
  try {
    // Frame rate limiting
    const currentTime = performance.now();
    if (currentTime - lastFrameTime < FRAME_INTERVAL) {
      return;
    }
    lastFrameTime = currentTime;

    // Ensure we have valid video dimensions
    if (!video.videoWidth || !video.videoHeight) {
      return;
    }

    // Make the drawing canvas the same size as the video
    if (canvasElement.width !== video.videoWidth || canvasElement.height !== video.videoHeight) {
      canvasElement.width = video.videoWidth;
      canvasElement.height = video.videoHeight;
    }

    // Clear the canvas and draw the video frame onto it
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }

    // If the AI finds pose dots, start the analysis
    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
      // Ensure we're ready for pose detection
      if (!isInitialized) {
        updateStatus("Pose detected! Ready to analyze.", 'ready');
        isInitialized = true;
      }

      // Draw the skeleton lines and dots on the screen
      if (typeof drawConnectors === 'function' && typeof POSE_CONNECTIONS !== 'undefined') {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
      }
      if (typeof drawLandmarks === 'function') {
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', radius: 2});
      }

      // --- Start of Ski Coach Logic ---

      // Get the specific dots we need for the left leg
      const leftHip = results.poseLandmarks[POSE_LANDMARKS.LEFT_HIP];
      const leftKnee = results.poseLandmarks[POSE_LANDMARKS.LEFT_KNEE];
      const leftAnkle = results.poseLandmarks[POSE_LANDMARKS.LEFT_ANKLE];

      // Validate that we have all required landmarks
      if (leftHip && leftKnee && leftAnkle) {
        // Calculate the angle of the left knee using our function
        const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);

        if (kneeAngle !== null && !isNaN(kneeAngle)) {
          // Display the angle on the screen, rounded to a whole number
          feedbackElement.innerHTML = "Knee Angle: " + Math.round(kneeAngle) + "°";
        } else {
          feedbackElement.innerHTML = "Knee Angle: --";
        }
      } else {
        feedbackElement.innerHTML = "Knee Angle: -- (landmarks not detected)";
      }

      // --- End of Ski Coach Logic ---
    } else {
      feedbackElement.innerHTML = "Knee Angle: -- (no pose detected)";
    }
  } catch (error) {
    handleError(error, "Error processing pose data");
  }
}

// Initialize the application
async function initializeApp() {
  try {
    updateStatus("Checking browser compatibility...", 'loading');

    // Check browser support
    const compatibilityErrors = checkBrowserSupport();
    if (compatibilityErrors.length > 0) {
      handleError(new Error("Browser not compatible"), compatibilityErrors.join(", "));
      return;
    }

    updateStatus("Loading MediaPipe libraries...", 'loading');

    // Wait for MediaPipe libraries to load
    await waitForMediaPipe();

    updateStatus("Loading AI model...", 'loading');

    // Setup the AI Model with error handling
    pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    // Connect our main function (onResults) to the AI
    pose.onResults(onResults);

    updateStatus("Requesting camera access...", 'loading');

    // Setup the Webcam with error handling
    camera = new Camera(video, {
      onFrame: async () => {
        try {
          if (pose && video.readyState >= 2) {
            await pose.send({image: video});
          }
        } catch (error) {
          console.error("Error sending frame to pose detection:", error);
        }
      },
      width: 640,
      height: 480
    });

    // Wait for camera to be ready
    video.addEventListener('loadedmetadata', () => {
      updateStatus("Camera ready. Stand in view to begin pose detection.", 'ready');
    });

    video.addEventListener('error', (error) => {
      handleError(error, "Camera access failed. Please check permissions.");
    });

    await camera.start();

  } catch (error) {
    handleError(error, "Failed to initialize application");
  }
}

// Cleanup function
function cleanup() {
  try {
    if (camera) {
      camera.stop();
    }
    if (pose) {
      pose.close();
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

// Handle page unload
window.addEventListener('beforeunload', cleanup);

// Start the application when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}