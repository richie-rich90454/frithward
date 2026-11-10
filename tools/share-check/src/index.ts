import {
    ShareCheckController,
    type MetadataPayload,
    type RedactionRegion,
    type SanitizedOutputDescriptor,
    type ShareCheckViewModel,
} from "@frithward/privacy-core";

export * from "@frithward/privacy-core";

export class ShareCheckTool {
    private readonly controller: ShareCheckController;

    public constructor(controller?: ShareCheckController) {
        this.controller = controller ?? new ShareCheckController();
    }

    public inspect(payload: MetadataPayload): ShareCheckViewModel {
        return this.controller.inspect(payload);
    }

    public export(
        payload: MetadataPayload,
        regions?: readonly RedactionRegion[],
    ): SanitizedOutputDescriptor {
        return this.controller.export(payload, regions);
    }
}
