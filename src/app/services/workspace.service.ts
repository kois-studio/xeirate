import { DOCUMENT } from '@angular/common';
import { computed, effect, Injectable, inject, signal } from '@angular/core';
import { createDemoWorkspace } from '../../lib/demo-fixture';
import {
    type Condition,
    type ConditionKind,
    createCondition,
    createDefaultScheduleColumn,
    createDefaultScheduleConfiguration,
    createIdentifier,
    createSession,
    emptyWorkspace,
    formatMonth,
    getDaysInMonth,
    isValidMonth,
    type Participant,
    type ScheduleColumn,
    type ScheduleConfiguration,
    type PreferenceMode,
    type ScheduleIssue,
    type Session,
    type Workspace,
    scheduleConfigurationSchema,
} from '../../lib/domain';
import { formatScheduleForSharing } from '../../lib/export';
import {
    clearWorkspace,
    loadWorkspace,
    type StorageLike,
    saveWorkspace,
} from '../../lib/persistence';
import { generateSchedule } from '../../lib/scheduler';
import type { TranslationKey, TranslationParams } from '../i18n/translations';
import { LanguageService } from './language.service';

export type AppView = 'people' | 'sessions';
export type ConditionScope = 'fixed' | 'session';
export type EditableConditionKind = Exclude<ConditionKind, 'clarification'>;

export type ConditionEditor = {
    conditionId: string | null;
    participantId: string;
    scope: ConditionScope;
};

export type ConditionDraft = {
    kind: EditableConditionKind;
    preferenceMode: PreferenceMode;
    startDate: string;
    endDate: string;
    weekdays: number[];
    note: string;
};

export const WEEKDAYS = [
    { value: 1, key: 'monday', shortLabel: 'M' },
    { value: 2, key: 'tuesday', shortLabel: 'T' },
    { value: 3, key: 'wednesday', shortLabel: 'W' },
    { value: 4, key: 'thursday', shortLabel: 'T' },
    { value: 5, key: 'friday', shortLabel: 'F' },
    { value: 6, key: 'saturday', shortLabel: 'S' },
    { value: 0, key: 'sunday', shortLabel: 'S' },
] as const;

export const ALL_WEEKDAY_VALUES: number[] = WEEKDAYS.map((weekday) => weekday.value);

function currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function kindTranslationKey(kind: ConditionKind): TranslationKey {
    switch (kind) {
        case 'restriction':
            return 'condition.requirement';
        case 'preference':
            return 'condition.preference';
        case 'clarification':
            return 'condition.clarification';
    }
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
    private readonly storage: StorageLike | undefined = inject(DOCUMENT).defaultView?.localStorage;
    private readonly languageService = inject(LanguageService);

    readonly workspace = signal<Workspace>(emptyWorkspace());
    readonly view = signal<AppView>('people');
    readonly month = signal(currentMonth());
    readonly notice = signal('');
    readonly storageReady = signal(false);
    readonly editor = signal<ConditionEditor | null>(null);

    readonly activeSession = computed<Session | undefined>(() =>
        this.workspace().sessions.find(
            (session) => session.id === this.workspace().activeSessionId,
        ),
    );

    readonly activeParticipants = computed<Participant[]>(() => {
        const session = this.activeSession();
        if (!session) {
            return [];
        }
        return session.participantIds.flatMap((participantId) => {
            const participant = this.workspace().participants.find(
                (item) => item.id === participantId,
            );
            return participant ? [participant] : [];
        });
    });

    readonly activeConditions = computed<Condition[]>(() => {
        const session = this.activeSession();
        if (!session) {
            return [];
        }
        return this.workspace().conditions.filter(
            (condition) =>
                condition.sessionId === session.id ||
                (condition.sessionId === null &&
                    session.participantIds.includes(condition.participantId)),
        );
    });

    readonly activeSchedule = computed(() => this.activeSession()?.schedule ?? null);
    readonly scheduleAssignments = computed(
        () =>
            this.activeSchedule()?.assignments.reduce((byDate, assignment) => {
                const assignments = byDate.get(assignment.date) ?? [];
                assignments.push(assignment);
                byDate.set(assignment.date, assignments);
                return byDate;
            }, new Map<string, NonNullable<Session['schedule']>['assignments']>()) ?? new Map(),
    );
    readonly scheduleIssues = computed(() => this.activeSchedule()?.issues ?? []);
    readonly scheduleErrors = computed(() =>
        this.scheduleIssues().filter((item) => item.severity === 'error'),
    );
    readonly scheduleWarnings = computed(() =>
        this.scheduleIssues().filter((item) => item.severity === 'warning'),
    );

    constructor() {
        const result = loadWorkspace(this.storage);
        this.workspace.set(result.workspace);
        this.storageReady.set(true);
        this.notice.set(
            result.status === 'invalid'
                ? this.languageService.translate('notice.invalidStorage')
                : result.status === 'loaded'
                  ? this.languageService.translate('notice.loadedStorage')
                  : this.languageService.translate('workspace.defaultNotice'),
        );

        effect(() => {
            if (!this.storageReady()) {
                return;
            }
            const result = saveWorkspace(this.storage, this.workspace());
            if (result.status === 'unavailable') {
                this.notice.set(this.languageService.translate('notice.unavailableStorage'));
            }
        });
    }

    translate(key: TranslationKey, params: TranslationParams = {}): string {
        return this.languageService.translate(key, params);
    }

    setView(view: AppView): void {
        this.view.set(view);
    }

    fixedConditions(participantId: string): Condition[] {
        return this.workspace().conditions.filter(
            (condition) =>
                condition.sessionId === null && condition.participantId === participantId,
        );
    }

    participantConditions(participantId: string): Condition[] {
        return this.activeConditions().filter(
            (condition) => condition.participantId === participantId,
        );
    }

    addParticipant(alias: string): void {
        const normalizedAlias = alias.trim();
        if (!normalizedAlias) {
            this.notice.set(this.languageService.translate('notice.aliasRequired'));
            return;
        }
        if (
            this.workspace().participants.some(
                (participant) =>
                    participant.alias.toLocaleLowerCase() === normalizedAlias.toLocaleLowerCase(),
            )
        ) {
            this.notice.set(this.languageService.translate('notice.aliasExists'));
            return;
        }

        this.workspace.update((current) => ({
            ...current,
            participants: [
                ...current.participants,
                { id: createIdentifier('person'), alias: normalizedAlias },
            ],
        }));
        this.notice.set(
            this.languageService.translate('notice.personAdded', { name: normalizedAlias }),
        );
    }

    removeParticipant(participantId: string): void {
        this.workspace.update((current) => ({
            ...current,
            participants: current.participants.filter(
                (participant) => participant.id !== participantId,
            ),
            sessions: current.sessions.map((session) => ({
                ...session,
                participantIds: session.participantIds.filter((id) => id !== participantId),
                participantColumnEligibility: session.participantColumnEligibility.filter(
                    (entry) => entry.participantId !== participantId,
                ),
                schedule: session.participantIds.includes(participantId) ? null : session.schedule,
            })),
            conditions: current.conditions.filter(
                (condition) => condition.participantId !== participantId,
            ),
        }));
        this.notice.set(this.languageService.translate('notice.personRemoved'));
    }

    startSession(month: string): void {
        if (!isValidMonth(month)) {
            this.notice.set(this.languageService.translate('notice.invalidMonth'));
            return;
        }
        const current = this.workspace();
        if (current.participants.length === 0) {
            this.notice.set(this.languageService.translate('notice.peopleRequired'));
            this.view.set('people');
            return;
        }

        const session = createSession({
            id: createIdentifier('session'),
            month,
            participantIds: current.participants.map((participant) => participant.id),
            createdAt: new Date().toISOString(),
            scheduleConfig: createDefaultScheduleConfiguration(),
            participantColumnEligibility: current.participants.map((participant) => ({
                participantId: participant.id,
                columnIds: ['general'],
            })),
            schedule: null,
        });
        const oldReusableConditions = current.conditions
            .filter(
                (condition) =>
                    condition.reusable &&
                    condition.sessionId !== null &&
                    !condition.startDate &&
                    !condition.endDate &&
                    !current.conditions.some(
                        (fixed) =>
                            fixed.sessionId === null &&
                            fixed.participantId === condition.participantId &&
                            fixed.note === condition.note,
                    ),
            )
            .map((condition) => ({
                ...condition,
                id: createIdentifier('condition'),
                sessionId: null,
                createdAt: new Date().toISOString(),
            }));

        this.workspace.update((currentWorkspace) => ({
            ...currentWorkspace,
            sessions: [...currentWorkspace.sessions, session],
            activeSessionId: session.id,
            conditions: [...currentWorkspace.conditions, ...oldReusableConditions],
        }));
        this.month.set(month);
        this.view.set('sessions');
        this.notice.set(
            oldReusableConditions.length > 0
                ? this.languageService.translate('notice.sessionPreparedWithFixed', {
                      month: this.monthLabel(month),
                      count: oldReusableConditions.length,
                  })
                : this.languageService.translate('notice.sessionPrepared', {
                      month: this.monthLabel(month),
                  }),
        );
    }

    selectSession(sessionId: string): void {
        const session = this.workspace().sessions.find((item) => item.id === sessionId);
        if (!session) {
            return;
        }
        this.workspace.update((current) => ({ ...current, activeSessionId: sessionId }));
        this.month.set(session.month);
        this.view.set('sessions');
    }

    activeScheduleConfiguration(): ScheduleConfiguration | undefined {
        return this.activeSession()?.scheduleConfig;
    }

    columnEligibility(participantId: string, columnId: string): boolean {
        const entry = this.activeSession()?.participantColumnEligibility.find(
            (item) => item.participantId === participantId,
        );
        return !entry || entry.columnIds.includes(columnId);
    }

    toggleParticipantColumn(participantId: string, columnId: string): void {
        this.updateActiveSession((session) => {
            const existing = session.participantColumnEligibility.find(
                (item) => item.participantId === participantId,
            );
            const current =
                existing?.columnIds ?? session.scheduleConfig.columns.map((column) => column.id);
            const columnIds = current.includes(columnId)
                ? current.filter((id) => id !== columnId)
                : [...current, columnId];
            return {
                ...session,
                participantColumnEligibility: session.participantColumnEligibility.some(
                    (item) => item.participantId === participantId,
                )
                    ? session.participantColumnEligibility.map((item) =>
                          item.participantId === participantId ? { ...item, columnIds } : item,
                      )
                    : [...session.participantColumnEligibility, { participantId, columnIds }],
                schedule: null,
            };
        });
    }

    setScheduleMode(mode: ScheduleConfiguration['mode']): void {
        this.updateActiveSession((session) => ({
            ...session,
            scheduleConfig: { ...session.scheduleConfig, mode },
            schedule: null,
        }));
    }

    setAllowMultipleAssignmentsPerDay(allowed: boolean): void {
        this.updateActiveSession((session) => ({
            ...session,
            scheduleConfig: {
                ...session.scheduleConfig,
                allowMultipleAssignmentsPerDay: allowed,
            },
            schedule: null,
        }));
    }

    addScheduleColumn(label: string): void {
        const normalizedLabel = label.trim();
        if (!normalizedLabel) {
            this.notice.set(this.languageService.translate('notice.columnNameRequired'));
            return;
        }
        if ((this.activeScheduleConfiguration()?.columns.length ?? 0) >= 24) {
            this.notice.set(this.languageService.translate('notice.columnLimit'));
            return;
        }
        this.updateActiveSession((session) => {
            const column = {
                ...createDefaultScheduleColumn(),
                id: createIdentifier('column'),
                label: normalizedLabel,
            };
            return {
                ...session,
                scheduleConfig: {
                    ...session.scheduleConfig,
                    columns: [...session.scheduleConfig.columns, column],
                },
                participantColumnEligibility: session.participantColumnEligibility.map((entry) => ({
                    ...entry,
                    columnIds: [...entry.columnIds, column.id],
                })),
                schedule: null,
            };
        });
    }

    removeScheduleColumn(columnId: string): void {
        const configuration = this.activeScheduleConfiguration();
        if (!configuration || configuration.columns.length <= 1) {
            this.notice.set(this.languageService.translate('notice.lastColumn'));
            return;
        }
        this.updateActiveSession((session) => ({
            ...session,
            scheduleConfig: {
                ...session.scheduleConfig,
                columns: session.scheduleConfig.columns.filter((column) => column.id !== columnId),
            },
            participantColumnEligibility: session.participantColumnEligibility.map((entry) => ({
                ...entry,
                columnIds: entry.columnIds.filter((id) => id !== columnId),
            })),
            schedule: null,
        }));
    }

    updateScheduleColumn(columnId: string, changes: Partial<ScheduleColumn>): void {
        const session = this.activeSession();
        if (!session) {
            return;
        }
        const scheduleConfig = {
            ...session.scheduleConfig,
            columns: session.scheduleConfig.columns.map((column) =>
                column.id === columnId ? { ...column, ...changes } : column,
            ),
        };
        if (!scheduleConfigurationSchema.safeParse(scheduleConfig).success) {
            this.notice.set(this.languageService.translate('notice.invalidScheduleSetting'));
            return;
        }
        this.updateActiveSession((current) => ({
            ...current,
            scheduleConfig,
            schedule: null,
        }));
    }

    toggleScheduleColumnWeekday(columnId: string, weekday: number): void {
        const column = this.activeScheduleConfiguration()?.columns.find(
            (item) => item.id === columnId,
        );
        if (!column) {
            return;
        }
        const weekdays = column.weekdays.includes(weekday)
            ? column.weekdays.filter((value) => value !== weekday)
            : [...column.weekdays, weekday].sort((left, right) => left - right);
        if (weekdays.length === 0) {
            return;
        }
        this.updateScheduleColumn(columnId, { weekdays });
    }

    private updateActiveSession(transform: (session: Session) => Session): void {
        const activeSessionId = this.workspace().activeSessionId;
        if (!activeSessionId) {
            return;
        }
        this.workspace.update((current) => ({
            ...current,
            sessions: current.sessions.map((session) =>
                session.id === activeSessionId ? transform(session) : session,
            ),
        }));
    }

    openConditionEditor(participantId: string, scope: ConditionScope, condition?: Condition): void {
        this.editor.set({ conditionId: condition?.id ?? null, participantId, scope });
    }

    closeConditionEditor(): void {
        this.editor.set(null);
    }

    saveCondition(draft: ConditionDraft): void {
        const editor = this.editor();
        if (!editor) {
            return;
        }
        const note = draft.note.trim();
        if (!note) {
            this.notice.set(this.languageService.translate('notice.noteRequired'));
            return;
        }
        const activeSession = this.activeSession();
        if (editor.scope === 'session' && !activeSession) {
            this.notice.set(this.languageService.translate('notice.sessionRequired'));
            return;
        }
        if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
            this.notice.set(this.languageService.translate('notice.endDateInvalid'));
            return;
        }

        const current = this.workspace();
        const existing = current.conditions.find(
            (condition) => condition.id === editor.conditionId,
        );
        const nextCondition = createCondition({
            id: editor.conditionId ?? createIdentifier('condition'),
            sessionId: editor.scope === 'fixed' ? null : (activeSession?.id ?? null),
            participantId: editor.participantId,
            kind: draft.kind,
            preferenceMode: draft.kind === 'preference' ? draft.preferenceMode : null,
            startDate: editor.scope === 'fixed' ? null : draft.startDate || null,
            endDate: editor.scope === 'fixed' ? null : draft.endDate || null,
            weekdays: editor.scope === 'fixed' ? draft.weekdays : null,
            note,
            reusable: editor.scope === 'fixed',
            createdAt: existing?.createdAt ?? new Date().toISOString(),
        });

        this.workspace.update((currentWorkspace) => ({
            ...currentWorkspace,
            conditions: editor.conditionId
                ? currentWorkspace.conditions.map((condition) =>
                      condition.id === editor.conditionId ? nextCondition : condition,
                  )
                : [...currentWorkspace.conditions, nextCondition],
            sessions: currentWorkspace.sessions.map((session) =>
                (
                    nextCondition.sessionId === null
                        ? session.participantIds.includes(nextCondition.participantId)
                        : session.id === nextCondition.sessionId
                )
                    ? { ...session, schedule: null }
                    : session,
            ),
        }));
        this.closeConditionEditor();
        this.notice.set(
            this.languageService.translate(
                editor.conditionId ? 'notice.conditionUpdated' : 'notice.conditionAdded',
            ),
        );
    }

    removeCondition(conditionId: string): void {
        const condition = this.workspace().conditions.find((item) => item.id === conditionId);
        this.workspace.update((current) => ({
            ...current,
            conditions: current.conditions.filter((item) => item.id !== conditionId),
            sessions: current.sessions.map((session) =>
                condition &&
                (condition.sessionId === null
                    ? session.participantIds.includes(condition.participantId)
                    : session.id === condition.sessionId)
                    ? { ...session, schedule: null }
                    : session,
            ),
        }));
        this.closeConditionEditor();
        this.notice.set(this.languageService.translate('notice.conditionDeleted'));
    }

    toggleConditionKind(condition: Condition): void {
        if (condition.kind === 'clarification') {
            return;
        }
        const nextKind: EditableConditionKind =
            condition.kind === 'restriction' ? 'preference' : 'restriction';
        const nextCondition = {
            ...condition,
            kind: nextKind,
            preferenceMode:
                nextKind === 'preference' ? (condition.preferenceMode ?? 'avoid') : null,
        };
        this.workspace.update((current) => ({
            ...current,
            conditions: current.conditions.map((item) =>
                item.id === condition.id ? nextCondition : item,
            ),
            sessions: current.sessions.map((session) =>
                condition.sessionId === null
                    ? session.participantIds.includes(condition.participantId)
                        ? { ...session, schedule: null }
                        : session
                    : session.id === condition.sessionId
                      ? { ...session, schedule: null }
                      : session,
            ),
        }));
        this.notice.set(
            this.languageService.translate('notice.conditionKindChanged', {
                kind: this.conditionKindLabel(nextKind).toLocaleLowerCase(),
            }),
        );
    }

    generateCurrentSchedule(): void {
        const session = this.activeSession();
        const participants = this.activeParticipants();
        if (!session || participants.length === 0) {
            this.notice.set(this.languageService.translate('notice.peopleForProposal'));
            return;
        }
        const nextAttempt = (session.schedule?.attempt ?? 0) + 1;
        const schedule = generateSchedule({
            session,
            participants,
            conditions: this.activeConditions(),
            attempt: nextAttempt,
        });
        this.workspace.update((current) => ({
            ...current,
            sessions: current.sessions.map((item) =>
                item.id === session.id ? { ...item, schedule } : item,
            ),
        }));
        this.notice.set(
            schedule.issues.some((item) => item.severity === 'error')
                ? this.languageService.translate('notice.proposalNeedsReview')
                : this.languageService.translate('notice.proposalGenerated', {
                      attempt: nextAttempt,
                  }),
        );
    }

    loadDemo(): void {
        this.workspace.set(createDemoWorkspace(this.languageService.language()));
        this.month.set('2026-11');
        this.view.set('sessions');
        this.notice.set(this.languageService.translate('notice.exampleLoaded'));
    }

    printSchedule(): void {
        window.print();
    }

    async shareSchedule(): Promise<void> {
        const session = this.activeSession();
        const schedule = this.activeSchedule();
        if (!session || !schedule) {
            return;
        }
        const text = formatScheduleForSharing(
            session,
            this.activeParticipants(),
            schedule,
            this.languageService.language(),
        );
        try {
            if (navigator.share) {
                await navigator.share({
                    title: this.languageService.translate('share.title'),
                    text,
                });
                this.notice.set(this.languageService.translate('notice.proposalShared'));
                return;
            }
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                this.notice.set(this.languageService.translate('notice.proposalCopied'));
                return;
            }
            this.notice.set(this.languageService.translate('notice.shareUnavailable'));
        } catch (error: unknown) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }
            this.notice.set(this.languageService.translate('notice.shareFailed'));
        }
    }

    resetWorkspace(): void {
        if (!window.confirm(this.languageService.translate('workspace.resetConfirm'))) {
            return;
        }
        clearWorkspace(this.storage);
        this.workspace.set(emptyWorkspace());
        this.month.set(currentMonth());
        this.view.set('people');
        this.notice.set(this.languageService.translate('notice.workspaceDeleted'));
    }

    monthLabel(month: string): string {
        return formatMonth(month, this.languageService.locale()).replace(/^./, (character) =>
            character.toUpperCase(),
        );
    }

    conditionKindLabel(kind: ConditionKind): string {
        return this.languageService.translate(kindTranslationKey(kind));
    }

    weekdaysSelectionLabel(values: number[]): string {
        if (values.length === 0) {
            return this.languageService.translate('condition.noneWeekdays');
        }
        if (values.length === WEEKDAYS.length) {
            return this.languageService.translate('condition.allWeekdays');
        }
        return WEEKDAYS.filter((weekday) => values.includes(weekday.value))
            .map((weekday) =>
                this.languageService.translate(`weekday.${weekday.key}`).toLocaleLowerCase(),
            )
            .join(', ');
    }

    conditionDateLabel(condition: Condition): string {
        if (condition.weekdays !== null) {
            return this.weekdaysSelectionLabel(condition.weekdays);
        }
        if (!condition.startDate && !condition.endDate) {
            return this.languageService.translate('condition.allMonth');
        }
        const formatter = new Intl.DateTimeFormat(this.languageService.locale(), {
            day: 'numeric',
            month: 'short',
        });
        const formatDate = (value: string): string =>
            formatter.format(new Date(`${value}T12:00:00`)).replace('.', '');
        if (condition.startDate && condition.endDate) {
            return `${formatDate(condition.startDate)} – ${formatDate(condition.endDate)}`;
        }
        return condition.startDate
            ? this.languageService.translate('condition.fromDate', {
                  date: formatDate(condition.startDate),
              })
            : this.languageService.translate('condition.untilDate', {
                  date: formatDate(condition.endDate ?? ''),
              });
    }

    conditionSummary(condition: Condition): string {
        const timing = this.conditionDateLabel(condition);
        return condition.kind === 'preference'
            ? `${this.languageService.translate(condition.preferenceMode === 'prefer' ? 'condition.assign' : 'condition.avoid')} · ${timing}`
            : timing;
    }

    lastDateOfMonth(month: string): string {
        return `${month}-${String(getDaysInMonth(month)).padStart(2, '0')}`;
    }

    calendarWeekdayLabel(date: string): string {
        return new Intl.DateTimeFormat(this.languageService.locale(), { weekday: 'short' })
            .format(new Date(`${date}T12:00:00`))
            .replace('.', '')
            .slice(0, 3);
    }

    scheduleIssueLabel(issue: ScheduleIssue): string {
        const participant = issue.participantId
            ? this.activeParticipants().find((item) => item.id === issue.participantId)?.alias
            : null;
        const date = issue.date
            ? new Intl.DateTimeFormat(this.languageService.locale(), {
                  day: 'numeric',
                  month: 'short',
              })
                  .format(new Date(`${issue.date}T12:00:00`))
                  .replace('.', '')
            : null;
        const message = this.languageService.translate(`schedule.issue.${issue.kind}`);
        const details = [date, participant].filter((item): item is string => Boolean(item));
        return details.length > 0 ? `${message} (${details.join(' · ')})` : message;
    }
}
