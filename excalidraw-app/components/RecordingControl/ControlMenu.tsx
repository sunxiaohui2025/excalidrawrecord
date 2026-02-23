import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";

import {
  GearIcon,
  TeleprompterIcon,
  RecordIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  CursorIcon,
  CameraIcon,
} from "./Icons";
import "./ControlMenu.scss";

interface ControlMenuProps {
  onSettingsClick: () => void;
  onTeleprompterClick: () => void;
  onRecordClick: () => void;
  isRecording: boolean;
  isPaused?: boolean;
  recordingTime?: number;
  onPauseClick?: () => void;
  onStopClick?: () => void;
  showCursor?: boolean;
  onToggleCursor?: () => void;
  showTeleprompter?: boolean;
  cursorColor?: string;
  showCamera?: boolean;
  onToggleCamera?: () => void;
  isCountingDown?: boolean;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export const ControlMenu = ({
  onSettingsClick,
  onTeleprompterClick,
  onRecordClick,
  isRecording,
  isPaused = false,
  recordingTime = 0,
  onPauseClick,
  onStopClick,
  showCursor = true,
  onToggleCursor,
  showTeleprompter = false,
  cursorColor = "#f03e3e",
  showCamera = false,
  onToggleCamera,
  isCountingDown = false,
}: ControlMenuProps) => {
  const [position, setPosition] = useState({
    x: window.innerWidth - 300,
    y: 100,
  });
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

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
    // Only drag if not clicking a button
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }

    draggingRef.current = true;
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = "none";
  };

  if (isRecording || isCountingDown) {
    return (
      <div
        className="recording-control-menu recording-mode"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
      >
        <div className="timer-display">
          <div
            className={clsx("recording-dot", {
              paused: isPaused,
              counting: isCountingDown,
            })}
          ></div>
          {isCountingDown ? `准备中` : formatTime(recordingTime)}
        </div>

        <div className="divider"></div>

        <button
          className="control-btn"
          onClick={onPauseClick}
          title={isPaused ? "继续录制" : "暂停录制"}
        >
          {isPaused ? PlayIcon : PauseIcon}
        </button>

        <button
          className="control-btn stop-btn"
          onClick={onStopClick}
          title="停止录制"
        >
          {StopIcon}
        </button>

        <div className="divider"></div>

        <button
          className={clsx("control-btn cursor-btn", { active: showCursor })}
          onClick={onToggleCursor}
          title={showCursor ? "隐藏光标" : "显示光标"}
          style={{ color: showCursor ? cursorColor : undefined }}
        >
          {CursorIcon}
        </button>

        <button
          className={clsx("control-btn", { active: showCamera })}
          onClick={onToggleCamera}
          title={showCamera ? "关闭摄像头" : "开启摄像头"}
        >
          {CameraIcon}
        </button>

        <button
          className={clsx("control-btn", { active: showTeleprompter })}
          onClick={onTeleprompterClick}
          title={showTeleprompter ? "关闭提词器" : "打开提词器"}
        >
          {TeleprompterIcon}
        </button>
      </div>
    );
  }

  return (
    <div
      className="recording-control-menu"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <button className="control-btn" onClick={onSettingsClick} title="设置">
        {GearIcon}
      </button>
      <button
        className="control-btn"
        onClick={onTeleprompterClick}
        title="提词器"
      >
        {TeleprompterIcon}
      </button>
      <button
        className={clsx("control-btn record-btn", { recording: isRecording })}
        onClick={onRecordClick}
        title={isRecording ? "停止录制" : "开始录制"}
      >
        {RecordIcon}
        <span>{isRecording ? "停止" : "录制"}</span>
      </button>
    </div>
  );
};
