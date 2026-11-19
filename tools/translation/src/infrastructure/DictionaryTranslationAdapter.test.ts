import { describe, expect, it } from "vitest";
import { TranslationTool } from "../index.js";
import { DictionaryTranslationAdapter, dictionaryKey } from "./DictionaryTranslationAdapter.js";

describe("TranslationTool with dictionary adapter", () => {
    const dictionary = new Map([[dictionaryKey("en", "fr", "hello"), "bonjour"]]);
    const tool = new TranslationTool(new DictionaryTranslationAdapter(dictionary));

    it("reports a translated term", async () => {
        expect(await tool.translate("hello", "en", "fr")).toEqual({
            text: "bonjour",
            translated: true,
        });
    });

    it("reports a missing term instead of echoing it as translated", async () => {
        expect(await tool.translate("goodbye", "en", "fr")).toEqual({
            text: "goodbye",
            translated: false,
        });
    });

    it("requires a port", () => {
        expect(() => new TranslationTool(undefined as never)).toThrow("requires a TranslationPort");
    });
});
