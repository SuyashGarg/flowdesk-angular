import { computed, effect, Injectable, signal } from "@angular/core";
import {
  ApprovalRequest,
  RequestCategory,
  RequestStatus,
  Role,
} from "./request.model";
const KEY = "flowdesk-requests-v1";
const sample: ApprovalRequest[] = [
  {
    id: "REQ-1042",
    title: "New developer laptops",
    category: "Equipment",
    amount: 15500,
    requester: "Alex Morgan",
    createdAt: "2026-11-09",
    status: "Pending",
    description: "Three laptops for the engineering onboarding cohort.",
    history: [{ at: "2026-11-09", action: "Submitted", by: "Alex Morgan" }],
  },
  {
    id: "REQ-1041",
    title: "Analytics platform renewal",
    category: "Software",
    amount: 7200,
    requester: "Sam Lee",
    createdAt: "2026-11-07",
    status: "Approved",
    description: "Annual reporting and event analytics subscription.",
    history: [
      { at: "2026-11-07", action: "Submitted", by: "Sam Lee" },
      { at: "2026-11-08", action: "Approved", by: "Approver" },
    ],
  },
  {
    id: "REQ-1040",
    title: "Customer workshop travel",
    category: "Travel",
    amount: 3400,
    requester: "Alex Morgan",
    createdAt: "2026-11-04",
    status: "Rejected",
    description: "Travel to conduct an on-site workshop.",
    history: [
      { at: "2026-11-04", action: "Submitted", by: "Alex Morgan" },
      { at: "2026-11-06", action: "Rejected", by: "Approver" },
    ],
  },
  {
    id: "REQ-1039",
    title: "Design system icons",
    category: "Software",
    amount: 950,
    requester: "Sam Lee",
    createdAt: "2026-11-02",
    status: "Pending",
    description: "Icon package license for the new design system.",
    history: [{ at: "2026-11-02", action: "Submitted", by: "Sam Lee" }],
  },
];
function isRequest(value: unknown): value is ApprovalRequest {
  if (!value || typeof value !== "object") return false;
  const r = value as ApprovalRequest;
  return (
    typeof r.id === "string" &&
    typeof r.title === "string" &&
    typeof r.requester === "string" &&
    typeof r.description === "string" &&
    ["Software", "Equipment", "Travel", "Other"].includes(r.category) &&
    ["Draft", "Pending", "Approved", "Rejected"].includes(r.status) &&
    Number.isFinite(r.amount) &&
    r.amount > 0 &&
    typeof r.createdAt === "string" &&
    Number.isFinite(Date.parse(r.createdAt)) &&
    Array.isArray(r.history) &&
    r.history.every(
      (h) =>
        h &&
        typeof h.action === "string" &&
        typeof h.by === "string" &&
        typeof h.at === "string" &&
        Number.isFinite(Date.parse(h.at)),
    )
  );
}
function initialRequests(): ApprovalRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return sample;
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) &&
      value.every(isRequest) &&
      new Set(value.map((r) => r.id)).size === value.length
      ? value
      : sample;
  } catch {
    return sample;
  }
}
@Injectable({ providedIn: "root" })
export class RequestStore {
  // Keep writes private so every change goes through a business action.
  private readonly itemsState = signal<ApprovalRequest[]>(initialRequests());
  readonly requests = this.itemsState.asReadonly();
  readonly role = signal<Role>("Approver");
  readonly query = signal("");
  readonly statusFilter = signal<RequestStatus | "All">("All");
  readonly categoryFilter = signal<RequestCategory | "All">("All");
  readonly sort = signal("newest");
  readonly onlyMine = signal(false);
  readonly pendingQueue = computed(() => this.requests().filter(r => r.status === "Pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
  readonly storageError = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly pendingCount = computed(
    () => this.requests().filter((r) => r.status === "Pending").length,
  );
  readonly approvedCount = computed(
    () => this.requests().filter((r) => r.status === "Approved").length,
  );
  readonly totalAmount = computed(() =>
    this.requests()
      .filter((r) => r.status !== "Rejected")
      .reduce((sum, r) => sum + r.amount, 0),
  );
  // Derived state stays in sync automatically when its signal dependencies change.
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    return this.requests()
      .filter(
        (r) =>
          (!this.onlyMine() || r.requester === "You") &&
          (status === "All" || r.status === status) &&
          (this.categoryFilter() === "All" ||
            r.category === this.categoryFilter()) &&
          (!q ||
            `${r.id} ${r.title} ${r.requester} ${r.category}`
              .toLowerCase()
              .includes(q)),
      )
      .sort((a, b) =>
        this.sort() === "amount"
          ? b.amount - a.amount
          : this.sort() === "oldest"
            ? a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
            : b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      );
  });
  readonly selected = computed(
    () => this.requests().find((r) => r.id === this.selectedId()) ?? null,
  );
  // Persistence is a side effect; it does not calculate application state.
  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.requests()));
        this.storageError.set(false);
      } catch {
        this.storageError.set(true);
      }
    }, {allowSignalWrites: true});
  }
  add(input: {
    title: string;
    category: RequestCategory;
    amount: number;
    description: string;
  }): void {
    if (
      !input.title.trim() ||
      input.title.length > 100 ||
      !Number.isFinite(input.amount) ||
      input.amount < 1 ||
      input.amount > 1000000 ||
      input.description.trim().length < 20 ||
      input.description.length > 2000 ||
      !["Software", "Travel", "Equipment", "Other"].includes(input.category)
    )
      return;
    const now = new Date();
    const request: ApprovalRequest = {
      id: `REQ-${Math.max(1042, ...this.requests().map(r => Number(r.id.replace("REQ-", "")) || 0)) + 1}`,
      title: input.title.trim(),
      category: input.category,
      amount: input.amount,
      description: input.description.trim(),
      requester: "You",
      createdAt: now.toISOString().slice(0, 10),
      status: "Pending",
      history: [{ at: now.toISOString(), action: "Submitted", by: "You" }],
    };
    this.itemsState.update((items) => [request, ...items]);
    this.selectedId.set(request.id);
    this.onlyMine.set(false);
    this.statusFilter.set("All");
    this.query.set("");
    this.categoryFilter.set("All");
  }
  // Guard transitions in the service as well as hiding buttons in the template.
  decide(id: string, action: "Approved" | "Rejected", note = ""): void {
    if (
      this.role() !== "Approver" ||
      (action === "Rejected" && note.trim().length < 5)
    )
      return;
    this.itemsState.update((items) =>
      items.map((item) =>
        item.id === id && item.status === "Pending"
          ? {
              ...item,
              status: action,
              history: [
                ...item.history,
                {
                  at: new Date().toISOString(),
                  action: note.trim() ? `${action}: ${note.trim()}` : action,
                  by: "Jordan Blake",
                },
              ],
            }
          : item,
      ),
    );
  }
  reset(): void {
    this.itemsState.set(
      sample.map((s) => ({ ...s, history: s.history.map((h) => ({ ...h })) })),
    );
    this.selectedId.set(null);
    this.onlyMine.set(false);
    this.sort.set("newest");
    this.statusFilter.set("All");
    this.categoryFilter.set("All");
    this.query.set("");
  }
}
