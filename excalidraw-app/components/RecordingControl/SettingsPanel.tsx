import React, { useState } from "react";
import clsx from "clsx";

import {
  CloseIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  VideoIcon,
  CameraIcon,
  PaletteIcon,
  MousePointerIcon,
} from "./Icons";
import "./SettingsPanel.scss";

type VideoFormat = "webm" | "mp4" | "mov";

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
  recordingMode: "screen" | "canvas";
  setRecordingMode: (mode: "screen" | "canvas") => void;
  videoFormat: VideoFormat;
  setVideoFormat: (format: VideoFormat) => void;
  countdown: number;
  setCountdown: (count: number) => void;
}

const ASPECT_RATIOS = [
  { label: "16:9", desc: "YouTube", value: "16/9" },
  { label: "4:3", desc: "经典", value: "4/3" },
  { label: "3:4", desc: "小红书", value: "3/4" },
  { label: "9:16", desc: "抖音", value: "9/16" },
  { label: "1:1", desc: "正方形", value: "1/1" },
  { label: "习俗", desc: "自定义", value: "custom" },
];

const VIDEO_FORMATS = [
  { label: "WebM", desc: "推荐，兼容性最好", value: "webm" },
  { label: "MP4", desc: "通用格式", value: "mp4" },
  { label: "MOV", desc: "Apple格式", value: "mov" },
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
  "#e03131",
  "#fd7e14",
  "#fcc419",
  "#2f9e44",
  "#228be6",
  "#7950f2",
  "#e64980",
];

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection = ({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) => {
  return (
    <div className={clsx("collapsible-section", { open: isOpen })}>
      <button className="section-header" onClick={onToggle}>
        <div className="section-title">
          <span className="section-icon">{icon}</span>
          <span>{title}</span>
        </div>
        <span className="section-toggle">
          {isOpen ? ChevronUpIcon : ChevronDownIcon}
        </span>
      </button>
      {isOpen && <div className="section-content">{children}</div>}
    </div>
  );
};

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
  recordingMode,
  setRecordingMode,
  videoFormat,
  setVideoFormat,
  countdown,
  setCountdown,
}: SettingsPanelProps) => {
  const [bgFilter, setBgFilter] = useState("all");
  const [openSections, setOpenSections] = useState<string[]>([
    "recording",
    "appearance",
  ]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

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
                  borderRadius: `${borderRadius / 4}px`,
                  margin: `${padding / 4}px`,
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
            {/* 录制设置 */}
            <CollapsibleSection
              title="录制设置"
              icon={VideoIcon}
              isOpen={openSections.includes("recording")}
              onToggle={() => toggleSection("recording")}
            >
              <div className="control-group">
                <label>录制模式</label>
                <div className="switch-row">
                  <div className="mode-toggle">
                    <button
                      className={clsx("mode-btn", {
                        active: recordingMode === "screen",
                      })}
                      onClick={() => setRecordingMode("screen")}
                    >
                      屏幕录制
                    </button>
                    <button
                      className={clsx("mode-btn", {
                        active: recordingMode === "canvas",
                      })}
                      onClick={() => setRecordingMode("canvas")}
                    >
                      画布录制
                    </button>
                  </div>
                </div>
                <p className="control-hint">
                  {recordingMode === "screen"
                    ? "需要选择录制区域，支持录制整个浏览器窗口。"
                    : "直接录制画布区域，无需选择，体验更流畅。"}
                </p>
              </div>

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
                <label>视频格式</label>
                <div className="format-grid">
                  {VIDEO_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      className={clsx("format-btn", {
                        active: videoFormat === format.value,
                      })}
                      onClick={() =>
                        setVideoFormat(format.value as VideoFormat)
                      }
                    >
                      <span className="format-val">{format.label}</span>
                      <span className="format-desc">{format.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-group">
                <div className="label-row">
                  <label>倒计时</label>
                  <span className="label-hint right">{countdown} 秒</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={countdown}
                  onChange={(e) => setCountdown(parseInt(e.target.value))}
                  className="styled-slider"
                />
                <p className="control-hint">录制开始前的倒计时，方便做准备</p>
              </div>
            </CollapsibleSection>

            {/* 外观样式 */}
            <CollapsibleSection
              title="外观样式"
              icon={PaletteIcon}
              isOpen={openSections.includes("appearance")}
              onToggle={() => toggleSection("appearance")}
            >
              <div className="control-group">
                <label>背景</label>
                <div className="bg-categories">
                  {BG_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      className={clsx("cat-btn", {
                        active: bgFilter === cat.id,
                      })}
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
                  <label>圆角半径: {borderRadius}px</label>
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
                <div className="label-row">
                  <label>画布边距: {padding}px</label>
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
            </CollapsibleSection>

            {/* 摄像头设置 */}
            <CollapsibleSection
              title="摄像头"
              icon={CameraIcon}
              isOpen={openSections.includes("camera")}
              onToggle={() => toggleSection("camera")}
            >
              <div className="control-group">
                <div className="switch-row">
                  <label>启用摄像头</label>
                  <div className="switch-container">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={showCamera}
                        onChange={(e) => setShowCamera(e.target.checked)}
                      />
                      <span className="slider round"></span>
                    </label>
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
            </CollapsibleSection>

            {/* 光标设置 */}
            <CollapsibleSection
              title="光标"
              icon={MousePointerIcon}
              isOpen={openSections.includes("cursor")}
              onToggle={() => toggleSection("cursor")}
            >
              <div className="control-group">
                <div className="switch-row">
                  <label>显示光标</label>
                  <div className="switch-container">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={showCursor}
                        onChange={(e) => setShowCursor(e.target.checked)}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>

              {showCursor && (
                <div className="control-group">
                  <label>光标颜色</label>
                  <div className="color-picker-row">
                    <div className="color-swatches">
                      {CURSOR_COLORS.map((color) => (
                        <button
                          key={color}
                          className={clsx("color-swatch", {
                            active: cursorColor === color,
                          })}
                          style={{ backgroundColor: color }}
                          onClick={() => setCursorColor(color)}
                        >
                          {cursorColor === color && (
                            <div className="swatch-check"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleSection>

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
