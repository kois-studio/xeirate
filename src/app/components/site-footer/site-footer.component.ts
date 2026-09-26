import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
    selector: 'app-site-footer',
    standalone: true,
    imports: [RouterLink, TranslatePipe],
    templateUrl: './site-footer.component.html',
})
export class SiteFooterComponent {
    readonly languageService = inject(LanguageService);
    readonly workspace = input(false);
    readonly primaryText = input<string | null>(null);
}
