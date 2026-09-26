import { Component, inject } from '@angular/core';

import { getDaysInMonth, type Session } from '../../../lib/domain';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { WorkspaceService } from '../../services/workspace.service';
import { AppButtonComponent } from '../button/button.component';

@Component({
    selector: 'app-schedule-view',
    standalone: true,
    imports: [AppButtonComponent, TranslatePipe],
    templateUrl: './schedule-view.component.html',
})
export class ScheduleViewComponent {
    readonly store = inject(WorkspaceService);

    calendarDates(session: Session): string[] {
        return Array.from(
            { length: getDaysInMonth(session.month) },
            (_, index) => `${session.month}-${String(index + 1).padStart(2, '0')}`,
        );
    }

    dayNumber(date: string): number {
        return Number(date.slice(-2));
    }

    assignmentAlias(participantId: string): string {
        return (
            this.store.activeParticipants().find((participant) => participant.id === participantId)
                ?.alias ?? 'Sin nombre'
        );
    }
}
