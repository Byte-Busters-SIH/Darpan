// Import necessary libraries
// Note: You would need to include these scripts in your HTML file
// <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh"></script>
// <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>
// <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection"></script>

let COUNTER = 0;
let TOTAL_BLINKS = 0;

const LEFT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
const RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];

let faceMesh;
let video;
let canvas;
let ctx;

async function setupCamera() {
  video = document.createElement('video');
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

function landmarksDetection(results) {
  if (results.multiFaceLandmarks) {
    return results.multiFaceLandmarks[0].map(landmark => ({
      x: landmark.x * canvas.width,
      y: landmark.y * canvas.height
    }));
  }
  return [];
}

function euclideanDistance(point1, point2) {
  return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
}

function blinkRatio(landmarks, rightIndices, leftIndices) {
  const getRightEyeDistance = (idx1, idx2) => euclideanDistance(landmarks[rightIndices[idx1]], landmarks[rightIndices[idx2]]);
  const getLeftEyeDistance = (idx1, idx2) => euclideanDistance(landmarks[leftIndices[idx1]], landmarks[leftIndices[idx2]]);

  const rightEyeHorizontalDistance = getRightEyeDistance(0, 8);
  const rightEyeVerticalDistance = getRightEyeDistance(12, 4);
  const leftEyeHorizontalDistance = getLeftEyeDistance(0, 8);
  const leftEyeVerticalDistance = getLeftEyeDistance(12, 4);

  const rightEyeRatio = rightEyeHorizontalDistance / rightEyeVerticalDistance;
  const leftEyeRatio = leftEyeHorizontalDistance / leftEyeVerticalDistance;

  return (rightEyeRatio + leftEyeRatio) / 2;
}

async function main() {
  await setupCamera();
  video.play();

  canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');

  faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.7
  });

  faceMesh.onResults(onResults);

  async function detectFace() {
    await faceMesh.send({ image: video });
    requestAnimationFrame(detectFace);
  }

  detectFace();
}

function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (results.multiFaceLandmarks) {
    const landmarks = landmarksDetection(results);
    const eyesRatio = blinkRatio(landmarks, RIGHT_EYE, LEFT_EYE);

    ctx.font = '30px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText('Please blink your eyes', canvas.width / 2 - 150, 50);

    if (eyesRatio > 3) {
      COUNTER += 1;
    } else {
      if (COUNTER > 4) {
        TOTAL_BLINKS += 1;
        COUNTER = 0;
      }
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(20, 60, 270, 40);
    ctx.fillStyle = 'light-grey';
    ctx.fillText(`Total Blinks: ${TOTAL_BLINKS}`, 30, 90);

    for (const landmark of landmarks) {
      ctx.beginPath();
      ctx.arc(landmark.x, landmark.y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = 'aliceblue';
      ctx.fill();
    }
  }
}

main();