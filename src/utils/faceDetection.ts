declare const webgazer: any;

let isInitialized = false;
let activeAudio: HTMLAudioElement | null = null;
let lastDetectionTime = 0;
const DETECTION_INTERVAL = 50;

interface GazeData {
  x: number;
  y: number;
}

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const loadModel = async () => {
  if (isInitialized) return true;
  
  try {
    await webgazer
      .setRegression('ridge')
      .setTracker('TFFacemesh')
      .begin();
    
    webgazer.showVideo(true);
    webgazer.showFaceOverlay(true);
    webgazer.showFaceFeedbackBox(true);
    webgazer.showPredictionPoints(true);
    
    const style = document.createElement('style');
    style.textContent = `
      .webgazerGazeDot {
        background-color: #FF4B4B !important;
        border: 2px solid white !important;
        border-radius: 50% !important;
        opacity: 0.8 !important;
        pointer-events: none !important;
        transition: all 0.1s ease-out !important;
      }
      #webgazerVideoContainer {
        position: relative !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
      }
      #webgazerVideoCanvas {
        width: 100% !important;
        height: 100% !important;
      }
      video {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
      }
      .webgazer-face-overlay {
        border: 2px solid #4CAF50 !important;
        opacity: 0.7 !important;
      }
      .webgazerFaceFeedbackBox {
        border: 2px solid #2196F3 !important;
        opacity: 0.7 !important;
      }
      .webgazerFaceFeature {
        background-color: yellow !important;
        border-radius: 50% !important;
        opacity: 0.7 !important;
      }
    `;
    document.head.appendChild(style);
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Error initializing WebGazer:', error);
    return false;
  }
};

export const detectFace = async () => {
  if (!isInitialized) return null;
  
  const currentTime = Date.now();
  if (currentTime - lastDetectionTime < DETECTION_INTERVAL) {
    return null;
  }
  
  lastDetectionTime = currentTime;
  
  try {
    const prediction = await webgazer.getCurrentPrediction();
    if (!prediction) {
      return { gazeData: null, faceDetected: false, timestamp: currentTime };
    }

    const faceFeatures = webgazer.getTracker().getPositions();
    const faceDetected = faceFeatures && faceFeatures.length > 0;

    return {
      gazeData: {
        x: prediction.x,
        y: prediction.y
      },
      faceDetected,
      timestamp: currentTime
    };
  } catch (error) {
    console.error('Error getting face detection:', error);
    return null;
  }
};

export const isPupilLookingAway = (
  predictions: { gazeData: GazeData | null, faceDetected: boolean } | null
): boolean => {
  if (!predictions || !predictions.faceDetected || !predictions.gazeData) {
    return true;
  }

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  const gazeX = predictions.gazeData.x;
  const gazeY = predictions.gazeData.y;

  const isWithinScreen = 
    gazeX >= 0 &&
    gazeX <= windowWidth &&
    gazeY >= 0 &&
    gazeY <= windowHeight;

  if (!isWithinScreen && !activeAudio) {
    playAlertSound();
  } else if (isWithinScreen && activeAudio) {
    stopAlertSound();
  }

  return !isWithinScreen;
};

export const playAlertSound = () => {
  if (activeAudio) return;
  
  const audio = new Audio('/src/assets/alarm-327234.mp3');
  audio.loop = true;
  audio.volume = 0.5;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      console.error('Error playing alert sound:', error);
    });
  }
  
  activeAudio = audio;
};

export const stopAlertSound = () => {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
};

export const cleanup = () => {
  if (isInitialized) {
    webgazer.end();
    isInitialized = false;
  }
  stopAlertSound();
};