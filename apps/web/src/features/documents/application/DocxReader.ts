import { CodedError, ERROR_CODES } from "@frithward/contracts";
import mammoth from "mammoth";

export class DocxReader {
    public async read(arrayBuffer: ArrayBuffer): Promise<string> {
        if (arrayBuffer.byteLength === 0) {
            throw new CodedError(ERROR_CODES.DOCX_EMPTY, "The selected .docx file is empty.");
        }
        const result = await mammoth.convertToHtml({ arrayBuffer });
        return result.value;
    }
}
