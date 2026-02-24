export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  visionModel: string;
  textModel: string;
}

const STORAGE_KEY = "excalidraw-ai-config";

export const getAIConfigFromLocalStorage = (): AIConfig | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to get AI config from localStorage:", error);
  }
  return null;
};

export const saveAIConfigToLocalStorage = (config: AIConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save AI config to localStorage:", error);
  }
};

export const clearAIConfigFromLocalStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear AI config from localStorage:", error);
  }
};

export const getAIConfig = (): AIConfig | null => {
  const userConfig = getAIConfigFromLocalStorage();
  if (userConfig && userConfig.apiKey && userConfig.baseUrl) {
    return userConfig;
  }

  const envConfig: AIConfig = {
    apiKey: import.meta.env.VITE_APP_AI_API_KEY || "",
    baseUrl: import.meta.env.VITE_APP_AI_BASE_URL || "",
    visionModel: import.meta.env.VITE_APP_AI_VISION_MODEL || "",
    textModel: import.meta.env.VITE_APP_AI_TEXT_MODEL || "",
  };

  if (envConfig.apiKey && envConfig.baseUrl) {
    return envConfig;
  }

  return null;
};

export const hasAIConfig = (): boolean => {
  const config = getAIConfig();
  return !!(config && config.apiKey && config.baseUrl);
};
