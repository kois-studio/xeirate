import { Component, effect, inject, input } from '@angular/core';
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
export class ConditionDialogComponent {
    readonly editor = input<ConditionEditor | null>(null);
    readonly activeSession = input<Session | undefined>(undefined);

    readonly store = inject(WorkspaceService);
    readonly languageService = inject(LanguageService);
    readonly weekdays = WEEKDAYS;
    private readonly formBuilder = inject(FormBuilder);
    readonly form = this.formBuilder.nonNullable.group({
        kind: this.formBuilder.nonNullable.control<EditableConditionKind>('restriction'),
        preferenceMode: this.formBuilder.nonNullable.control<'avoid' | 'prefer'>('avoid'),
        startDate: this.formBuilder.nonNullable.control(''),
        endDate: this.formBuilder.nonNullable.control(''),
        weekdays: this.formBuilder.nonNullable.control<number[]>([...ALL_WEEKDAY_VALUES]),
        note: this.formBuilder.nonNullable.control('', Validators.required),
    });

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
                kind: condition?.kind === 'preference' ? 'preference' : 'restriction',
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
        });
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
        if (this.form.invalid) {
            this.form.controls.note.markAsTouched();
            this.store.notice.set(this.languageService.translate('notice.noteRequired'));
            return;
        }
        this.store.saveCondition(this.form.getRawValue() as ConditionDraft);
    }

    remove(): void {
        const conditionId = this.editor()?.conditionId;
        if (conditionId) {
            this.store.removeCondition(conditionId);
        }
    }
}
