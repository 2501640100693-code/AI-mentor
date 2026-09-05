"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AppProvider } from "@/contexts/AppContext";

const AppSceneBackground = dynamic(
  () => import("@/components/three/AppSceneBackground"),
  { ssr: false },
);

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const frameloop = "always";
  return (
    <AppProvider>
      {!isLogin && <AppSceneBackground frameloop={frameloop} />}
      {children}
    </AppProvider>
  );
}