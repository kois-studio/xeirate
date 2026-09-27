import { DOCUMENT } from '@angular/common';
import { Component, effect, inject } from '@angular/core';

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
    private readonly document = inject(DOCUMENT);
    private lastStep = this.store.wizardStep();

    readonly wizardSteps: readonly { id: WizardStep; label: TranslationKey }[] = [
        { id: 'people', label: 'workspace.stepPeople' },
        { id: 'conditions', label: 'workspace.stepConditions' },
        { id: 'session', label: 'workspace.stepSession' },
        { id: 'proposal', label: 'workspace.stepProposal' },
    ];

    constructor() {
        effect(() => {
            const step = this.store.wizardStep();
            if (step === this.lastStep) {
                return;
            }
            this.lastStep = step;
            queueMicrotask(() => {
                const content = this.document.getElementById('workspace-step-content');
                content?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
                content?.focus({ preventScroll: true });
            });
        });
    }

    stepNumber(step: WizardStep): number {
        return this.wizardSteps.findIndex((item) => item.id === step) + 1;
    }

    isStepComplete(step: WizardStep): boolean {
        const currentStepNumber = this.stepNumber(this.store.wizardStep());
        return step === 'people'
            ? this.store.workspace().participants.length > 0
            : step === 'conditions'
              ? currentStepNumber > this.stepNumber(step) ||
                this.store.workspace().conditions.some((condition) => condition.sessionId === null)
              : step === 'session'
                ? Boolean(this.store.activeSession()) && currentStepNumber > this.stepNumber(step)
                : Boolean(this.store.activeSchedule());
    }

    stepSummary(step: WizardStep): string {
        switch (step) {
            case 'people':
                return this.store.translate('workspace.peopleSummary', {
                    count: this.store.workspace().participants.length,
                });
            case 'conditions':
                return this.store.translate('workspace.conditionsSummary', {
                    count: this.store
                        .workspace()
                        .conditions.filter((condition) => condition.sessionId === null).length,
                });
            case 'session':
                return this.store.activeSession()
                    ? this.store.monthLabel(this.store.activeSession()?.month ?? '')
                    : this.store.translate('workspace.notStarted');
            case 'proposal':
                return this.store.activeSchedule()
                    ? this.store.translate('workspace.reviewReady')
                    : this.store.translate('workspace.reviewPending');
        }
    }
}
