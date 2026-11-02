"use client";
import { Fragment } from "react";
import { openGlossary } from "./glossary-drawer";

/** Renders **bold** and [[glossary term]] markup from curriculum text. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>;
        if (p.startsWith("[[") && p.endsWith("]]")) {
          const term = p.slice(2, -2);
          return (
            <button key={i} type="button" onClick={() => openGlossary(term)} className="focus-ring rounded font-semibold text-cool-300 underline decoration-cool-400/40 decoration-dotted underline-offset-4 hover:text-cool-200">
              {term}
            </button>
          );
        }
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
