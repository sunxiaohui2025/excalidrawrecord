import { useRef } from "react";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { isFiniteNumber } from "@excalidraw/math";

import { useAtom } from "../../../editor-jotai";

import { trackEvent } from "../../../analytics";
import { t } from "../../../i18n";

import { errorAtom, rateLimitsAtom, chatHistoryAtom } from "../TTDContext";
import { useChatAgent } from "../Chat";

import {
  addMessages,
  getLastAssistantMessage,
  getMessagesForLLM,
  removeLastAssistantMessage,
  updateAssistantContent,
} from "../utils/chat";

import type { LLMMessage, TTTDDialog } from "../types";

const MIN_PROMPT_LENGTH = 3;
const MAX_PROMPT_LENGTH = 10000;

const cleanMermaidResponse = (response: string): string => {
  let cleaned = response.trim();

  // Remove markdown code blocks if present
  const mermaidMatch = cleaned.match(/```mermaid\n?([\s\S]*?)\n?```/);
  if (mermaidMatch) {
    cleaned = mermaidMatch[1];
  } else {
    // Try generic code block
    const genericMatch = cleaned.match(/```\w*\n?([\s\S]*?)\n?```/);
    if (genericMatch) {
      cleaned = genericMatch[1];
    } else {
      // Remove code block markers at start/end
      cleaned = cleaned.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
    }
  }

  // Convert Chinese punctuation to English punctuation
  cleaned = cleaned
    .replace(/[（]/g, "(") // Chinese left parenthesis
    .replace(/[）]/g, ")") // Chinese right parenthesis
    .replace(/[【]/g, "[") // Chinese left bracket
    .replace(/[】]/g, "]") // Chinese right bracket
    .replace(/[｛]/g, "{") // Chinese left brace
    .replace(/[｝]/g, "}") // Chinese right brace
    .replace(/[：]/g, ":") // Chinese colon
    .replace(/[；]/g, ";") // Chinese semicolon
    .replace(/[，]/g, ",") // Chinese comma
    .replace(/[。]/g, "."); // Chinese period

  return cleaned.trim();
};

