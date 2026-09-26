import { inject } from '@angular/core';
import type { CanActivateFn, CanMatchFn } from '@angular/router';
import { Router } from '@angular/router';

import { LanguageService } from '../services/language.service';

export const redirectToPreferredLanguage: CanMatchFn = () => {
    const languageService = inject(LanguageService);
    return inject(Router).parseUrl(`/${languageService.preferredLanguage()}`);
};

export const languageGuard: CanActivateFn = (route) => {
    const languageService = inject(LanguageService);
    const language = route.paramMap.get('lang');
    if (language !== 'en' && language !== 'es') {
        return inject(Router).parseUrl(`/${languageService.preferredLanguage()}`);
    }
    languageService.setRouteLanguage(language);
    return true;
};
