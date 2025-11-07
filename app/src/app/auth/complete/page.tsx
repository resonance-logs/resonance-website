"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/src/api/axios";

export default function AuthCompletePage() {
  const router = useRouter();

  useEffect(() => {
    async function verify() {
      try {
        await api.get("/api/auth/me", { withCredentials: true });
      } catch (e) {
        // ignore; user not authenticated
      } finally {
        router.replace("/");
      }
    }
    void verify();
  }, [router]);

  return null;
}
