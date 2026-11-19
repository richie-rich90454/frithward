import { describe, expect, it } from "vitest";
import { ModelManagerController } from "./ModelManagerController.js";

describe("ModelManagerController", () => {
    it("starts empty with no fabricated models", () => {
        const controller = new ModelManagerController();
        expect(controller.getViewModel().installed).toEqual([]);
        expect(controller.getViewModel().registryCards).toEqual([]);
        expect(controller.getViewModel().totalSizeBytes).toBe(0);
    });

    it("lists installed models and sums their real sizes", () => {
        const controller = new ModelManagerController();
        controller.markInstalled({
            id: "model-a",
            sizeBytes: 1024,
            installedAt: "2026-01-01T00:00:00Z",
            stage: "stable",
        });
        controller.markInstalled({
            id: "model-b",
            sizeBytes: 2048,
            installedAt: "2026-01-02T00:00:00Z",
            stage: "experimental",
        });

        const viewModel = controller.getViewModel();
        expect(viewModel.installed.map((model) => model.id)).toEqual(["model-a", "model-b"]);
        expect(viewModel.totalSizeBytes).toBe(3072);
        expect(viewModel.installed[0]?.stage).toBe("stable");
    });

    it("registers a card and enriches a matching installed model", () => {
        const controller = new ModelManagerController();
        controller.markInstalled({
            id: "model-a",
            sizeBytes: 500,
            installedAt: "2026-01-01T00:00:00Z",
            stage: "candidate",
        });
        controller.registerCard({
            id: "model-a",
            stage: "candidate",
            license: "Apache-2.0",
            intendedUse: "local classification",
            limitations: "not for medical use",
        });

        const viewModel = controller.getViewModel();
        expect(viewModel.registryCards).toHaveLength(1);
        expect(viewModel.installed[0]?.license).toBe("Apache-2.0");
        expect(viewModel.installed[0]?.limitations).toBe("not for medical use");
        expect(viewModel.installed[0]?.intendedUse).toBe("local classification");
    });

    it("rejects a blank card id without changing state", () => {
        const controller = new ModelManagerController();
        controller.registerCard({
            id: "   ",
            stage: "stable",
            license: "MIT",
            intendedUse: "test",
            limitations: "none",
        });

        expect(controller.getError()).toBe("Model id required.");
        expect(controller.getViewModel().registryCards).toEqual([]);
    });

    it("notifies subscribers when state changes", () => {
        const controller = new ModelManagerController();
        let calls = 0;
        const unsubscribe = controller.subscribe(() => {
            calls += 1;
        });
        controller.registerCard({
            id: "model-c",
            stage: "stable",
            license: "MIT",
            intendedUse: "test",
            limitations: "none",
        });
        unsubscribe();
        controller.registerCard({
            id: "model-d",
            stage: "stable",
            license: "MIT",
            intendedUse: "test",
            limitations: "none",
        });

        expect(calls).toBe(1);
    });
});
