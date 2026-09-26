import { Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import type { Workspace } from '../../../lib/domain';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { WorkspaceService } from '../../services/workspace.service';
import { AppButtonComponent } from '../button/button.component';
import { ConditionRowComponent } from '../condition-row/condition-row.component';

@Component({
    selector: 'app-people-view',
    standalone: true,
    imports: [AppButtonComponent, ConditionRowComponent, ReactiveFormsModule, TranslatePipe],
    templateUrl: './people-view.component.html',
})
export class PeopleViewComponent {
    readonly workspace = input.required<Workspace>();

    readonly store = inject(WorkspaceService);
    private readonly formBuilder = inject(FormBuilder);
    readonly form = this.formBuilder.nonNullable.group({ alias: [''] });

    addParticipant(): void {
        this.store.addParticipant(this.form.controls.alias.value);
        this.form.reset();
    }
}
