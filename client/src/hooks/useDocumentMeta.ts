import { useEffect } from "react";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function useDocumentMeta({ title, description, image }: { title: string; description?: string; image?: string | null }) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
    const summary = description?.replace(/\s+/g, " ").trim().slice(0, 300);
    if (summary) {
      setMeta("name", "description", summary);
      setMeta("property", "og:description", summary);
      setMeta("name", "twitter:description", summary);
    }
    setMeta("property", "og:title", title);
    setMeta("name", "twitter:title", title);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    if (image) {
      setMeta("property", "og:image", image);
      setMeta("name", "twitter:image", image);
    }
  }, [title, description, image]);
}
