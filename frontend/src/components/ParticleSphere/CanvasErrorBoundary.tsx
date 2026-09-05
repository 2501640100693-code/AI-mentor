"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Keeps the login form mounted if WebGL / R3F throws. */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Particle sphere canvas failed", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black"
        >
          <div
            className="absolute top-1/2 right-[-8%] h-[min(92vh,42rem)] w-[min(92vh,42rem)] -translate-y-1/2 rounded-full opacity-90"
            style={{
              background:
                "radial-gradient(circle at 42% 48%, rgba(16,205,152,0.22) 0%, rgba(4,20,15,0.95) 42%, #000 72%)",
              boxShadow: "0 0 80px rgba(16,205,152,0.18)",
            }}
          />
          {Array.from({ length: 48 }, (_, i) => {
            const t = (i / 48) * Math.PI * 2;
            const r = 34 + (i % 5) * 4.5;
            return (
              <span
                key={i}
                className="absolute top-1/2 right-[18%] h-2.5 w-2.5 rounded-full bg-[#0a3d32]"
                style={{
                  transform: `translate(-50%, -50%) translate(${Math.cos(t) * r}px, ${Math.sin(t) * r}px)`,
                  boxShadow: "0 0 8px rgba(16,205,152,0.35)",
                }}
              />
            );
          })}
        </div>
      );
    }
    return this.props.children;
  }
}
