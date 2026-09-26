import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
    selector: 'app-landing-page',
    standalone: true,
    imports: [RouterLink, SiteFooterComponent, SiteHeaderComponent, TranslatePipe],
    templateUrl: './landing.component.html',
})
export class LandingPage {
    readonly languageService = inject(LanguageService);
}
