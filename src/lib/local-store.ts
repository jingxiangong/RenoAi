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

function mergeCloud<T extends { id: string }>(local: T[], cloud: T[]) {
  const cloudIds = new Set(cloud.map((item) => item.id));
  return [...cloud, ...local.filter((item) => !cloudIds.has(item.id))];
}

export function createLocalStore(scope: string | null) {
  const prefix = `renoai.account.${scope}`;
  const PROPERTY_KEY = `${prefix}.properties`;
  const SELECTED_PROPERTY_KEY = `${prefix}.selected-property`;
  const REQUEST_KEY = `${prefix}.requests`;

  function read<T>(key: string, fallback: T): T {
    if (!scope || typeof window === "undefined") return fallback;
    try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
  }

  function write<T>(key: string, value: T) {
    if (!scope) return;
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("renoai:change"));
  }

  function cloudMutation(method: "POST" | "DELETE", body: unknown) {
    if (!scope) return;
    void fetch("/api/data", {
      method,
      headers: { "Content-Type": "application/json", "x-reno-cache-scope": scope },
      body: JSON.stringify(body),
    }).then((response) => {
      if (!response.ok && response.status !== 401) console.error("Cloud save failed", response.status);
    }).catch((error) => console.error("Cloud save failed", error));
  }

  let cloudSync: Promise<void> | undefined;

  return {
    properties: () => read<Property[]>(PROPERTY_KEY, []),
    saveProperty(property: Property) {
      const current = this.properties().filter((item) => item.id !== property.id);
      if (!scope) return;
      localStorage.setItem(SELECTED_PROPERTY_KEY, JSON.stringify(property.id));
      write(PROPERTY_KEY, [property, ...current]);
      cloudMutation("POST", { kind: "property", data: property });
    },
    selectProperty(id: string) {
      if (!this.properties().some((property) => property.id === id)) return;
      write(SELECTED_PROPERTY_KEY, id);
    },
    deleteProperty(id: string) {
      const next = this.properties().filter((property) => property.id !== id);
      const selectedId = read<string>(SELECTED_PROPERTY_KEY, "");
      if (scope && selectedId === id) {
        localStorage.setItem(SELECTED_PROPERTY_KEY, JSON.stringify(next[0]?.id ?? ""));
      }
      write(PROPERTY_KEY, next);
      cloudMutation("DELETE", { kind: "property", id });
    },
    selectedProperty() {
      const properties = this.properties();
      const selectedId = read<string>(SELECTED_PROPERTY_KEY, "");
      return properties.find((property) => property.id === selectedId) || properties[0] || demoProperty;
    },
    requests: () => read<RepairRequest[]>(REQUEST_KEY, []),
    request(id: string) { return this.requests().find((item) => item.id === id); },
    saveRequest(request: RepairRequest) {
      const current = this.requests().filter((item) => item.id !== request.id);
      write(REQUEST_KEY, [request, ...current]);
      cloudMutation("POST", { kind: "request", data: request });
    },
    deleteRequest(id: string) {
      write(REQUEST_KEY, this.requests().filter((item) => item.id !== id));
      cloudMutation("DELETE", { kind: "request", id });
    },
    syncFromCloud() {
      if (!scope) return Promise.resolve();
      cloudSync ||= fetch("/api/data", { headers: { "x-reno-cache-scope": scope } })
        .then(async (response) => {
          if (response.status === 401 || response.status === 409) return;
          if (!response.ok) throw new Error(`Cloud sync failed: ${response.status}`);
          const cloud = await response.json() as { properties?: Property[]; requests?: RepairRequest[] };
          const localProperties = this.properties();
          const localRequests = this.requests();
          const cloudProperties = cloud.properties || [];
          const cloudRequests = cloud.requests || [];
          const properties = mergeCloud(localProperties, cloudProperties);
          const requests = mergeCloud(localRequests, cloudRequests);
          write(PROPERTY_KEY, properties);
          write(REQUEST_KEY, requests);
        })
        .catch((error) => {
          cloudSync = undefined;
          console.error("Cloud sync failed", error);
        });
      return cloudSync;
    },
  };
}
