import { PrivacyFinding } from "../domain/PrivacyFinding.js";
import { PrivacyPolicy } from "../domain/PrivacyPolicy.js";

export class InspectPrivacyUseCase {
    private readonly policy: PrivacyPolicy;

    public constructor(policy?: PrivacyPolicy) {
        this.policy = policy ?? new PrivacyPolicy();
    }

    public execute(input: { findings: readonly PrivacyFinding[] }): void {
        this.policy.assertMetadataSafe(input.findings);
    }
}
