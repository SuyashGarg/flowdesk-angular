import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
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
  note = "";
  setRole(role: string) {
    this.store.role.set(role as Role);
  }
  setStatus(status: string) {
    this.store.statusFilter.set(status as RequestStatus | "All");
  }
  setCategory(category: string) {
    this.store.categoryFilter.set(category as RequestCategory | "All");
  }
  navigate(view: string) {
    this.view.set(view);
    this.store.statusFilter.set("All");
    this.store.query.set("");
    this.store.categoryFilter.set("All");
  }
  create(input: {
    title: string;
    category: RequestCategory;
    amount: number;
    description: string;
  }) {
    this.store.add(input);
    this.showForm.set(false);
    this.view.set("requests");
    this.notice.set("Request submitted. It is ready for review.");
  }
  decide(action: "Approved" | "Rejected") {
    const r = this.store.selected();
    if (!r) return;
    if (action === "Rejected" && this.note.trim().length < 5) {
      this.notice.set(
        "Add a reason of at least 5 characters before rejecting.",
      );
      return;
    }
    this.store.decide(r.id, action, this.note);
    this.note = "";
    this.notice.set(`${r.id} ${action.toLowerCase()}.`);
  }
  select(id: string) {
    this.note = "";
    this.store.selectedId.set(id);
  }
  exportCsv() {
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
  reset() {
    if (
      confirm(
        "Replace your requests and decisions with the original demo data?",
      )
    ) {
      this.store.reset();
      this.notice.set("Demo data restored.");
    }
  }
}
