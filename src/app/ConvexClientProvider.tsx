"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// NEXT_PUBLIC_CONVEX_URL is set in .env.local (created by `npx convex dev`)
// A placeholder URL is used during development setup / builds.
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud";

const convex = new ConvexReactClient(CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
