# Translation tool

Glossary-backed translation helper. `TranslationTool` looks up exact text in a
caller-supplied glossary and returns the original text when there is no entry.

## Usage

```ts
import { TranslationTool } from "@frithward/translation";

const tool = new TranslationTool(new Map([["hello", "hola"]]));
tool.translate("hello"); // "hola"
tool.translate("goodbye"); // "goodbye"
```

## API

| Method | Input | Output |
| --- | --- | --- |
| `constructor(glossary?)` | `ReadonlyMap<string, string>` | Tool with an optional glossary |
| `translate(text)` | Text to translate | Glossary match or the original text; throws on empty input |

## Limitations

- Exact-match glossary only. No neural translation, language detection, or
  context handling.
- Unknown text is returned unchanged, which callers must surface honestly.
- Document the language limits of any downstream model separately.
