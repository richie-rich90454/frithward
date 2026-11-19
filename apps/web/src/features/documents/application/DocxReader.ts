import mammoth from "mammoth";

export class DocxReader {
    public async read(arrayBuffer: ArrayBuffer): Promise<string> {
        if (arrayBuffer.byteLength === 0) {
            throw new Error("The selected .docx file is empty.");
        }
        const result = await mammoth.convertToHtml({ arrayBuffer });
        return result.value;
    }
}
