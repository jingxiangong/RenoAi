"use client";

import { useEffect, useState } from "react";
import type { RepairRequest } from "@/features/account-data/store";
import { useLocalStore } from "@/features/account-data/context";

export function useRepairRequest(requestId: string) {
  const localStore = useLocalStore();
  const [request, setRequest] = useState<RepairRequest>();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser storage is read after hydration.
    setRequest(localStore.request(requestId));
  }, [localStore, requestId]);

  return [request, setRequest] as const;
}
