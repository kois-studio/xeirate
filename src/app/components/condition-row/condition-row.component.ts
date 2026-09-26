import { Component, inject, input } from '@angular/core';

import type { Condition } from '../../../lib/domain';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { type ConditionScope, WorkspaceService } from '../../services/workspace.service';
import { AppButtonComponent } from '../button/button.component';

@Component({
    selector: 'app-condition-row',
    standalone: true,
    imports: [AppButtonComponent, TranslatePipe],
    templateUrl: './condition-row.component.html',
})
export class ConditionRowComponent {
    readonly condition = input.required<Condition>();

    readonly store = inject(WorkspaceService);

    get scope(): ConditionScope {
        return this.condition().sessionId === null ? 'fixed' : 'session';
    }
}
