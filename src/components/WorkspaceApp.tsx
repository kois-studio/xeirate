import { useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX, TargetedEvent } from 'preact';

import {
    createCondition,
    createIdentifier,
    createSession,
    emptyWorkspace,
    formatMonth,
    getDaysInMonth,
    isValidMonth,
    type Condition,
    type ConditionKind,
    type Participant,
    type PreferenceMode,
    type ScheduleIssue,
    type Session,
    type Workspace,
} from '../lib/domain';
import { createDemoWorkspace } from '../lib/demo-fixture';
import { formatScheduleForSharing } from '../lib/export';
import { clearWorkspace, loadWorkspace, saveWorkspace } from '../lib/persistence';
import { generateSchedule } from '../lib/scheduler';

type AppView = 'people' | 'sessions';
type ConditionScope = 'fixed' | 'session';
type ConditionEditor = {
    conditionId: string | null;
    participantId: string;
    scope: ConditionScope;
};

const weekdays = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
];

function currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
    return formatMonth(month).replace(/^./, (character) => character.toUpperCase());
}

function conditionKindLabel(kind: ConditionKind): string {
    switch (kind) {
        case 'restriction':
            return 'Requisito';
        case 'preference':
            return 'Preferencia';
        case 'clarification':
            return 'Por aclarar';
    }
}

function weekdayLabel(value: number | null): string | null {
    return weekdays.find((weekday) => weekday.value === value)?.label ?? null;
}

function calendarWeekdayLabel(date: string): string {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
        .format(new Date(`${date}T12:00:00`))
        .replace('.', '')
        .slice(0, 3);
}

function conditionDateLabel(condition: Condition): string {
    const recurringWeekday = weekdayLabel(condition.weekday);
    if (recurringWeekday) {
        return `Todos los ${recurringWeekday.toLocaleLowerCase()}`;
    }
    if (!condition.startDate && !condition.endDate) {
        return 'Todo el mes';
    }

    const formatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
    const formatDate = (value: string): string =>
        formatter.format(new Date(`${value}T12:00:00`)).replace('.', '');

    if (condition.startDate && condition.endDate) {
        return `${formatDate(condition.startDate)} – ${formatDate(condition.endDate)}`;
    }

    return condition.startDate
        ? `Desde ${formatDate(condition.startDate)}`
        : `Hasta ${formatDate(condition.endDate ?? '')}`;
}

function conditionSummary(condition: Condition): string {
    const timing = conditionDateLabel(condition);
    if (condition.kind === 'preference') {
        return `${condition.preferenceMode === 'prefer' ? 'Intentar asignar' : 'Intentar evitar'} · ${timing}`;
    }
    return timing;
}

function lastDateOfMonth(month: string): string {
    return `${month}-${String(getDaysInMonth(month)).padStart(2, '0')}`;
}

function scheduleIssueLabel(issue: ScheduleIssue, participants: Participant[]): string {
    const details = [
        issue.date
            ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
                  .format(new Date(`${issue.date}T12:00:00`))
                  .replace('.', '')
            : null,
        issue.participantId
            ? participants.find((participant) => participant.id === issue.participantId)?.alias
            : null,
    ].filter(Boolean);

    return details.length > 0 ? `${issue.message} (${details.join(' · ')})` : issue.message;
}

type ShareNavigator = Navigator & {
    share?: (data: { title: string; text: string }) => Promise<void>;
};

