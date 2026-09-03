"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { mediaUrl } from "@/lib/api";
import type { AvatarAsset } from "@/lib/api";

// No real talking-head video is generated (see backend/app/avatar/avatar_client.py
// for why) -- this renders an illustrated cartoon character instead, animated
// with blinking, subtle eyebrow shifts, a multi-frame talking mouth, arm/hand
// teaching gestures, and an idle breathing bob. Inline SVG + CSS/JS timers
// only: no video generation, no external API.

const MOUTH_FRAMES = [
  { rx: 13, ry: 4 },
  { rx: 10, ry: 9 },
  { rx: 8, ry: 15 },
  { rx: 15, ry: 6 },
  { rx: 10, ry: 11 },
];

export type Gesture = "neutral" | "raise" | "present" | "think" | "positive" | "attentive";

// Right-arm rotation is what actually changes per gesture (left arm only
// leaves its relaxed neutral angle for "present", mirrored). Angles are
// tuned by eye for a flat-illustration read, not literal biomechanics.
const RIGHT_ARM_ANGLE: Record<Gesture, number> = {
  neutral: -15,
  raise: -170, // swept up near-vertical: "one hand raised, explaining"
  present: -100, // swept out to roughly horizontal: "open, presenting"
  think: -135, // swept up toward the face: "hand near chin"
  positive: -170, // same raised sweep as "raise", paired with a nod + thumb accent
  attentive: -135, // same as "think" -- hand near chin, softer wrong-answer reaction
};
const LEFT_ARM_ANGLE: Record<Gesture, number> = {
  neutral: 15,
  raise: 15,
  present: 100,
  think: 15,
  positive: 15,
  attentive: 15,
};

// Talking cycles randomly between these while idle-neutral is never picked,
// so the character always looks like it's actively teaching while speaking.
const TALK_GESTURES: Gesture[] = ["raise", "present", "neutral"];

