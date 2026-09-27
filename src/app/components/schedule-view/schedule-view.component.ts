import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';

import {
    getDaysInMonth,
    type Schedule,
    type ScheduleAssignment,
    type Session,
} from '../../../lib/domain';
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
    private readonly document = inject(DOCUMENT);
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

    exportScheduleImage(session: Session, schedule: Schedule): void {
        const canvas = this.document.createElement('canvas');
        const rows = schedule.assignments.length > 0 ? schedule.assignments : [null];
        canvas.width = 1200;
        canvas.height = 150 + rows.length * 48;
        const context = canvas.getContext('2d');
        if (!context) {
            this.store.notice.set(this.store.translate('notice.imageExportUnavailable'));
            return;
        }
        context.fillStyle = '#162b36';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#e4ff69';
        context.font = '600 42px Georgia, serif';
        context.fillText(`Xeirate · ${this.store.monthLabel(session.month)}`, 56, 68);
        context.fillStyle = '#aec2c5';
        context.font = '20px sans-serif';
        context.fillText(
            `${schedule.assignments.length} / ${this.requiredSlotCount(session)} · ${schedule.fairness.maxDifference} ${this.store.translate('schedule.maxDifference')}`,
            58,
            108,
        );
        rows.forEach((assignment, index) => {
            const y = 150 + index * 48;
            context.fillStyle = index % 2 === 0 ? '#213b47' : '#1e3742';
            context.fillRect(40, y - 30, canvas.width - 80, 40);
            context.fillStyle = assignment ? '#ffffff' : '#aec2c5';
            context.font = '500 20px sans-serif';
            context.fillText(
                assignment
                    ? `${assignment.date} · ${this.assignmentMetadata(assignment, session)} · ${this.assignmentAlias(assignment.participantId)}`
                    : this.store.translate('schedule.noAssignments'),
                58,
                y - 4,
            );
        });
        const anchor = this.document.createElement('a');
        anchor.download = `xeirate-${session.month}.png`;
        anchor.href = canvas.toDataURL('image/png');
        anchor.click();
        this.store.notice.set(this.store.translate('notice.imageExported'));
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
