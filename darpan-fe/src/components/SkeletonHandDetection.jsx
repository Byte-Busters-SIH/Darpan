import React, { useRef, useEffect, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

const LEFT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
const RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];

const SkeletonHandFaceDetection = () => {
  const videoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const handCanvasRef = useRef(null);
  const [gesture, setGesture] = useState('Gesture: Center');
  const [handGesture, setHandGesture] = useState('Hand Gesture: None');
  const [isFaceDetectionEnabled, setIsFaceDetectionEnabled] = useState(true);
  const [isHandDetectionEnabled, setIsHandDetectionEnabled] = useState(true);

  useEffect(() => {
    const setupCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Set up Hands model
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults(handleHandResults);

      // Set up FaceMesh model
      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.7
      });

      faceMesh.onResults(handleFaceResults);

      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (isFaceDetectionEnabled) {
              await faceMesh.send({ image: videoRef.current });
            }
            if (isHandDetectionEnabled) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        camera.start();
      }
    };

    setupCamera();
  }, [isFaceDetectionEnabled, isHandDetectionEnabled]);

  const handleHandResults = (results) => {
    if (!isHandDetectionEnabled) return;

    const ctx = handCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, handCanvasRef.current.width, handCanvasRef.current.height);

    if (results.multiHandLandmarks) {
      results.multiHandLandmarks.forEach((landmarks) => {
        drawSkeletonHand(ctx, landmarks);

        // Determine hand gesture
        const isFist = detectFist(landmarks);
        const isPalm = detectPalm(landmarks);

        if (isFist) {
          setHandGesture('Hand Gesture: Fist');
        } else if (isPalm) {
          setHandGesture('Hand Gesture: Palm');
        } else {
          setHandGesture('Hand Gesture: None');
        }
      });
    }
  };

  const handleFaceResults = (results) => {
    if (!isFaceDetectionEnabled) return;

    const ctx = faceCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, faceCanvasRef.current.width, faceCanvasRef.current.height);

    if (results.multiFaceLandmarks) {
      const landmarks = results.multiFaceLandmarks[0].map(landmark => ({
        x: landmark.x * faceCanvasRef.current.width,
        y: landmark.y * faceCanvasRef.current.height
      }));

      detectHeadGesture(landmarks);

      // Draw face landmarks
      landmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x, landmark.y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'aliceblue';
        ctx.fill();
      });

      ctx.font = '20px Arial';
      ctx.fillStyle = 'black';
    }
  };

  const detectHeadGesture = (landmarks) => {
    const nose = landmarks[1];
    const leftEye = landmarks[LEFT_EYE[0]];
    const rightEye = landmarks[RIGHT_EYE[0]];

    const eyeDistance = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2));
    const noseToLeftEyeDistance = Math.sqrt(Math.pow(leftEye.x - nose.x, 2) + Math.pow(leftEye.y - nose.y, 2));
    const noseToRightEyeDistance = Math.sqrt(Math.pow(rightEye.x - nose.x, 2) + Math.pow(rightEye.y - nose.y, 2));

    if (noseToLeftEyeDistance > noseToRightEyeDistance * 1.5) {
      setGesture('Looking Right');
    } else if (noseToRightEyeDistance > noseToLeftEyeDistance * 1.5) {
      setGesture('Looking Left');
    } else {
      setGesture('Center');
    }
  };

  const detectFist = (landmarks) => {
    const threshold = 0.1; // Adjust this value based on your needs

    const palmBase = landmarks[0]; // Wrist or base of the palm
    const fingertips = [4, 8, 12, 16, 20]; // Fingertips landmarks indices

    return fingertips.every(index => {
      const tip = landmarks[index];
      const distance = Math.sqrt(Math.pow(tip.x - palmBase.x, 2) + Math.pow(tip.y - palmBase.y, 2));
      return distance < threshold;
    });
  };

  const detectPalm = (landmarks) => {
    const threshold = 0.2; // Adjust this value based on your needs

    const palmBase = landmarks[0]; // Wrist or base of the palm
    const fingertips = [4, 8, 12, 16, 20]; // Fingertips landmarks indices

    return fingertips.every(index => {
      const tip = landmarks[index];
      const distance = Math.sqrt(Math.pow(tip.x - palmBase.x, 2) + Math.pow(tip.y - palmBase.y, 2));
      return distance > threshold;
    });
  };

  const drawSkeletonHand = (ctx, landmarks) => {
    ctx.strokeStyle = 'rgba(211, 211, 211, 0.8)';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'black';

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20]
    ];

    connections.forEach(([start, end]) => {
      const startX = landmarks[start].x * handCanvasRef.current.width;
      const startY = landmarks[start].y * handCanvasRef.current.height;
      const endX = landmarks[end].x * handCanvasRef.current.width;
      const endY = landmarks[end].y * handCanvasRef.current.height;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(startX, startY, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.arc(endX, endY, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  return (
    <div>
      <div>
        <button onClick={() => setIsFaceDetectionEnabled(prev => !prev)}>
          {isFaceDetectionEnabled ? 'Disable Face Detection' : 'Enable Face Detection'}
        </button>
        <button onClick={() => setIsHandDetectionEnabled(prev => !prev)}>
          {isHandDetectionEnabled ? 'Disable Hand Detection' : 'Enable Hand Detection'}
        </button>
      </div>
      <div>{gesture}</div>
      <div>{handGesture}</div>
      <video 
  ref={videoRef} 
  width="640" 
  height="480" 
  autoPlay 
  style={{ 
    position: 'absolute', 
    top: 450, 
    left: '480px', 
    transform: 'scaleX(-1)'  // This flips the video horizontally
  }} 
/>
      {isFaceDetectionEnabled && (
        <canvas ref={faceCanvasRef} width="640" height="480" style={{ position: 'absolute', top: 800, left: '480px', transform: 'scaleX(-1)'  }} />
      )}
      {isHandDetectionEnabled && (
        <canvas ref={handCanvasRef} width="640" height="480" style={{ position: 'absolute', top: 800, left: '480px', transform: 'scaleX(-1)'  }} />
      )}
    </div>
  );
};

export default SkeletonHandFaceDetection;
