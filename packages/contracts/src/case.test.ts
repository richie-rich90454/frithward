import { describe, expect, it } from "vitest";
import {
    Case,
    CaseKind,
    CreateCaseInput,
    ThemePreference,
    UpdateCaseInput,
    type CaseArtifact,
    type CaseFinding,
    type CaseKind as CaseKindType,
    type ThemePreference as ThemePreferenceType,
} from "./case.js";

const validCase = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    kind: "message",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    title: "Suspicious message",
    inputs: { text: "click here" },
    findings: [{ label: "Urgency", severity: "high", detail: "Pressures the reader" }],
    artifacts: [{ kind: "screenshot", name: "shot.png", hash: "abc123" }],
    nextSteps: ["Report the sender"],
    limitations: ["Offline analysis only"],
    status: "draft",
};

describe("Case schema", () => {
    it("parses a complete valid case", () => {
        const parsed = Case.parse(validCase);

        expect(parsed.id).toBe(validCase.id);
        expect(parsed.kind).toBe("message");
        expect(parsed.status).toBe("draft");
        expect(parsed.inputs).toEqual({ text: "click here" });
        expect(parsed.findings[0]?.severity).toBe("high");
        expect(parsed.artifacts[0]?.hash).toBe("abc123");
    });

    const invalidPatches: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
        ["id", { id: "not-a-uuid" }],
        ["kind", { kind: "unknown" }],
        ["createdAt", { createdAt: "yesterday" }],
        ["updatedAt", { updatedAt: 123 }],
        ["inputs", { inputs: "not a record" }],
        ["findings", { findings: [{ label: "x", severity: "critical", detail: "y" }] }],
        ["artifacts", { artifacts: [{ kind: 1, name: "x" }] }],
        ["nextSteps", { nextSteps: [1] }],
        ["limitations", { limitations: null }],
        ["status", { status: "done" }],
    ];

    for (const [field, patch] of invalidPatches) {
        it(`rejects an invalid ${field}`, () => {
            expect(Case.safeParse({ ...validCase, ...patch }).success).toBe(false);
        });
    }
});

describe("enum schemas", () => {
    it("accepts every declared case kind", () => {
        for (const kind of ["message", "url", "qr", "file", "provenance", "evidence"]) {
            expect(CaseKind.safeParse(kind).success).toBe(true);
        }
        expect(CaseKind.safeParse("image").success).toBe(false);
    });

    it("accepts every declared theme preference", () => {
        for (const theme of ["system", "light", "dark"]) {
            expect(ThemePreference.safeParse(theme).success).toBe(true);
        }
        expect(ThemePreference.safeParse("auto").success).toBe(false);
    });
});

describe("case input schemas", () => {
    it("accepts the minimum create payload", () => {
        expect(CreateCaseInput.safeParse({ kind: "url", title: "Link", inputs: {} }).success).toBe(
            true,
        );
    });

    it("rejects a create payload missing a required field", () => {
        expect(CreateCaseInput.safeParse({ title: "Link", inputs: {} }).success).toBe(false);
    });

    it("strips server-managed fields from a create payload", () => {
        const parsed = CreateCaseInput.parse({
            id: validCase.id,
            kind: "url",
            title: "Link",
            inputs: {},
        });

        expect(parsed).not.toHaveProperty("id");
    });

    it("accepts a partial update", () => {
        expect(UpdateCaseInput.safeParse({ title: "New title" }).success).toBe(true);
        expect(UpdateCaseInput.safeParse({}).success).toBe(true);
    });

    it("rejects an update with an unknown status", () => {
        expect(UpdateCaseInput.safeParse({ status: "done" }).success).toBe(false);
    });
});

describe("case type inference", () => {
    it("infers schema output types", () => {
        const parsed = Case.parse(validCase);
        const kind: CaseKindType = parsed.kind;
        const theme: ThemePreferenceType = "dark";
        const finding: CaseFinding = parsed.findings[0]!;
        const artifact: CaseArtifact = parsed.artifacts[0]!;
        const create: CreateCaseInput = { kind, title: "QR", inputs: {} };
        const update: UpdateCaseInput = { title: "Updated" };

        expect([kind, theme, finding.label, artifact.name, create.kind, update.title]).toEqual([
            "message",
            "dark",
            "Urgency",
            "shot.png",
            "message",
            "Updated",
        ]);
    });
});
