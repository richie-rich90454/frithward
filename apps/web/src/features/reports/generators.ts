import type { Case } from "@frithward/contracts";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const AUTHENTICITY_NOTICE = "This is not proof of authenticity.";

const HTML_STYLE = `
:root { color-scheme: light dark; }
body { margin: 0 auto; padding: 32px 20px; max-width: 760px; font: 16px/1.5 system-ui, sans-serif; }
h1 { font-size: 1.8rem; }
h2 { font-size: 1.15rem; margin-top: 28px; border-bottom: 1px solid #999; padding-bottom: 4px; }
.notice { padding: 12px 16px; border: 2px solid #b00; border-radius: 6px; font-weight: 700; }
dl { display: grid; grid-template-columns: 130px 1fr; gap: 4px 12px; }
dt { font-weight: 700; }
dd { margin: 0; overflow-wrap: anywhere; }
code { overflow-wrap: anywhere; }
li { margin-bottom: 8px; }
.severity { font-weight: 700; text-transform: capitalize; }
@media print { body { max-width: none; padding: 0; } }
`;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function list(items: readonly string[], empty: string): string {
    return items.length === 0
        ? `<p>${empty}</p>`
        : `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function fileName(title: string): string {
    const base = title
        .normalize("NFKD")
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
    return base || "case";
}

/** Builds a self-contained HTML document; no scripts, fonts, or external assets. */
export function buildHtmlReport(caseData: Case): string {
    const findings =
        caseData.findings.length === 0
            ? "<p>None recorded.</p>"
            : `<ul>${caseData.findings
                  .map(
                      (finding) =>
                          `<li><span class="severity">${escapeHtml(finding.severity)}:</span> ${escapeHtml(finding.label)} — ${escapeHtml(finding.detail)}</li>`,
                  )
                  .join("")}</ul>`;
    const artifacts =
        caseData.artifacts.length === 0
            ? "<p>None recorded.</p>"
            : `<ul>${caseData.artifacts
                  .map(
                      (artifact) =>
                          `<li>${escapeHtml(artifact.name)} (${escapeHtml(artifact.kind)}) — SHA-256: <code>${escapeHtml(artifact.hash ?? "not recorded")}</code>${artifact.url ? ` — ${escapeHtml(artifact.url)}` : ""}</li>`,
                  )
                  .join("")}</ul>`;

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(caseData.title)}</title>
<style>${HTML_STYLE}</style>
</head>
<body>
<main>
<h1>${escapeHtml(caseData.title)}</h1>
<p class="notice">${AUTHENTICITY_NOTICE}</p>
<section>
<h2>Case details</h2>
<dl>
<dt>Kind</dt><dd>${escapeHtml(caseData.kind)}</dd>
<dt>Created</dt><dd>${escapeHtml(caseData.createdAt)}</dd>
<dt>Updated</dt><dd>${escapeHtml(caseData.updatedAt)}</dd>
<dt>Status</dt><dd>${escapeHtml(caseData.status)}</dd>
<dt>ID</dt><dd><code>${escapeHtml(caseData.id)}</code></dd>
</dl>
</section>
<section>
<h2>Findings</h2>
${findings}
</section>
<section>
<h2>Next steps</h2>
${list(caseData.nextSteps, "None recorded.")}
</section>
<section>
<h2>Limitations</h2>
${list(caseData.limitations, "No limitations were recorded for this case.")}
</section>
<section>
<h2>Artifacts</h2>
${artifacts}
</section>
</main>
</body>
</html>`;
}

/** Replaces glyphs the built-in Helvetica font cannot draw with ASCII-safe text. */
function asciiSafe(value: string): string {
    return value
        .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
        .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/\u2026/g, "...")
        .replace(/[^\x20-\x7e]/g, "?");
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;

/** Builds a real PDF with wrapped text and an explicit authenticity notice. */
export async function buildReportPdfBytes(caseData: Case): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;
    const maxWidth = PAGE_WIDTH - MARGIN * 2;

    const newPage = () => {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
    };
    const draw = (text: string, size: number) => {
        if (y < MARGIN + size) newPage();
        page.drawText(text, { x: MARGIN, y, size, font, color: rgb(0.1, 0.1, 0.1) });
        y -= size + 4;
    };
    const write = (value: string, size = 11) => {
        let line = "";
        for (const word of asciiSafe(value).split(/\s+/)) {
            const candidate = line ? `${line} ${word}` : word;
            if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
                draw(line, size);
                line = word;
            } else {
                line = candidate;
            }
        }
        if (line) draw(line, size);
    };
    const heading = (value: string) => {
        y -= 8;
        write(value, 14);
    };
    const bullets = (items: readonly string[], empty: string) => {
        if (items.length === 0) write(empty);
        for (const item of items) write(`- ${item}`);
    };

    write(caseData.title, 18);
    write(`Kind: ${caseData.kind}`);
    write(`Created: ${caseData.createdAt}`);
    write(`Updated: ${caseData.updatedAt}`);
    write(`Status: ${caseData.status}`);
    write(`Case ID: ${caseData.id}`);
    heading("Findings");
    if (caseData.findings.length === 0) write("None recorded.");
    for (const finding of caseData.findings) {
        write(`- ${finding.label} [${finding.severity}]`);
        write(`  ${finding.detail}`);
    }
    heading("Next steps");
    bullets(caseData.nextSteps, "None recorded.");
    heading("Limitations");
    bullets(caseData.limitations, "No limitations were recorded for this case.");
    heading("Artifacts");
    if (caseData.artifacts.length === 0) write("None recorded.");
    for (const artifact of caseData.artifacts) {
        write(`- ${artifact.name} (${artifact.kind}) SHA-256: ${artifact.hash ?? "not recorded"}`);
    }
    y -= 12;
    write(AUTHENTICITY_NOTICE, 12);

    return doc.save();
}

function triggerDownload(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
}

/** Downloads a self-contained HTML report. */
export function downloadHtmlReport(caseData: Case): void {
    const blob = new Blob([buildHtmlReport(caseData)], { type: "text/html;charset=utf-8" });
    triggerDownload(blob, `${fileName(caseData.title)}.html`);
}

/** Downloads a generated PDF report; rendering finishes asynchronously. */
export function downloadPdfReport(caseData: Case): void {
    void buildReportPdfBytes(caseData).then((bytes) => {
        triggerDownload(
            new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
            `${fileName(caseData.title)}.pdf`,
        );
    });
}
