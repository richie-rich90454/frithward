import { defineConfig } from "vitepress";

export default defineConfig({
    title: "Frithward",
    description: "Keep people safe. Keep media honest.",
    lang: "en",
    head: [
        ["meta", { name: "theme-color", content: "#FFFFFF" }],
        [
            "meta",
            { name: "theme-color", content: "#141414", media: "(prefers-color-scheme: dark)" },
        ],
        ["meta", { property: "og:type", content: "website" }],
        ["meta", { property: "og:site_name", content: "Frithward" }],
        [
            "meta",
            {
                property: "og:title",
                content: "Frithward documentation — Keep people safe. Keep media honest.",
            },
        ],
        [
            "meta",
            {
                property: "og:description",
                content:
                    "Documentation for Frithward, a local-first, open-source digital safety toolkit for captions, media checks, privacy inspection, and provenance.",
            },
        ],
        ["meta", { property: "og:url", content: "https://github.com/richie-rich90454/frithward" }],
        ["meta", { property: "og:locale", content: "en_US" }],
        ["meta", { name: "twitter:card", content: "summary_large_image" }],
        ["link", { rel: "canonical", href: "https://github.com/richie-rich90454/frithward" }],
    ],
    themeConfig: {
        nav: [
            { text: "Home", link: "/" },
            { text: "Architecture", link: "/architecture" },
            { text: "API", link: "/api" },
            { text: "Engines", link: "/engines" },
            { text: "Privacy", link: "/privacy" },
            { text: "Security", link: "/security" },
            { text: "Research", link: "/research" },
            { text: "Community", link: "/community" },
            { text: "Governance", link: "/governance" },
            { text: "Deployment", link: "/deployment" },
            { text: "Compatibility", link: "/compatibility" },
        ],
        sidebar: [
            {
                text: "Documentation",
                items: [
                    { text: "Introduction", link: "/" },
                    { text: "Architecture", link: "/architecture" },
                    { text: "API reference", link: "/api" },
                    { text: "Engines", link: "/engines" },
                    { text: "Privacy", link: "/privacy" },
                    { text: "Security", link: "/security" },
                    { text: "Research", link: "/research" },
                    { text: "Community", link: "/community" },
                    { text: "Governance", link: "/governance" },
                    { text: "Deployment", link: "/deployment" },
                    { text: "Compatibility", link: "/compatibility" },
                ],
            },
        ],
    },
});
