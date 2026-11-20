import type { Case } from "@frithward/contracts";
import { useI18n } from "../../i18n/index.js";
import { downloadHtmlReport, downloadPdfReport } from "./generators.js";
import "./reports.css";

export function ReportButtons(props: { caseData: Case }) {
    const { t } = useI18n();
    return (
        <div class="fw-report-buttons" role="group" aria-label={t("report.title")}>
            <button
                type="button"
                class="fw-report-button"
                aria-label={t("report.downloadHtml")}
                onClick={() => downloadHtmlReport(props.caseData)}
            >
                HTML
            </button>
            <button
                type="button"
                class="fw-report-button"
                aria-label={t("report.downloadPdf")}
                onClick={() => downloadPdfReport(props.caseData)}
            >
                PDF
            </button>
        </div>
    );
}
