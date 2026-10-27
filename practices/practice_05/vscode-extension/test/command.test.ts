import assert from "node:assert/strict";
import test from "node:test";

import { runTranslationCommand, type EditorApi } from "../src/command";
import { createOllamaTranslator } from "../src/ollama";

test("command inserts the translated variable at the cursor", async () => {
  const inserted: string[] = [];
  const api: EditorApi = {
    askForText: async () => "количество активных пользователей",
    getCursor: () => ({ line: 2, character: 5 }),
    insertAtCursor: async (text) => {
      inserted.push(text);
      return true;
    },
    showError: () => undefined
  };

  await runTranslationCommand(api, async () => "active_user_count");

  assert.deepEqual(inserted, ["active_user_count"]);
});

test("command does not edit the document when input is cancelled", async () => {
  let translated = false;
  let inserted = false;
  const api: EditorApi = {
    askForText: async () => undefined,
    getCursor: () => ({ line: 0, character: 0 }),
    insertAtCursor: async () => {
      inserted = true;
      return true;
    },
    showError: () => undefined
  };

  await runTranslationCommand(api, async () => {
    translated = true;
    return "ignored";
  });

  assert.equal(translated, false);
  assert.equal(inserted, false);
});

test("translator requests Ollama and returns a snake case variable name", async () => {
  let requestedUrl = "";
  let requestedBody = "";
  const translate = createOllamaTranslator(
    async (url, init) => {
      requestedUrl = String(url);
      requestedBody = String(init?.body);
      return new Response(JSON.stringify({ response: "number of active users" }), {
        status: 200
      });
    },
    { baseUrl: "http://localhost:11434", model: "variable-translator", style: "snake" }
  );

  const result = await translate("количество активных пользователей");

  assert.equal(result, "number_of_active_users");
  assert.equal(requestedUrl, "http://localhost:11434/api/generate");
  assert.match(requestedBody, /количество активных пользователей/);
  assert.equal(JSON.parse(requestedBody).think, false);
});
