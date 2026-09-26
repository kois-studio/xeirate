import { Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import type { Workspace } from '../../../lib/domain';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { WorkspaceService } from '../../services/workspace.service';
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

    startSession(): void {
        this.store.startSession(this.form.controls.month.value);
    }
}
