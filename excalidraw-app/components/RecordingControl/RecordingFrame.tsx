import { useEffect, useRef, useState } from "react";

import { useRecordingDimensions } from "./useRecordingDimensions";

import "./RecordingFrame.scss";

interface Ripple {
  x: number;
  y: number;
  startTime: number;
  id: number;
}

interface RecordingFrameProps {
  visible: boolean;
  aspectRatio: string;
  countdown?: number;
  showCursor?: boolean;
  cursorColor?: string;
  cursorSize?: number;
  cursorRippleSize?: number;
}

export const RecordingFrame = ({
  visible,
  aspectRatio,
  countdown,
  showCursor = true,
  cursorColor = "#f03e3e",
  cursorSize = 10,
  cursorRippleSize = 4,
}: RecordingFrameProps) => {
  const { width, height, left, top } = useRecordingDimensions(aspectRatio);
  const frameRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseInside, setIsMouseInside] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    if (!visible || !showCursor) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      // Check if mouse is inside recording frame
      const isInside =
        e.clientX >= left &&
        e.clientX <= left + width &&
        e.clientY >= top &&
        e.clientY <= top + height;

      setIsMouseInside(isInside);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!visible) {
        return;
      }
      const newRipple: Ripple = {
        x: e.clientX,
        y: e.clientY,
        startTime: Date.now(),
        id: rippleIdRef.current++,
      };
      setRipples((prev) => [...prev, newRipple]);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [visible, showCursor, left, top, width, height]);

  // Clean up expired ripples
  useEffect(() => {
    if (ripples.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      setRipples((prev) =>
        prev.filter((ripple) => now - ripple.startTime < 600),
      );
    }, 50);

    return () => clearInterval(interval);
  }, [ripples]);

  if (!visible) {
    return null;
  }

  return (
    <div className="recording-frame-overlay">
      <div
        ref={frameRef}
        className={["recording-frame", isMouseInside && "hide-cursor"]
          .filter(Boolean)
          .join(" ")}
        style={{
          width,
          height,
          left,
          top,
        }}
      >
        <div className="recording-label">REC</div>
        {countdown !== undefined && countdown > 0 && (
          <div className="countdown-wrapper">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}

        {/* Custom cursor overlay - only show when mouse is inside */}
        {showCursor && isMouseInside && (
          <div
            className="custom-cursor"
            style={{
              left: mousePos.x,
              top: mousePos.y,
              width: cursorSize * 2,
              height: cursorSize * 2,
              backgroundColor: `${cursorColor}80`,
              borderColor: "white",
            }}
          />
        )}

        {/* Ripples overlay */}
        {showCursor &&
          ripples.map((ripple) => {
            const progress = (Date.now() - ripple.startTime) / 600;
            const maxRadius = cursorSize * cursorRippleSize;
            const currentRadius = maxRadius * progress;
            const opacity = 1 - progress;

            return (
              <div
                key={ripple.id}
                className="ripple-effect"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: currentRadius * 2,
                  height: currentRadius * 2,
                  borderColor: `${cursorColor}${Math.floor(opacity * 255)
                    .toString(16)
                    .padStart(2, "0")}`,
                  opacity,
                }}
              />
            );
          })}
      </div>
    </div>
  );
};
