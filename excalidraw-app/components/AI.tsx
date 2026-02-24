import {
  DiagramToCodePlugin,
  exportToBlob,
  getTextFromElements,
  MIME_TYPES,
  TTDDialog,
  TTDStreamFetch,
} from "@excalidraw/excalidraw";
import { getDataURL } from "@excalidraw/excalidraw/data/blob";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { TTDIndexedDBAdapter } from "../data/TTDStorage";

export const AIComponents = ({
  excalidrawAPI,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
}) => {
  return (
    <>
      <DiagramToCodePlugin
        generate={async ({ frame, children }) => {
          const appState = excalidrawAPI.getAppState();

          const blob = await exportToBlob({
            elements: children,
            appState: {
              ...appState,
              exportBackground: true,
              viewBackgroundColor: appState.viewBackgroundColor,
            },
            exportingFrame: frame,
            files: excalidrawAPI.getFiles(),
            mimeType: MIME_TYPES.jpg,
          });

          const dataURL = await getDataURL(blob);

          const textFromFrameChildren = getTextFromElements(children);

          const apiKey = import.meta.env.VITE_APP_AI_API_KEY;
          const baseUrl = import.meta.env.VITE_APP_AI_BASE_URL;
          const visionModel = import.meta.env.VITE_APP_AI_VISION_MODEL;

          if (!apiKey || !baseUrl || !visionModel) {
            throw new Error(
              "AI configuration missing. Please check .env file.",
            );
          }

          const systemPrompt = `你是一位精通 HTML 和 CSS 的 Web 开发专家。
你的任务是将提供的线框图转换为使用 Tailwind CSS 的单个 HTML 文件。
仅返回 HTML 代码。不要包含任何解释。
如果返回 Markdown，请将 HTML 包裹在 \`\`\`html 代码块中。`;

          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: visionModel,
              messages: [
                {
                  role: "system",
                  content: systemPrompt,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Turn this wireframe into a HTML web page. The text content from the wireframe is: ${textFromFrameChildren}`,
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: dataURL,
                      },
                    },
                  ],
                },
              ],
              temperature: 0.3,
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Generation failed");
          }

          try {
            const json = await response.json();
            let html = json.choices?.[0]?.message?.content || "";

            // Extract HTML from markdown code blocks if present
            const match = html.match(/```html\n([\s\S]*?)\n```/);
            if (match) {
              html = match[1];
            } else {
              // Cleanup generic markdown wrappers if specific html tag missing
              html = html.replace(/^```\w*\n/, "").replace(/\n```$/, "");
            }

            if (!html) {
              throw new Error("Generation failed (empty response)");
            }
            return {
              html,
            };
          } catch {
            throw new Error("Generation failed (invalid response)");
          }
        }}
      />

      <TTDDialog
        onTextSubmit={async (props) => {
          const { onChunk, onStreamCreated, signal, messages } = props;

          const apiKey = import.meta.env.VITE_APP_AI_API_KEY;
          const baseUrl = import.meta.env.VITE_APP_AI_BASE_URL;
          const textModel = import.meta.env.VITE_APP_AI_TEXT_MODEL;

          if (!apiKey || !baseUrl || !textModel) {
            throw new Error("AI configuration missing");
          }

          const systemPrompt: {
            role: "system";
            content: string;
          } = {
            role: "system",
            content: `你是一个专业的Mermaid图表生成助手。
你的任务是根据用户的自然语言描述生成Mermaid图表代码。
严格遵守以下规则：
1. 仅返回 Mermaid 代码，不要包含任何解释、前言或结束语。
2. 不要使用 markdown 代码块包裹 (例如 \`\`\`mermaid ... \`\`\`)，直接返回纯代码。
3. 如果用户描述不清楚，请尝试生成最合理的图表。
4. 支持的图表类型：流程图(flowchart)、时序图(sequence)、类图(class)、状态图(state)、实体关系图(erDiagram)、用户旅程图(journey)、甘特图(gantt)、饼图(pie)、象限图(quadrant)、需求图(requirement)、Git图(gitGraph)、C4架构图(C4Context)、思维导图(mindmap)、时间线(timeline)。
5. 流程图必须使用 "flowchart" 关键字，并使用标准语法：
   - 方向声明使用 "flowchart TD" (Top-Down) 或 "flowchart LR" (Left-Right)
   - 节点定义：A[文本] 表示矩形，B{文本} 表示菱形，C(文本) 表示圆角矩形，D((文本)) 表示圆形
   - 箭头语法：使用 --> 表示箭头，使用 -->|标签| 表示带标签的箭头
   - 不要使用 -- 文本 --> 语法，应该使用 -->|文本|
   - 确保每个节点都有明确定义的形状符号（[] () {} 或 (( )))

示例输出（用户要求登录流程图）：
flowchart TD
    A[输入用户名] --> B[输入密码]
    B --> C{验证信息}
    C -->|成功| D[进入主页]
    C -->|失败| E[显示错误]
    E --> B
    D --> F((结束))`,
          };

          const newMessages = [systemPrompt, ...messages];

          const result = await TTDStreamFetch({
            url: `${baseUrl}/chat/completions`,
            messages: newMessages,
            onChunk,
            onStreamCreated,
            extractRateLimits: false,
            signal,
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            model: textModel,
          });

          return result;
        }}
        persistenceAdapter={TTDIndexedDBAdapter}
      />
    </>
  );
};
