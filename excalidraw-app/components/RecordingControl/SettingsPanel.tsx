import React, { useState } from "react";
import clsx from "clsx";

import { CloseIcon, CheckIcon } from "./Icons";
import "./SettingsPanel.scss";

interface SettingsPanelProps {
  onClose: () => void;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  background: string;
  setBackground: (bg: string) => void;
  borderRadius: number;
  setBorderRadius: (radius: number) => void;
  padding: number;
  setPadding: (padding: number) => void;
  showCamera: boolean;
  setShowCamera: (show: boolean) => void;
  showCursor: boolean;
  setShowCursor: (show: boolean) => void;
  cursorColor: string;
  setCursorColor: (color: string) => void;
  cameraPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  setCameraPosition: (
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right",
  ) => void;
  cameraSize: number;
  setCameraSize: (size: number) => void;
}

const ASPECT_RATIOS = [
  { label: "16:9", desc: "YouTube", value: "16/9" },
  { label: "4:3", desc: "经典", value: "4/3" },
  { label: "3:4", desc: "小红书", value: "3/4" },
  { label: "9:16", desc: "抖音", value: "9/16" },
  { label: "1:1", desc: "正方形", value: "1/1" },
  { label: "习俗", desc: "自定义", value: "custom" },
];

const BG_CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "vibrant", label: "鲜艳" },
  { id: "soft", label: "柔和" },
  { id: "dark", label: "深色" },
  { id: "nature", label: "自然" },
];

