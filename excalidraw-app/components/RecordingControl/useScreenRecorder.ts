import { useState, useRef, useCallback, useEffect } from "react";

type VideoFormat = "webm" | "mp4" | "mov";

interface RecordingArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  cursorSize?: number;
  cursorRippleSize?: number;
  background?: string;
  borderRadius?: number;
  videoFormat?: VideoFormat;
  recordingArea?: RecordingArea | null; // 指定录制区域，null 表示全屏
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
  cursorSize = 10,
  cursorRippleSize = 4,
  background = "#000000",
  borderRadius = 0,
  videoFormat = "webm",
  recordingArea = null,
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

  // Ripple animation state
  const ripplesRef = useRef<
    Array<{ x: number; y: number; startTime: number; id: number }>
  >([]);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (isRecording) {
        ripplesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          startTime: Date.now(),
          id: rippleIdRef.current++,
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isRecording]);

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
              cursor: "never", // Always hide system cursor, we'll draw custom cursor
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

      // Note: We don't hide the system cursor on the original canvas
      // The custom cursor is only drawn on the recording canvas
      // User can still see their system cursor while recording

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

          // Variables for coordinate mapping (used by cursor and ripples)
          let canvasScaleX = 1;
          let canvasScaleY = 1;
          let canvasRect = { left: 0, top: 0, width: cw, height: ch };
          let canvasSrcRect = { x: 0, y: 0, w: cw, h: ch };
          let canvasContentX = padding;
          let canvasContentY = padding;
          let canvasContentWidth = cw - padding * 2;
          let canvasContentHeight = ch - padding * 2;

          // Common content dimensions for both modes
          const contentWidth = cw - padding * 2;
          const contentHeight = ch - padding * 2;
          const contentX = padding;
          const contentY = padding;

          if (recordingMode === "canvas") {
            // Find all canvases in excalidraw container and draw them
            const container = document.querySelector(".excalidraw");

            if (container) {
              const canvases = container.querySelectorAll("canvas");

              if (canvases.length > 0) {
                // Calculate crop based on first canvas (assume all same size)
                const c0 = canvases[0];
                const cSw = c0.width;
                const cSh = c0.height;

                // Calculate scale factor for cursor mapping
                const rect = c0.getBoundingClientRect();
                canvasRect = rect;
                canvasScaleX = cSw / rect.width;
                canvasScaleY = cSh / rect.height;

                let srcW = cSw;
                let srcH = cSh;

                if (srcW / srcH > targetRatio) {
                  srcW = srcH * targetRatio;
                } else {
                  srcH = srcW / targetRatio;
                }

                canvasSrcRect = {
                  x: (cSw - srcW) / 2,
                  y: (cSh - srcH) / 2,
                  w: srcW,
                  h: srcH,
                };
              }

              // Calculate centered position with padding
              canvasContentWidth = cw - padding * 2;
              canvasContentHeight = ch - padding * 2;
              canvasContentX = padding;
              canvasContentY = padding;

              // Draw content with rounded corners
              ctx.save();
              drawRoundedRectPath(
                ctx,
                canvasContentX,
                canvasContentY,
                canvasContentWidth,
                canvasContentHeight,
                borderRadius,
              );
              ctx.clip();

              // Fill with white background for content area
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(
                canvasContentX,
                canvasContentY,
                canvasContentWidth,
                canvasContentHeight,
              );

              canvases.forEach((c) => {
                ctx.drawImage(
                  c,
                  canvasSrcRect.x,
                  canvasSrcRect.y,
                  canvasSrcRect.w,
                  canvasSrcRect.h,
                  canvasContentX,
                  canvasContentY,
                  canvasContentWidth,
                  canvasContentHeight,
                );
              });

              ctx.restore();

              if (showCursor) {
                const { x: clientX, y: clientY } = mousePosRef.current;

                // Map Client Mouse to Canvas Element relative position
                const relX = clientX - canvasRect.left;
                const relY = clientY - canvasRect.top;

                // Map to Internal Canvas pixels
                const sx = relX * canvasScaleX;
                const sy = relY * canvasScaleY;

                // Map Source Canvas pixels to Destination Canvas pixels (accounting for padding)
                const destX =
                  canvasContentX +
                  (sx - canvasSrcRect.x) *
                    (canvasContentWidth / canvasSrcRect.w);
                const destY =
                  canvasContentY +
                  (sy - canvasSrcRect.y) *
                    (canvasContentHeight / canvasSrcRect.h);

                ctx.save();
                ctx.beginPath();
                ctx.arc(destX, destY, cursorSize, 0, Math.PI * 2);
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
            let srcX = 0;
            let srcY = 0;

            // 如果指定了录制区域，使用该区域
            if (recordingArea) {
              srcX = recordingArea.x;
              srcY = recordingArea.y;
              srcW = recordingArea.width;
              srcH = recordingArea.height;

              // 调整画布尺寸为录制区域尺寸
              canvas.width = Math.round(srcW / 2) * 2;
              canvas.height = Math.round(srcH / 2) * 2;

              // 直接绘制录制区域
              ctx.drawImage(
                screenVideo,
                srcX,
                srcY,
                srcW,
                srcH,
                0,
                0,
                canvas.width,
                canvas.height,
              );

              // Draw custom cursor in screen mode with recording area
              if (showCursor) {
                const { x: clientX, y: clientY } = mousePosRef.current;

                // 检查光标是否在录制区域内
                if (
                  clientX >= srcX &&
                  clientX <= srcX + srcW &&
                  clientY >= srcY &&
                  clientY <= srcY + srcH
                ) {
                  // Map coordinates relative to recording area
                  const relX = (clientX - srcX) / srcW;
                  const relY = (clientY - srcY) / srcH;

                  const destX = relX * canvas.width;
                  const destY = relY * canvas.height;

                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(destX, destY, cursorSize, 0, Math.PI * 2);
                  ctx.fillStyle = `${cursorColor}80`;
                  ctx.fill();
                  ctx.strokeStyle = "white";
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  ctx.restore();
                }
              }
            } else {
              // 原有逻辑：全屏录制
              if (srcW / srcH > targetRatio) {
                srcW = srcH * targetRatio;
              } else {
                srcH = srcW / targetRatio;
              }

              srcX = (vSw - srcW) / 2;
              srcY = (vSh - srcH) / 2;

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

              // Draw custom cursor in screen mode
              if (showCursor) {
                const { x: clientX, y: clientY } = mousePosRef.current;

                // Map screen coordinates to canvas coordinates
                const relX = clientX / window.screen.width;
                const relY = clientY / window.screen.height;

                const destX =
                  contentX + (relX * vSw - srcX) * (contentWidth / srcW);
                const destY =
                  contentY + (relY * vSh - srcY) * (contentHeight / srcH);

                ctx.save();
                ctx.beginPath();
                ctx.arc(destX, destY, cursorSize, 0, Math.PI * 2);
                ctx.fillStyle = `${cursorColor}80`;
                ctx.fill();
                ctx.strokeStyle = "white";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
              }
            }
          }

          // Draw camera overlay
          const currentCameraVideo = videoElementsRef.current?.camera;
          if (currentCameraVideo && currentCameraVideo.readyState >= 2) {
            // 使用当前 canvas 尺寸（可能因 recordingArea 而改变）
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const camSize = Math.min(
              cameraSize,
              canvasWidth / 4,
              canvasHeight / 4,
            );
            let camX = padding;
            let camY = padding;

            if (cameraPosition.includes("right")) {
              camX = canvasWidth - camSize - padding;
            }
            if (cameraPosition.includes("bottom")) {
              camY = canvasHeight - camSize - padding;
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

            const cVw = currentCameraVideo.videoWidth || 1280;
            const cVh = currentCameraVideo.videoHeight || 720;
            const cMin = Math.min(cVw, cVh);
            const cSx = (cVw - cMin) / 2;
            const cSy = (cVh - cMin) / 2;

            ctx.drawImage(
              currentCameraVideo,
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

          // Draw click ripples - use same coordinate mapping as cursor
          if (ripplesRef.current.length > 0) {
            const now = Date.now();
            const rippleDuration = 600; // ms

            ripplesRef.current = ripplesRef.current.filter(
              (ripple) => now - ripple.startTime < rippleDuration,
            );

            ripplesRef.current.forEach((ripple) => {
              const progress = (now - ripple.startTime) / rippleDuration;
              const maxRadius = cursorSize * cursorRippleSize;
              const currentRadius = maxRadius * progress;
              const opacity = 1 - progress;

              // Map screen coordinates to canvas coordinates (same logic as cursor)
              let rippleX;
              let rippleY;

              if (recordingMode === "canvas") {
                // Use same coordinate mapping as cursor drawing
                const relX = ripple.x - canvasRect.left;
                const relY = ripple.y - canvasRect.top;

                // Map to Internal Canvas pixels
                const sx = relX * canvasScaleX;
                const sy = relY * canvasScaleY;

                // Map Source Canvas pixels to Destination Canvas pixels
                rippleX =
                  canvasContentX +
                  (sx - canvasSrcRect.x) *
                    (canvasContentWidth / canvasSrcRect.w);
                rippleY =
                  canvasContentY +
                  (sy - canvasSrcRect.y) *
                    (canvasContentHeight / canvasSrcRect.h);
              } else if (recordingArea) {
                // 指定录制区域模式
                const {
                  x: raX,
                  y: raY,
                  width: raW,
                  height: raH,
                } = recordingArea;

                // 检查波纹是否在录制区域内
                if (
                  ripple.x >= raX &&
                  ripple.x <= raX + raW &&
                  ripple.y >= raY &&
                  ripple.y <= raY + raH
                ) {
                  const relX = (ripple.x - raX) / raW;
                  const relY = (ripple.y - raY) / raH;

                  rippleX = relX * canvas.width;
                  rippleY = relY * canvas.height;
                } else {
                  // 波纹在录制区域外，不绘制
                  return;
                }
              } else {
                // 全屏录制模式
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

                // Map screen coordinates to canvas coordinates
                const relX = ripple.x / window.screen.width;
                const relY = ripple.y / window.screen.height;

                rippleX =
                  contentX + (relX * vSw - srcX) * (contentWidth / srcW);
                rippleY =
                  contentY + (relY * vSh - srcY) * (contentHeight / srcH);
              }

              // Draw ripple
              ctx.save();
              ctx.beginPath();
              ctx.arc(rippleX, rippleY, currentRadius, 0, Math.PI * 2);
              const gradient = ctx.createRadialGradient(
                rippleX,
                rippleY,
                0,
                rippleX,
                rippleY,
                currentRadius,
              );
              gradient.addColorStop(0, `${cursorColor}00`);
              gradient.addColorStop(
                0.5,
                `${cursorColor}${Math.floor(opacity * 128)
                  .toString(16)
                  .padStart(2, "0")}`,
              );
              gradient.addColorStop(1, `${cursorColor}00`);
              ctx.fillStyle = gradient;
              ctx.fill();

              // Draw ring
              ctx.beginPath();
              ctx.arc(rippleX, rippleY, currentRadius, 0, Math.PI * 2);
              ctx.strokeStyle = `${cursorColor}${Math.floor(opacity * 255)
                .toString(16)
                .padStart(2, "0")}`;
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.restore();
            });
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

      // Determine mimeType based on video format
      const getMimeType = (format: VideoFormat): string => {
        switch (format) {
          case "mp4":
            return MediaRecorder.isTypeSupported("video/mp4")
              ? "video/mp4"
              : "video/webm;codecs=vp9";
          case "mov":
            // QuickTime format, supported on Safari
            return MediaRecorder.isTypeSupported("video/quicktime")
              ? "video/quicktime"
              : "video/webm;codecs=vp9";
          case "webm":
          default:
            return "video/webm;codecs=vp9";
        }
      };

      const mimeType = getMimeType(videoFormat);
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
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
        const blobType =
          videoFormat === "mp4" && mimeType === "video/mp4"
            ? "video/mp4"
            : "video/webm";
        const blob = new Blob(chunksRef.current, {
          type: blobType,
        });
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);

        // Restore original canvas cursor
        const styleId = "recording-hide-cursor";
        const styleEl = document.getElementById(styleId);
        if (styleEl) {
          styleEl.remove();
        }

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
          const extension = videoFormat;
          a.download = `excalidraw-recording-${new Date().toISOString()}.${extension}`;
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
    cursorSize,
    cursorRippleSize,
    background,
    borderRadius,
    videoFormat,
    recordingArea,
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

  // Toggle camera during recording
  const toggleCamera = useCallback(
    async (show: boolean, stream: MediaStream | null) => {
      if (!videoElementsRef.current) {
        return;
      }

      if (show && stream) {
        // Start camera
        const cameraVideo = document.createElement("video");
        cameraVideo.muted = true;
        cameraVideo.srcObject = stream;
        await cameraVideo.play();
        videoElementsRef.current.camera = cameraVideo;
      } else if (videoElementsRef.current.camera) {
        // Stop camera
        videoElementsRef.current.camera.srcObject = null;
        videoElementsRef.current.camera = null;
      }
    },
    [],
  );

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
    toggleCamera,
  };
};
