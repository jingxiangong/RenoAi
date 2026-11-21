import type { Property } from "@/schemas/property.schema";
import type { ProblemAnalysis } from "@/schemas/problem-brief.schema";
import type { MediaItem, ProjectBrief, RequestStatus } from "@/schemas/project-brief.schema";

export type ClarificationAnswer = { question: string; answer: string };

export type RepairRequest = {
  id: string;
  property_id: string;
  description: string;
  category_hint?: string;
  status: RequestStatus;
  created_at: string;
  analysis?: ProblemAnalysis;
  clarification_history?: ClarificationAnswer[];
  project?: ProjectBrief;
  evidence: { photos: MediaItem[]; videos: MediaItem[] };
};

export const demoProperty: Property = {
  id: "property_demo",
  user_id: "user_local",
  name: "My Home",
  home_type: "HDB",
  address: { postal_code: "570123", address_line: "123 Bishan Street", unit_number: "#10-123" },
  created_at: new Date().toISOString(),
};

type RecordKind = "property" | "request";
type CloudMutation =
  | { kind: "property"; data: Property }
  | { kind: "request"; data: RepairRequest }
  | { kind: RecordKind; id: string };

function mergeCloud<T extends { id: string }>(local: T[], cloud: T[], editedIds: Set<string>) {
  const incoming = cloud.filter((item) => !editedIds.has(item.id));
  const incomingIds = new Set(incoming.map((item) => item.id));
  return [...incoming, ...local.filter((item) => !incomingIds.has(item.id))];
}

function updateList<T extends { id: string }>(list: T[], item: T) {
  return [item, ...list.filter((existing) => existing.id !== item.id)];
}

export function createLocalStore(scope: string | null) {
  const prefix = `renoai.account.${scope}`;
  const propertyKey = `${prefix}.properties`;
  const selectedPropertyKey = `${prefix}.selected-property`;
  const requestKey = `${prefix}.requests`;
  const edited = { property: new Set<string>(), request: new Set<string>() };
  const pendingWrites = new Map<string, Promise<void>>();
  let cloudSync: Promise<void> | undefined;
  let synced = false;

  function read<T>(key: string, fallback: T): T {
    if (!scope || typeof window === "undefined") return fallback;
    try {
      return JSON.parse(localStorage.getItem(key) || "") as T;
    } catch {
      return fallback;
    }
  }

  function write<T>(key: string, value: T) {
    if (scope) localStorage.setItem(key, JSON.stringify(value));
  }

  function notify() {
    if (scope) window.dispatchEvent(new Event("renoai:change"));
  }

  function queueCloudMutation(change: CloudMutation) {
    if (!scope) return;

    const saving = "data" in change;
    const id = saving ? change.data.id : change.id;
    // A late cloud read must preserve both local edits and local deletions.
    if (!synced) edited[change.kind].add(id);

    const key = `${change.kind}:${id}`;
    const send = async () => {
      try {
        const response = await fetch("/api/data", {
          method: saving ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json", "x-reno-cache-scope": scope },
          body: JSON.stringify(change),
        });
        if (!response.ok && response.status !== 401) console.error("Cloud save failed", response.status);
      } catch (error) {
        console.error("Cloud save failed", error);
      }
    };

    // Serialize changes to the same record so slower writes cannot undo newer ones.
    const previous = pendingWrites.get(key);
    const pending = previous ? previous.then(send) : send();
    pendingWrites.set(key, pending);
    void pending.then(() => {
      if (pendingWrites.get(key) === pending) pendingWrites.delete(key);
    });
  }

  const properties = () => read<Property[]>(propertyKey, []);
  const requests = () => read<RepairRequest[]>(requestKey, []);

  function syncFromCloud() {
    if (!scope || synced) return Promise.resolve();
    cloudSync ??= fetch("/api/data", { headers: { "x-reno-cache-scope": scope } })
      .then(async (response) => {
        if (response.status === 401 || response.status === 409) return;
        if (!response.ok) throw new Error(`Cloud sync failed: ${response.status}`);
        const cloud = await response.json() as { properties?: Property[]; requests?: RepairRequest[] };
        write(propertyKey, mergeCloud(properties(), cloud.properties || [], edited.property));
        write(requestKey, mergeCloud(requests(), cloud.requests || [], edited.request));
        synced = true;
        edited.property.clear();
        edited.request.clear();
        notify();
      })
      .catch((error) => console.error("Cloud sync failed", error))
      .finally(() => { cloudSync = undefined; });
    return cloudSync;
  }

  return {
    properties,
    requests,
    request: (id: string) => requests().find((item) => item.id === id),
    saveProperty(property: Property) {
      write(selectedPropertyKey, property.id);
      write(propertyKey, updateList(properties(), property));
      queueCloudMutation({ kind: "property", data: property });
      notify();
    },
    selectProperty(id: string) {
      if (!properties().some((property) => property.id === id)) return;
      write(selectedPropertyKey, id);
      notify();
    },
    deleteProperty(id: string) {
      const next = properties().filter((property) => property.id !== id);
      if (read(selectedPropertyKey, "") === id) {
        write(selectedPropertyKey, next[0]?.id ?? "");
      }
      write(propertyKey, next);
      queueCloudMutation({ kind: "property", id });
      notify();
    },
    selectedProperty() {
      const available = properties();
      const selectedId = read(selectedPropertyKey, "");
      return available.find((property) => property.id === selectedId) || available[0] || demoProperty;
    },
    saveRequest(request: RepairRequest) {
      write(requestKey, updateList(requests(), request));
      queueCloudMutation({ kind: "request", data: request });
      notify();
    },
    deleteRequest(id: string) {
      write(requestKey, requests().filter((item) => item.id !== id));
      queueCloudMutation({ kind: "request", id });
      notify();
    },
    syncFromCloud,
  };
}
