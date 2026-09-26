import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { AppButtonComponent } from '../button/button.component';

@Component({
    selector: 'app-site-header',
    standalone: true,
    imports: [AppButtonComponent, RouterLink, TranslatePipe],
    templateUrl: './site-header.component.html',
})
export class SiteHeaderComponent {
    readonly languageService = inject(LanguageService);
    readonly workspace = input(false);

    selectLanguage(language: 'en' | 'es'): void {
        this.languageService.navigateToLanguage(language);
    }
}
