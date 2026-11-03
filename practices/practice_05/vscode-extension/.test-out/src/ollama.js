"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOllamaTranslator = createOllamaTranslator;
function formatIdentifier(value, style) {
    const normalizedResponse = value.trim().toLowerCase().replace(/[_-]+/g, " ");
    if (/^(patch|fetch|tool|operation|request) (failed|failure|error)$/.test(normalizedResponse)) {
        throw new Error("Ollama вернула служебное сообщение вместо перевода. " +
            "Пересоздайте модель командой `npm run ollama:setup`.");
    }
    const words = extractWords(value)
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .match(/[A-Za-z0-9]+/g)
        ?.map((word) => word.toLowerCase());
    if (!words?.length) {
        throw new Error("Ollama не вернула английское имя переменной.");
    }
    let result;
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
function extractWords(value) {
    try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object" &&
            parsed !== null &&
            "words" in parsed &&
            Array.isArray(parsed.words) &&
            parsed.words.every((word) => typeof word === "string")) {
            return parsed.words.join(" ");
        }
    }
    catch {
        // Backward compatibility with older models that return plain text.
    }
    return value;
}
function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
function createOllamaTranslator(fetcher, settings) {
    return async (text) => {
        let response;
        try {
            response = await fetcher(`${settings.baseUrl.replace(/\/$/, "")}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: settings.model,
                    stream: false,
                    think: false,
                    format: {
                        type: "object",
                        properties: {
                            words: {
                                type: "array",
                                items: { type: "string", pattern: "^[a-z0-9]+$" },
                                minItems: 1
                            }
                        },
                        required: ["words"]
                    },
                    options: {
                        temperature: 0,
                        num_predict: 32
                    },
                    system: "You translate Russian text into concise English variable names. " +
                        "Return a JSON object with a words array containing separate lowercase English words. " +
                        "Example: {\"words\":[\"active\",\"user\",\"count\"]}. " +
                        "Do not explain the answer.",
                    prompt: `Russian text: ${text}`
                })
            });
        }
        catch {
            throw new Error("Не удалось подключиться к Ollama. Запустите `ollama serve` и повторите команду.");
        }
        if (!response.ok) {
            const details = await readErrorDetails(response);
            const setupHint = response.status === 404
                ? " Создайте модель командой `npm run ollama:setup`."
                : "";
            throw new Error(`Ollama вернула HTTP ${response.status}${details}.${setupHint}`);
        }
        const data = await response.json();
        if (!isGenerateResponse(data)) {
            throw new Error("Ollama вернула некорректный ответ.");
        }
        return formatIdentifier(data.response, settings.style);
    };
}
async function readErrorDetails(response) {
    try {
        const body = await response.json();
        if (typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof body.error === "string") {
            return `: ${body.error}`;
        }
    }
    catch {
        // Some Ollama/proxy errors have an empty or non-JSON body.
    }
    return "";
}
function isGenerateResponse(value) {
    return (typeof value === "object" &&
        value !== null &&
        "response" in value &&
        typeof value.response === "string");
}
