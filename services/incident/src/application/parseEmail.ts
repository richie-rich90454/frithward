import PostalMime from "postal-mime";
import { AppError } from "@frithward/contracts";

export interface ParsedEmail {
    from: string;
    to: string;
    subject: string;
    text: string;
    attachments: number;
}

function addressText(value: unknown): string {
    if (!value) return "";
    if (Array.isArray(value)) return value.map(addressText).filter(Boolean).join(", ");
    if (typeof value === "string") return value;
    const address = value as { text?: string; address?: string; name?: string };
    if (address.text) return address.text;
    if (address.address) return address.name ? `${address.name} <${address.address}>` : address.address;
    return "";
}

export async function parseEmail(raw: string): Promise<ParsedEmail> {
    if (raw.trim().length === 0)
        throw new AppError("VALIDATION_FAILED", "Email content required.");
    try {
        const email = await PostalMime.parse(raw);
        return {
            from: addressText(email.from),
            to: addressText(email.to),
            subject: email.subject ?? "",
            text: email.text ?? "",
            attachments: email.attachments?.length ?? 0,
        };
    } catch (cause) {
        throw new AppError("VALIDATION_FAILED", "Could not parse the email.", cause);
    }
}
