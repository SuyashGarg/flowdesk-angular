import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from "@angular/core";
import { paginate } from "./pagination";
import { CommonModule } from "@angular/common";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { FormsModule } from "@angular/forms";
import { RequestStore } from "./request.store";
import { DialogFocusDirective } from "./dialog-focus.directive";
import { RequestFormComponent } from "./request-form.component";
import { RequestCategory, RequestStatus, Role } from "./request.model";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    RequestFormComponent,
    DialogFocusDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  readonly store = inject(RequestStore);
  readonly view = signal("overview");
  readonly showForm = signal(false);
  readonly notice = signal("");
  readonly searchText = signal("");
  readonly pageSize = signal(25);
  private readonly pageState = signal({ key: "", page: 1 });
  private readonly pageKey = computed(() => JSON.stringify([
    this.view(), this.store.query(), this.store.statusFilter(),
    this.store.categoryFilter(), this.store.onlyMine(), this.store.sort(), this.pageSize(),
  ]));
  readonly requestPage = computed(() => paginate(this.store.filtered(),
    this.pageState().key === this.pageKey() ? this.pageState().page : 1, this.pageSize()));
  readonly activityPageIndex = signal(1);
  readonly activityPage = computed(() => paginate(this.recentActivity(), this.activityPageIndex(), 25));
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }
  search(value: string) {
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.store.query.set(value);
      this.changePage(1);
    }, 250);
  }
  private clearSearch() {
    clearTimeout(this.searchTimer);
    this.searchText.set("");
    this.store.query.set("");
  }
  changePage(page: number) {
    this.pageState.set({ key: this.pageKey(), page });
  }
  setPageSize(value: number) {
    this.pageSize.set(Number(value));
    this.changePage(1);
  }
  readonly statuses: Array<RequestStatus | "All"> = [
    "All",
    "Pending",
    "Approved",
    "Rejected",
  ];
  readonly categories: RequestCategory[] = [
    "Software",
    "Travel",
    "Equipment",
    "Other",
  ];
  readonly pendingAmount = computed(() =>
    this.store
      .requests()
      .filter((r) => r.status === "Pending")
      .reduce((s, r) => s + r.amount, 0),
  );
  readonly approvedAmount = computed(() =>
    this.store
      .requests()
      .filter((r) => r.status === "Approved")
      .reduce((s, r) => s + r.amount, 0),
  );
  readonly recentActivity = computed(() =>
    this.store
      .requests()
      .flatMap((r) =>
        r.history.map((h) => ({ ...h, title: r.title, id: r.id })),
      )
      .sort((a, b) => b.at.localeCompare(a.at)),
  );
  readonly categorySpending = computed(() => {
    const totals = this.categories.map(category => ({
      category,
      amount: this.store.requests().filter(r => r.category === category && r.status !== "Rejected").reduce((sum, r) => sum + r.amount, 0),
    }));
    const max = Math.max(1, ...totals.map(item => item.amount));
    return totals.map(item => ({ ...item, width: item.amount / max * 100 }));
  });
  reviewNext() {
    const next = this.store.pendingQueue()[0];
    if (next) this.select(next.id);
  }
  note = "";
  setRole(role: string) {
    this.store.role.set(role as Role);
  }
  setStatus(status: string) {
    this.store.statusFilter.set(status as RequestStatus | "All");
    this.changePage(1);
  }
  setCategory(category: string) {
    this.store.categoryFilter.set(category as RequestCategory | "All");
    this.changePage(1);
  }
  setSort(value: string) {
    this.store.sort.set(value);
    this.changePage(1);
  }
  setOnlyMine(value: boolean) {
    this.store.onlyMine.set(value);
    this.changePage(1);
  }
  navigate(view: string) {
    this.view.set(view);
    this.store.statusFilter.set("All");
    this.clearSearch();
    this.activityPageIndex.set(1);
    this.pageState.set({ key: "", page: 1 });
    this.store.categoryFilter.set("All");
    this.store.onlyMine.set(false);
    this.store.sort.set("newest");
  }
  async create(input: {
    title: string;
    category: RequestCategory;
    amount: number;
    description: string;
  }) {
    this.clearSearch();
    this.changePage(1);
    if (!await this.store.add(input)) return;
    this.showForm.set(false);
    this.view.set("requests");
    this.notice.set("Request submitted. It is ready for review.");
  }
  async decide(action: "Approved" | "Rejected") {
    const r = this.store.selected();
    if (!r) return;
    if (action === "Rejected" && this.note.trim().length < 5) {
      this.notice.set(
        "Add a reason of at least 5 characters before rejecting.",
      );
      return;
    }
    if (!await this.store.decide(r.id, action, this.note)) return;
    this.note = "";
    this.notice.set(`${r.id} ${action.toLowerCase()}.`);
  }
  select(id: string) {
    this.note = "";
    this.store.selectedId.set(id);
  }
  exportCsv() {
    clearTimeout(this.searchTimer);
    this.store.query.set(this.searchText());
    const rows = [
      ["ID", "Title", "Category", "Requester", "Amount (USD)", "Status"],
      ...this.store
        .filtered()
        .map((r) => [
          r.id,
          r.title,
          r.category,
          r.requester,
          r.amount,
          r.status,
        ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "'$&")
                .replace(/"/g, '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowdesk-requests.csv";
    a.click();
    URL.revokeObjectURL(url);
    this.notice.set("Filtered requests exported.");
  }
  async reset() {
    if (
      confirm(
        "Replace your requests and decisions with the original demo data?",
      )
    ) {
      this.clearSearch();
      this.changePage(1);
      if (!await this.store.reset()) return;
      this.notice.set("Demo data restored.");
    }
  }
}
