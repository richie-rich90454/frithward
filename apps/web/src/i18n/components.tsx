import { For, type ParentProps } from "solid-js";
import { createI18n, I18nContext, LANGUAGE_NAMES, LOCALES, useI18n, type Locale } from "./index.js";

export function LocaleProvider(props: ParentProps) {
    return <I18nContext.Provider value={createI18n()}>{props.children}</I18nContext.Provider>;
}

export function LanguageSwitcher() {
    const { locale, setLocale, t } = useI18n();
    return (
        <select
            class="language-switcher"
            aria-label={t("language")}
            value={locale()}
            onChange={(event) => setLocale(event.currentTarget.value as Locale)}
        >
            <For each={LOCALES}>
                {(option) => <option value={option}>{LANGUAGE_NAMES[option]}</option>}
            </For>
        </select>
    );
}
