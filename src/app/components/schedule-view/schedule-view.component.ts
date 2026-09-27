import { Component, inject } from '@angular/core';

import { getDaysInMonth, type ScheduleAssignment, type Session } from '../../../lib/domain';
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
}
