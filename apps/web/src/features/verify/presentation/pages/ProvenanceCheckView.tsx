import { Show, createSignal, onCleanup } from "solid-js";
import { BadgeCheck } from "lucide-solid";
import type { ProvenanceRecord } from "@frithward/provenance-core";
import { ProvenanceCheckController } from "../controllers/ProvenanceCheckController";
import type { SignatureStatus } from "../controllers/ProvenanceCheckController";

interface ProvenanceCheckViewProps {
    record: ProvenanceRecord;
    result: string | null;
    onSetSignatureStatus: (status: SignatureStatus) => void;
    onSetSigner: (signer: string) => void;
    onSetAssetSha256: (assetSha256: string) => void;
    onVerify: () => void;
}

export function ProvenanceCheckView(props: ProvenanceCheckViewProps) {
    return (
        <section>
            <h1>
                <BadgeCheck class="fw-icon" />
                Provenance check
            </h1>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onVerify();
                }}
            >
                <label>
                    Signature status
                    <select
                        value={props.record.signatureStatus}
                        onChange={(event) =>
                            props.onSetSignatureStatus(event.currentTarget.value as SignatureStatus)
                        }
                    >
                        <option value="valid">Valid</option>
                        <option value="invalid">Invalid</option>
                        <option value="missing">Missing</option>
                    </select>
                </label>
                <label>
                    Signer
                    <input
                        value={props.record.signer ?? ""}
                        onInput={(event) => props.onSetSigner(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Asset SHA-256
                    <input
                        value={props.record.assetSha256}
                        onInput={(event) => props.onSetAssetSha256(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">Verify provenance</button>
            </form>
            <Show when={props.result}>
                <p role="status">{props.result}</p>
            </Show>
        </section>
    );
}

export function ProvenanceCheckPage() {
    const controller = new ProvenanceCheckController();
    const [record, setRecord] = createSignal(controller.getRecord());
    const [result, setResult] = createSignal(controller.getResult());
    onCleanup(
        controller.subscribe(() => {
            setRecord(controller.getRecord());
            setResult(controller.getResult());
        }),
    );
    return (
        <ProvenanceCheckView
            record={record()}
            result={result()}
            onSetSignatureStatus={(status) => controller.setSignatureStatus(status)}
            onSetSigner={(signer) => controller.setSigner(signer)}
            onSetAssetSha256={(assetSha256) => controller.setAssetSha256(assetSha256)}
            onVerify={() => controller.verify()}
        />
    );
}
