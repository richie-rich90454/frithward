import { FrithwardClient, SDKError } from "../src/index.js";

// Run the API locally first: pnpm run start:api
// Then run this file, for example: pnpm exec tsx packages/sdk/examples/typed.ts
const client = new FrithwardClient({
    baseUrl: process.env.FRITHWARD_URL ?? "http://localhost:3000",
});

async function show<T>(label: string, run: () => Promise<T>): Promise<void> {
    try {
        const value = await run();
        console.log(`${label}:`, value);
    } catch (error) {
        if (error instanceof SDKError) {
            // Privacy, provenance and caption routes require an authenticated session.
            console.log(`${label} failed: ${error.status} ${error.code}: ${error.message}`);
        } else {
            throw error;
        }
    }
}

async function main(): Promise<void> {
    await show("health", () => client.health());
    await show("analyzeMessage", () =>
        client.analyzeMessage("Your parcel is waiting. Pay the fee at this link."),
    );
    await show("getSession", () => client.getSession());
    await show("getJob", () => client.getJob("example-job"));
    await show("inspectPrivacy", () =>
        client.inspectPrivacy([
            {
                id: "finding-1",
                kind: "email",
                detail: "Contact jane@example.com",
                remediation: "Remove the address before sharing.",
            },
        ]),
    );
    await show("verifyProvenance", () =>
        client.verifyProvenance({
            id: "asset-1",
            signatureStatus: "valid",
            signer: "Example Studio",
            assetSha256: "abc123",
            manifest: null,
        }),
    );
    await show("exportCaptions", () =>
        client.exportCaptions({
            projectId: "project-1",
            title: "Example",
            language: "en",
            format: "vtt",
            segments: [
                { id: "segment-1", startMs: 0, endMs: 1000, text: "Hello", speakerId: null },
            ],
        }),
    );
}

void main();
