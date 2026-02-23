import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";

import "./CameraOverlay.scss";

interface CameraOverlayProps {
  visible: boolean;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  defaultSize: number; // percentage or pixel width
  onToggleSize?: () => void;
  stream: MediaStream | null;
  containerRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export const CameraOverlay = ({
  visible,
  position,
  defaultSize,
  stream,
  containerRect,
}: CameraOverlayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scale, setScale] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  // Dragging state
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Reset drag position when the position prop changes (e.g. from settings)
  useEffect(() => {
    setDragPosition(null);
  }, [position, containerRect]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't start drag if clicking on controls
    if ((e.target as HTMLElement).closest(".camera-controls")) {
      return;
    }

    e.preventDefault();
    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();

    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // If we haven't dragged yet, we need to set the initial position
    // based on the current computed position
    if (!dragPosition) {
      setDragPosition({ x: rect.left, y: rect.top });
    }

    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setDragPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!visible) {
    return null;
  }

  const getContainerPositionStyle = () => {
    if (!containerRect) {
      return {};
    }

    const { x, y, width, height } = containerRect;
    const padding = 20; // Default padding used in SCSS
    const elWidth = defaultSize * scale;

    const style: React.CSSProperties = {
      bottom: "auto",
      right: "auto",
      transform: "none",
    };

    switch (position) {
      case "top-left":
        style.top = y + padding;
        style.left = x + padding;
        break;
      case "top-right":
        style.top = y + padding;
        style.left = x + width - elWidth - padding;
        break;
      case "bottom-left":
        style.top = y + height - elWidth - padding;
        style.left = x + padding;
        break;
      case "bottom-right":
        style.top = y + height - elWidth - padding;
        style.left = x + width - elWidth - padding;
        break;
    }
    return style;
  };

  const containerStyle = getContainerPositionStyle();

  return (
    <div
      className={clsx("camera-overlay", position, {
        "is-dragging": isDragging,
      })}
      style={{
        width: `${defaultSize * scale}px`,
        // If we are dragging or have a drag position, override the class-based positioning
        ...(dragPosition
          ? {
              top: dragPosition.y,
              left: dragPosition.x,
              bottom: "auto",
              right: "auto",
              transform: "none", // Disable any transform that might interfere
            }
          : containerRect
          ? containerStyle
          : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
    >
      <div className="camera-container">
        {!stream ? (
          <div className="camera-error">
            <span>无法访问摄像头</span>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
            onContextMenu={(e) => e.preventDefault()}
          />
        )}

        {/* Quick Controls on Hover */}
        <div className={clsx("camera-controls", { visible: isHovered })}>
          <button
            className="control-btn"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            title="缩小"
          >
            -
          </button>
          <span className="scale-display">{Math.round(scale * 100)}%</span>
          <button
            className="control-btn"
            onClick={() => setScale((s) => Math.min(2.0, s + 0.1))}
            title="放大"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
