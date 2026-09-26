import { inject, Pipe, type PipeTransform } from '@angular/core';

import type { TranslationKey, TranslationParams } from '../i18n/translations';
import { LanguageService } from '../services/language.service';

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
    private readonly languageService = inject(LanguageService);

    transform(key: TranslationKey, params: TranslationParams = {}): string {
        this.languageService.language();
        return this.languageService.translate(key, params);
    }
}
