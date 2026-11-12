import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  output,
} from "@angular/core";
// Keep keyboard navigation inside an open dialog, then restore the trigger.
@Directive({ selector: "[appDialogFocus]", standalone: true })
export class DialogFocusDirective implements AfterViewInit, OnDestroy {
  readonly dialogEscape = output<void>();
  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  private readonly previous = document.activeElement as HTMLElement | null;
  ngAfterViewInit() {
    this.element.focus();
  }
  ngOnDestroy() {
    this.previous?.focus();
  }
  @HostListener("keydown", ["$event"]) onKey(event: KeyboardEvent) {
    if (event.key === "Escape") {
      // Let the Material overlay handle Escape before closing its parent dialog.
      const combobox = (event.target as HTMLElement).closest(
        '[role="combobox"]',
      );
      if (combobox?.getAttribute("aria-expanded") === "true") return;
      event.stopPropagation();
      this.dialogEscape.emit();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(
      this.element.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
      ),
    ).filter((e) => e.offsetParent !== null);
    const first = items[0],
      last = items[items.length - 1];
    if (!first) {
      event.preventDefault();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === this.element)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        document.activeElement === this.element)
    ) {
      event.preventDefault();
      first.focus();
    }
  }
}
