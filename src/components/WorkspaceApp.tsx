import { useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX, TargetedEvent } from 'preact';

import {
    createIdentifier,
    createSession,
    emptyWorkspace,
    formatMonth,
    getDaysInMonth,
    isValidMonth,
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

export default function WorkspaceApp(): JSX.Element {
    const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
    const [alias, setAlias] = useState('');
    const [month, setMonth] = useState(currentMonth);
    const [notice, setNotice] = useState('');
    const [storageReady, setStorageReady] = useState(false);

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
        });
        setWorkspace((current) => ({
            ...current,
            sessions: [...current.sessions, session],
            activeSessionId: session.id,
        }));
        setNotice(`Sesión de ${monthLabel(month)} preparada.`);
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
