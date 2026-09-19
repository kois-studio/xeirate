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
    type Session,
    type Workspace,
} from '../lib/domain';
import { clearWorkspace, loadWorkspace, saveWorkspace } from '../lib/persistence';

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
        setWorkspace((current) => ({
            ...current,
            sessions: [...current.sessions, session],
            activeSessionId: session.id,
        }));
        setNotice(`Sesión de ${monthLabel(month)} preparada.`);
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
            reusable: conditionReusable,
            createdAt: new Date().toISOString(),
        });
        setWorkspace((current) => ({
            ...current,
            conditions: [...current.conditions, condition],
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
        }));
        setNotice('Condición eliminada de la sesión.');
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
                        Convierte lo que te han pedido en una nota estructurada. Xeirate todavía no
                        decide el calendario: primero te ayuda a no perder ningún detalle.
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
                                    checked={conditionReusable}
                                    onChange={(event) =>
                                        setConditionReusable(event.currentTarget.checked)
                                    }
                                />
                                <span>
                                    <strong>Recordar como condición fija</strong>
                                    <small>
                                        Se guardará como reutilizable para una futura sesión.
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
                    <button class="button button-quiet" type="button" disabled={!activeSession}>
                        <span aria-hidden="true">↻</span> Reintentar
                    </button>
                </div>

                {activeSession ? (
                    <>
                        <div class="workspace-note">
                            <span class="note-icon" aria-hidden="true">
                                ☼
                            </span>
                            <div>
                                <strong>La generación llegará después.</strong>
                                <p>
                                    Ya tienes el mes y las personas. El siguiente paso será añadir
                                    condiciones y generar una propuesta explicable.
                                </p>
                            </div>
                        </div>
                        <ul
                            class="calendar-grid"
                            aria-label={`Días de ${monthLabel(activeSession.month)}`}
                        >
                            {Array.from(
                                { length: getDaysInMonth(activeSession.month) },
                                (_, index) => (
                                    <li key={index + 1}>
                                        <span class="day-number">{index + 1}</span>
                                        <span class="day-state">Sin asignar</span>
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
                    </div>
                )}
            </section>
        </div>
    );
}
