import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
 head: () => ({ meta: [{ title: "Heavic Ventures — Salon Management" }, { name: "description", content: "Manage salon stock, sales and your team at Heavic Ventures." }, { property: "og:title", content: "Heavic Ventures — Salon Management" }, { property: "og:description", content: "Manage salon stock, sales and your team." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
 component: () => <Navigate to="/dashboard" replace />,
});
