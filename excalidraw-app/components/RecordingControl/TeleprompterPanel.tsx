import React, { useState, useRef, useEffect } from "react";

import { PlayIcon, PauseIcon, CloseIcon } from "./Icons";
import "./TeleprompterPanel.scss";

interface TeleprompterPanelProps {
  onClose: () => void;
}

export const TeleprompterPanel = ({ onClose }: TeleprompterPanelProps) => {
  const [position, setPosition] = useState({
    x: window.innerWidth - 350,
    y: 200,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [opacity, setOpacity] = useState(0.9);
  const [text, setText] = useState(
    "在此输入提词内容...\n\n你可以调整播放速度和透明度。\n\n点击播放按钮开始滚动。",
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const scroll = () => {
        if (textareaRef.current) {
          textareaRef.current.scrollTop += speed * 0.5;
          if (
            textareaRef.current.scrollTop + textareaRef.current.clientHeight >=
            textareaRef.current.scrollHeight
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

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from header
    if (!(e.target as HTMLElement).closest(".panel-header")) {
      return;
    }

    draggingRef.current = true;
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = "none";
  };

  return (
    <div
      className="teleprompter-panel"
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: `rgba(255, 255, 255, ${opacity})`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="panel-header">
        <h3>提词器</h3>
        <button onClick={onClose} title="关闭">
          {CloseIcon}
        </button>
      </div>

      <div className="panel-content">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入提词内容..."
          disabled={isPlaying}
        />
      </div>

      <div className="panel-footer">
        <button
          className="play-btn"
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? PauseIcon : PlayIcon}
        </button>

        <div className="speed-control">
          <span>速度</span>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
        </div>

        <div className="opacity-control" title="透明度">
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};
