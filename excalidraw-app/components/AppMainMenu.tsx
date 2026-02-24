import { useState, useEffect } from "react";
import { eyeIcon } from "@excalidraw/excalidraw/components/icons";
import { MainMenu } from "@excalidraw/excalidraw/index";
import { useApp } from "@excalidraw/excalidraw/components/App";
import React from "react";

import { isDevEnv } from "@excalidraw/common";

import type { Theme } from "@excalidraw/element/types";

import { LanguageList } from "../app-language/LanguageList";

import { hasAIConfig } from "../data/AIConfigStorage";

import { saveDebugState } from "./DebugCanvas";

export const AppMainMenu: React.FC<{
  onCollabDialogOpen: () => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  refresh: () => void;
}> = React.memo((props) => {
  const app = useApp();
  const [aiConfigured, setAiConfigured] = useState(hasAIConfig());

  useEffect(() => {
    const handleStorageChange = () => {
      setAiConfigured(hasAIConfig());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleOpenAISettings = () => {
    app.setOpenDialog({ name: "ttd", tab: "ai-settings" });
  };

  return (
    <>
      <MainMenu>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.SaveToActiveFile />
        <MainMenu.DefaultItems.Export />
        <MainMenu.DefaultItems.SaveAsImage />
        {/* Live Collaboration Trigger removed */}
        {/* Command Palette removed */}
        <MainMenu.DefaultItems.SearchMenu />
        <MainMenu.DefaultItems.Help />
        <MainMenu.DefaultItems.ClearCanvas />
        {/* AI+Draw, Socials, and Sign up removed */}
        {isDevEnv() && (
          <MainMenu.Item
            icon={eyeIcon}
            onSelect={() => {
              if (window.visualDebug) {
                delete window.visualDebug;
                saveDebugState({ enabled: false });
              } else {
                window.visualDebug = { data: [] };
                saveDebugState({ enabled: true });
              }
              props?.refresh();
            }}
          >
            Visual Debug
          </MainMenu.Item>
        )}
        <MainMenu.Separator />
        <MainMenu.Item onSelect={handleOpenAISettings}>
          AI 设置 {aiConfigured ? "✓" : ""}
        </MainMenu.Item>
        <MainMenu.DefaultItems.Preferences />
        <MainMenu.DefaultItems.ToggleTheme
          allowSystemTheme
          theme={props.theme}
          onSelect={props.setTheme}
        />
        <MainMenu.ItemCustom>
          <LanguageList style={{ width: "100%" }} />
        </MainMenu.ItemCustom>
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    </>
  );
});
