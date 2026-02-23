import React, { useState, useCallback, useRef, useEffect } from "react";
import clsx from "clsx";

import { newElement, newTextElement } from "@excalidraw/element";
import { generateKeyBetween } from "fractional-indexing";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { FractionalIndex } from "@excalidraw/element/types";

import { AddIcon } from "./Icons";
import "./SlideshowPanel.scss";

interface Slide {
  id: number;
  title: string;
  elementId: string;
  labelElementId?: string;
}

interface SlideshowPanelProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  aspectRatio: string;
  isRecording: boolean;
  isPaused: boolean;
  pauseRecording: () => void;
  resumeRecording: () => void;
  onSlideChange?: (slideElementId: string | null) => void;
}

// 根据宽高比计算尺寸
const calculateDimensions = (aspectRatio: string) => {
  const baseWidth = 800;
  const width = baseWidth;
  let height = baseWidth;

  if (aspectRatio !== "custom") {
    const [w, h] = aspectRatio.split("/").map(Number);
    if (!isNaN(w) && !isNaN(h) && h !== 0) {
      height = Math.round((baseWidth * h) / w);
    }
  }

  return { width, height };
};

// 生成 fractional index
// 使用 Excalidraw 的 fractional indexing 算法
const generateFractionalIndex = (
  prevIndex: string | null,
  nextIndex: string | null,
): FractionalIndex => {
  return generateKeyBetween(prevIndex, nextIndex) as FractionalIndex;
};

