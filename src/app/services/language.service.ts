import { DOCUMENT } from '@angular/common';
import { computed, effect, Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import {
    type Language,
    TRANSLATIONS,
    type TranslationKey,
    type TranslationParams,
} from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'xeirate.language';
const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'es'];

function isLanguage(value: string | null): value is Language {
    return value !== null && SUPPORTED_LANGUAGES.includes(value as Language);
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
    private readonly document = inject(DOCUMENT);
    private readonly router = inject(Router);
    private readonly storage = this.document.defaultView?.localStorage;

    readonly language = signal<Language>(this.initialLanguage());
    readonly locale = computed(() => (this.language() === 'es' ? 'es-ES' : 'en-US'));

    constructor() {
        effect(() => {
            this.language();
            this.updateMetadata(this.router.url);
        });
        this.router.events
            .pipe(filter((event) => event instanceof NavigationEnd))
            .subscribe((event) => this.updateMetadata(event.urlAfterRedirects));
    }

    private updateMetadata(url: string): void {
        const workspaceRoute = url.split('?')[0]?.split('#')[0]?.endsWith('/app') ?? false;
        this.document.documentElement.lang = this.language();
        this.document.title = this.translate(
            workspaceRoute ? 'workspace.metaTitle' : 'landing.metaTitle',
        );
        this.document
            .querySelector('meta[name="description"]')
            ?.setAttribute(
                'content',
                this.translate(
                    workspaceRoute ? 'workspace.metaDescription' : 'landing.metaDescription',
                ),
            );
    }

    preferredLanguage(): Language {
        return this.initialLanguage();
    }

    setLanguage(language: Language): void {
        this.language.set(language);
        try {
            this.storage?.setItem(LANGUAGE_STORAGE_KEY, language);
        } catch {
            // A blocked localStorage should not prevent changing the current language.
        }
    }

    setRouteLanguage(language: string | null): void {
        if (isLanguage(language)) {
            this.language.set(language);
        }
    }

    localizedUrl(url: string, language: Language): string {
        const [pathAndQuery, fragment] = url.split('#', 2);
        const [path, query] = (pathAndQuery ?? '').split('?', 2);
        const segments = (path ?? '').split('/').filter(Boolean);
        if (isLanguage(segments[0] ?? null)) {
            segments.shift();
        }
        const localizedPath = `/${language}${segments.length > 0 ? `/${segments.join('/')}` : ''}`;
        return `${localizedPath}${query ? `?${query}` : ''}${fragment ? `#${fragment}` : ''}`;
    }

    navigateToLanguage(language: Language): void {
        this.setLanguage(language);
        void this.router.navigateByUrl(this.localizedUrl(this.router.url, language));
    }

    translate(key: TranslationKey, params: TranslationParams = {}): string {
        const value = TRANSLATIONS[this.language()][key] ?? TRANSLATIONS.en[key] ?? key;
        return value.replace(/\{(\w+)\}/g, (match, name: string) =>
            params[name] === undefined ? match : String(params[name]),
        );
    }

    private initialLanguage(): Language {
        try {
            const stored = this.storage?.getItem(LANGUAGE_STORAGE_KEY) ?? null;
            if (isLanguage(stored)) {
                return stored;
            }
        } catch {
            // Fall through to browser detection.
        }
        const browserLanguage = this.document.defaultView?.navigator.language.toLowerCase() ?? '';
        return browserLanguage.startsWith('es') ? 'es' : 'en';
    }
}