export function TeacherCharacter({
  playing,
  gesture,
  size = 168,
}: {
  playing: boolean;
  /** Explicit gesture override (e.g. a quiz-answer reaction). When unset,
   * gestures auto-cycle while `playing` and rest at neutral otherwise. */
  gesture?: Gesture | null;
  /** Rendered width in px; height follows the character's fixed aspect
   * ratio. viewBox-based, so this scales cleanly with no layout hacks. */
  size?: number;
}) {
  const [blinking, setBlinking] = useState(false);
  const [browShift, setBrowShift] = useState(false);
  const [mouthFrame, setMouthFrame] = useState(0);
  const [autoGesture, setAutoGesture] = useState<Gesture>("neutral");

  const activeGesture: Gesture = gesture ?? autoGesture;

  // Occasional natural-feeling blink, timed randomly rather than on a fixed beat.
  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout>;
    let nextTimeout: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function scheduleBlink() {
      const delay = 2200 + Math.random() * 3200;
      nextTimeout = setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        hideTimeout = setTimeout(() => {
          if (!cancelled) setBlinking(false);
        }, 120);
        scheduleBlink();
      }, delay);
    }

    scheduleBlink();
    return () => {
      cancelled = true;
      clearTimeout(nextTimeout);
      clearTimeout(hideTimeout);
    };
  }, []);

  // Slow, subtle eyebrow shift so the face doesn't feel frozen even when idle.
  useEffect(() => {
    const interval = setInterval(() => setBrowShift((b) => !b), 3600);
    return () => clearInterval(interval);
  }, []);

  // Cycle through mouth shapes while audio is playing; settle to a closed
  // smile otherwise. This (not a single static shape) is what sells "talking".
  useEffect(() => {
    if (!playing) {
      setMouthFrame(0);
      return;
    }
    const interval = setInterval(() => {
      setMouthFrame(() => Math.floor(Math.random() * MOUTH_FRAMES.length));
    }, 150);
    return () => clearInterval(interval);
  }, [playing]);

  // Cycle teaching gestures while talking, unless a reaction is overriding.
  useEffect(() => {
    if (!playing || gesture) {
      setAutoGesture("neutral");
      return;
    }
    setAutoGesture(TALK_GESTURES[Math.floor(Math.random() * TALK_GESTURES.length)]);
    const interval = setInterval(() => {
      setAutoGesture(TALK_GESTURES[Math.floor(Math.random() * TALK_GESTURES.length)]);
    }, 2200);
    return () => clearInterval(interval);
  }, [playing, gesture]);

  const eyeStyle = (isBlinking: boolean): CSSProperties => ({
    transform: isBlinking ? "scaleY(0.1)" : "scaleY(1)",
    transformBox: "fill-box",
    transformOrigin: "center",
    transition: "transform 90ms ease-in-out",
  });

  const browStyle = (shift: boolean): CSSProperties => ({
    transform: shift ? "translateY(-2px)" : "translateY(0px)",
    transition: "transform 1.6s ease-in-out",
  });

  const armStyle = (angle: number): CSSProperties => ({
    transform: `rotate(${angle}deg)`,
    transformBox: "fill-box",
    transformOrigin: "top center",
    transition: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  });

  const headStyle: CSSProperties = {
    transform:
      gesture === "attentive" ? "rotate(-6deg)" : gesture === "positive" ? undefined : "rotate(0deg)",
    transformBox: "fill-box",
    transformOrigin: "center",
    transition: "transform 400ms ease-in-out",
  };

  const mouth = MOUTH_FRAMES[mouthFrame];

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={Math.round(size * 1.1)}
      className={`character-bob ${gesture === "positive" ? "character-nod" : ""}`}
    >
      {/* Arms (drawn before the body/head so hands read as "behind" at rest) */}
      <g style={armStyle(LEFT_ARM_ANGLE[activeGesture])}>
        <rect x="44" y="152" width="17" height="62" rx="8.5" fill="#f6d3ac" />
        <circle cx="52.5" cy="218" r="11" fill="#f6d3ac" />
      </g>
      <g style={armStyle(RIGHT_ARM_ANGLE[activeGesture])}>
        <rect x="139" y="152" width="17" height="62" rx="8.5" fill="#f6d3ac" />
        <circle cx="147.5" cy="218" r="11" fill="#f6d3ac" />
        {gesture === "positive" && (
          <rect x="141" y="200" width="8" height="16" rx="4" fill="#f6d3ac" />
        )}
      </g>

      {/* Body / shoulders */}
      <path d="M 38 220 Q 38 148 100 146 Q 162 148 162 220 Z" fill="var(--color-clay-blue)" />
      <path
        d="M 68 158 Q 100 172 132 158 L 132 190 Q 100 202 68 190 Z"
        fill="var(--color-clay-blue-dark)"
      />

      <g style={headStyle}>
        {/* Neck */}
        <rect x="87" y="126" width="26" height="28" rx="12" fill="#f0c8a2" />

        {/* Head */}
        <circle cx="100" cy="92" r="58" fill="#f6d3ac" />

        {/* Ears */}
        <circle cx="42" cy="94" r="10" fill="#f0c8a2" />
        <circle cx="158" cy="94" r="10" fill="#f0c8a2" />

        {/* Hair -- bob silhouette: top cap + face-framing side flaps + a
            couple of strand lines so it doesn't read as a flat helmet */}
        <path
          d="M 40 78 Q 36 20 100 18 Q 164 20 160 78 Q 152 46 100 44 Q 48 46 40 78 Z"
          fill="var(--color-clay-lavender-dark)"
        />
        <path
          d="M 40 78 Q 36 100 44 120 Q 50 124 54 113 Q 50 92 52 78 Z"
          fill="var(--color-clay-lavender-dark)"
        />
        <path
          d="M 160 78 Q 164 100 156 120 Q 150 124 146 113 Q 150 92 148 78 Z"
          fill="var(--color-clay-lavender-dark)"
        />
        <path
          d="M 58 28 Q 55 50 59 72"
          stroke="#8a6fc9"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />
        <path
          d="M 142 28 Q 145 50 141 72"
          stroke="#8a6fc9"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />

        {/* Blush */}
        <ellipse cx="65" cy="109" rx="11" ry="6" fill="var(--color-clay-pink)" opacity="0.6" />
        <ellipse cx="135" cy="109" rx="11" ry="6" fill="var(--color-clay-pink)" opacity="0.6" />

        {/* Eyebrows */}
        <path
          d="M 65 68 Q 78 59 91 67"
          stroke="#6b5b8f"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          style={browStyle(browShift)}
        />
        <path
          d="M 109 67 Q 122 59 135 68"
          stroke="#6b5b8f"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          style={browStyle(!browShift)}
        />

        {/* Eyes */}
        <g style={eyeStyle(blinking)}>
          <ellipse cx="78" cy="88" rx="9" ry="11" fill="white" />
          <circle cx="78" cy="89" r="4.5" fill="#3a3352" />
          <circle cx="80" cy="86" r="1.4" fill="white" />
        </g>
        <g style={eyeStyle(blinking)}>
          <ellipse cx="122" cy="88" rx="9" ry="11" fill="white" />
          <circle cx="122" cy="89" r="4.5" fill="#3a3352" />
          <circle cx="124" cy="86" r="1.4" fill="white" />
        </g>

        {/* Mouth */}
        {gesture === "positive" ? (
          <path
            d="M 78 118 Q 100 136 122 118"
            stroke="#8a4a4a"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        ) : gesture === "attentive" ? (
          <path
            d="M 85 122 Q 100 118 115 122"
            stroke="#8a4a4a"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        ) : playing ? (
          <ellipse cx="100" cy="122" rx={mouth.rx} ry={mouth.ry} fill="#8a4a4a" />
        ) : (
          <path
            d="M 82 120 Q 100 130 118 120"
            stroke="#8a4a4a"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </g>
    </svg>
  );
}

export default function AvatarPlayer({
  audioUrl,
  avatar,
  caption,
  autoPlay = true,
  onEnded,
}: {
  audioUrl: string;
  avatar: AvatarAsset;
  caption: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    const audio = audioRef.current;
    if (!audio || !autoPlay) return;
    audio.play().catch(() => {
      // Autoplay can be blocked until the user interacts with the page;
      // the visible controls let them press play manually in that case.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  if (avatar.mode === "video" && avatar.video_url) {
    return (
      <div className="shadow-clay overflow-hidden rounded-clay bg-clay-ink">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={mediaUrl(avatar.video_url)}
          controls
          autoPlay={autoPlay}
          onEnded={onEnded}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div className="shadow-clay flex flex-col items-center gap-4 rounded-clay-lg bg-gradient-to-b from-clay-lavender/25 via-white to-clay-blue/15 p-8">
      <TeacherCharacter playing={playing} />

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={mediaUrl(audioUrl)}
        controls
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
        className="w-full max-w-sm"
      />
      <p className="max-w-md text-center text-sm text-clay-ink-soft">{caption}</p>
    </div>
  );
}
