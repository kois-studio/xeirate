import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import type { ScheduleColumn, Workspace } from '../../../lib/domain';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { WEEKDAYS, WorkspaceService } from '../../services/workspace.service';
import { AppButtonComponent } from '../button/button.component';
import { ConditionRowComponent } from '../condition-row/condition-row.component';
import { ScheduleViewComponent } from '../schedule-view/schedule-view.component';

type SessionSection = 'calendar' | 'coverage' | 'requests';

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
    readonly showSchedule = input(true);
    readonly section = signal<SessionSection>('calendar');
    readonly store = inject(WorkspaceService);
    readonly selectedParticipantIds = signal<string[]>(
        this.store.workspace().participants.map((participant) => participant.id),
    );

    private readonly formBuilder = inject(FormBuilder);
    readonly form = this.formBuilder.nonNullable.group({ month: [this.store.month()] });
    readonly columnForm = this.formBuilder.nonNullable.group({ label: [''] });
    readonly weekdays = WEEKDAYS;

    startSession(): void {
        this.store.startSession(this.form.controls.month.value, this.selectedParticipantIds());
        if (this.store.activeSession()) {
            this.section.set('coverage');
        }
    }

    isParticipantSelected(participantId: string): boolean {
        return this.selectedParticipantIds().includes(participantId);
    }

    toggleParticipant(participantId: string): void {
        const selected = this.selectedParticipantIds();
        this.selectedParticipantIds.set(
            selected.includes(participantId)
                ? selected.filter((id) => id !== participantId)
                : [...selected, participantId],
        );
    }

    selectSession(sessionId: string): void {
        this.store.selectSession(sessionId);
        this.section.set('coverage');
    }

    setSection(section: SessionSection): void {
        if (section !== 'calendar' && !this.store.activeSession()) {
            return;
        }
        this.section.set(section);
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
        const people = this.store.translate(
            column.requiredPeople === 1
                ? 'sessions.columnPeople.one'
                : 'sessions.columnPeople.other',
            { count: column.requiredPeople },
        );
        const interval = this.store.translate(
            column.intervalDays === 1
                ? 'sessions.columnInterval.one'
                : 'sessions.columnInterval.other',
            { count: column.intervalDays },
        );
        const rest = this.store.translate(
            column.restDaysAfterAssignment === 1
                ? 'sessions.columnRest.one'
                : 'sessions.columnRest.other',
            { count: column.restDaysAfterAssignment },
        );
        return `${people} · ${this.store.weekdaysSelectionLabel(column.weekdays)} · ${interval} · ${column.shiftDurationHours ?? '—'} h · ${rest}`;
    }

    trackColumn(_index: number, column: ScheduleColumn): string {
        return column.id;
    }
}
