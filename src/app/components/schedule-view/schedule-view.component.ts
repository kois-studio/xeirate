import { Component, computed, effect, inject, signal } from '@angular/core';

import { getDaysInMonth, type ScheduleAssignment, type Session } from '../../../lib/domain';
import { countCoverageSlots } from '../../../lib/scheduler';
import type { TranslationKey } from '../../i18n/translations';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { WEEKDAYS, WorkspaceService } from '../../services/workspace.service';
import { AppButtonComponent } from '../button/button.component';

@Component({
    selector: 'app-schedule-view',
    standalone: true,
    imports: [AppButtonComponent, TranslatePipe],
    templateUrl: './schedule-view.component.html',
})
export class ScheduleViewComponent {
    readonly store = inject(WorkspaceService);
    readonly weekdayHeaders = WEEKDAYS;
    readonly reviewChecks = signal({ alerts: false, coverage: false });
    readonly reviewReady = computed(() => {
        const checks = this.reviewChecks();
        return checks.alerts && checks.coverage;
    });

    constructor() {
        let lastAttempt: number | null = null;
        effect(() => {
            const attempt = this.store.activeSchedule()?.attempt ?? null;
            if (attempt === lastAttempt) {
                return;
            }
            lastAttempt = attempt;
            this.reviewChecks.set({ alerts: false, coverage: false });
        });
    }

    setReviewCheck(key: 'alerts' | 'coverage', checked: boolean): void {
        this.reviewChecks.update((current) => ({ ...current, [key]: checked }));
    }

    calendarDates(session: Session): string[] {
        return Array.from(
            { length: getDaysInMonth(session.month) },
            (_, index) => `${session.month}-${String(index + 1).padStart(2, '0')}`,
        );
    }

    dayNumber(date: string): number {
        return Number(date.slice(-2));
    }

    weekdayHeaderLabel(key: (typeof WEEKDAYS)[number]['key']): string {
        return this.store.translate(`weekday.${key}` as TranslationKey);
    }

    leadingCalendarSlots(session: Session): string[] {
        const firstDate = new Date(`${session.month}-01T12:00:00`);
        const sundayBasedDay = firstDate.getDay();
        const mondayBasedDay = sundayBasedDay === 0 ? 6 : sundayBasedDay - 1;
        return Array.from({ length: mondayBasedDay }, (_, index) => `empty-${index}`);
    }

    assignmentAlias(participantId: string): string {
        return (
            this.store.activeParticipants().find((participant) => participant.id === participantId)
                ?.alias ?? 'Sin nombre'
        );
    }

    assignmentsForDate(date: string): ScheduleAssignment[] {
        return this.store.scheduleAssignments().get(date) ?? [];
    }

    assignmentsForColumn(date: string, columnId: string): ScheduleAssignment[] {
        return this.assignmentsForDate(date).filter(
            (assignment) => assignment.columnId === columnId,
        );
    }

    requiredSlotCount(session: Session): number {
        return countCoverageSlots(session);
    }

    uncoveredSlotCount(session: Session, schedule: { assignments: ScheduleAssignment[] }): number {
        return Math.max(this.requiredSlotCount(session) - schedule.assignments.length, 0);
    }

    assignmentMetadata(assignment: ScheduleAssignment, session: Session): string {
        const column = session.scheduleConfig.columns.find(
            (item) => item.id === assignment.columnId,
        );
        if (!column) {
            return '';
        }
        return column.startTime && column.endTime
            ? `${column.label} · ${column.startTime}–${column.endTime}`
            : column.label;
    }
}
