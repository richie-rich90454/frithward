# Scam check

Facade over `@frithward/security-core`. It inspects suspicious messages, URLs, and QR payloads, and creates evidence reports.

## Usage

```ts
import {
    AnalyzeMessageUseCase,
    QrInspectionUseCase,
    ScamReportUseCase,
    UrlInspectionUseCase,
} from "@frithward/scam-check";

const analysis = new AnalyzeMessageUseCase().execute("Act now and send a gift card.");
const url = new UrlInspectionUseCase().execute("https://paypa1.com/login");
const qr = new QrInspectionUseCase().execute("WIFI:T:WPA;S:CoffeeShop;P:password123;;");
const report = await new ScamReportUseCase().execute({
    channel: "message",
    description: "Requested a gift card",
    source: "SMS",
});
```

## API

| Export                           | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `AnalyzeMessageUseCase`          | Text indicators, summary, next steps, limitations             |
| `UrlInspectionUseCase`           | Transport, hostname, lookalike-brand, and short-link checks   |
| `QrInspectionUseCase`            | URL, Wi-Fi, vCard, crypto, and contact payload classification |
| `ScamReportUseCase`              | Evidence report with a SHA-256 hash                           |
| `OlderAdultGuidedFlowController` | Six-step guided flow with plain-language steps                |

## Limitations

- Text patterns and URL heuristics are evidence, not proof of fraud.
- URL inspection compares text only. It cannot verify the destination.
- QR payloads can be truncated or encoded; camera apps may auto-open links.
- No person is accused automatically. Reports are for human follow-up.
