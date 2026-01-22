"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/api/config";
import { ApiError, customFetch } from "@/api/client";
import type { ProfileResponseDto } from "@/api/model/models";
import { useAuthStore } from "@/store/authStore";

async function anonymousLogin(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/anonymous`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Anonymous login failed");
  }

  await response.json().catch(() => ({}));
}

async function fetchProfile(): Promise<ProfileResponseDto> {
  return customFetch<ProfileResponseDto>({
    url: "/auth/profile",
    method: "GET",
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, setLoading } = useAuthStore();
  const initializing = useRef(false);

  useEffect(() => {
    if (isAuthenticated || initializing.current) {
      return;
    }

    initializing.current = true;
    setLoading(true);

    async function initAuth() {
      try {
        const profile = await fetchProfile();
        setAuth(profile.id);
        return;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          try {
            await anonymousLogin();
            const profile = await fetchProfile();
            setAuth(profile.id);
            return;
          } catch (loginError) {
            console.error("Anonymous login failed:", loginError);
          }
        } else {
          console.error("Auth initialization failed:", error);
        }
        setLoading(false);
      }
    }

    initAuth().finally(() => {
      initializing.current = false;
    });
  }, [isAuthenticated, setAuth, setLoading]);

  return <>{children}</>;
}
