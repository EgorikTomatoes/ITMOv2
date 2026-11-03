"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const command_1 = require("../src/command");
const ollama_1 = require("../src/ollama");
(0, node_test_1.default)("command inserts the translated variable at the cursor", async () => {
    const inserted = [];
    const api = {
        askForText: async () => "количество активных пользователей",
        getCursor: () => ({ line: 2, character: 5 }),
        insertAtCursor: async (text) => {
            inserted.push(text);
            return true;
        },
        showError: () => undefined
    };
    await (0, command_1.runTranslationCommand)(api, async () => "active_user_count");
    strict_1.default.deepEqual(inserted, ["active_user_count"]);
});
(0, node_test_1.default)("command does not edit the document when input is cancelled", async () => {
    let translated = false;
    let inserted = false;
    const api = {
        askForText: async () => undefined,
        getCursor: () => ({ line: 0, character: 0 }),
        insertAtCursor: async () => {
            inserted = true;
            return true;
        },
        showError: () => undefined
    };
    await (0, command_1.runTranslationCommand)(api, async () => {
        translated = true;
        return "ignored";
    });
    strict_1.default.equal(translated, false);
    strict_1.default.equal(inserted, false);
});
(0, node_test_1.default)("translator requests Ollama and returns a snake case variable name", async () => {
    let requestedUrl = "";
    let requestedBody = "";
    const translate = (0, ollama_1.createOllamaTranslator)(async (url, init) => {
        requestedUrl = String(url);
        requestedBody = String(init?.body);
        return new Response(JSON.stringify({ response: "{\"words\":[\"number\",\"of\",\"active\",\"users\"]}" }), {
            status: 200
        });
    }, { baseUrl: "http://localhost:11434", model: "variable-translator", style: "snake" });
    const result = await translate("количество активных пользователей");
    strict_1.default.equal(result, "number_of_active_users");
    strict_1.default.equal(requestedUrl, "http://localhost:11434/api/generate");
    strict_1.default.match(requestedBody, /количество активных пользователей/);
    strict_1.default.equal(JSON.parse(requestedBody).think, false);
    strict_1.default.deepEqual(JSON.parse(requestedBody).format.required, ["words"]);
    strict_1.default.equal(JSON.parse(requestedBody).options.temperature, 0);
    strict_1.default.match(JSON.parse(requestedBody).system, /translate Russian text/i);
});
(0, node_test_1.default)("translator explains how to start Ollama when the connection fails", async () => {
    const translate = (0, ollama_1.createOllamaTranslator)(async () => {
        throw new TypeError("fetch failed");
    }, { baseUrl: "http://localhost:11434", model: "variable-translator", style: "snake" });
    await strict_1.default.rejects(() => translate("количество пользователей"), /Запустите `ollama serve`/);
});
(0, node_test_1.default)("translator explains how to create a missing model", async () => {
    const translate = (0, ollama_1.createOllamaTranslator)(async () => new Response(JSON.stringify({ error: "model not found" }), { status: 404 }), { baseUrl: "http://localhost:11434", model: "variable-translator", style: "snake" });
    await strict_1.default.rejects(() => translate("количество пользователей"), /npm run ollama:setup/);
});
(0, node_test_1.default)("translator rejects a service message instead of inserting patch_failed", async () => {
    const translate = (0, ollama_1.createOllamaTranslator)(async () => new Response(JSON.stringify({ response: "patch failed" }), { status: 200 }), { baseUrl: "http://localhost:11434", model: "variable-translator", style: "snake" });
    await strict_1.default.rejects(() => translate("количество пользователей"), /служебное сообщение/);
});
(0, node_test_1.default)("formatting returns camelCase and PascalCase and UPPER_SNAKE_CASE", async () => {
    const mockFetch = async () => new Response(JSON.stringify({ response: "{\"words\":[\"number\",\"of\",\"active\",\"users\"]}" }), { status: 200 });
    const translateCamel = (0, ollama_1.createOllamaTranslator)(mockFetch, {
        baseUrl: "http://localhost:11434",
        model: "variable-translator",
        style: "camel"
    });
    const translatePascal = (0, ollama_1.createOllamaTranslator)(mockFetch, {
        baseUrl: "http://localhost:11434",
        model: "variable-translator",
        style: "pascal"
    });
    const translateConstant = (0, ollama_1.createOllamaTranslator)(mockFetch, {
        baseUrl: "http://localhost:11434",
        model: "variable-translator",
        style: "constant"
    });
    strict_1.default.equal(await translateCamel("текст"), "numberOfActiveUsers");
    strict_1.default.equal(await translatePascal("текст"), "NumberOfActiveUsers");
    strict_1.default.equal(await translateConstant("текст"), "NUMBER_OF_ACTIVE_USERS");
});
