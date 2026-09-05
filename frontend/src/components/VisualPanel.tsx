"use client";

import katex from "katex";
import { Highlight, themes } from "prism-react-renderer";
import { useMemo } from "react";
import type { TeachingTurn } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";

const SVG_TYPES = new Set(["diagram", "graph", "timeline", "concept_map"]);

function Typewriter({ text }: { text: string }) {
  return (
    <p className="text-lg leading-relaxed text-[color:var(--ink)]">
      {text.split("").map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="inline-block animate-[fadeIn_0.4s_ease_forwards]"
          style={{ animationDelay: `${Math.min(i, 80) * 12}ms`, opacity: 0 }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
      <style>{`@keyframes fadeIn { to { opacity: 1 } }`}</style>
    </p>
  );
}

function EquationView({ tex }: { tex: string }) {
  const clean = tex.replaceAll("$", "").trim();
  const html = useMemo(() => {
    try {
      return katex.renderToString(clean, {
        throwOnError: true,
        displayMode: true,
        strict: "ignore",
      });
    } catch {
      return null;
    }
  }, [clean]);

  if (!html) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-[color:var(--hairline)] bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] p-3 font-mono text-[color:var(--signal)]">
        {clean}
      </pre>
    );
  }
  return (
    <div
      className="overflow-x-auto text-[color:var(--ink)] [&_.katex]:text-xl"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SvgPanel({ content }: { content: string }) {
  const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
  if (!svgMatch) {
    return <Typewriter text={content || "Visual unavailable — follow the narration below."} />;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--hairline)] shadow-[0_0_24px_rgba(79,184,166,0.12)]">
      <div
        className="bg-white p-4 text-black"
        dangerouslySetInnerHTML={{ __html: svgMatch[0] }}
      />
    </div>
  );
}

export function VisualPanel({ turn }: { turn: TeachingTurn | null }) {
  const content = turn?.visual_content || "";
  const type = turn?.visual_type || "none";
  const subtitleFallback =
    turn?.script_text || "The visual panel stays with you for every turn.";

  const code = useMemo(() => {
    if (type !== "code") return null;
    const match = content.match(/```(\w+)?\n?([\s\S]*?)```/);
    return {
      lang: match?.[1] || "python",
      body: match ? match[2] : content,
    };
  }, [content, type]);

  let inner;
  if (!turn || type === "none" || !content.trim()) {
    inner = <Typewriter text={subtitleFallback} />;
  } else if (content.includes("<svg")) {
    inner = <SvgPanel content={content} />;
  } else if (type === "equation") {
    inner = <EquationView tex={content} />;
  } else if (type === "code" && code) {
    inner = (
      <div>
        <span className="mb-2 inline-block rounded-full bg-[color:var(--signal-soft)] px-3 py-1 text-xs uppercase tracking-widest text-[color:var(--signal)]">
          {code.lang}
        </span>
        <div className="overflow-hidden rounded-xl border border-[color:var(--hairline)]">
          <Highlight theme={themes.nightOwl} code={code.body.trim()} language={code.lang}>
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre className={`${className} overflow-x-auto p-4 text-sm`} style={style}>
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>
      </div>
    );
  } else if (SVG_TYPES.has(type) || content.includes("<svg")) {
    inner = <SvgPanel content={content} />;
  } else {
    inner = <Typewriter text={content || subtitleFallback} />;
  }

  return (
    <GlassCard className="flex h-full min-h-[320px] flex-col p-5" hover={false}>
      <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[color:var(--signal)]">Visual panel</p>
      <div className="flex-1">{inner}</div>
    </GlassCard>
  );
}