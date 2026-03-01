"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { LS_USER_ID } from "@/lib/constants";

export default function ResetPage() {
  const nukeUserData = useMutation(api.users.nukeUserData);
  const [status, setStatus] = useState("🗑️ Resetting...");

  useEffect(() => {
    async function reset() {
      try {
        const userId = localStorage.getItem(LS_USER_ID);
        if (userId) {
          await nukeUserData({ userId: userId as Id<"users"> });
        }
        // Clear all local state
        localStorage.clear();
        // Clear session cookie
        await fetch("/api/auth/local-session", { method: "DELETE" }).catch(() => {});
        setStatus("✅ Done! Redirecting...");
        setTimeout(() => { window.location.href = "/"; }, 1000);
      } catch (e) {
        console.error(e);
        // Even if DB delete fails, clear local state and redirect
        localStorage.clear();
        setStatus("✅ Local data cleared. Redirecting...");
        setTimeout(() => { window.location.href = "/"; }, 1000);
      }
    }
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "inherit", fontSize: 18, color: "#3D2B1F" }}>
      {status}
    </div>
  );
}
