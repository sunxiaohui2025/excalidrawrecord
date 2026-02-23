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
  recordingMode?: "screen" | "canvas"; // 'screen' = getDisplayMedia, 'canvas' = DOM canvas capture
  cursorColor?: string;
  background?: string;
  borderRadius?: number;
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
  recordingMode = "screen",
  cursorColor = "#f03e3e",
  background = "#000000",
  borderRadius = 0,
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

  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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

      if (recordingMode === "screen") {
        // Check if we can reuse the existing display stream
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
              monitorTypeSurfaces: "exclude",
            } as MediaTrackConstraints | any,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        }
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
        if (displayStream) {
          screenVideo.srcObject = displayStream;
          await screenVideo.play();
        }

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
        if (
          displayStream &&
          videoElementsRef.current.screen.srcObject !== displayStream
        ) {
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
      let sw = window.screen.width;
      let sh = window.screen.height;

      if (recordingMode === "canvas") {
        const appCanvas = document.querySelector(
          ".excalidraw canvas",
        ) as HTMLCanvasElement;
        if (appCanvas) {
          sw = appCanvas.width;
          sh = appCanvas.height;
        }
      } else if (displayStream) {
        const settings = displayStream.getVideoTracks()[0].getSettings();
        sw = screenVideo.videoWidth || settings.width || window.screen.width;
        sh = screenVideo.videoHeight || settings.height || window.screen.height;
      }

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

      // Helper function to draw rounded rectangle path
      const drawRoundedRectPath = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
      ) => {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      // Helper function to apply background (gradient or solid color)
      const applyBackground = (
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        background: string,
      ) => {
        // Check if it's a gradient
        if (background.includes("gradient")) {
          // Parse linear gradient
          const linearMatch = background.match(
            /linear-gradient\((\d+)deg,\s*(.+)\)/,
          );
          if (linearMatch) {
            const angle = parseInt(linearMatch[1]);
            const colorsStr = linearMatch[2];

            // Convert angle to radians and calculate gradient vector
            const angleRad = ((angle - 90) * Math.PI) / 180;
            const x1 = width / 2 - (width / 2) * Math.cos(angleRad);
            const y1 = height / 2 - (height / 2) * Math.sin(angleRad);
            const x2 = width / 2 + (width / 2) * Math.cos(angleRad);
            const y2 = height / 2 + (height / 2) * Math.sin(angleRad);

            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);

            // Parse color stops
            const colorStops = colorsStr.split(",").map((s) => s.trim());
            colorStops.forEach((stop) => {
              const match = stop.match(/(.+?)\s+(\d+)%/);
              if (match) {
                gradient.addColorStop(
                  parseInt(match[2]) / 100,
                  match[1].trim(),
                );
              }
            });

            ctx.fillStyle = gradient;
          } else {
            // Fallback to solid color if parsing fails
            ctx.fillStyle = "#fce38a";
          }
        } else {
          ctx.fillStyle = background;
        }
        ctx.fillRect(0, 0, width, height);
      };

      // 5. Animation Loop
      // Restart animation loop if not running
      if (!animationFrameRef.current) {
        const draw = () => {
          if (!ctx || !videoElementsRef.current) {
            return;
          }

          // Clear with user configured background (gradient or color)
          applyBackground(ctx, cw, ch, background);

          if (recordingMode === "canvas") {
            // Find all canvases in excalidraw container and draw them
            const container = document.querySelector(".excalidraw");
            let srcRect = { x: 0, y: 0, w: cw, h: ch }; // Default fallback

            if (container) {
              const canvases = container.querySelectorAll("canvas");
              let scaleX = 1;
              let scaleY = 1;
              let cRect = { left: 0, top: 0, width: cw, height: ch };

              if (canvases.length > 0) {
                // Calculate crop based on first canvas (assume all same size)
                const c0 = canvases[0];
                const cSw = c0.width;
                const cSh = c0.height;

                // Calculate scale factor for cursor mapping
                const rect = c0.getBoundingClientRect();
                cRect = rect;
                scaleX = cSw / rect.width;
                scaleY = cSh / rect.height;

                let srcW = cSw;
                let srcH = cSh;

                if (srcW / srcH > targetRatio) {
                  srcW = srcH * targetRatio;
                } else {
                  srcH = srcW / targetRatio;
                }

                srcRect = {
                  x: (cSw - srcW) / 2,
                  y: (cSh - srcH) / 2,
                  w: srcW,
                  h: srcH,
                };
              }

              // Calculate centered position with padding
              const contentWidth = cw - padding * 2;
              const contentHeight = ch - padding * 2;
              const contentX = padding;
              const contentY = padding;

              // Draw content with rounded corners
              ctx.save();
              drawRoundedRectPath(
                ctx,
                contentX,
                contentY,
                contentWidth,
                contentHeight,
                borderRadius,
              );
              ctx.clip();

              // Fill with white background for content area
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(contentX, contentY, contentWidth, contentHeight);

              canvases.forEach((c) => {
                ctx.drawImage(
                  c,
                  srcRect.x,
                  srcRect.y,
                  srcRect.w,
                  srcRect.h,
                  contentX,
                  contentY,
                  contentWidth,
                  contentHeight,
                );
              });

              ctx.restore();

              if (showCursor) {
                const { x: clientX, y: clientY } = mousePosRef.current;

                // Map Client Mouse to Canvas Element relative position
                const relX = clientX - cRect.left;
                const relY = clientY - cRect.top;

                // Map to Internal Canvas pixels
                const sx = relX * scaleX;
                const sy = relY * scaleY;

                // Map Source Canvas pixels to Destination Canvas pixels (accounting for padding)
                const destX =
                  contentX + (sx - srcRect.x) * (contentWidth / srcRect.w);
                const destY =
                  contentY + (sy - srcRect.y) * (contentHeight / srcRect.h);

                ctx.save();
                ctx.beginPath();
                ctx.arc(destX, destY, 10, 0, Math.PI * 2);
                ctx.fillStyle = `${cursorColor}80`; // add transparency
                ctx.fill();
                ctx.strokeStyle = "white";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
              }
            }
          } else {
            // Screen mode
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

            // Calculate centered position with padding
            const contentWidth = cw - padding * 2;
            const contentHeight = ch - padding * 2;
            const contentX = padding;
            const contentY = padding;

            // Draw screen content with rounded corners
            ctx.save();
            drawRoundedRectPath(
              ctx,
              contentX,
              contentY,
              contentWidth,
              contentHeight,
              borderRadius,
            );
            ctx.clip();
            ctx.drawImage(
              screenVideo,
              srcX,
              srcY,
              srcW,
              srcH,
              contentX,
              contentY,
              contentWidth,
              contentHeight,
            );
            ctx.restore();
          }

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
      if (displayStream) {
        const displayAudioTracks = displayStream.getAudioTracks();
        if (displayAudioTracks.length > 0) {
          tracks.push(...displayAudioTracks);
        }
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
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
          ) {
            mediaRecorderRef.current.stop();
          }
          cleanup();
        };
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
    }
  }, [
    aspectRatio,
    showCamera,
    cameraPosition,
    cameraSize,
    padding,
    showCursor,
    externalCameraStream,
    onStop,
    startTimer,
    stopTimer,
    cleanup,
    recordingMode,
    cursorColor,
    background,
    borderRadius,
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
