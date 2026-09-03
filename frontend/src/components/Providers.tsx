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
  const frameloop = pathname === "/onboard" || pathname === "/player" ? "always" : "demand";
  return (
    <AppProvider>
      <AppSceneBackground frameloop={frameloop} />
      {children}
    </AppProvider>
  );
}
