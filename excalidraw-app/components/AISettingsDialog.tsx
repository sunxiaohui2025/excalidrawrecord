import React, { useState, useEffect } from "react";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";

import {
  getAIConfigFromLocalStorage,
  saveAIConfigToLocalStorage,
  clearAIConfigFromLocalStorage,
  type AIConfig,
} from "../data/AIConfigStorage";

import "./AISettingsDialog.scss";

interface AISettingsDialogProps {
  onClose: () => void;
}

export const AISettingsDialog: React.FC<AISettingsDialogProps> = ({
  onClose,
}) => {
  const [config, setConfig] = useState<AIConfig>({
    apiKey: "",
    baseUrl: "",
    visionModel: "",
    textModel: "",
  });
  const [saved, setSaved] = useState(false);
  const [hasEnvConfig, setHasEnvConfig] = useState(false);

  useEffect(() => {
    const stored = getAIConfigFromLocalStorage();
    if (stored) {
      setConfig(stored);
    } else {
      setConfig({
        apiKey: import.meta.env.VITE_APP_AI_API_KEY || "",
        baseUrl:
          import.meta.env.VITE_APP_AI_BASE_URL ||
          "https://api.siliconflow.cn/v1",
        visionModel:
          import.meta.env.VITE_APP_AI_VISION_MODEL ||
          "Qwen/Qwen3-VL-32B-Instruct",
        textModel: import.meta.env.VITE_APP_AI_TEXT_MODEL || "Qwen/Qwen3-8B",
      });
      setHasEnvConfig(!!import.meta.env.VITE_APP_AI_API_KEY);
    }
  }, []);

  const handleSave = () => {
    saveAIConfigToLocalStorage(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    clearAIConfigFromLocalStorage();
    setConfig({
      apiKey: "",
      baseUrl: "",
      visionModel: "",
      textModel: "",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Dialog
      title="AI 设置"
      onCloseRequest={onClose}
      className="ai-settings-dialog"
    >
      <div className="ai-settings-content">
        <div className="ai-settings-section">
          <p className="ai-settings-description">
            配置您的 AI API 设置。配置后，AI 功能将使用您的 API Key。
          </p>

          {hasEnvConfig && (
            <div className="ai-settings-info">当前环境已配置默认 AI 服务</div>
          )}

          <div className="ai-settings-field">
            <label>API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sk-..."
            />
            <a
              href="https://cloud.siliconflow.cn/i/WFoChvZf"
              target="_blank"
              rel="noopener noreferrer"
              className="ai-settings-get-key-btn"
            >
              获取 API Key
            </a>
          </div>

          <div className="ai-settings-field">
            <label>Base URL</label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) =>
                setConfig({ ...config, baseUrl: e.target.value })
              }
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div className="ai-settings-field">
            <label>Vision Model (图片生成代码)</label>
            <input
              type="text"
              value={config.visionModel}
              onChange={(e) =>
                setConfig({ ...config, visionModel: e.target.value })
              }
              placeholder="gpt-4o"
            />
          </div>

          <div className="ai-settings-field">
            <label>Text Model (Mermaid 图表)</label>
            <input
              type="text"
              value={config.textModel}
              onChange={(e) =>
                setConfig({ ...config, textModel: e.target.value })
              }
              placeholder="gpt-4o-mini"
            />
          </div>
        </div>

        <div className="ai-settings-actions">
          <button
            className="ai-settings-btn primary"
            onClick={handleSave}
            disabled={!config.apiKey || !config.baseUrl}
          >
            {saved ? "已保存 ✓" : "保存配置"}
          </button>
          <button className="ai-settings-btn secondary" onClick={handleClear}>
            清除配置
          </button>
        </div>
      </div>
    </Dialog>
  );
};
