import { Component, inject } from '@angular/core';

import { AppButtonComponent } from '../../components/button/button.component';
import { ConditionDialogComponent } from '../../components/condition-dialog/condition-dialog.component';
import { PeopleViewComponent } from '../../components/people-view/people-view.component';
import { ScheduleViewComponent } from '../../components/schedule-view/schedule-view.component';
import { SessionsViewComponent } from '../../components/sessions-view/sessions-view.component';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { WorkspaceService } from '../../services/workspace.service';
import type { TranslationKey } from '../../i18n/translations';
import type { WizardStep } from '../../services/workspace.service';

@Component({
    selector: 'app-workspace-page',
    standalone: true,
    imports: [
        AppButtonComponent,
        ConditionDialogComponent,
        PeopleViewComponent,
        ScheduleViewComponent,
        SessionsViewComponent,
        SiteFooterComponent,
        SiteHeaderComponent,
        TranslatePipe,
    ],
    templateUrl: './workspace.component.html',
})
export class WorkspacePage {
    readonly store = inject(WorkspaceService);

    readonly wizardSteps: readonly { id: WizardStep; label: TranslationKey }[] = [
        { id: 'people', label: 'workspace.stepPeople' },
        { id: 'conditions', label: 'workspace.stepConditions' },
        { id: 'session', label: 'workspace.stepSession' },
        { id: 'proposal', label: 'workspace.stepProposal' },
    ];

    stepNumber(step: WizardStep): number {
        return this.wizardSteps.findIndex((item) => item.id === step) + 1;
    }
}