const BACKGROUNDS = [
  {
    id: "bg-1",
    category: "vibrant",
    type: "gradient",
    value: "linear-gradient(135deg, #fce38a 0%, #f38181 100%)",
  },
  {
    id: "bg-2",
    category: "soft",
    type: "gradient",
    value: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  },
  {
    id: "bg-3",
    category: "vibrant",
    type: "gradient",
    value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    id: "bg-4",
    category: "vibrant",
    type: "gradient",
    value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    id: "bg-5",
    category: "nature",
    type: "gradient",
    value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
  {
    id: "bg-6",
    category: "soft",
    type: "gradient",
    value: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
  },
  {
    id: "bg-7",
    category: "soft",
    type: "gradient",
    value: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  },
  {
    id: "bg-8",
    category: "soft",
    type: "gradient",
    value: "linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)",
  },
  {
    id: "bg-9",
    category: "dark",
    type: "gradient",
    value: "linear-gradient(135deg, #232526 0%, #414345 100%)",
  },
  {
    id: "bg-10",
    category: "dark",
    type: "gradient",
    value: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  },
  {
    id: "bg-11",
    category: "nature",
    type: "gradient",
    value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  },
  {
    id: "bg-12",
    category: "nature",
    type: "gradient",
    value: "linear-gradient(135deg, #00b09b 0%, #96c93d 100%)",
  },
];

const CURSOR_COLORS = [
  "#e03131", // red
  "#fd7e14", // orange
  "#fcc419", // yellow
  "#2f9e44", // green
  "#228be6", // blue
  "#7950f2", // violet
  "#e64980", // pink
];

export const SettingsPanel = ({
  onClose,
  aspectRatio,
  setAspectRatio,
  background,
  setBackground,
  borderRadius,
  setBorderRadius,
  padding,
  setPadding,
  showCamera,
  setShowCamera,
  showCursor,
  setShowCursor,
  cursorColor,
  setCursorColor,
  cameraPosition,
  setCameraPosition,
  cameraSize,
  setCameraSize,
}: SettingsPanelProps) => {
  const [bgFilter, setBgFilter] = useState("all");

  const getPreviewClass = (ratio: string) => {
    switch (ratio) {
      case "16/9":
        return "ratio-16-9";
      case "4/3":
        return "ratio-4-3";
      case "3/4":
        return "ratio-3-4";
      case "9/16":
        return "ratio-9-16";
      case "1/1":
        return "ratio-1-1";
      default:
        return "ratio-16-9";
    }
  };

  const filteredBackgrounds = BACKGROUNDS.filter(
    (bg) => bgFilter === "all" || bg.category === bgFilter,
  );

  const handleRandomBackground = () => {
    const randomIndex = Math.floor(Math.random() * BACKGROUNDS.length);
    setBackground(BACKGROUNDS[randomIndex].value);
  };

  return (
    <div
      className="settings-panel-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="settings-panel-container">
        <div className="preview-section">
          <div className="preview-label">预览</div>
          <div className="preview-viewport">
            <div
              className={clsx("preview-box", getPreviewClass(aspectRatio))}
              style={{ background }}
            >
              <div
                className="preview-content-skeleton"
                style={{
                  borderRadius: `${borderRadius / 4}px`, // Scale down for preview
                  margin: `${padding / 4}px`, // Scale down for preview
                }}
              >
                <div className="skeleton-line title"></div>
                <div className="skeleton-circle"></div>
                <div className="skeleton-line text"></div>
                <div className="skeleton-line text short"></div>
              </div>
              <div
                className="preview-cursor"
                style={{
                  backgroundColor: `${cursorColor}33`,
                  borderColor: cursorColor,
                }}
              >
                <div
                  className="cursor-dot"
                  style={{ backgroundColor: cursorColor }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="controls-section">
          <div className="controls-header">
            <h2>录制设置</h2>
            <button className="close-btn" onClick={onClose}>
              {CloseIcon}
            </button>
          </div>

          <div className="controls-content">
            <div className="control-group">
              <label>画面比例</label>
              <div className="ratio-grid">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    className={clsx("ratio-btn", {
                      active: aspectRatio === ratio.value,
                    })}
                    onClick={() => setAspectRatio(ratio.value)}
                  >
                    <span className="ratio-val">{ratio.label}</span>
                    <span className="ratio-desc">{ratio.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>背景</label>
              <div className="bg-categories">
                {BG_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    className={clsx("cat-btn", { active: bgFilter === cat.id })}
                    onClick={() => setBgFilter(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <button
                className="random-bg-btn"
                onClick={handleRandomBackground}
              >
                ✨ 随机选择壁纸
              </button>

              <div className="bg-grid">
                {filteredBackgrounds.map((bg) => (
                  <button
                    key={bg.id}
                    className={clsx("bg-btn", {
                      active: background === bg.value,
                    })}
                    style={{ background: bg.value }}
                    onClick={() => setBackground(bg.value)}
                  >
                    {background === bg.value && (
                      <div className="checked-overlay">{CheckIcon}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <div className="label-row">
                <label>圆角半径: {borderRadius}PX</label>
                <span className="label-hint right">圆角</span>
              </div>
              <input
                type="range"
                min="0"
                max="64"
                value={borderRadius}
                onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                className="styled-slider"
              />
            </div>

            <div className="control-group">
              <div className="switch-row">
                <label>摄像头</label>
                <div className="switch-container">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showCamera}
                      onChange={(e) => setShowCamera(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span className="switch-label">录制时显示摄像头画面</span>
                </div>
              </div>
            </div>

            {showCamera && (
              <>
                <div className="control-group">
                  <label>摄像头位置</label>
                  <div className="position-grid">
                    {[
                      { id: "top-left", label: "左上", icon: "↖" },
                      { id: "top-right", label: "右上", icon: "↗" },
                      { id: "bottom-left", label: "左下", icon: "↙" },
                      { id: "bottom-right", label: "右下", icon: "↘" },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        className={clsx("pos-btn", {
                          active: cameraPosition === pos.id,
                        })}
                        onClick={() => setCameraPosition(pos.id as any)}
                        title={pos.label}
                      >
                        {pos.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <div className="label-row">
                    <label>摄像头大小: {cameraSize}px</label>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="400"
                    step="10"
                    value={cameraSize}
                    onChange={(e) => setCameraSize(Number(e.target.value))}
                    className="styled-slider"
                  />
                </div>
              </>
            )}

            <div className="control-group">
              <div className="label-row">
                <label>画布边距: {padding}PX</label>
                <span className="label-hint right">大</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={padding}
                onChange={(e) => setPadding(parseInt(e.target.value))}
                className="styled-slider"
              />
            </div>

            <div className="control-group">
              <label>鼠标光标颜色</label>
              <div className="color-picker-row">
                <div className="color-swatches">
                  {CURSOR_COLORS.map((color) => (
                    <button
                      key={color}
                      className={clsx("color-swatch", {
                        active: cursorColor === color,
                      })}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setCursorColor(color);
                        if (!showCursor) {
                          setShowCursor(true);
                        }
                      }}
                    >
                      {cursorColor === color && (
                        <div className="swatch-check"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="control-group account-section">
              <label>账户</label>
              <button className="pro-btn">⭐ 去除水印 — $20 一次性付款</button>
            </div>

            <div className="footer-actions">
              <button className="done-btn" onClick={onClose}>
                完成
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
