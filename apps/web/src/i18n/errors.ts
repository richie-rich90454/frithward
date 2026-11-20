import { CodedError } from "@frithward/contracts";
import { interpolate, type Translator } from "./translate.js";

function isCodedError(cause: unknown): cause is CodedError {
    return (
        cause instanceof CodedError ||
        (typeof cause === "object" &&
            cause !== null &&
            typeof (cause as CodedError).code === "string" &&
            typeof (cause as CodedError).params === "object")
    );
}

/**
 * AppError keeps a coarse ErrorCode and an English message. These stable codes
 * let presentation translate the message without changing the package errors.
 */
export const APP_ERROR_CODES: Readonly<Record<string, string>> = {
    "URL required.": "URL_REQUIRED",
    "URL exceeds inspection limit.": "URL_LIMIT_EXCEEDED",
    "QR payload required.": "QR_REQUIRED",
    "QR payload exceeds inspection limit.": "QR_LIMIT_EXCEEDED",
    "Report description required.": "REPORT_DESCRIPTION_REQUIRED",
    "Report description exceeds limit.": "REPORT_DESCRIPTION_LIMIT",
    "Report source required.": "REPORT_SOURCE_REQUIRED",
    "Message text required.": "MESSAGE_REQUIRED",
    "Message exceeds analysis limit.": "MESSAGE_LIMIT_EXCEEDED",
    "No guided step available.": "GUIDED_STEP_MISSING",
    "Invalid guided step.": "GUIDED_STEP_INVALID",
    "Reporting is not available.": "REPORTING_UNAVAILABLE",
    "Asset id required.": "ASSET_ID_REQUIRED",
    "Protection method required.": "PROTECTION_METHOD_REQUIRED",
    "Analysis cancelled.": "ANALYSIS_CANCELLED",
};

/** Map a domain code to a translated message, falling back to the original error message. */
export function translatedError(
    cause: unknown,
    translate: Translator,
    fallbackKey?: string,
): string {
    if (isCodedError(cause)) {
        const key = `error.${cause.code}`;
        const template = translate(key);
        if (template && template !== key) return interpolate(template, cause.params);
        return cause.message;
    }
    if (cause instanceof Error) {
        const code = APP_ERROR_CODES[cause.message];
        if (code) {
            const key = `error.${code}`;
            const template = translate(key);
            if (template && template !== key) return template;
        }
        return cause.message;
    }
    return fallbackKey ? translate(fallbackKey) : String(cause);
}
