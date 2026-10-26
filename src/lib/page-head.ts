export function pageHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Heavic Ventures` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Heavic Ventures` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] };
}