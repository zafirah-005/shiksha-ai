"use client";

import { useEffect, useId, useState } from "react";
import katex from "katex";
import mermaid from "mermaid";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec, PhotoSpec, VisualSpec } from "@/lib/api";

// suppressErrorRendering is required for invalid syntax to actually reject
// render()'s promise -- without it, Mermaid swallows the parse error itself
// and resolves with an SVG that visibly says "Syntax error in text", which
// is why a plain .catch() alone doesn't protect against broken diagrams.
mermaid.initialize({ startOnLoad: false, theme: "neutral", suppressErrorRendering: true });

function EquationView({ latex, caption }: { latex: string; caption: string }) {
  const html = katex.renderToString(latex, { throwOnError: false, displayMode: true });
  return (
    <div className="text-center">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {caption && <p className="mt-2 text-sm text-clay-ink-soft">{caption}</p>}
    </div>
  );
}

function DiagramView({ mermaidCode, caption }: { mermaidCode: string; caption: string }) {
  const id = useId().replace(/[:]/g, "-");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setSvg("");

    // Belt-and-suspenders: catch both a synchronous throw and an async
    // rejection. A broken diagram must never take down the segment -- worst
    // case we just render nothing here and the text explanation still shows.
    (async () => {
      try {
        const { svg } = await mermaid.render(`diagram-${id}`, mermaidCode);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, mermaidCode]);

  if (error || !svg) return null;

  return (
    <div className="text-center">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      {caption && <p className="mt-2 text-sm text-clay-ink-soft">{caption}</p>}
    </div>
  );
}

function CodeView({
  code,
  language,
  caption,
}: {
  code: string;
  language: string;
  caption: string;
}) {
  return (
    <div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{ borderRadius: 18 }}
      >
        {code}
      </SyntaxHighlighter>
      {caption && <p className="mt-2 text-sm text-clay-ink-soft">{caption}</p>}
    </div>
  );
}

function TimelineView({
  events,
  caption,
}: {
  events: { date: string; title: string; description: string }[];
  caption: string;
}) {
  return (
    <div>
      <ol className="space-y-4 border-l-2 border-clay-lavender-dark pl-4">
        {events.map((e, i) => (
          <li key={i}>
            <div className="text-xs font-semibold text-clay-lavender-dark">{e.date}</div>
            <div className="font-medium text-clay-ink">{e.title}</div>
            <div className="text-sm text-clay-ink-soft">{e.description}</div>
          </li>
        ))}
      </ol>
      {caption && <p className="mt-2 text-sm text-clay-ink-soft">{caption}</p>}
    </div>
  );
}

function ChartView({ chart }: { chart: ChartSpec }) {
  if (chart.data.length === 0) return null;
  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chart.data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6ddf0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#837c93", fontSize: 12 }}
            axisLine={{ stroke: "#e6ddf0" }}
            tickLine={false}
            label={
              chart.x_label
                ? { value: chart.x_label, position: "insideBottom", offset: -4, fill: "#837c93", fontSize: 11 }
                : undefined
            }
          />
          <YAxis
            tick={{ fill: "#837c93", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
            label={
              chart.y_label
                ? { value: chart.y_label, angle: -90, position: "insideLeft", fill: "#837c93", fontSize: 11 }
                : undefined
            }
          />
          <Tooltip
            cursor={{ fill: "rgba(157, 192, 222, 0.15)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e6ddf0",
              fontSize: 13,
            }}
          />
          <Bar dataKey="value" fill="#6f9ac0" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {chart.caption && (
        <p className="mt-1 text-center text-sm text-clay-ink-soft">{chart.caption}</p>
      )}
    </div>
  );
}

function PhotoView({ photo }: { photo: PhotoSpec }) {
  if (!photo.image_url) return null;
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.image_url}
        alt={photo.caption || "Photo related to this segment"}
        className="w-full rounded-clay object-cover"
      />
      <p className="mt-2 text-xs text-clay-ink-faint">
        {photo.caption && <span className="mr-1">{photo.caption} &mdash;</span>}
        Photo by{" "}
        {photo.photographer_url ? (
          <a
            href={photo.photographer_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-clay-ink-soft"
          >
            {photo.photographer}
          </a>
        ) : (
          photo.photographer
        )}{" "}
        on{" "}
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-clay-ink-soft"
        >
          Pexels
        </a>
      </p>
    </div>
  );
}

export default function VisualStage({ visual }: { visual: VisualSpec | null }) {
  if (!visual || visual.visual_type === "none") return null;

  return (
    <div className="glass-card rounded-clay p-6">
      {visual.visual_type === "equation" && visual.equation && (
        <EquationView latex={visual.equation.latex} caption={visual.equation.caption} />
      )}
      {visual.visual_type === "diagram" && visual.diagram && (
        <DiagramView mermaidCode={visual.diagram.mermaid_code} caption={visual.diagram.caption} />
      )}
      {visual.visual_type === "code" && visual.code && (
        <CodeView
          code={visual.code.code}
          language={visual.code.language}
          caption={visual.code.caption}
        />
      )}
      {visual.visual_type === "timeline" && visual.timeline && (
        <TimelineView events={visual.timeline.events} caption={visual.timeline.caption} />
      )}
      {visual.visual_type === "chart" && visual.chart && <ChartView chart={visual.chart} />}
      {visual.visual_type === "photo" && visual.photo && <PhotoView photo={visual.photo} />}
    </div>
  );
}
