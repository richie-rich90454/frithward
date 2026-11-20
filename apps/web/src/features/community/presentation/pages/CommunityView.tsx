import { For, Show, createSignal, onCleanup } from "solid-js";
import { Accessibility, GraduationCap, Library, MessageSquare, Users } from "lucide-solid";
import { REVIEWED_PATTERNS } from "../../../check/domain/ReviewedPatterns.js";
import { translatePatternFields } from "../../../check/presentation/patternTranslations.js";
import { CommunityPatternsController } from "../controllers/CommunityPatternsController";
import { useI18n } from "../../../../i18n/index.js";
import "../community.css";

const TRACKS = [
    {
        titleKey: "community.track.technology.title",
        detailKey: "community.track.technology.detail",
    },
    {
        titleKey: "community.track.publicSafety.title",
        detailKey: "community.track.publicSafety.detail",
    },
    {
        titleKey: "community.track.accessibility.title",
        detailKey: "community.track.accessibility.detail",
    },
    {
        titleKey: "community.track.research.title",
        detailKey: "community.track.research.detail",
    },
] as const;

const PARTNERSHIPS = [
    {
        icon: GraduationCap,
        titleKey: "community.partner.schools.title",
        detailKey: "community.partner.schools.detail",
    },
    {
        icon: Library,
        titleKey: "community.partner.libraries.title",
        detailKey: "community.partner.libraries.detail",
    },
    {
        icon: Accessibility,
        titleKey: "community.partner.seniorCentres.title",
        detailKey: "community.partner.seniorCentres.detail",
    },
    {
        icon: Users,
        titleKey: "community.partner.universities.title",
        detailKey: "community.partner.universities.detail",
    },
    {
        icon: MessageSquare,
        titleKey: "community.partner.consumerGroups.title",
        detailKey: "community.partner.consumerGroups.detail",
    },
] as const;

export function CommunityView() {
    const { t } = useI18n();
    const controller = new CommunityPatternsController({ translate: t });
    const [state, setState] = createSignal(controller.getState());
    onCleanup(
        controller.subscribe(() => {
            setState(controller.getState());
        }),
    );
    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [sourceUrl, setSourceUrl] = createSignal("");

    const submit = (event: SubmitEvent) => {
        event.preventDefault();
        const added = controller.add({
            title: title(),
            description: description(),
            sourceUrl: sourceUrl(),
        });
        if (added) {
            setTitle("");
            setDescription("");
            setSourceUrl("");
        }
    };

    return (
        <section class="community-view">
            <h1>
                <Users class="fw-icon" />
                {t("community.title")}
            </h1>
            <p>{t("community.intro")}</p>

            <h2>{t("community.reviewedPatterns")}</h2>
            <p>{t("community.reviewedIntro")}</p>
            <ul class="resource-list">
                <For each={REVIEWED_PATTERNS}>
                    {(pattern) => (
                        <li>
                            <div>
                                <h3>
                                    {
                                        translatePatternFields(t, pattern.id, {
                                            label: pattern.label,
                                            rationale: pattern.rationale,
                                            detail: pattern.detail,
                                        }).label
                                    }
                                </h3>
                                <p>
                                    {
                                        translatePatternFields(t, pattern.id, {
                                            label: pattern.label,
                                            rationale: pattern.rationale,
                                            detail: pattern.detail,
                                        }).rationale
                                    }
                                </p>
                                <p class="community-view__source">{t("community.source")}</p>
                            </div>
                        </li>
                    )}
                </For>
            </ul>

            <h2>{t("community.communityPatterns")}</h2>
            <p role="note">{t("community.communityNote")}</p>

            <form class="community-view__form" onSubmit={submit}>
                <label>
                    {t("community.field.title")}
                    <input
                        type="text"
                        value={title()}
                        maxlength={120}
                        onInput={(event) => setTitle(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("community.field.description")}
                    <textarea
                        value={description()}
                        maxlength={600}
                        onInput={(event) => setDescription(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("community.field.sourceUrl")}
                    <input
                        type="text"
                        value={sourceUrl()}
                        maxlength={500}
                        onInput={(event) => setSourceUrl(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">{t("community.addPattern")}</button>
            </form>

            <Show when={state().error}>
                <p role="alert" class="community-view__error">
                    {state().error}
                </p>
            </Show>

            <Show
                when={state().patterns.length > 0}
                fallback={<p class="community-view__empty">{t("community.empty")}</p>}
            >
                <ul class="resource-list">
                    <For each={state().patterns}>
                        {(pattern) => (
                            <li>
                                <div>
                                    <h3>{pattern.title}</h3>
                                    <p>{pattern.description}</p>
                                    <Show when={pattern.sourceUrl}>
                                        <p class="community-view__source">
                                            <a
                                                href={pattern.sourceUrl ?? ""}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {pattern.sourceUrl}
                                            </a>
                                        </p>
                                    </Show>
                                    <p class="community-view__source">
                                        {t("community.communitySubmitted")}
                                    </p>
                                </div>
                                <button type="button" onClick={() => controller.remove(pattern.id)}>
                                    {t("community.delete")}
                                </button>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <h2>{t("community.tracks")}</h2>
            <ul class="resource-list">
                <For each={TRACKS}>
                    {(track) => (
                        <li>
                            <div>
                                <h3>{t(track.titleKey)}</h3>
                                <p>{t(track.detailKey)}</p>
                            </div>
                        </li>
                    )}
                </For>
            </ul>

            <h2>{t("community.partnerships")}</h2>
            <ul class="resource-list">
                <For each={PARTNERSHIPS}>
                    {(partner) => (
                        <li>
                            <partner.icon class="fw-icon" />
                            <div>
                                <h3>{t(partner.titleKey)}</h3>
                                <p>{t(partner.detailKey)}</p>
                            </div>
                        </li>
                    )}
                </For>
            </ul>

            <p role="note">
                <strong>{t("community.privacyRuleStrong")}</strong> {t("community.privacyRule")}
            </p>
        </section>
    );
}
