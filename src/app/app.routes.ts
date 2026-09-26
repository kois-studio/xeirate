import type { Routes } from '@angular/router';

import { languageGuard, redirectToPreferredLanguage } from './guards/language.guard';
import { LandingPage } from './pages/landing/landing.component';
import { WorkspacePage } from './pages/workspace/workspace.component';

export const routes: Routes = [
    { path: '', pathMatch: 'full', canMatch: [redirectToPreferredLanguage], children: [] },
    {
        path: ':lang',
        canActivate: [languageGuard],
        children: [
            { path: '', component: LandingPage, title: 'Xeirate' },
            { path: 'app', component: WorkspacePage, title: 'Xeirate' },
            { path: '**', redirectTo: '' },
        ],
    },
    { path: '**', redirectTo: '/en' },
];
