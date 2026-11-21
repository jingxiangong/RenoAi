"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { useLocalStore } from "@/features/account-data/context";
import { useEffect, useState } from "react";
import type { Property } from "@/schemas/property.schema";

export function AppShell({ children }: { children: React.ReactNode }) {
  const localStore = useLocalStore();
  const [property, setProperty] = useState<Property>();
  useEffect(() => {
    const sync = () => setProperty(localStore.selectedProperty());
    sync(); window.addEventListener("renoai:change", sync);
    return () => window.removeEventListener("renoai:change", sync);
  }, [localStore]);
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/home"><Image className="brand-mark" src="/brand/renoai-mark.png" alt="" width={34} height={34}/> RenoAI</Link>
        <div className="topbar-actions">
          <Link className="property-pill" href="/onboarding"><span>{property?.name || "My Home"}</span><ChevronDown size={15}/></Link>
          <form action={signOutAction}>
            <button className="signout-button" type="submit" aria-label="Sign out" title="Sign out"><LogOut size={17}/></button>
          </form>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
