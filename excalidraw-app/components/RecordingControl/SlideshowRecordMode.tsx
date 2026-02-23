import React, { useState, useEffect, useCallback, useRef } from "react";
import clsx from "clsx";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { PauseIcon, PlayIcon, StopIcon } from "./Icons";
import "./SlideshowRecordMode.scss";

export interface Slide {
  id: number;
  elementId: string;
  labelElementId?: string;
}

interface RecordingArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SlideshowRecordModeProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  slides: Slide[];
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  onExit: () => void;
  aspectRatio: string;
  startFadeOut?: () => void;
  startFadeIn?: () => void;
  clearFade?: () => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export const SlideshowRecordMode: React.FC<SlideshowRecordModeProps> = ({
  excalidrawAPI,
  slides,
  isRecording,
  isPaused,
  recordingTime,
  pauseRecording,
  resumeRecording,
  stopRecording,
  onExit,
  aspectRatio,
  startFadeOut,
  startFadeIn,
  clearFade,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [recordingArea, setRecordingArea] = useState<RecordingArea | null>(
    null,
  );
  const switchingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentSlide = slides[currentIndex];

  // 计算幻灯片在屏幕上的位置
  const calculateRecordingArea = useCallback(() => {
    if (!currentSlide || !excalidrawAPI) {
      return null;
    }

    const elements = excalidrawAPI.getSceneElements();
    const element = elements.find((el) => el.id === currentSlide.elementId);

    if (!element) {
      return null;
    }

    // 获取元素在视口中的位置
    const appState = excalidrawAPI.getAppState();
    const zoom = appState.zoom.value;

    // 计算矩形框在屏幕上的像素位置
    const screenX = (element.x + appState.scrollX) * zoom;
    const screenY = (element.y + appState.scrollY) * zoom;
    const screenWidth = element.width * zoom;
    const screenHeight = element.height * zoom;

    // 查找对应的文字标签元素（在矩形框上方）
    if (currentSlide.labelElementId) {
      const labelElement = elements.find(
        (el) => el.id === currentSlide.labelElementId,
      );
      if (labelElement && !labelElement.isDeleted) {
        // 计算文字标签的屏幕位置
        const labelScreenY = (labelElement.y + appState.scrollY) * zoom;
        const labelHeight = labelElement.height * zoom;

        // 如果文字标签在矩形框上方，调整录制区域
        if (labelScreenY + labelHeight < screenY) {
          // 从文字标签底部开始录制
          const adjustedY = labelScreenY + labelHeight;
          const adjustedHeight = screenY + screenHeight - adjustedY;

          return {
            x: screenX,
            y: adjustedY,
            width: screenWidth,
            height: adjustedHeight,
          };
        }
      }
    }

    return {
      x: screenX,
      y: screenY,
      width: screenWidth,
      height: screenHeight,
    };
  }, [currentSlide, excalidrawAPI]);

  // 更新录制区域
  useEffect(() => {
    const updateArea = () => {
      const area = calculateRecordingArea();
      setRecordingArea(area);
    };

    updateArea();

    // 监听滚动和缩放变化
    const unsubscribe = excalidrawAPI.onChange(updateArea);

    return () => {
      unsubscribe();
    };
  }, [calculateRecordingArea, excalidrawAPI]);

  // 滚动到当前幻灯片
  const scrollToSlide = useCallback(
    (index: number) => {
      if (!excalidrawAPI || index < 0 || index >= slides.length) {
        return;
      }

      const slide = slides[index];
      const elements = excalidrawAPI.getSceneElements();
      const element = elements.find((el) => el.id === slide.elementId);

      if (element) {
        excalidrawAPI.scrollToContent(element, {
          animate: true,
          fitToContent: true,
          viewportZoomFactor: 0.95,
        });
      }
    },
    [excalidrawAPI, slides],
  );

  // 执行幻灯片切换（带录制淡出淡入效果，不暂停录制）
  const switchToSlide = useCallback(
    async (newIndex: number) => {
      if (
        newIndex === currentIndex ||
        newIndex < 0 ||
        newIndex >= slides.length ||
        isSwitching
      ) {
        return;
      }

      setIsSwitching(true);

      // 第一步：开始淡出（200ms）
      if (isRecording && startFadeOut) {
        startFadeOut();
      }

      // 等待淡出到一半时开始切换
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 切换幻灯片（录制继续）
      setCurrentIndex(newIndex);
      scrollToSlide(newIndex);

      // 等待滚动动画和淡出完成
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 第二步：开始淡入（200ms）
      if (isRecording && startFadeIn) {
        startFadeIn();
      }

      // 等待淡入完成
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 清除淡出状态
      if (clearFade) {
        clearFade();
      }

      setIsSwitching(false);
    },
    [
      currentIndex,
      slides.length,
      isSwitching,
      isRecording,
      scrollToSlide,
      startFadeOut,
      startFadeIn,
      clearFade,
    ],
  );

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSwitching) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          switchToSlide(currentIndex - 1);
          break;
        case "ArrowRight":
        case " ":
          e.preventDefault();
          switchToSlide(currentIndex + 1);
          break;
        case "Escape":
          e.preventDefault();
          stopRecording();
          onExit();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, isSwitching, switchToSlide, stopRecording, onExit]);

  // 隐藏幻灯片边框和文字标签
  const hideSlideElements = useCallback(() => {
    if (!excalidrawAPI) {
      return;
    }

    const elements = excalidrawAPI.getSceneElements();
    const elementsToHide: string[] = [];

    slides.forEach((slide) => {
      // 隐藏矩形边框
      const rectElement = elements.find((el) => el.id === slide.elementId);
      if (rectElement) {
        elementsToHide.push(rectElement.id);
      }
      // 隐藏文字标签
      if (slide.labelElementId) {
        const labelElement = elements.find(
          (el) => el.id === slide.labelElementId,
        );
        if (labelElement) {
          elementsToHide.push(labelElement.id);
        }
      }
    });

    // 保存当前状态以便恢复
    const originalElements = elements.map((el) => ({
      id: el.id,
      opacity: (el as any).opacity ?? 100,
    }));

    // 隐藏元素（设置透明度为0）
    const updatedElements = elements.map((el) => {
      if (elementsToHide.includes(el.id)) {
        return { ...el, opacity: 0 };
      }
      return el;
    });

    excalidrawAPI.updateScene({ elements: updatedElements });

    return originalElements;
  }, [excalidrawAPI, slides]);

  // 恢复幻灯片边框和文字标签
  const restoreSlideElements = useCallback(
    (originalElements: { id: string; opacity: number }[]) => {
      if (!excalidrawAPI) {
        return;
      }

      const elements = excalidrawAPI.getSceneElements();
      const updatedElements = elements.map((el) => {
        const original = originalElements.find((o) => o.id === el.id);
        if (original) {
          return { ...el, opacity: original.opacity };
        }
        return el;
      });

      excalidrawAPI.updateScene({ elements: updatedElements });
    },
    [excalidrawAPI],
  );

  // 初始滚动到第一张幻灯片，并隐藏幻灯片元素
  useEffect(() => {
    scrollToSlide(0);

    // 隐藏幻灯片边框和文字标签
    const originalElements = hideSlideElements();

    // 3秒后隐藏提示
    hintTimeoutRef.current = setTimeout(() => {
      setShowHint(false);
    }, 3000);

    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
      // 恢复幻灯片边框和文字标签
      if (originalElements) {
        restoreSlideElements(originalElements);
      }
    };
  }, [scrollToSlide, hideSlideElements, restoreSlideElements]);

  // 清理定时器
  useEffect(() => {
    const timeoutRef = switchingTimeoutRef.current;
    return () => {
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
    };
  }, []);

  const handleStop = () => {
    stopRecording();
    onExit();
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  return (
    <div className="slideshow-record-mode">
      {/* 录制区域高亮框 */}
      {recordingArea && (
        <div
          className="slideshow-recording-frame"
          style={{
            left: recordingArea.x,
            top: recordingArea.y,
            width: recordingArea.width,
            height: recordingArea.height,
          }}
        >
          <div className="recording-label">REC</div>
        </div>
      )}

      {/* 幻灯片导航提示 */}
      {showHint && (
        <div className="slideshow-hint">
          <div className="hint-content">
            <p>← → 或空格键切换幻灯片</p>
            <p>ESC 停止录制</p>
          </div>
        </div>
      )}

      {/* 幻灯片进度指示器 */}
      <div className="slideshow-progress">
        <div className="progress-dots">
          {slides.map((_, index) => (
            <div
              key={index}
              className={clsx("progress-dot", {
                active: index === currentIndex,
                passed: index < currentIndex,
              })}
              onClick={() => switchToSlide(index)}
            />
          ))}
        </div>
        <div className="progress-text">
          {currentIndex + 1} / {slides.length}
        </div>
      </div>

      {/* 录制控制栏 */}
      <div className="slideshow-control-bar">
        <div className="control-section timer-section">
          <div
            className={clsx("recording-indicator", {
              paused: isPaused,
            })}
          />
          <span className="timer">{formatTime(recordingTime)}</span>
        </div>

        <div className="control-section buttons-section">
          <button
            className="control-btn"
            onClick={handlePauseToggle}
            title={isPaused ? "继续录制" : "暂停录制"}
          >
            {isPaused ? PlayIcon : PauseIcon}
          </button>

          <button
            className="control-btn stop-btn"
            onClick={handleStop}
            title="停止录制"
          >
            {StopIcon}
          </button>
        </div>

        <div className="control-section info-section">
          <span className="slide-info">
            幻灯片 {currentIndex + 1}/{slides.length}
          </span>
        </div>
      </div>
    </div>
  );
};