export const SlideshowPanel = ({
  excalidrawAPI,
  aspectRatio,
  isRecording,
  isPaused,
  pauseRecording,
  resumeRecording,
  onSlideChange,
}: SlideshowPanelProps) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlide, setActiveSlide] = useState<number | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const switchingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  // 存储第一个幻灯片的基准位置，用于统一排列后续幻灯片
  const basePositionRef = useRef<{ x: number; y: number } | null>(null);

  // 在画布中创建对应尺寸的矩形块和文字标签
  const createSlideElement = useCallback(
    (slideId: number, dimensions: { width: number; height: number }) => {
      if (!excalidrawAPI) {
        return null;
      }

      const appState = excalidrawAPI.getAppState();
      const { width, height } = dimensions;

      // 计算位置 - 在现有幻灯片右侧横向排列
      const existingSlides = slides.length;
      const spacing = 80;

      let x: number;
      let y: number;

      if (basePositionRef.current) {
        // 使用基准位置计算后续幻灯片位置
        x = basePositionRef.current.x + existingSlides * (width + spacing);
        y = basePositionRef.current.y;
      } else {
        // 第一个幻灯片：基于当前视口中心
        x = appState.scrollX + (appState.width - width) / 2;
        y = appState.scrollY + (appState.height - height) / 2;
        // 保存基准位置
        basePositionRef.current = { x, y };
      }

      // 获取当前元素以确定 index
      const currentElements = excalidrawAPI.getSceneElementsIncludingDeleted();
      const lastElement = currentElements[currentElements.length - 1];
      const prevIndex = lastElement?.index || null;

      // 创建矩形框
      const rectElement = newElement({
        type: "rectangle",
        x,
        y,
        width,
        height,
        strokeColor: "#1971c2",
        backgroundColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "dashed",
        fillStyle: "hachure",
        roughness: 0,
        opacity: 100,
        roundness: null,
        index: generateFractionalIndex(prevIndex, null),
      });

      // 创建文字标签 - 基于矩形框的 index 生成
      const labelElement = newTextElement({
        x: x + width / 2,
        y: y - 30,
        text: `幻灯片${slideId}`,
        fontSize: 20,
        fontFamily: 1,
        textAlign: "center",
        verticalAlign: "middle",
        strokeColor: "#495057",
      });

      // 为文字标签添加 index - 使用中间值插入到矩形框之后
      const labelWithIndex = {
        ...labelElement,
        index: generateFractionalIndex(rectElement.index, null),
      };

      // 更新场景，添加新元素
      excalidrawAPI.updateScene({
        elements: [...currentElements, rectElement, labelWithIndex],
      });

      return {
        elementId: rectElement.id,
        labelElementId: labelWithIndex.id,
      };
    },
    [excalidrawAPI, slides],
  );

  // 初始化 - 不再自动创建第一个幻灯片，保持空白状态
  useEffect(() => {
    if (!excalidrawAPI || initializedRef.current) {
      return;
    }
    initializedRef.current = true;
  }, [excalidrawAPI]);

  // 滚动到指定幻灯片
  const scrollToSlide = useCallback(
    (slideId: number, elementId: string) => {
      if (!excalidrawAPI) {
        return;
      }

      const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
      const targetElement = elements.find((el) => el.id === elementId);

      if (targetElement) {
        excalidrawAPI.scrollToContent(targetElement, { animate: true });
      }

      setActiveSlide(slideId);

      // 通知父组件当前激活的幻灯片
      if (onSlideChange) {
        onSlideChange(elementId);
      }
    },
    [excalidrawAPI, onSlideChange],
  );

  // 执行幻灯片切换（带录制暂停/恢复逻辑）
  const performSlideSwitch = useCallback(
    (slideId: number, elementId: string) => {
      scrollToSlide(slideId, elementId);

      // 如果正在录制，恢复录制
      if (isRecording && isPaused) {
        // 给一点时间让滚动动画完成
        switchingTimeoutRef.current = setTimeout(() => {
          resumeRecording();
          setIsSwitching(false);
        }, 600);
      } else {
        setIsSwitching(false);
      }
    },
    [isRecording, isPaused, resumeRecording, scrollToSlide],
  );

  // 切换到指定幻灯片
  const switchToSlide = useCallback(
    (slideId: number) => {
      if (!excalidrawAPI || slideId === activeSlide || isSwitching) {
        return;
      }

      const slide = slides.find((s) => s.id === slideId);
      if (!slide) {
        return;
      }

      setIsSwitching(true);

      // 如果正在录制，先暂停录制
      if (isRecording && !isPaused) {
        pauseRecording();

        // 等待暂停完成后再切换
        switchingTimeoutRef.current = setTimeout(() => {
          performSlideSwitch(slideId, slide.elementId);
        }, 100);
      } else {
        performSlideSwitch(slideId, slide.elementId);
      }
    },
    [
      excalidrawAPI,
      slides,
      activeSlide,
      isRecording,
      isPaused,
      isSwitching,
      pauseRecording,
      performSlideSwitch,
    ],
  );

  // 添加新幻灯片
  const addSlide = useCallback(() => {
    if (!excalidrawAPI) {
      return;
    }

    const newId =
      slides.length > 0 ? Math.max(...slides.map((s) => s.id)) + 1 : 1;

    const dimensions = calculateDimensions(aspectRatio);
    const result = createSlideElement(newId, dimensions);

    if (!result) {
      return;
    }

    const newSlide: Slide = {
      id: newId,
      title: `幻灯片 ${newId}`,
      elementId: result.elementId,
      labelElementId: result.labelElementId,
    };

    const updatedSlides = [...slides, newSlide];
    setSlides(updatedSlides);

    // 激活新创建的幻灯片
    setActiveSlide(newId);
    if (onSlideChange) {
      onSlideChange(result.elementId);
    }

    // 延迟执行聚焦，等待场景更新完成
    setTimeout(() => {
      // 只聚焦到新创建的幻灯片，保持合适的缩放比例
      const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
      const newSlideElement = elements.find((el) => el.id === result.elementId);
      const newLabelElement = elements.find(
        (el) => el.id === result.labelElementId,
      );

      if (newSlideElement) {
        // 只聚焦到新幻灯片，不自适应所有幻灯片
        const elementsToFocus = newLabelElement
          ? [newSlideElement, newLabelElement]
          : [newSlideElement];
        excalidrawAPI.scrollToContent(elementsToFocus, {
          animate: true,
          fitToContent: true,
          viewportZoomFactor: 0.75, // 缩小一些，确保文字提示不被顶部工具栏遮挡
        });
      }
    }, 100);
  }, [slides, excalidrawAPI, aspectRatio, onSlideChange, createSlideElement]);

  // 删除幻灯片
  const deleteSlide = useCallback(
    (e: React.MouseEvent, slideId: number) => {
      e.stopPropagation();

      const slide = slides.find((s) => s.id === slideId);
      if (excalidrawAPI) {
        const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
        const updatedElements = elements.map((el) => {
          if (el.id === slide?.elementId || el.id === slide?.labelElementId) {
            return { ...el, isDeleted: true };
          }
          return el;
        });
        excalidrawAPI.updateScene({ elements: updatedElements });
      }

      const newSlides = slides.filter((s) => s.id !== slideId);
      setSlides(newSlides);

      if (activeSlide === slideId) {
        const newActiveId = newSlides[0]?.id;
        if (newActiveId) {
          const newActiveSlide = newSlides.find((s) => s.id === newActiveId);
          if (newActiveSlide) {
            if (isRecording) {
              switchToSlide(newActiveId);
            } else {
              scrollToSlide(newActiveId, newActiveSlide.elementId);
            }
          }
        } else {
          // 所有幻灯片都被删除了
          setActiveSlide(null);
          if (onSlideChange) {
            onSlideChange(null);
          }
          // 重置基准位置，下次创建时重新计算
          basePositionRef.current = null;
        }
      }
    },
    [
      slides,
      activeSlide,
      excalidrawAPI,
      isRecording,
      switchToSlide,
      scrollToSlide,
      onSlideChange,
    ],
  );

  // 监听画布元素变化，同步删除状态
  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    const checkDeletedSlides = () => {
      const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
      const deletedSlideIds: number[] = [];

      slides.forEach((slide) => {
        const rectElement = elements.find((el) => el.id === slide.elementId);

        // 如果矩形框被删除，则认为该幻灯片被删除
        if (rectElement?.isDeleted) {
          deletedSlideIds.push(slide.id);
        }
      });

      if (deletedSlideIds.length > 0) {
        const newSlides = slides.filter((s) => !deletedSlideIds.includes(s.id));
        setSlides(newSlides);

        // 如果当前激活的幻灯片被删除了，切换到第一个
        if (activeSlide && deletedSlideIds.includes(activeSlide)) {
          if (newSlides.length > 0) {
            setActiveSlide(newSlides[0].id);
            if (onSlideChange) {
              onSlideChange(newSlides[0].elementId);
            }
          } else {
            setActiveSlide(null);
            if (onSlideChange) {
              onSlideChange(null);
            }
            // 重置基准位置，下次创建时重新计算
            basePositionRef.current = null;
          }
        }
      }
    };

    // 定期检查删除状态（每500ms检查一次）
    const intervalId = setInterval(checkDeletedSlides, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [excalidrawAPI, slides, activeSlide, onSlideChange]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={clsx("slideshow-panel", { switching: isSwitching })}>
      <div className="slideshow-header">幻灯片</div>
      <div className="slides-container">
        {slides.map((slide) => (
          <div
            key={slide.id}
            className={clsx("slide-item", {
              active: activeSlide === slide.id,
            })}
            onClick={() => switchToSlide(slide.id)}
            title={slide.title}
          >
            <span className="slide-number">{slide.id}</span>
            <button
              className="delete-slide-btn"
              onClick={(e) => deleteSlide(e, slide.id)}
              title="删除幻灯片"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="add-slide-btn" onClick={addSlide} title="新增幻灯片">
        {AddIcon}
      </button>
    </div>
  );
};
