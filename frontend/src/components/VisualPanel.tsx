"use client";

import { BlockMath } from "react-katex";
import { Highlight, themes } from "prism-react-renderer";
import { useMemo, useState } from "react";
import type { TeachingTurn } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";

function Typewriter({ text }: { text: string }) {
  return (
    <p className="text-lg leading-relaxed text-white/90">
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
  const [failed, setFailed] = useState(false);
  const clean = tex.replaceAll("$", "").trim();
  if (failed) {
    return <pre className="overflow-x-auto font-mono text-cyan-200">{clean}</pre>;
  }
  try {
    return (
      <div
        className="overflow-x-auto text-white"
        onError={() => setFailed(true)}
      >
        <BlockMath math={clean} errorColor="#f87171" />
      </div>
    );
  } catch {
    return <pre className="overflow-x-auto font-mono text-cyan-200">{clean}</pre>;
  }
}

export function VisualPanel({ turn }: { turn: TeachingTurn | null }) {
  const content = turn?.visual_content || "";
  const type = turn?.visual_type || "none";

  const code = useMemo(() => {
    if (type !== "code") return null;
    const match = content.match(/```(\w+)?\n?([\s\S]*?)```/);
    return {
      lang: match?.[1] || "python",
      body: match ? match[2] : content,
    };
  }, [content, type]);

  let inner;
  if (!turn || type === "none" || !content) {
    inner = <Typewriter text={turn?.script_text || "The visual panel stays with you for every turn."} />;
  } else if (type === "equation") {
    inner = <EquationView tex={content} />;
  } else if (type === "code" && code) {
    inner = (
      <div>
        <span className="mb-2 inline-block rounded-full bg-cyan-400/20 px-3 py-1 text-xs uppercase tracking-widest text-cyan-200">
          {code.lang}
        </span>
        <Highlight theme={themes.nightOwl} code={code.body.trim()} language={code.lang}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${className} overflow-x-auto rounded-xl p-4 text-sm`} style={style}>
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
    );
  } else {
    inner = content.includes("<svg") ? (
      <div
        className="rounded-xl bg-white p-3 text-black shadow-inner"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    ) : (
      <Typewriter text={turn.script_text} />
    );
  }

  return (
    <GlassCard className="flex h-full min-h-[320px] flex-col p-5" hover={false}>
      <p className="mb-3 text-xs uppercase tracking-[0.22em] text-cyan-300">Visual panel</p>
      <div className="flex-1">{inner}</div>
    </GlassCard>
  );
}
