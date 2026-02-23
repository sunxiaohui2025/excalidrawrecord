import React, { useState, useRef, useEffect } from "react";

import { PlayIcon, PauseIcon, CloseIcon } from "./Icons";
import "./TeleprompterPanel.scss";

interface TeleprompterPanelProps {
  onClose: () => void;
}

export const TeleprompterPanel = ({ onClose }: TeleprompterPanelProps) => {
  const [position, setPosition] = useState({
    x: window.innerWidth - 400,
    y: 100,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [opacity, setOpacity] = useState(0.9);
  const [text, setText] = useState(
    "在此输入提词内容...\n\n你可以调整播放速度和透明度。\n\n点击播放按钮开始滚动。",
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  // Handle auto-scroll when playing
  useEffect(() => {
    if (isPlaying && textareaRef.current) {
      const scroll = () => {
        if (textareaRef.current) {
          const scrollSpeed = (speed / 100) * 2;
          textareaRef.current.scrollTop += scrollSpeed;

          // Check if reached the end
          if (
            textareaRef.current.scrollTop + textareaRef.current.clientHeight >=
            textareaRef.current.scrollHeight - 5
          ) {
            setIsPlaying(false);
            return;
          }
        }
        animationFrameRef.current = requestAnimationFrame(scroll);
      };
      animationFrameRef.current = requestAnimationFrame(scroll);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, speed]);

  // Handle drag functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        setPosition({
          x: e.clientX - offsetRef.current.x,
          y: e.clientY - offsetRef.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Handle wheel event to prevent bubbling to canvas and ensure textarea scrolling works
  useEffect(() => {
    const textarea = textareaRef.current;
    const panel = panelRef.current;
    if (!textarea || !panel) {
      return;
    }

    const handleNativeWheel = (e: WheelEvent) => {
      // Stop propagation to prevent canvas from scrolling
      e.stopPropagation();
      // Do NOT prevent default - allow the textarea to handle scrolling normally
    };

    // Use capture phase to intercept event before it bubbles to canvas
    textarea.addEventListener("wheel", handleNativeWheel, { capture: true });
    panel.addEventListener("wheel", handleNativeWheel, { capture: true });

    return () => {
      textarea.removeEventListener("wheel", handleNativeWheel, {
        capture: true,
      });
      panel.removeEventListener("wheel", handleNativeWheel, { capture: true });
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from header
    const target = e.target as HTMLElement;

    // Don't allow dragging from controls (buttons, sliders, close button)
    if (
      target.closest(".scroll-toggle") ||
      target.closest(".slider-group") ||
      target.closest(".close-btn") ||
      target.closest("input[type='range']")
    ) {
      return;
    }

    // Only allow dragging from header area
    if (!target.closest(".panel-header")) {
      return;
    }

    draggingRef.current = true;
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = "none";
  };

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  // Handle wheel event to prevent bubbling to canvas
  const handleWheel = (e: React.WheelEvent) => {
    // Only stop propagation, don't prevent default to allow textarea scrolling
    e.stopPropagation();
  };

  return (
    <div
      ref={panelRef}
      className="teleprompter-panel"
      style={{
        left: position.x,
        top: position.y,
        ["--teleprompter-opacity" as string]: opacity,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="panel-header">
        <div className="header-title-row">
          <h3>提词器</h3>
          <button className="close-btn" onClick={onClose} title="关闭">
            {CloseIcon}
          </button>
        </div>
        <div className="header-controls">
          <button
            className={`scroll-toggle ${isPlaying ? "playing" : ""}`}
            onClick={handlePlayToggle}
            title={isPlaying ? "暂停" : "自动滚动"}
          >
            {isPlaying ? PauseIcon : PlayIcon}
          </button>
          <div className="slider-group">
            <div className="slider-row">
              <span className="slider-label">滚动速度</span>
              <input
                className="teleprompter-slider"
                type="range"
                min="0"
                max="100"
                step="5"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
              />
            </div>
            <div className="slider-row">
              <span className="slider-label">透明度</span>
              <input
                className="teleprompter-slider"
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        className="teleprompter-text"
        value={text}
        onChange={handleTextChange}
        onWheel={handleWheel}
        placeholder="在此粘贴你的脚本...&#10;&#10;此文本仅对你可见，不会出现在录制中。"
        readOnly={isPlaying}
        style={{
          backgroundColor: `rgba(240, 238, 235, ${opacity})`,
        }}
      />
    </div>
  );
};
