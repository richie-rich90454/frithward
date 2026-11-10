import { defineConfig } from "vitepress";

export default defineConfig({
    title: "Frithward",
    description: "Keep people safe. Keep media honest.",
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
                ],
            },
        ],
    },
});
