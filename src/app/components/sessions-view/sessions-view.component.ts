import { Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import type { ScheduleColumn, Workspace } from '../../../lib/domain';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { WEEKDAYS, WorkspaceService } from '../../services/workspace.service';
import { AppButtonComponent } from '../button/button.component';
import { ConditionRowComponent } from '../condition-row/condition-row.component';
import { ScheduleViewComponent } from '../schedule-view/schedule-view.component';

@Component({
    selector: 'app-sessions-view',
    standalone: true,
    imports: [
        AppButtonComponent,
        ConditionRowComponent,
        ReactiveFormsModule,
        ScheduleViewComponent,
        TranslatePipe,
    ],
    templateUrl: './sessions-view.component.html',
})
export class SessionsViewComponent {
    readonly workspace = input.required<Workspace>();

    readonly store = inject(WorkspaceService);
    private readonly formBuilder = inject(FormBuilder);
    readonly form = this.formBuilder.nonNullable.group({ month: [this.store.month()] });
    readonly columnForm = this.formBuilder.nonNullable.group({ label: [''] });
    readonly weekdays = WEEKDAYS;

    startSession(): void {
        this.store.startSession(this.form.controls.month.value);
    }

    addColumn(): void {
        this.store.addScheduleColumn(this.columnForm.controls.label.value);
        this.columnForm.reset();
    }

    updateColumnLabel(columnId: string, event: Event): void {
        const label = (event.target as HTMLInputElement).value;
        if (label.trim()) {
            this.store.updateScheduleColumn(columnId, { label });
        }
    }

    updateColumnNumber(
        columnId: string,
        field: 'requiredPeople' | 'intervalDays' | 'restDaysAfterAssignment',
        event: Event,
    ): void {
        const value = Number((event.target as HTMLInputElement).value);
        if (Number.isInteger(value) && value >= 0) {
            this.store.updateScheduleColumn(columnId, { [field]: value });
        }
    }

    updateColumnDuration(columnId: string, event: Event): void {
        const rawValue = (event.target as HTMLInputElement).value;
        const value = rawValue ? Number(rawValue) : null;
        if (value === null || (Number.isFinite(value) && value > 0)) {
            this.store.updateScheduleColumn(columnId, { shiftDurationHours: value });
        }
    }

    updateColumnTime(columnId: string, field: 'startTime' | 'endTime', event: Event): void {
        const value = (event.target as HTMLInputElement).value || null;
        this.store.updateScheduleColumn(columnId, { [field]: value });
    }

    columnWeekdayLabel(value: number): string {
        return this.store.weekdaysSelectionLabel([value]);
    }

    columnPreview(column: ScheduleColumn): string {
        return this.store.translate('sessions.columnPreview', {
            people: column.requiredPeople,
            days: this.store.weekdaysSelectionLabel(column.weekdays),
            interval: column.intervalDays,
            hours: column.shiftDurationHours ?? '—',
            rest: column.restDaysAfterAssignment,
        });
    }

    trackColumn(_index: number, column: ScheduleColumn): string {
        return column.id;
    }
}
