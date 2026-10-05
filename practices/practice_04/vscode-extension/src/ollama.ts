import type { Translator } from "./command";

export type VariableStyle = "snake" | "camel" | "pascal" | "constant";

export interface OllamaSettings {
  baseUrl: string;
  model: string;
  style: VariableStyle;
}

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<Response>;

function formatIdentifier(value: string, style: VariableStyle): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .match(/[A-Za-z0-9]+/g)
    ?.map((word) => word.toLowerCase());

  if (!words?.length) {
    throw new Error("Ollama не вернула английское имя переменной.");
  }

  let result: string;
  switch (style) {
    case "camel":
      result = words[0] + words.slice(1).map(capitalize).join("");
      break;
    case "pascal":
      result = words.map(capitalize).join("");
      break;
    case "constant":
      result = words.join("_").toUpperCase();
      break;
    default:
      result = words.join("_");
  }

  return /^\d/.test(result) ? `value_${result}` : result;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function createOllamaTranslator(
  fetcher: FetchLike,
  settings: OllamaSettings
): Translator {
  return async (text: string): Promise<string> => {
    const response = await fetcher(`${settings.baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        think: false,
        prompt:
          "Translate the Russian text into a concise English code variable name. " +
          "Return only lowercase English words separated by spaces, without explanation. " +
          `Russian text: ${text}`
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama вернула HTTP ${response.status}.`);
    }

    const data: unknown = await response.json();
    if (!isGenerateResponse(data)) {
      throw new Error("Ollama вернула некорректный ответ.");
    }
    return formatIdentifier(data.response, settings.style);
  };
}

function isGenerateResponse(value: unknown): value is { response: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "response" in value &&
    typeof value.response === "string"
  );
}