export default function WorkspaceApp(): JSX.Element {
    const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
    const [view, setView] = useState<AppView>('people');
    const [month, setMonth] = useState(currentMonth);
    const [alias, setAlias] = useState('');
    const [notice, setNotice] = useState('');
    const [storageReady, setStorageReady] = useState(false);
    const [editor, setEditor] = useState<ConditionEditor | null>(null);
    const [conditionKind, setConditionKind] = useState<ConditionKind>('restriction');
    const [conditionPreferenceMode, setConditionPreferenceMode] = useState<PreferenceMode>('avoid');
    const [conditionStartDate, setConditionStartDate] = useState('');
    const [conditionEndDate, setConditionEndDate] = useState('');
    const [conditionWeekday, setConditionWeekday] = useState('');
    const [conditionNote, setConditionNote] = useState('');

    useEffect(() => {
        const result = loadWorkspace(window.localStorage);
        setWorkspace(result.workspace);
        setStorageReady(true);
        setNotice(
            result.status === 'invalid'
                ? 'No pudimos usar los datos locales anteriores. Hemos empezado un espacio nuevo.'
                : result.status === 'loaded'
                  ? 'Tu espacio local se ha recuperado.'
                  : 'Tus cambios se guardarán en este navegador.',
        );
    }, []);

    useEffect(() => {
        if (!storageReady) {
            return;
        }

        const result = saveWorkspace(window.localStorage, workspace);
        if (result.status === 'unavailable') {
            setNotice('No hemos podido guardar el cambio en este navegador.');
        }
    }, [workspace, storageReady]);

    const activeSession = useMemo<Session | undefined>(
        () => workspace.sessions.find((session) => session.id === workspace.activeSessionId),
        [workspace.sessions, workspace.activeSessionId],
    );

    const activeParticipants = useMemo<Participant[]>(() => {
        if (!activeSession) {
            return [];
        }

        return activeSession.participantIds.flatMap((participantId) => {
            const participant = workspace.participants.find((item) => item.id === participantId);
            return participant ? [participant] : [];
        });
    }, [activeSession, workspace.participants]);

    const activeConditions = useMemo<Condition[]>(
        () =>
            activeSession
                ? workspace.conditions.filter(
                      (condition) =>
                          condition.sessionId === activeSession.id ||
                          (condition.sessionId === null &&
                              activeSession.participantIds.includes(condition.participantId)),
                  )
                : [],
        [activeSession, workspace.conditions],
    );

    const activeSchedule = activeSession?.schedule ?? null;
    const scheduleAssignments = useMemo(
        () =>
            new Map(activeSchedule?.assignments.map((assignment) => [assignment.date, assignment])),
        [activeSchedule],
    );
    const scheduleIssues = activeSchedule?.issues ?? [];
    const scheduleErrors = scheduleIssues.filter((item) => item.severity === 'error');
    const scheduleWarnings = scheduleIssues.filter((item) => item.severity === 'warning');

    function addParticipant(event: TargetedEvent<HTMLFormElement, SubmitEvent>): void {
        event.preventDefault();
        const normalizedAlias = alias.trim();
        if (!normalizedAlias) {
            setNotice('Escribe un alias para añadir a una persona.');
            return;
        }
        if (
            workspace.participants.some(
                (participant) =>
                    participant.alias.toLocaleLowerCase() === normalizedAlias.toLocaleLowerCase(),
            )
        ) {
            setNotice('Ese alias ya está en la lista.');
            return;
        }

        setWorkspace((current) => ({
            ...current,
            participants: [
                ...current.participants,
                { id: createIdentifier('person'), alias: normalizedAlias },
            ],
        }));
        setAlias('');
        setNotice(`${normalizedAlias} se ha añadido al equipo.`);
    }

    function removeParticipant(participantId: string): void {
        setWorkspace((current) => ({
            ...current,
            participants: current.participants.filter(
                (participant) => participant.id !== participantId,
            ),
            sessions: current.sessions.map((session) => ({
                ...session,
                participantIds: session.participantIds.filter((id) => id !== participantId),
                schedule: session.participantIds.includes(participantId) ? null : session.schedule,
            })),
            conditions: current.conditions.filter(
                (condition) => condition.participantId !== participantId,
            ),
        }));
        setNotice('Persona eliminada de la lista y de las sesiones locales.');
    }

    function startSession(event: TargetedEvent<HTMLFormElement, SubmitEvent>): void {
        event.preventDefault();
        if (!isValidMonth(month)) {
            setNotice('Elige un mes válido para empezar la sesión.');
            return;
        }
        if (workspace.participants.length === 0) {
            setNotice('Añade al menos una persona antes de crear una sesión.');
            setView('people');
            return;
        }

        const session = createSession({
            id: createIdentifier('session'),
            month,
            participantIds: workspace.participants.map((participant) => participant.id),
            createdAt: new Date().toISOString(),
            schedule: null,
        });
        const oldReusableConditions = workspace.conditions
            .filter(
                (condition) =>
                    condition.reusable &&
                    condition.sessionId !== null &&
                    !condition.startDate &&
                    !condition.endDate &&
                    !workspace.conditions.some(
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
        setWorkspace((current) => ({
            ...current,
            sessions: [...current.sessions, session],
            activeSessionId: session.id,
            conditions: [...current.conditions, ...oldReusableConditions],
        }));
        setView('sessions');
        setNotice(
            oldReusableConditions.length > 0
                ? `Sesión de ${monthLabel(month)} preparada con ${oldReusableConditions.length} condición(es) fija(s).`
                : `Sesión de ${monthLabel(month)} preparada.`,
        );
    }

    function selectSession(sessionId: string): void {
        const session = workspace.sessions.find((item) => item.id === sessionId);
        if (!session) {
            return;
        }
        setWorkspace((current) => ({ ...current, activeSessionId: sessionId }));
        setMonth(session.month);
        setView('sessions');
    }

    function openConditionEditor(
        participantId: string,
        scope: ConditionScope,
        condition?: Condition,
    ): void {
        setEditor({
            conditionId: condition?.id ?? null,
            participantId,
            scope,
        });
        setConditionKind(condition?.kind ?? 'restriction');
        setConditionPreferenceMode(condition?.preferenceMode ?? 'avoid');
        setConditionStartDate(condition?.startDate ?? '');
        setConditionEndDate(condition?.endDate ?? '');
        setConditionWeekday(
            condition?.weekday === null || condition?.weekday === undefined
                ? ''
                : String(condition.weekday),
        );
        setConditionNote(condition?.note ?? '');
    }

    function closeConditionEditor(): void {
        setEditor(null);
        setConditionNote('');
        setConditionStartDate('');
        setConditionEndDate('');
        setConditionWeekday('');
    }

    function saveCondition(event: TargetedEvent<HTMLFormElement, SubmitEvent>): void {
        event.preventDefault();
        if (!editor) {
            return;
        }

        const normalizedNote = conditionNote.trim();
        if (!normalizedNote) {
            setNotice('Escribe una nota para explicar la petición.');
            return;
        }
        if (editor.scope === 'session' && !activeSession) {
            setNotice('Prepara una sesión antes de añadir condiciones para el mes.');
            return;
        }
        if (conditionStartDate && conditionEndDate && conditionStartDate > conditionEndDate) {
            setNotice('La fecha final no puede ser anterior a la fecha inicial.');
            return;
        }
        if (editor.scope === 'fixed' && (conditionStartDate || conditionEndDate)) {
            setNotice('Una condición fija debe repetirse por día de la semana, no por fechas.');
            return;
        }

        const nextCondition = createCondition({
            id: editor.conditionId ?? createIdentifier('condition'),
            sessionId: editor.scope === 'fixed' ? null : (activeSession?.id ?? null),
            participantId: editor.participantId,
            kind: conditionKind,
            preferenceMode: conditionKind === 'preference' ? conditionPreferenceMode : null,
            startDate: editor.scope === 'fixed' ? null : conditionStartDate || null,
            endDate: editor.scope === 'fixed' ? null : conditionEndDate || null,
            weekday: editor.scope === 'fixed' && conditionWeekday ? Number(conditionWeekday) : null,
            note: normalizedNote,
            reusable: editor.scope === 'fixed',
            createdAt:
                workspace.conditions.find((condition) => condition.id === editor.conditionId)
                    ?.createdAt ?? new Date().toISOString(),
        });

        setWorkspace((current) => ({
            ...current,
            conditions: editor.conditionId
                ? current.conditions.map((condition) =>
                      condition.id === editor.conditionId ? nextCondition : condition,
                  )
                : [...current.conditions, nextCondition],
            sessions: current.sessions.map((session) =>
                (
                    nextCondition.sessionId === null
                        ? session.participantIds.includes(nextCondition.participantId)
                        : session.id === nextCondition.sessionId
                )
                    ? { ...session, schedule: null }
                    : session,
            ),
        }));
        closeConditionEditor();
        setNotice(editor.conditionId ? 'Condición actualizada.' : 'Condición añadida.');
    }

    function removeCondition(conditionId: string): void {
        const condition = workspace.conditions.find((item) => item.id === conditionId);
        setWorkspace((current) => ({
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
        closeConditionEditor();
        setNotice('Condición eliminada.');
    }

    function toggleConditionKind(condition: Condition): void {
        if (condition.kind === 'clarification') {
            return;
        }

        const nextKind: ConditionKind =
            condition.kind === 'restriction' ? 'preference' : 'restriction';
        const nextCondition = {
            ...condition,
            kind: nextKind,
            preferenceMode:
                nextKind === 'preference' ? (condition.preferenceMode ?? 'avoid') : null,
        };
        setWorkspace((current) => ({
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
        setNotice(`Condición cambiada a ${conditionKindLabel(nextKind).toLocaleLowerCase()}.`);
    }

    function generateCurrentSchedule(): void {
        if (!activeSession || activeParticipants.length === 0) {
            setNotice('Prepara una sesión con personas antes de generar una propuesta.');
            return;
        }

        const nextAttempt = (activeSession.schedule?.attempt ?? 0) + 1;
        const schedule = generateSchedule({
            session: activeSession,
            participants: activeParticipants,
            conditions: activeConditions,
            attempt: nextAttempt,
        });
        setWorkspace((current) => ({
            ...current,
            sessions: current.sessions.map((session) =>
                session.id === activeSession.id ? { ...session, schedule } : session,
            ),
        }));
        setNotice(
            schedule.issues.some((item) => item.severity === 'error')
                ? 'Propuesta generada con días pendientes de resolver.'
                : `Propuesta ${nextAttempt} generada. Revisa las alertas antes de compartirla.`,
        );
    }

    function loadDemo(): void {
        setWorkspace(createDemoWorkspace());
        setMonth('2026-11');
        setView('sessions');
        setNotice('Ejemplo anonimizado cargado. Revisa las condiciones y genera una propuesta.');
    }

    function printSchedule(): void {
        window.print();
    }

    async function shareSchedule(): Promise<void> {
        if (!activeSession || !activeSchedule) {
            return;
        }

        const text = formatScheduleForSharing(activeSession, activeParticipants, activeSchedule);
        const shareNavigator = navigator as ShareNavigator;
        try {
            if (shareNavigator.share) {
                await shareNavigator.share({ title: 'Propuesta de guardias', text });
                setNotice('Propuesta compartida.');
                return;
            }
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                setNotice('Propuesta copiada. Ya puedes pegarla en WhatsApp.');
                return;
            }
            setNotice('Este navegador no permite compartir automáticamente la propuesta.');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }
            setNotice('No hemos podido compartir la propuesta desde este navegador.');
        }
    }

    function resetWorkspace(): void {
        if (!window.confirm('¿Borrar todas las personas y sesiones guardadas en este navegador?')) {
            return;
        }

        clearWorkspace(window.localStorage);
        setWorkspace(emptyWorkspace());
        setMonth(currentMonth());
        setView('people');
        setNotice('El espacio local se ha borrado.');
    }

    function renderConditionRow(condition: Condition): JSX.Element {
        const canToggle = condition.kind !== 'clarification';
        return (
            <li class="condition-row" key={condition.id}>
                <button
                    class={`condition-toggle ${condition.kind}`}
                    type="button"
                    disabled={!canToggle}
                    aria-label={
                        canToggle
                            ? `Cambiar ${conditionKindLabel(condition.kind).toLocaleLowerCase()}`
                            : 'Petición pendiente de aclaración'
                    }
                    onClick={() => toggleConditionKind(condition)}
                >
                    {conditionKindLabel(condition.kind)}
                </button>
                <div class="condition-row-copy">
                    <strong>{conditionSummary(condition)}</strong>
                    <span class="condition-note">{condition.note}</span>
                    {condition.sessionId === null ? (
                        <small>Condición fija de la persona</small>
                    ) : null}
                </div>
                <button
                    class="condition-edit-button"
                    type="button"
                    aria-label="Editar condición"
                    onClick={() =>
                        openConditionEditor(
                            condition.participantId,
                            condition.sessionId === null ? 'fixed' : 'session',
                            condition,
                        )
                    }
                >
                    Editar
                </button>
            </li>
        );
    }

    function renderPeopleView(): JSX.Element {
        return (
            <section class="app-view" aria-labelledby="people-title">
                <div class="people-toolbar">
                    <div class="view-heading">
                        <div>
                            <p class="section-kicker">Equipo permanente</p>
                            <h2 id="people-title">Personas</h2>
                            <p class="section-intro">
                                Guarda el equipo una vez. Las condiciones fijas reaparecerán al
                                preparar cada mes.
                            </p>
                        </div>
                    </div>

                    <form class="add-person-form" onSubmit={addParticipant}>
                        <label for="participant-alias">Añadir al equipo</label>
                        <div class="form-row">
                            <input
                                id="participant-alias"
                                name="participant-alias"
                                value={alias}
                                placeholder="Ej. Laura"
                                maxLength={40}
                                autoComplete="off"
                                onInput={(event) => setAlias(event.currentTarget.value)}
                            />
                            <button class="button button-primary" type="submit">
                                <span aria-hidden="true">+</span> Añadir
                            </button>
                        </div>
                    </form>
                </div>

                {workspace.participants.length > 0 ? (
                    <div class="person-cards">
                        {workspace.participants.map((participant) => {
                            const fixedConditions = workspace.conditions.filter(
                                (condition) =>
                                    condition.sessionId === null &&
                                    condition.participantId === participant.id,
                            );
                            return (
                                <article class="person-card" key={participant.id}>
                                    <div class="person-card-heading">
                                        <div class="person-heading-name">
                                            <span class="avatar" aria-hidden="true">
                                                {participant.alias.slice(0, 1).toUpperCase()}
                                            </span>
                                            <div>
                                                <h3>{participant.alias}</h3>
                                                <span>
                                                    {fixedConditions.length === 0
                                                        ? 'Sin condiciones fijas'
                                                        : `${fixedConditions.length} condición(es) fija(s)`}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            class="icon-button"
                                            type="button"
                                            aria-label={`Eliminar a ${participant.alias}`}
                                            onClick={() => removeParticipant(participant.id)}
                                        >
                                            <span aria-hidden="true">×</span>
                                        </button>
                                    </div>
                                    {fixedConditions.length > 0 ? (
                                        <ul
                                            class="condition-row-list"
                                            aria-label={`Condiciones de ${participant.alias}`}
                                        >
                                            {fixedConditions.map(renderConditionRow)}
                                        </ul>
                                    ) : null}
                                    <button
                                        class="add-condition-button"
                                        type="button"
                                        onClick={() => openConditionEditor(participant.id, 'fixed')}
                                    >
                                        <span aria-hidden="true">+</span> Añadir condición fija
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div class="empty-state large">
                        <span class="empty-calendar" aria-hidden="true">
                            ✦
                        </span>
                        <strong>Aún no hay personas</strong>
                        <span>Añade al equipo para poder preparar una sesión.</span>
                    </div>
                )}
            </section>
        );
    }

    function renderSchedule(): JSX.Element {
        if (!activeSession) {
            return (
                <div class="empty-state large">
                    <span class="empty-calendar" aria-hidden="true">
                        ▦
                    </span>
                    <strong>Selecciona o crea una sesión</strong>
                    <span>Cuando tengas un mes, aquí aparecerá su propuesta de guardias.</span>
                    <button class="button button-quiet" type="button" onClick={loadDemo}>
                        Cargar ejemplo anonimizado
                    </button>
                </div>
            );
        }

        return (
            <section
                class="workspace-card calendar-card schedule-card"
                aria-labelledby="calendar-title"
            >
                <div class="calendar-heading">
                    <div>
                        <p class="section-kicker">Tablero del mes</p>
                        <h2 id="calendar-title">Guardias de {monthLabel(activeSession.month)}</h2>
                    </div>
                    <button
                        class="button button-quiet"
                        type="button"
                        disabled={activeParticipants.length === 0}
                        onClick={generateCurrentSchedule}
                    >
                        <span aria-hidden="true">{activeSchedule ? '↻' : '✦'}</span>{' '}
                        {activeSchedule ? 'Reintentar' : 'Generar propuesta'}
                    </button>
                </div>

                {activeSchedule ? (
                    <>
                        <div class="schedule-summary">
                            <div class="schedule-summary-item">
                                <strong>{activeSchedule.assignments.length}</strong>
                                <span>guardias asignadas</span>
                            </div>
                            <div class="schedule-summary-item">
                                <strong>{activeSchedule.fairness.maxDifference}</strong>
                                <span>de diferencia máxima</span>
                            </div>
                            <div class="schedule-summary-item">
                                <strong>{scheduleErrors.length + scheduleWarnings.length}</strong>
                                <span>alertas para revisar</span>
                            </div>
                        </div>
                        {scheduleIssues.length > 0 ? (
                            <ul class="schedule-issues" aria-label="Alertas de la propuesta">
                                {scheduleIssues.slice(0, 4).map((item) => (
                                    <li class={`issue-${item.severity}`} key={item.id}>
                                        {scheduleIssueLabel(item, activeParticipants)}
                                    </li>
                                ))}
                                {scheduleIssues.length > 4 ? (
                                    <li class="issue-info">
                                        Y {scheduleIssues.length - 4} alerta(s) más en el texto
                                        compartible.
                                    </li>
                                ) : null}
                            </ul>
                        ) : (
                            <p class="schedule-health">No hay alertas en esta propuesta.</p>
                        )}
                        <div class="schedule-actions">
                            <button
                                class="button button-secondary"
                                type="button"
                                onClick={shareSchedule}
                            >
                                Compartir propuesta
                            </button>
                            <button
                                class="button button-quiet"
                                type="button"
                                onClick={printSchedule}
                            >
                                Imprimir / PDF
                            </button>
                        </div>
                    </>
                ) : (
                    <div class="workspace-note">
                        <span class="note-icon" aria-hidden="true">
                            ☼
                        </span>
                        <div>
                            <strong>Lista para generar una propuesta.</strong>
                            <p>
                                Los requisitos son límites, las preferencias son señales y las
                                peticiones por aclarar siempre quedan visibles.
                            </p>
                        </div>
                    </div>
                )}
                <ul class="calendar-grid" aria-label={`Días de ${monthLabel(activeSession.month)}`}>
                    {Array.from({ length: getDaysInMonth(activeSession.month) }, (_, index) => {
                        const date = `${activeSession.month}-${String(index + 1).padStart(2, '0')}`;
                        const assignment = scheduleAssignments.get(date);
                        return (
                            <li class={assignment ? 'assigned-day' : 'unassigned-day'} key={date}>
                                <span class="day-week">{calendarWeekdayLabel(date)}</span>
                                <span class="day-number">{index + 1}</span>
                                <span class="day-state">
                                    {assignment
                                        ? (activeParticipants.find(
                                              (participant) =>
                                                  participant.id === assignment.participantId,
                                          )?.alias ?? 'Sin nombre')
                                        : 'Sin asignar'}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </section>
        );
    }

    function renderSessionsView(): JSX.Element {
        return (
            <section class="app-view" aria-labelledby="sessions-title">
                <div class="view-heading">
                    <div>
                        <p class="section-kicker">Meses de trabajo</p>
                        <h2 id="sessions-title">Sesiones</h2>
                        <p class="section-intro">
                            Cada sesión contiene un mes, sus peticiones y las propuestas que quieras
                            explorar.
                        </p>
                    </div>
                    <button class="button button-quiet" type="button" onClick={loadDemo}>
                        Cargar ejemplo
                    </button>
                </div>

                <form class="new-session-form workspace-card" onSubmit={startSession}>
                    <div>
                        <label for="session-month">Nueva sesión</label>
                        <span>Elige el mes de las guardias</span>
                    </div>
                    <input
                        id="session-month"
                        name="session-month"
                        type="month"
                        value={month}
                        onInput={(event) => setMonth(event.currentTarget.value)}
                    />
                    <button class="button button-primary" type="submit">
                        Crear sesión <span aria-hidden="true">→</span>
                    </button>
                </form>

                {workspace.sessions.length > 0 ? (
                    <div class="sessions-layout">
                        <aside class="workspace-card sessions-list-card" aria-label="Tus sesiones">
                            <div class="section-kicker">Tus sesiones</div>
                            <ul class="session-list">
                                {workspace.sessions.map((session) => (
                                    <li key={session.id}>
                                        <button
                                            class={
                                                session.id === activeSession?.id
                                                    ? 'session-list-item active'
                                                    : 'session-list-item'
                                            }
                                            type="button"
                                            onClick={() => selectSession(session.id)}
                                        >
                                            <span class="session-list-month">
                                                {monthLabel(session.month)
                                                    .split(' ')[0]
                                                    ?.slice(0, 3) ?? ''}
                                            </span>
                                            <span>
                                                <strong>{monthLabel(session.month)}</strong>
                                                <small>
                                                    {session.participantIds.length} personas ·{' '}
                                                    {session.schedule
                                                        ? 'Con propuesta'
                                                        : 'Sin propuesta'}
                                                </small>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </aside>

                        <div class="session-detail">
                            {activeSession ? (
                                <section
                                    class="workspace-card condition-card"
                                    aria-labelledby="session-detail-title"
                                >
                                    <div class="session-detail-heading">
                                        <div>
                                            <p class="section-kicker">Sesión activa</p>
                                            <h2 id="session-detail-title">
                                                Peticiones de {monthLabel(activeSession.month)}
                                            </h2>
                                        </div>
                                        <span class="session-status-pill">
                                            {activeConditions.length} condiciones
                                        </span>
                                    </div>
                                    <p class="section-intro">
                                        Revisa cada petición por persona. Pulsa el badge para
                                        cambiar entre requisito y preferencia, o edita la
                                        traducción.
                                    </p>
                                    <div class="condition-groups">
                                        {activeParticipants.map((participant) => {
                                            const participantConditions = activeConditions.filter(
                                                (condition) =>
                                                    condition.participantId === participant.id,
                                            );
                                            return (
                                                <article
                                                    class="condition-group"
                                                    key={participant.id}
                                                >
                                                    <div class="condition-group-heading">
                                                        <div class="person-heading-name">
                                                            <span class="avatar" aria-hidden="true">
                                                                {participant.alias
                                                                    .slice(0, 1)
                                                                    .toUpperCase()}
                                                            </span>
                                                            <h3>{participant.alias}</h3>
                                                        </div>
                                                        <span>
                                                            {participantConditions.length}{' '}
                                                            peticiones
                                                        </span>
                                                    </div>
                                                    {participantConditions.length > 0 ? (
                                                        <ul class="condition-row-list">
                                                            {participantConditions.map(
                                                                renderConditionRow,
                                                            )}
                                                        </ul>
                                                    ) : (
                                                        <p class="condition-group-empty">
                                                            Todavía no hay peticiones para esta
                                                            persona.
                                                        </p>
                                                    )}
                                                    <button
                                                        class="add-condition-button"
                                                        type="button"
                                                        onClick={() =>
                                                            openConditionEditor(
                                                                participant.id,
                                                                'session',
                                                            )
                                                        }
                                                    >
                                                        <span aria-hidden="true">+</span> Añadir
                                                        condición para {participant.alias}
                                                    </button>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>
                            ) : null}
                            {renderSchedule()}
                        </div>
                    </div>
                ) : (
                    <div class="empty-state large workspace-card">
                        <span class="empty-calendar" aria-hidden="true">
                            ▦
                        </span>
                        <strong>Aún no hay sesiones</strong>
                        <span>Crea una sesión para empezar a traducir peticiones.</span>
                    </div>
                )}
            </section>
        );
    }

    return (
        <div class="app-shell">
            <header class="app-header">
                <div class="app-header-copy">
                    <p class="section-kicker">Espacio local</p>
                    <h1>El mes, más claro.</h1>
                    <p class="app-header-description">
                        Traduce peticiones, explora una propuesta y decide con tu equipo.
                    </p>
                </div>
                <span class="local-badge">
                    <span aria-hidden="true">●</span> Solo en este navegador
                </span>
            </header>

            <nav class="app-nav" aria-label="Secciones de Xeirate">
                <button
                    class={view === 'people' ? 'app-nav-item active' : 'app-nav-item'}
                    type="button"
                    aria-current={view === 'people' ? 'page' : undefined}
                    onClick={() => setView('people')}
                >
                    <span class="app-nav-mark" aria-hidden="true">
                        ●
                    </span>
                    <span>
                        <strong>Personas</strong>
                        <small>Tu equipo y condiciones fijas</small>
                    </span>
                </button>
                <button
                    class={view === 'sessions' ? 'app-nav-item active' : 'app-nav-item'}
                    type="button"
                    aria-current={view === 'sessions' ? 'page' : undefined}
                    onClick={() => setView('sessions')}
                >
                    <span class="app-nav-mark" aria-hidden="true">
                        ◒
                    </span>
                    <span>
                        <strong>Sesiones</strong>
                        <small>Meses, peticiones y propuestas</small>
                    </span>
                </button>
            </nav>

            {view === 'people' ? renderPeopleView() : renderSessionsView()}

            <div class="workspace-actions">
                <p class="status-message" role="status" aria-live="polite">
                    <span class="status-dot" aria-hidden="true" />
                    {notice || 'Los datos se quedan en este navegador.'}
                </p>
                <button class="reset-button" type="button" onClick={resetWorkspace}>
                    Borrar espacio local
                </button>
            </div>

            {editor ? (
                <div class="modal-backdrop">
                    <section
                        class="condition-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="condition-dialog-title"
                    >
                        <div class="dialog-heading">
                            <div>
                                <p class="section-kicker">
                                    {editor.scope === 'fixed'
                                        ? 'Condición de persona'
                                        : 'Condición de sesión'}
                                </p>
                                <h2 id="condition-dialog-title">
                                    {editor.conditionId ? 'Editar condición' : 'Traducir petición'}
                                </h2>
                            </div>
                            <button
                                class="icon-button"
                                type="button"
                                aria-label="Cerrar"
                                onClick={closeConditionEditor}
                            >
                                <span aria-hidden="true">×</span>
                            </button>
                        </div>
                        <p class="dialog-intro">
                            Decide qué significa esta petición para el calendario. Siempre podrás
                            cambiarla después.
                        </p>
                        <form class="condition-dialog-form" onSubmit={saveCondition}>
                            <div class="dialog-kind-picker">
                                <label for="dialog-condition-kind">Tipo de condición</label>
                                <select
                                    id="dialog-condition-kind"
                                    value={conditionKind}
                                    onChange={(event) =>
                                        setConditionKind(event.currentTarget.value as ConditionKind)
                                    }
                                >
                                    <option value="restriction">
                                        Requisito · no puede ocurrir
                                    </option>
                                    <option value="preference">
                                        Preferencia · intentar evitar o asignar
                                    </option>
                                    <option value="clarification">
                                        Por aclarar · necesita decisión
                                    </option>
                                </select>
                            </div>
                            {conditionKind === 'preference' ? (
                                <div>
                                    <label for="dialog-preference-mode">Cómo aplicarla</label>
                                    <select
                                        id="dialog-preference-mode"
                                        value={conditionPreferenceMode}
                                        onChange={(event) =>
                                            setConditionPreferenceMode(
                                                event.currentTarget.value as PreferenceMode,
                                            )
                                        }
                                    >
                                        <option value="avoid">Intentar evitar</option>
                                        <option value="prefer">Intentar asignar</option>
                                    </select>
                                </div>
                            ) : null}
                            {editor.scope === 'fixed' ? (
                                <div>
                                    <label for="dialog-condition-weekday">Se repite cada</label>
                                    <select
                                        id="dialog-condition-weekday"
                                        value={conditionWeekday}
                                        onChange={(event) =>
                                            setConditionWeekday(event.currentTarget.value)
                                        }
                                    >
                                        <option value="">Todo el mes, sin día fijo</option>
                                        {weekdays.map((weekday) => (
                                            <option key={weekday.value} value={weekday.value}>
                                                {weekday.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div class="condition-date-fields">
                                    <div>
                                        <label for="dialog-condition-start">Desde (opcional)</label>
                                        <input
                                            id="dialog-condition-start"
                                            type="date"
                                            min={
                                                activeSession
                                                    ? `${activeSession.month}-01`
                                                    : undefined
                                            }
                                            max={
                                                activeSession
                                                    ? lastDateOfMonth(activeSession.month)
                                                    : undefined
                                            }
                                            value={conditionStartDate}
                                            onInput={(event) =>
                                                setConditionStartDate(event.currentTarget.value)
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label for="dialog-condition-end">Hasta (opcional)</label>
                                        <input
                                            id="dialog-condition-end"
                                            type="date"
                                            min={
                                                activeSession
                                                    ? `${activeSession.month}-01`
                                                    : undefined
                                            }
                                            max={
                                                activeSession
                                                    ? lastDateOfMonth(activeSession.month)
                                                    : undefined
                                            }
                                            value={conditionEndDate}
                                            onInput={(event) =>
                                                setConditionEndDate(event.currentTarget.value)
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label for="dialog-condition-note">Qué ha pedido</label>
                                <textarea
                                    id="dialog-condition-note"
                                    rows={4}
                                    maxLength={180}
                                    placeholder="Ej. No puede hacer guardia durante el curso."
                                    value={conditionNote}
                                    onInput={(event) => setConditionNote(event.currentTarget.value)}
                                />
                            </div>
                            <div class="dialog-actions">
                                {editor.conditionId ? (
                                    <button
                                        class="button button-danger-quiet"
                                        type="button"
                                        onClick={() => removeCondition(editor.conditionId ?? '')}
                                    >
                                        Eliminar
                                    </button>
                                ) : (
                                    <span />
                                )}
                                <div>
                                    <button
                                        class="button button-quiet"
                                        type="button"
                                        onClick={closeConditionEditor}
                                    >
                                        Cancelar
                                    </button>
                                    <button class="button button-primary" type="submit">
                                        Guardar condición
                                    </button>
                                </div>
                            </div>
                        </form>
                    </section>
                </div>
            ) : null}
        </div>
    );
}
