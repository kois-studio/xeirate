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
import { clearWorkspace, loadWorkspace, saveWorkspace } from '../lib/persistence';
import { createDemoWorkspace } from '../lib/demo-fixture';
import { formatScheduleForSharing } from '../lib/export';
import { generateSchedule } from '../lib/scheduler';

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
            return 'Restricción';
        case 'preference':
            return 'Preferencia';
        case 'clarification':
            return 'Por aclarar';
    }
}

function conditionDateLabel(condition: Condition): string {
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
    const [alias, setAlias] = useState('');
    const [month, setMonth] = useState(currentMonth);
    const [notice, setNotice] = useState('');
    const [storageReady, setStorageReady] = useState(false);
    const [conditionPersonId, setConditionPersonId] = useState('');
    const [conditionKind, setConditionKind] = useState<ConditionKind>('restriction');
    const [conditionPreferenceMode, setConditionPreferenceMode] = useState<PreferenceMode>('avoid');
    const [conditionStartDate, setConditionStartDate] = useState('');
    const [conditionEndDate, setConditionEndDate] = useState('');
    const [conditionNote, setConditionNote] = useState('');
    const [conditionReusable, setConditionReusable] = useState(false);

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
        if (result.workspace.activeSessionId) {
            const activeSession = result.workspace.sessions.find(
                (session) => session.id === result.workspace.activeSessionId,
            );
            if (activeSession) {
                setMonth(activeSession.month);
            }
        }
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
                      (condition) => condition.sessionId === activeSession.id,
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

    useEffect(() => {
        const firstParticipant = activeParticipants[0];
        if (!firstParticipant) {
            setConditionPersonId('');
            return;
        }

        setConditionPersonId((current) =>
            activeParticipants.some((participant) => participant.id === current)
                ? current
                : firstParticipant.id,
        );
    }, [activeParticipants]);

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
            return;
        }

        const session = createSession({
            id: createIdentifier('session'),
            month,
            participantIds: workspace.participants.map((participant) => participant.id),
            createdAt: new Date().toISOString(),
            schedule: null,
        });
        const reusableConditions = workspace.conditions
            .filter(
                (condition) =>
                    condition.reusable &&
                    !condition.startDate &&
                    !condition.endDate &&
                    session.participantIds.includes(condition.participantId),
            )
            .map((condition) => ({
                ...condition,
                id: createIdentifier('condition'),
                sessionId: session.id,
                createdAt: new Date().toISOString(),
            }));
        setWorkspace((current) => ({
            ...current,
            sessions: [...current.sessions, session],
            activeSessionId: session.id,
            conditions: [...current.conditions, ...reusableConditions],
        }));
        setNotice(
            reusableConditions.length > 0
                ? `Sesión de ${monthLabel(month)} preparada con ${reusableConditions.length} condición(es) fija(s).`
                : `Sesión de ${monthLabel(month)} preparada.`,
        );
    }

    function addCondition(event: TargetedEvent<HTMLFormElement, SubmitEvent>): void {
        event.preventDefault();
        if (!activeSession) {
            setNotice('Prepara una sesión antes de añadir condiciones.');
            return;
        }

        const participantId = conditionPersonId || activeParticipants[0]?.id;
        const normalizedNote = conditionNote.trim();
        if (!participantId) {
            setNotice('Añade una persona a la sesión antes de registrar una condición.');
            return;
        }
        if (!normalizedNote) {
            setNotice('Escribe una nota para explicar la petición.');
            return;
        }
        if (conditionStartDate && conditionEndDate && conditionStartDate > conditionEndDate) {
            setNotice('La fecha final no puede ser anterior a la fecha inicial.');
            return;
        }

        const condition = createCondition({
            id: createIdentifier('condition'),
            sessionId: activeSession.id,
            participantId,
            kind: conditionKind,
            preferenceMode: conditionKind === 'preference' ? conditionPreferenceMode : null,
            startDate: conditionStartDate || null,
            endDate: conditionEndDate || null,
            note: normalizedNote,
            reusable: conditionReusable && !conditionStartDate && !conditionEndDate,
            createdAt: new Date().toISOString(),
        });
        setWorkspace((current) => ({
            ...current,
            conditions: [...current.conditions, condition],
            sessions: current.sessions.map((session) =>
                session.id === activeSession.id ? { ...session, schedule: null } : session,
            ),
        }));
        setConditionStartDate('');
        setConditionEndDate('');
        setConditionNote('');
        setConditionReusable(false);
        setNotice('Condición añadida a la sesión.');
    }

    function removeCondition(conditionId: string): void {
        setWorkspace((current) => ({
            ...current,
            conditions: current.conditions.filter((condition) => condition.id !== conditionId),
            sessions: current.sessions.map((session) =>
                session.id === activeSession?.id ? { ...session, schedule: null } : session,
            ),
        }));
        setNotice('Condición eliminada de la sesión.');
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
        const demo = createDemoWorkspace();
        setWorkspace(demo);
        setMonth('2026-11');
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
        setNotice('El espacio local se ha borrado.');
    }

    return (
        <div class="workspace-shell">
            <section class="workspace-card setup-card" aria-labelledby="setup-title">
                <div class="section-kicker">Primer paso</div>
                <h2 id="setup-title">Prepara tu equipo</h2>
                <p class="section-intro">
                    Usa alias sencillos. Más adelante podrás traducir cada petición a una condición
                    clara.
                </p>

                <form class="inline-form" onSubmit={addParticipant}>
                    <label for="participant-alias">Alias de la persona</label>
                    <div class="form-row">
                        <input
                            id="participant-alias"
                            name="participant-alias"
                            value={alias}
                            placeholder="Ej. Lúa"
                            maxLength={40}
                            autoComplete="off"
                            onInput={(event) => setAlias(event.currentTarget.value)}
                        />
                        <button class="button button-primary" type="submit">
                            <span aria-hidden="true">+</span> Añadir
                        </button>
                    </div>
                </form>

                {workspace.participants.length > 0 ? (
                    <ul class="people-list" aria-label="Personas del equipo">
                        {workspace.participants.map((participant) => (
                            <li key={participant.id}>
                                <span class="avatar" aria-hidden="true">
                                    {participant.alias.slice(0, 1).toUpperCase()}
                                </span>
                                <span class="person-name">{participant.alias}</span>
                                <button
                                    class="icon-button"
                                    type="button"
                                    aria-label={`Eliminar a ${participant.alias}`}
                                    onClick={() => removeParticipant(participant.id)}
                                >
                                    <span aria-hidden="true">×</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div class="empty-state compact">
                        <span class="empty-icon" aria-hidden="true">
                            ✦
                        </span>
                        <span>Aún no hay personas. Empieza por añadir la primera.</span>
                    </div>
                )}
            </section>

            <section class="workspace-card session-card" aria-labelledby="session-title">
                <div class="section-kicker">Segundo paso</div>
                <h2 id="session-title">Crea una sesión mensual</h2>
                <p class="section-intro">
                    La sesión será el espacio de trabajo para condiciones y propuestas de
                    calendario.
                </p>

                <form class="month-form" onSubmit={startSession}>
                    <div>
                        <label for="session-month">Mes de las guardias</label>
                        <input
                            id="session-month"
                            name="session-month"
                            type="month"
                            value={month}
                            onInput={(event) => setMonth(event.currentTarget.value)}
                        />
                    </div>
                    <button class="button button-secondary" type="submit">
                        Preparar sesión <span aria-hidden="true">→</span>
                    </button>
                </form>
            </section>

            {activeSession ? (
                <section class="workspace-card condition-card" aria-labelledby="condition-title">
                    <div class="section-kicker">Tercer paso</div>
                    <h2 id="condition-title">Traduce una petición</h2>
                    <p class="section-intro">
                        Convierte lo que te han pedido en una condición estructurada. Después podrás
                        generar propuestas y revisar qué peticiones necesitan una decisión humana.
                    </p>

                    <form class="condition-form" onSubmit={addCondition}>
                        <div class="condition-fields">
                            <div>
                                <label for="condition-person">Persona</label>
                                <select
                                    id="condition-person"
                                    name="condition-person"
                                    value={conditionPersonId}
                                    onChange={(event) =>
                                        setConditionPersonId(event.currentTarget.value)
                                    }
                                >
                                    {activeParticipants.map((participant) => (
                                        <option key={participant.id} value={participant.id}>
                                            {participant.alias}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label for="condition-kind">Tipo de petición</label>
                                <select
                                    id="condition-kind"
                                    name="condition-kind"
                                    value={conditionKind}
                                    onChange={(event) =>
                                        setConditionKind(event.currentTarget.value as ConditionKind)
                                    }
                                >
                                    <option value="restriction">Restricción</option>
                                    <option value="preference">Preferencia</option>
                                    <option value="clarification">Necesita aclaración</option>
                                </select>
                            </div>
                            {conditionKind === 'preference' ? (
                                <div>
                                    <label for="condition-preference-mode">Cómo aplicarla</label>
                                    <select
                                        id="condition-preference-mode"
                                        name="condition-preference-mode"
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
                        </div>
                        <div class="condition-date-fields">
                            <div>
                                <label for="condition-start">Desde (opcional)</label>
                                <input
                                    id="condition-start"
                                    name="condition-start"
                                    type="date"
                                    min={`${activeSession.month}-01`}
                                    max={lastDateOfMonth(activeSession.month)}
                                    value={conditionStartDate}
                                    onInput={(event) =>
                                        setConditionStartDate(event.currentTarget.value)
                                    }
                                />
                            </div>
                            <div>
                                <label for="condition-end">Hasta (opcional)</label>
                                <input
                                    id="condition-end"
                                    name="condition-end"
                                    type="date"
                                    min={`${activeSession.month}-01`}
                                    max={lastDateOfMonth(activeSession.month)}
                                    value={conditionEndDate}
                                    onInput={(event) =>
                                        setConditionEndDate(event.currentTarget.value)
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <label for="condition-note">Qué hay que tener en cuenta</label>
                            <textarea
                                id="condition-note"
                                name="condition-note"
                                rows={3}
                                maxLength={180}
                                placeholder="Ej. No puede hacer guardia durante el curso."
                                value={conditionNote}
                                onInput={(event) => setConditionNote(event.currentTarget.value)}
                            />
                        </div>
                        <div class="condition-form-footer">
                            <label class="reusable-toggle" for="condition-reusable">
                                <input
                                    id="condition-reusable"
                                    name="condition-reusable"
                                    type="checkbox"
                                    checked={
                                        !conditionStartDate &&
                                        !conditionEndDate &&
                                        conditionReusable
                                    }
                                    disabled={Boolean(conditionStartDate || conditionEndDate)}
                                    onChange={(event) =>
                                        setConditionReusable(event.currentTarget.checked)
                                    }
                                />
                                <span>
                                    <strong>Recordar como condición fija</strong>
                                    <small>
                                        {conditionStartDate || conditionEndDate
                                            ? 'Las condiciones con fechas solo afectan a este mes.'
                                            : 'Se guardará como reutilizable para una futura sesión.'}
                                    </small>
                                </span>
                            </label>
                            <button class="button button-primary" type="submit">
                                Añadir condición <span aria-hidden="true">+</span>
                            </button>
                        </div>
                    </form>

                    {activeConditions.length > 0 ? (
                        <ul class="conditions-list" aria-label="Condiciones de la sesión">
                            {activeConditions.map((condition) => {
                                const participant = activeParticipants.find(
                                    (item) => item.id === condition.participantId,
                                );
                                return (
                                    <li key={condition.id}>
                                        <div class="condition-list-heading">
                                            <div class="condition-tags">
                                                <span class={`condition-badge ${condition.kind}`}>
                                                    {conditionKindLabel(condition.kind)}
                                                </span>
                                                <strong>
                                                    {participant?.alias ?? 'Persona no disponible'}
                                                </strong>
                                            </div>
                                            <button
                                                class="icon-button"
                                                type="button"
                                                aria-label="Eliminar condición"
                                                onClick={() => removeCondition(condition.id)}
                                            >
                                                <span aria-hidden="true">×</span>
                                            </button>
                                        </div>
                                        <p class="condition-copy">{condition.note}</p>
                                        <div class="condition-meta">
                                            <span>{conditionDateLabel(condition)}</span>
                                            {condition.kind === 'preference' ? (
                                                <span>
                                                    {condition.preferenceMode === 'prefer'
                                                        ? 'Intentar asignar'
                                                        : 'Intentar evitar'}
                                                </span>
                                            ) : null}
                                            {condition.reusable ? (
                                                <span>⌁ Condición fija</span>
                                            ) : null}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div class="empty-state compact condition-empty">
                            <span class="empty-icon" aria-hidden="true">
                                ✎
                            </span>
                            <span>Aún no hay peticiones estructuradas para este mes.</span>
                        </div>
                    )}
                </section>
            ) : null}

            <div class="workspace-actions">
                <p class="status-message" role="status" aria-live="polite">
                    <span class="status-dot" aria-hidden="true" />
                    {notice || 'Los datos se quedan en este navegador.'}
                </p>
                <button class="reset-button" type="button" onClick={resetWorkspace}>
                    Borrar espacio local
                </button>
            </div>

            <section class="workspace-card calendar-card" aria-labelledby="calendar-title">
                <div class="calendar-heading">
                    <div>
                        <div class="section-kicker">Espacio de trabajo</div>
                        <h2 id="calendar-title">
                            {activeSession
                                ? `Guardias de ${monthLabel(activeSession.month)}`
                                : 'Tu calendario aparecerá aquí'}
                        </h2>
                    </div>
                    <button
                        class="button button-quiet"
                        type="button"
                        disabled={!activeSession || activeParticipants.length === 0}
                        onClick={generateCurrentSchedule}
                    >
                        <span aria-hidden="true">{activeSchedule ? '↻' : '✦'}</span>{' '}
                        {activeSchedule ? 'Reintentar' : 'Generar propuesta'}
                    </button>
                </div>

                {activeSession ? (
                    <>
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
                                        <strong>
                                            {scheduleErrors.length + scheduleWarnings.length}
                                        </strong>
                                        <span>alertas para revisar</span>
                                    </div>
                                </div>
                                {scheduleIssues.length > 0 ? (
                                    <ul
                                        class="schedule-issues"
                                        aria-label="Alertas de la propuesta"
                                    >
                                        {scheduleIssues.slice(0, 4).map((item) => (
                                            <li class={`issue-${item.severity}`} key={item.id}>
                                                {scheduleIssueLabel(item, activeParticipants)}
                                            </li>
                                        ))}
                                        {scheduleIssues.length > 4 ? (
                                            <li class="issue-info">
                                                Y {scheduleIssues.length - 4} alerta(s) más en el
                                                texto compartible.
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
                                        Compartir
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
                                        Xeirate tratará las restricciones como límites, las
                                        preferencias como señales y dejará visibles las peticiones
                                        por aclarar.
                                    </p>
                                </div>
                            </div>
                        )}
                        <ul
                            class="calendar-grid"
                            aria-label={`Días de ${monthLabel(activeSession.month)}`}
                        >
                            {Array.from(
                                { length: getDaysInMonth(activeSession.month) },
                                (_, index) => (
                                    <li
                                        class={
                                            scheduleAssignments.has(
                                                `${activeSession.month}-${String(index + 1).padStart(2, '0')}`,
                                            )
                                                ? 'assigned-day'
                                                : 'unassigned-day'
                                        }
                                        key={index + 1}
                                    >
                                        <span class="day-number">{index + 1}</span>
                                        <span class="day-state">
                                            {(() => {
                                                const assignment = scheduleAssignments.get(
                                                    `${activeSession.month}-${String(index + 1).padStart(2, '0')}`,
                                                );
                                                return assignment
                                                    ? (activeParticipants.find(
                                                          (participant) =>
                                                              participant.id ===
                                                              assignment.participantId,
                                                      )?.alias ?? 'Sin nombre')
                                                    : 'Sin asignar';
                                            })()}
                                        </span>
                                    </li>
                                ),
                            )}
                        </ul>
                    </>
                ) : (
                    <div class="empty-state large">
                        <span class="empty-calendar" aria-hidden="true">
                            ▦
                        </span>
                        <strong>Primero prepara una sesión</strong>
                        <span>Cuando tengas personas y un mes, este será tu punto de partida.</span>
                        <button class="button button-quiet" type="button" onClick={loadDemo}>
                            Cargar ejemplo anonimizado
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
