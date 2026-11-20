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
    if (cause instanceof Error) return cause.message;
    return fallbackKey ? translate(fallbackKey) : String(cause);
}
