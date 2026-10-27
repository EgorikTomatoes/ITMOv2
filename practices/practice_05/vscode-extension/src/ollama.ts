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
  const normalizedResponse = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (/^(patch|fetch|tool|operation|request) (failed|failure|error)$/.test(normalizedResponse)) {
    throw new Error(
      "Ollama вернула служебное сообщение вместо перевода. " +
      "Пересоздайте модель командой `npm run ollama:setup`."
    );
  }

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
    let response: Response;
    try {
      response = await fetcher(`${settings.baseUrl.replace(/\/$/, "")}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: settings.model,
          stream: false,
          think: false,
          options: {
            temperature: 0,
            num_predict: 32
          },
          system:
            "You translate Russian text into concise English variable names. " +
            "Reply only with lowercase English words separated by single spaces. " +
            "Do not explain the answer and do not use punctuation, markdown, or tool calls.",
          prompt: `Russian text: ${text}`
        })
      });
    } catch {
      throw new Error(
        "Не удалось подключиться к Ollama. Запустите `ollama serve` и повторите команду."
      );
    }

    if (!response.ok) {
      const details = await readErrorDetails(response);
      const setupHint = response.status === 404
        ? " Создайте модель командой `npm run ollama:setup`."
        : "";
      throw new Error(`Ollama вернула HTTP ${response.status}${details}.${setupHint}`);
    }

    const data: unknown = await response.json();
    if (!isGenerateResponse(data)) {
      throw new Error("Ollama вернула некорректный ответ.");
    }
    return formatIdentifier(data.response, settings.style);
  };
}

async function readErrorDetails(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return `: ${body.error}`;
    }
  } catch {
    // Some Ollama/proxy errors have an empty or non-JSON body.
  }
  return "";
}

function isGenerateResponse(value: unknown): value is { response: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "response" in value &&
    typeof value.response === "string"
  );
}
