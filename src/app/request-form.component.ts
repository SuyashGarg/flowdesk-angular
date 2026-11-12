import { Component, output } from "@angular/core";
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { RequestCategory } from "./request.model";

// The form owns input and validation; the parent owns saving and navigation.
@Component({
  selector: "app-request-form",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: ` <form [formGroup]="form" (ngSubmit)="submit()">
    <label
      >Request title<input
        formControlName="title"
        placeholder="e.g. Laptops for the new design team"
        maxlength="100"
    /></label>
    <div class="two">
      <label
        >Category<select formControlName="category">
          <option>Software</option>
          <option>Equipment</option>
          <option>Travel</option>
          <option>Other</option>
        </select></label
      >
      <label
        >Amount (USD)<input
          type="number"
          formControlName="amount"
          min="1"
          max="1000000"
          placeholder="0.00"
      /></label>
    </div>
    <label
      >Business justification<textarea
        formControlName="description"
        rows="5"
        maxlength="2000"
        placeholder="What problem does this solve? Who benefits, and why now?"
      ></textarea>
    </label>
    <p class="hint">
      Use a clear title, an amount between $1 and $1,000,000, and at least 20
      characters of justification.
    </p>
    @if (attempted && form.invalid) {
      <p role="alert" class="error">
        Please complete all fields with the requirements above.
      </p>
    }
    <div class="actions">
      <button type="button" (click)="cancelled.emit()">Cancel</button
      ><button class="primary" type="submit">Submit request ↗</button>
    </div>
  </form>`,
  styles: [
    `
      label {
        display: grid;
        gap: 8px;
        margin: 18px 0;
        font-size: 14px;
        font-weight: 600;
      }
      input,
      select,
      textarea {
        width: 100%;
        border: 1px solid #d9dfdc;
        border-radius: 8px;
        padding: 12px;
        background: white;
        font: inherit;
      }
      .two {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .hint {
        font-size: 12px;
        color: #65736d;
        line-height: 1.6;
      }
      .error {
        color: #b52d35;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
      }
      button {
        padding: 12px 18px;
        border: 1px solid #d9dfdc;
        border-radius: 8px;
        background: white;
      }
      .primary {
        background: #235c48;
        color: white;
        border-color: #235c48;
      }
    `,
  ],
})
export class RequestFormComponent {
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
        (control) => control.value.trim().length >= 20 && control.value.length <= 2000 ? null : {justification: true},
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
