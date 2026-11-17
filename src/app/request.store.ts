import { RequestApi } from "./request.api";
import { computed, inject, Injectable, signal } from "@angular/core";
import {
  ApprovalRequest,
  RequestCategory,
  RequestStatus,
  Role,
} from "./request.model";
@Injectable({ providedIn: "root" })
export class RequestStore {
  // Keep writes private so every change goes through a business action.
  private readonly itemsState = signal<ApprovalRequest[]>([]);
  readonly requests = this.itemsState.asReadonly();
  readonly role = signal<Role>("Approver");
  readonly query = signal("");
  readonly statusFilter = signal<RequestStatus | "All">("All");
  readonly categoryFilter = signal<RequestCategory | "All">("All");
  readonly sort = signal("newest");
  readonly onlyMine = signal(false);
  readonly pendingQueue = computed(() => this.requests().filter(r => r.status === "Pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal("");
  private readonly api = inject(RequestApi);
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
  constructor() { void this.load(); }

  async load(): Promise<void> {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.error.set("");
    try { this.itemsState.set(await this.api.list()); }
    catch { this.error.set("Could not load requests. Check the API server and try again."); }
    finally { this.loading.set(false); }
  }

  private async mutate(action: () => Promise<void>): Promise<boolean> {
    if (this.saving() || this.loading()) return false;
    this.saving.set(true);
    this.error.set("");
    try { await action(); return true; }
    catch (error: any) {
      this.error.set(error?.error?.message || "Could not save changes. Please try again.");
      return false;
    } finally { this.saving.set(false); }
  }

  add(input: { title: string; category: RequestCategory; amount: number; description: string }): Promise<boolean> {
    return this.mutate(async () => {
      const request = await this.api.create(input);
      this.itemsState.update(items => [request, ...items]);
      this.selectedId.set(request.id);
      this.onlyMine.set(false);
      this.statusFilter.set("All");
      this.query.set("");
      this.categoryFilter.set("All");
    });
  }

  decide(id: string, action: "Approved" | "Rejected", note = ""): Promise<boolean> {
    return this.mutate(async () => {
      const request = await this.api.decide(id, action, note, this.role());
      this.itemsState.update(items => items.map(item => item.id === id ? request : item));
    });
  }

  reset(): Promise<boolean> {
    return this.mutate(async () => {
      this.itemsState.set(await this.api.reset());
      this.selectedId.set(null);
      this.onlyMine.set(false);
      this.sort.set("newest");
      this.statusFilter.set("All");
      this.categoryFilter.set("All");
      this.query.set("");
    });
  }
}
