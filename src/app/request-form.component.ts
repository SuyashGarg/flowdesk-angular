import { Component, output } from "@angular/core";
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { RequestCategory } from "./request.model";

// The form owns input and validation; the parent owns saving and navigation.
@Component({
  selector: "app-request-form",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline" floatLabel="always">
        <mat-label>Request title</mat-label>
        <input
          matInput
          formControlName="title"
          placeholder="e.g. Laptops for the design team"
          maxlength="100"
        />
        <mat-error>Enter a request title.</mat-error>
      </mat-form-field>
      <div class="two">
        <mat-form-field appearance="outline" floatLabel="always">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category">
            @for (category of categories; track category) {
              <mat-option [value]="category">{{ category }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" floatLabel="always">
          <mat-label>Amount (USD)</mat-label>
          <input
            matInput
            type="number"
            formControlName="amount"
            min="1"
            max="1000000"
            placeholder="0.00"
          />
          <mat-error>Enter $1–$1,000,000.</mat-error>
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline" floatLabel="always">
        <mat-label>Business justification</mat-label>
        <textarea
          matInput
          formControlName="description"
          rows="4"
          maxlength="2000"
          placeholder="What problem does this solve? Who benefits, and why now?"
        ></textarea>
        <mat-hint
          >At least 20 characters explaining the business need.</mat-hint
        >
        <mat-error
          >Include at least 20 characters of meaningful context.</mat-error
        >
      </mat-form-field>
      @if (attempted && form.invalid) {
        <p role="alert" class="error">
          Please review the highlighted fields before submitting.
        </p>
      }
      <div class="actions">
        <button mat-button type="button" (click)="cancelled.emit()">
          Cancel
        </button>
        <button mat-flat-button type="submit">Submit request ↗</button>
      </div>
    </form>
  `,
  styles: [
    `
      form {
        display: grid;
        gap: 6px;
        padding-top: 20px;
      }
      mat-form-field {
        width: 100%;
        min-width: 0;
      }
      .two {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 16px;
      }
      textarea {
        resize: vertical;
      }
      .error {
        color: #b3261e;
        font-size: 12px;
        line-height: 1.6;
        margin: 0;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 20px;
      }
      @media (max-width: 440px) {
        .two {
          grid-template-columns: 1fr;
          gap: 6px;
        }
      }
    `,
  ],
})
export class RequestFormComponent {
  readonly categories: RequestCategory[] = [
    "Software",
    "Equipment",
    "Travel",
    "Other",
  ];
  readonly saved = output<{
    title: string;
    category: RequestCategory;
    amount: number;
    description: string;
  }>();
  readonly cancelled = output<void>();
  attempted = false;
  readonly form = new FormGroup({
    title: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/.*\S.*/),
        Validators.maxLength(100),
      ],
    }),
    category: new FormControl<RequestCategory>("Software", {
      nonNullable: true,
    }),
    amount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(1000000),
    ]),
    description: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.required,
        (control) =>
          control.value.trim().length >= 20 && control.value.length <= 2000
            ? null
            : { justification: true },
      ],
    }),
  });
  submit() {
    this.attempted = true;
    this.form.markAllAsTouched();
    if (this.form.valid) {
      const v = this.form.getRawValue();
      if (v.description.trim().length < 20) return;
      this.saved.emit({ ...v, amount: v.amount! });
    }
  }
}
