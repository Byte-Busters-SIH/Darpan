const video = document.getElementById('video');
const startButton = document.getElementById('start-button');
const statusDiv = document.getElementById('status');
let session;

// Set up the camera and video stream
async function setupCamera() {
    try {
        // Request access to the user's webcam
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' }, // Use 'environment' for the back camera if needed
            audio: false // No need for audio in liveness detection
        });
        video.srcObject = stream;

        // Return a promise that resolves when the video is loaded
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } catch (error) {
        console.error("Error accessing the camera:", error);
        statusDiv.innerText = 'Error: Unable to access the camera. Please check your permissions and device settings.';
        throw new Error("Camera not found or access denied");
    }
}

// Load ONNX model
async function loadModel() {
    try {
        if (!ort) {
            throw new Error("ONNX Runtime not loaded. Make sure ort.js is included.");
        }
        // Load the ONNX model using ONNX Runtime
        session = await ort.InferenceSession.create('./model.onnx', {
            executionProviders: ['wasm'], // Options: 'wasm', 'webgl'
            graphOptimizationLevel: 'all'
        });
        console.log("Model loaded successfully.");
    } catch (error) {
        console.error("Error loading the ONNX model:", error);
        statusDiv.innerText = 'Error: Unable to load the liveness detection model.';
        throw new Error("Model loading failed");
    }
}

// Preprocess the video frame
function preprocessFrame(videoElement) {
    // Create a canvas to capture the current video frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Get the image data from the canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    // Convert the image data to a Float32Array for the model
    const input = new Float32Array(width * height * 3); // assuming RGB channels
    for (let i = 0; i < width * height; i++) {
        input[i * 3] = data[i * 4] / 255;     // R
        input[i * 3 + 1] = data[i * 4 + 1] / 255; // G
        input[i * 3 + 2] = data[i * 4 + 2] / 255; // B
    }

    // Return the processed input tensor
    return new ort.Tensor('float32', input, [1, 3, height, width]); // NCHW format
}

// Perform inference with the ONNX model
async function detectFace() {
    try {
        // Preprocess the video frame
        const inputTensor = preprocessFrame(video);

        // Run the model inference
        const feeds = { input: inputTensor }; // Use the correct input name as per your model
        const results = await session.run(feeds);

        // Assuming the model returns a liveness score
        const output = results.output.data[0]; // Use the correct output name
        console.log("Liveness Score:", output);

        // Update the status based on the liveness score
        if (output > 0.5) {
            statusDiv.innerText = 'Status: Live Face Detected';
        } else {
            statusDiv.innerText = 'Status: No Live Face Detected';
        }
    } catch (error) {
        console.error("Error during face detection:", error);
        statusDiv.innerText = 'Error: Face detection failed.';
    }
}

// Initialize and run the application
async function run() {
    try {
        // Set up the camera and load the ONNX model
        await setupCamera();
        await loadModel();

        // Play the video stream
        video.play();

        // Add event listener to start detection on button click
        startButton.addEventListener('click', () => {
            setInterval(detectFace, 500); // Run detection every 500 milliseconds
        });
    } catch (error) {
        console.error("Initialization error:", error);
        statusDiv.innerText = 'Error: Initialization failed. Please try reloading the page.';
    }
}

// Initialize the application
run();
