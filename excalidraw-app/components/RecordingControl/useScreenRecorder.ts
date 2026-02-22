import { useState, useRef, useCallback, useEffect } from "react";

interface UseScreenRecorderProps {
  onStop?: (blob: Blob) => void;
  aspectRatio?: string;
  showCamera?: boolean;
  cameraPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  cameraSize?: number;
  padding?: number;
  showCursor?: boolean;
  cameraStream?: MediaStream | null;
}

export const useScreenRecorder = ({
  onStop,
  aspectRatio = "16/9",
  showCamera = false,
  cameraPosition = "bottom-right",
  cameraSize = 200,
  padding = 20,
  showCursor = true,
  cameraStream: externalCameraStream = null,
}: UseScreenRecorderProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Refs for canvas composition
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const videoElementsRef = useRef<{
    screen: HTMLVideoElement;
    camera: HTMLVideoElement | null;
  } | null>(null);
  const streamsRef = useRef<{
    display: MediaStream | null;
    camera: MediaStream | null;
    canvas: MediaStream | null;
    audio: MediaStream | null;
  }>({ display: null, camera: null, canvas: null, audio: null });

  const startTimer = useCallback(() => {
    timerRef.current = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop all streams
    Object.values(streamsRef.current).forEach((stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    });

    // Cleanup video elements
    if (videoElementsRef.current) {
      videoElementsRef.current.screen.srcObject = null;
      if (videoElementsRef.current.camera) {
        videoElementsRef.current.camera.srcObject = null;
      }
      videoElementsRef.current = null;
    }

    streamsRef.current = {
      display: null,
      camera: null,
      canvas: null,
      audio: null,
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      let displayStream = streamsRef.current.display;
      let isStreamReused = false;

      // Check if we can reuse the existing display stream
      // Check if active and has live tracks
      if (
        displayStream &&
        displayStream.active &&
        displayStream.getTracks().some((t) => t.readyState === "live")
      ) {
        isStreamReused = true;
      } else {
        // 1. Get Display Stream
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "browser",
            cursor: showCursor ? "always" : "never",
            selfBrowserSurface: "include",
            surfaceSwitching: "include",
            preferCurrentTab: true,
          } as MediaTrackConstraints | any,
          audio: true,
        });
      }

      // 2. Get Camera Stream (if needed)
      let cameraStream: MediaStream | null = null;
      if (externalCameraStream) {
        cameraStream = externalCameraStream;
      } else if (showCamera) {
        // Reuse existing camera stream if available
        if (streamsRef.current.camera && streamsRef.current.camera.active) {
          cameraStream = streamsRef.current.camera;
        } else {
          try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                aspectRatio: 1.777, // 16:9
              },
              audio: false, // We'll get audio separately or from display stream
            });
            // Only track created streams for cleanup
            streamsRef.current.camera = cameraStream;
          } catch (e) {
            console.warn("Failed to get camera stream", e);
          }
        }
      }

      // 3. Get Microphone Audio
      let audioStream = streamsRef.current.audio;
      if (!audioStream || !audioStream.active) {
        audioStream = await navigator.mediaDevices
          .getUserMedia({ audio: true })
          .catch(() => null);
        streamsRef.current.audio = audioStream;
      }

      // Store streams
      streamsRef.current.display = displayStream;
      // streamsRef.current.camera is already set if created internally
      // streamsRef.current.audio is already set

      // 4. Setup Canvas Composition
      // Only create canvas and video elements if not reused or invalid
      if (!canvasRef.current || !videoElementsRef.current) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Could not create canvas context");
        }

        canvasRef.current = canvas;

        // Prepare video elements
        const screenVideo = document.createElement("video");
        screenVideo.muted = true;
        screenVideo.srcObject = displayStream;
        await screenVideo.play();

        let cameraVideo: HTMLVideoElement | null = null;
        if (cameraStream) {
          cameraVideo = document.createElement("video");
          cameraVideo.muted = true;
          cameraVideo.srcObject = cameraStream;
          await cameraVideo.play();
        }

        videoElementsRef.current = { screen: screenVideo, camera: cameraVideo };
      } else {
        // Ensure srcObjects are correct if we reused elements
        if (videoElementsRef.current.screen.srcObject !== displayStream) {
          videoElementsRef.current.screen.srcObject = displayStream;
          await videoElementsRef.current.screen.play();
        }
        if (
          cameraStream &&
          (!videoElementsRef.current.camera ||
            videoElementsRef.current.camera.srcObject !== cameraStream)
        ) {
          if (!videoElementsRef.current.camera) {
            videoElementsRef.current.camera = document.createElement("video");
            videoElementsRef.current.camera.muted = true;
          }
          videoElementsRef.current.camera.srcObject = cameraStream;
          await videoElementsRef.current.camera.play();
        }
      }

      const screenVideo = videoElementsRef.current.screen;
      const cameraVideo = videoElementsRef.current.camera;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d");

      // Calculate dimensions based on aspect ratio
      const settings = displayStream!.getVideoTracks()[0].getSettings();
      const sw =
        screenVideo.videoWidth || settings.width || window.screen.width;
      const sh =
        screenVideo.videoHeight || settings.height || window.screen.height;

      let targetRatio = 16 / 9;
      if (aspectRatio && aspectRatio !== "custom") {
        const [w, h] = aspectRatio.split("/").map(Number);
        if (!isNaN(w) && !isNaN(h) && h !== 0) {
          targetRatio = w / h;
        }
      } else {
        targetRatio = sw / sh;
      }

      // Determine canvas size (crop strategy)
      let cw = sw;
      let ch = sh;

      if (cw / ch > targetRatio) {
        cw = ch * targetRatio;
      } else {
        ch = cw / targetRatio;
      }

      cw = Math.round(cw / 2) * 2;
      ch = Math.round(ch / 2) * 2;

      canvas.width = cw;
      canvas.height = ch;

      // 5. Animation Loop
      // Restart animation loop if not running
      if (!animationFrameRef.current) {
        const draw = () => {
          if (!ctx || !videoElementsRef.current) {
            return;
          }

          // Clear
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, cw, ch);

          const vSw = screenVideo.videoWidth || sw;
          const vSh = screenVideo.videoHeight || sh;

          let srcW = vSw;
          let srcH = vSh;

          if (srcW / srcH > targetRatio) {
            srcW = srcH * targetRatio;
          } else {
            srcH = srcW / targetRatio;
          }

          const srcX = (vSw - srcW) / 2;
          const srcY = (vSh - srcH) / 2;

          ctx.drawImage(screenVideo, srcX, srcY, srcW, srcH, 0, 0, cw, ch);

          if (cameraVideo && cameraVideo.videoWidth) {
            const camSize = cameraSize;
            let camX = padding;
            let camY = padding;

            if (cameraPosition.includes("right")) {
              camX = cw - camSize - padding;
            }
            if (cameraPosition.includes("bottom")) {
              camY = ch - camSize - padding;
            }

            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(
              camX + camSize / 2,
              camY + camSize / 2,
              camSize / 2,
              0,
              Math.PI * 2,
            );
            ctx.clip();

            const cVw = cameraVideo.videoWidth;
            const cVh = cameraVideo.videoHeight;
            const cMin = Math.min(cVw, cVh);
            const cSx = (cVw - cMin) / 2;
            const cSy = (cVh - cMin) / 2;

            ctx.drawImage(
              cameraVideo,
              cSx,
              cSy,
              cMin,
              cMin,
              camX,
              camY,
              camSize,
              camSize,
            );

            ctx.restore();
            ctx.beginPath();
            ctx.arc(
              camX + camSize / 2,
              camY + camSize / 2,
              camSize / 2,
              0,
              Math.PI * 2,
            );
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();
          }

          animationFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
      }

      // 6. Capture Stream from Canvas
      // If we already have a canvas stream, we might need to recreate it if canvas changed,
      // but here we just recreate it for simplicity to ensure fresh track for MediaRecorder
      const canvasStream = canvas.captureStream(30); // 30 FPS
      streamsRef.current.canvas = canvasStream;

      // 7. Combine Audio
      const tracks = [...canvasStream.getTracks()];
      const displayAudioTracks = displayStream!.getAudioTracks();
      if (displayAudioTracks.length > 0) {
        tracks.push(...displayAudioTracks);
      }
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp9",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopTimer();
        const blob = new Blob(chunksRef.current, {
          type: "video/webm",
        });
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);

        // DO NOT cleanup streams here to allow reuse
        // cleanup();

        if (onStop) {
          onStop(blob);
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          document.body.appendChild(a);
          a.style.display = "none";
          a.href = url;
          a.download = `excalidraw-recording-${new Date().toISOString()}.webm`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimer();

      // Handle user stopping sharing via browser UI (Display Stream ends)
      // Only attach listener if it's a new stream to avoid duplicate listeners
      if (!isStreamReused && displayStream) {
        displayStream.getVideoTracks()[0].onended = () => {
          // If the user manually stops sharing, we should stop recording AND cleanup
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
          ) {
            mediaRecorderRef.current.stop();
          }
          cleanup();
        };
      }
    } catch (err) {
      console.error("Error starting recording:", err);
      setIsRecording(false);
    }
  }, [
    onStop,
    aspectRatio,
    showCamera,
    cameraPosition,
    cameraSize,
    padding,
    showCursor,
    cleanup,
    startTimer,
    stopTimer,
    externalCameraStream,
  ]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Note: cleanup() is NOT called here anymore, it's called on unmount or manual stream stop
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  }, [isRecording, isPaused, stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  }, [isRecording, isPaused, startTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    isPaused,
    recordingTime,
    pauseRecording,
    resumeRecording,
  };
};
