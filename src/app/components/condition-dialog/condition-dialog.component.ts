import { DOCUMENT } from '@angular/common';
import {
    Component,
    effect,
    type ElementRef,
    inject,
    input,
    type OnDestroy,
    viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import type { Session } from '../../../lib/domain';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import {
    ALL_WEEKDAY_VALUES,
    type ConditionDraft,
    type ConditionEditor,
    type EditableConditionKind,
    WEEKDAYS,
    WorkspaceService,
} from '../../services/workspace.service';
import { AppButtonComponent } from '../button/button.component';

@Component({
    selector: 'app-condition-dialog',
    standalone: true,
    imports: [AppButtonComponent, ReactiveFormsModule, TranslatePipe],
    templateUrl: './condition-dialog.component.html',
})
export class ConditionDialogComponent implements OnDestroy {
    readonly editor = input<ConditionEditor | null>(null);
    readonly activeSession = input<Session | undefined>(undefined);

    readonly store = inject(WorkspaceService);
    readonly languageService = inject(LanguageService);
    private readonly document = inject(DOCUMENT);
    private readonly dialogPanel = viewChild<ElementRef<HTMLElement>>('dialogPanel');
    private readonly previouslyFocusedElement = this.document.activeElement as HTMLElement | null;
    readonly weekdays = WEEKDAYS;
    private readonly formBuilder = inject(FormBuilder);
    readonly form = this.formBuilder.nonNullable.group({
        kind: this.formBuilder.nonNullable.control<EditableConditionKind | ''>(''),
        preferenceMode: this.formBuilder.nonNullable.control<'avoid' | 'prefer'>('avoid'),
        startDate: this.formBuilder.nonNullable.control(''),
        endDate: this.formBuilder.nonNullable.control(''),
        weekdays: this.formBuilder.nonNullable.control<number[]>([...ALL_WEEKDAY_VALUES]),
        note: this.formBuilder.nonNullable.control('', Validators.required),
    });
    submitted = false;

    constructor() {
        effect(() => {
            const editor = this.editor();
            if (!editor) {
                return;
            }
            const condition = editor.conditionId
                ? this.store.workspace().conditions.find((item) => item.id === editor.conditionId)
                : undefined;
            this.form.reset({
                kind: condition
                    ? condition.kind === 'preference'
                        ? 'preference'
                        : condition.kind === 'restriction'
                          ? 'restriction'
                          : condition.kind
                    : '',
                preferenceMode: condition?.preferenceMode ?? 'avoid',
                startDate: condition?.startDate ?? '',
                endDate: condition?.endDate ?? '',
                weekdays:
                    editor.scope === 'fixed' &&
                    condition?.weekdays !== null &&
                    condition?.weekdays !== undefined
                        ? [...condition.weekdays]
                        : [...ALL_WEEKDAY_VALUES],
                note: condition?.note ?? '',
            });
            this.submitted = false;
        });
        effect(() => {
            if (!this.editor() || !this.dialogPanel()) {
                return;
            }
            queueMicrotask(() => this.dialogPanel()?.nativeElement.focus());
        });
    }

    ngOnDestroy(): void {
        if (this.previouslyFocusedElement?.isConnected) {
            this.previouslyFocusedElement.focus();
        }
    }

    handleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.store.closeConditionEditor();
            return;
        }
        if (event.key !== 'Tab') {
            return;
        }
        const panel = this.dialogPanel()?.nativeElement;
        if (!panel) {
            return;
        }
        const focusable = Array.from(
            panel.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
            ),
        );
        if (focusable.length === 0) {
            event.preventDefault();
            panel.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) {
            return;
        }
        if (event.shiftKey && this.document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && this.document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    dateRangeInvalid(): boolean {
        const { startDate, endDate } = this.form.getRawValue();
        return Boolean(startDate && endDate && startDate > endDate);
    }

    showNoteError(): boolean {
        return (
            this.form.controls.note.invalid && (this.form.controls.note.touched || this.submitted)
        );
    }

    showDateError(): boolean {
        return (
            this.dateRangeInvalid() &&
            (this.form.controls.startDate.touched ||
                this.form.controls.endDate.touched ||
                this.submitted)
        );
    }

    isFixed(): boolean {
        return this.editor()?.scope === 'fixed';
    }

    weekdayLabel(value: number): string {
        const weekday = this.weekdays.find((item) => item.value === value);
        return weekday ? this.languageService.translate(`weekday.${weekday.key}`) : '';
    }

    toggleWeekday(value: number): void {
        const current = this.form.controls.weekdays.value;
        this.form.controls.weekdays.setValue(
            current.includes(value)
                ? current.filter((weekday) => weekday !== value)
                : [...current, value].sort(
                      (left, right) =>
                          ALL_WEEKDAY_VALUES.indexOf(left) - ALL_WEEKDAY_VALUES.indexOf(right),
                  ),
        );
    }

    save(): void {
        this.submitted = true;
        this.form.markAllAsTouched();
        if (
            this.form.invalid ||
            !this.form.controls.kind.value ||
            (this.isFixed() && this.form.controls.weekdays.value.length === 0) ||
            this.dateRangeInvalid()
        ) {
            this.store.notice.set(
                this.languageService.translate(
                    this.dateRangeInvalid()
                        ? 'notice.endDateInvalid'
                        : this.isFixed() && this.form.controls.weekdays.value.length === 0
                          ? 'notice.weekdayRequired'
                          : this.form.controls.kind.value
                            ? 'notice.noteRequired'
                            : 'notice.conditionTypeRequired',
                ),
            );
            return;
        }
        this.store.saveCondition({
            ...this.form.getRawValue(),
            kind: this.form.controls.kind.value as EditableConditionKind,
        } as ConditionDraft);
    }

    remove(): void {
        const conditionId = this.editor()?.conditionId;
        if (conditionId) {
            this.store.removeCondition(conditionId);
        }
    }
}
