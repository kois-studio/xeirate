import { booleanAttribute, Component, input, output } from '@angular/core';

@Component({
    selector: 'app-button',
    standalone: true,
    templateUrl: './button.component.html',
})
export class AppButtonComponent {
    readonly buttonClass = input('');
    readonly ariaCurrent = input<string | null>(null);
    readonly ariaLabel = input<string | null>(null);
    readonly ariaPressed = input<boolean | null>(null);
    readonly type = input<'button' | 'submit' | 'reset'>('button');
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly buttonClick = output<MouseEvent>();

    emitClick(event: MouseEvent): void {
        if (!this.disabled()) {
            this.buttonClick.emit(event);
        }
    }
}