export const useTextGeneration = ({
  onTextSubmit,
}: {
  onTextSubmit: (
    props: TTTDDialog.OnTextSubmitProps,
  ) => Promise<TTTDDialog.OnTextSubmitRetValue>;
}) => {
  const [, setError] = useAtom(errorAtom);
  const [rateLimits, setRateLimits] = useAtom(rateLimitsAtom);
  const [chatHistory, setChatHistory] = useAtom(chatHistoryAtom);

  const { addUserMessage, addAssistantMessage, setAssistantError } =
    useChatAgent();

  const streamingAbortControllerRef = useRef<AbortController | null>(null);

  const validatePrompt = (prompt: string): boolean => {
    if (
      prompt.length > MAX_PROMPT_LENGTH ||
      prompt.length < MIN_PROMPT_LENGTH ||
      rateLimits?.rateLimitRemaining === 0
    ) {
      if (prompt.length < MIN_PROMPT_LENGTH) {
        setError(
          new Error(
            t("chat.errors.promptTooShort", { min: MIN_PROMPT_LENGTH }),
          ),
        );
      }
      if (prompt.length > MAX_PROMPT_LENGTH) {
        setError(
          new Error(t("chat.errors.promptTooLong", { max: MAX_PROMPT_LENGTH })),
        );
      }

      return false;
    }
    return true;
  };

  const onGenerate: TTTDDialog.OnGenerate = async ({
    prompt,
    isRepairFlow = false,
  }) => {
    if (!validatePrompt(prompt)) {
      return;
    }

    if (streamingAbortControllerRef.current) {
      streamingAbortControllerRef.current.abort();
    }

    setError(null);

    const abortController = new AbortController();
    streamingAbortControllerRef.current = abortController;

    if (!isRepairFlow) {
      addUserMessage(prompt);
      addAssistantMessage();
    } else {
      setChatHistory((prev) =>
        updateAssistantContent(prev, {
          isGenerating: true,
          content: "",
          error: undefined,
          errorType: undefined,
          errorDetails: undefined,
        }),
      );
    }

    try {
      trackEvent("ai", "generate", "ttd");

      const previousMessages = getMessagesForLLM(chatHistory);

      const messages: LLMMessage[] = [
        ...previousMessages.slice(-3),
        { role: "user", content: prompt },
      ];

      const { generatedResponse, error, rateLimit, rateLimitRemaining } =
        await onTextSubmit({
          messages,
          onStreamCreated: () => {
            if (isRepairFlow) {
              setChatHistory((prev) =>
                updateAssistantContent(prev, {
                  content: "",
                  error: "",
                  isGenerating: true,
                }),
              );
            }
          },
          onChunk: (chunk: string) => {
            setChatHistory((prev) => {
              const lastAssistantMessage = getLastAssistantMessage(prev);
              // Clean the chunk before appending
              const cleanedChunk = chunk
                .replace(/[（]/g, "(")
                .replace(/[）]/g, ")")
                .replace(/[【]/g, "[")
                .replace(/[】]/g, "]")
                .replace(/[｛]/g, "{")
                .replace(/[｝]/g, "}")
                .replace(/[：]/g, ":")
                .replace(/[；]/g, ";")
                .replace(/[，]/g, ",")
                .replace(/[。]/g, ".");
              return updateAssistantContent(prev, {
                content: lastAssistantMessage.content + cleanedChunk,
              });
            });
          },
          signal: abortController.signal,
        });

      setChatHistory((prev) =>
        updateAssistantContent(prev, {
          isGenerating: false,
        }),
      );

      if (isFiniteNumber(rateLimit) && isFiniteNumber(rateLimitRemaining)) {
        setRateLimits({ rateLimit, rateLimitRemaining });
      }

      if (error?.status === 429 || rateLimitRemaining === 0) {
        setChatHistory((chatHistory) => {
          if (error?.status === 429) {
            chatHistory = removeLastAssistantMessage(chatHistory);
          }

          chatHistory = {
            ...chatHistory,
            messages: chatHistory.messages.filter(
              (msg) =>
                msg.type !== "warning" ||
                msg.warningType === "rateLimitExceeded" ||
                msg.warningType === "messageLimitExceeded",
            ),
          };
          const messages = addMessages(chatHistory, [
            {
              type: "warning",
              warningType:
                rateLimitRemaining === 0
                  ? "messageLimitExceeded"
                  : "rateLimitExceeded",
            },
          ]);
          return messages;
        });
      }

      if (error) {
        const isAborted =
          error.name === "AbortError" ||
          error.message === "Aborted" ||
          abortController.signal.aborted;

        // do nothing if the request was aborted by the user
        if (isAborted) {
          return;
        }

        const _error = new Error(
          error.message || t("chat.errors.requestFailed"),
        );
        if (error.status !== 429) {
          setAssistantError(_error.message, "network");
        }
        setError(_error);

        return;
      }

      // Clean the response before parsing
      const cleanedResponse = cleanMermaidResponse(generatedResponse ?? "");

      // Update the message with cleaned content
      setChatHistory((prev) =>
        updateAssistantContent(prev, {
          content: cleanedResponse,
        }),
      );

      try {
        await parseMermaidToExcalidraw(cleanedResponse);
        trackEvent("ai", "mermaid parse success", "ttd");
      } catch (error: any) {
        trackEvent("ai", "mermaid parse failed", "ttd");
        const _error = new Error(
          error.message || t("chat.errors.mermaidParseError"),
        );
        setAssistantError(_error.message, "parse");
        setError(_error);
      }
    } catch (error: any) {
      const _error = new Error(
        error.message || t("chat.errors.generationFailed"),
      );
      setAssistantError(_error.message, "other");
      setError(_error);
    } finally {
      streamingAbortControllerRef.current = null;
    }
  };

  const handleAbort = () => {
    if (streamingAbortControllerRef.current) {
      streamingAbortControllerRef.current.abort();
    }
  };

  return {
    onGenerate,
    handleAbort,
  };
};
