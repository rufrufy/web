"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.push(token ? "/home" : "/login");
    }
  }, [token, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-gray-400">Memuat...</div>
    </div>
  );
}
