"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createLocalStore } from "./local-store";

const LocalStoreContext = createContext(createLocalStore(null));

export function LocalStoreProvider({ scope, children }: { scope: string | null; children: ReactNode }) {
  const store = useMemo(() => createLocalStore(scope), [scope]);
  return <LocalStoreContext.Provider key={scope ?? "signed-out"} value={store}>{children}</LocalStoreContext.Provider>;
}

export function useLocalStore() {
  return useContext(LocalStoreContext);
}
