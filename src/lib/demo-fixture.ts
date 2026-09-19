import { createCondition, createSession, type Condition, type Workspace } from './domain';

const createdAt = '2026-09-19T10:00:00.000Z';
const demoSessionId = 'demo-session-november';

const demoParticipants = [
    { id: 'demo-nube', alias: 'Nube' },
    { id: 'demo-brisa', alias: 'Brisa' },
    { id: 'demo-lume', alias: 'Lume' },
    { id: 'demo-alba', alias: 'Alba' },
    { id: 'demo-senda', alias: 'Senda' },
    { id: 'demo-rio', alias: 'Río' },
    { id: 'demo-sol', alias: 'Sol' },
    { id: 'demo-mar', alias: 'Mar' },
];

function demoCondition(
    input: Pick<Condition, 'id' | 'participantId' | 'kind' | 'startDate' | 'endDate' | 'note'> &
        Partial<Pick<Condition, 'preferenceMode' | 'reusable' | 'weekday' | 'sessionId'>>,
): Condition {
    return createCondition({
        ...input,
        sessionId: input.sessionId ?? demoSessionId,
        preferenceMode: input.kind === 'preference' ? (input.preferenceMode ?? 'avoid') : null,
        weekday: input.weekday ?? null,
        reusable: input.reusable ?? false,
        createdAt,
    });
}

export function createDemoWorkspace(): Workspace {
    const session = createSession({
        id: demoSessionId,
        month: '2026-11',
        participantIds: demoParticipants.map((participant) => participant.id),
        createdAt,
        schedule: null,
    });

    return {
        participants: demoParticipants,
        sessions: [session],
        activeSessionId: session.id,
        conditions: [
            demoCondition({
                id: 'demo-rio-fixed-tuesday',
                sessionId: null,
                participantId: 'demo-rio',
                kind: 'restriction',
                weekday: 2,
                startDate: null,
                endDate: null,
                note: 'Condición fija: no trabaja los martes.',
                reusable: true,
            }),
            demoCondition({
                id: 'demo-nube-course',
                participantId: 'demo-nube',
                kind: 'restriction',
                startDate: '2026-11-04',
                endDate: '2026-11-06',
                note: 'Curso fuera del hospital durante esos días.',
            }),
            demoCondition({
                id: 'demo-nube-holiday',
                participantId: 'demo-nube',
                kind: 'restriction',
                startDate: '2026-11-21',
                endDate: '2026-11-30',
                note: 'Vacaciones.',
            }),
            demoCondition({
                id: 'demo-brisa-preference',
                participantId: 'demo-brisa',
                kind: 'preference',
                preferenceMode: 'avoid',
                startDate: '2026-11-05',
                endDate: '2026-11-08',
                note: 'Preferiría evitar estos días.',
            }),
            demoCondition({
                id: 'demo-brisa-preference-two',
                participantId: 'demo-brisa',
                kind: 'preference',
                preferenceMode: 'avoid',
                startDate: '2026-11-27',
                endDate: '2026-11-30',
                note: 'Preferiría evitar este fin de semana.',
            }),
            demoCondition({
                id: 'demo-lume-course',
                participantId: 'demo-lume',
                kind: 'restriction',
                startDate: '2026-11-04',
                endDate: '2026-11-07',
                note: 'Curso y rotación formativa.',
            }),
            demoCondition({
                id: 'demo-lume-break',
                participantId: 'demo-lume',
                kind: 'clarification',
                startDate: null,
                endDate: null,
                note: 'Sería útil dejar 4–5 días sin guardia para cubrir cambios de vacaciones.',
            }),
            demoCondition({
                id: 'demo-alba-holiday',
                participantId: 'demo-alba',
                kind: 'restriction',
                startDate: '2026-11-09',
                endDate: '2026-11-15',
                note: 'Vacaciones.',
            }),
            demoCondition({
                id: 'demo-alba-rotation',
                participantId: 'demo-alba',
                kind: 'restriction',
                startDate: '2026-11-28',
                endDate: '2026-11-30',
                note: 'Rotación externa: no asignar desde esta fecha.',
            }),
            demoCondition({
                id: 'demo-senda-preference',
                participantId: 'demo-senda',
                kind: 'preference',
                preferenceMode: 'avoid',
                startDate: '2026-11-01',
                endDate: '2026-11-04',
                note: 'Preferiría evitar estos primeros días.',
            }),
            demoCondition({
                id: 'demo-rio-block',
                participantId: 'demo-rio',
                kind: 'restriction',
                startDate: '2026-11-06',
                endDate: '2026-11-11',
                note: 'No disponible durante este bloqueo.',
            }),
            demoCondition({
                id: 'demo-rio-area',
                participantId: 'demo-rio',
                kind: 'clarification',
                startDate: null,
                endDate: null,
                note: 'Evitar un área concreta: todavía falta confirmar cómo representar las áreas.',
            }),
            demoCondition({
                id: 'demo-sol-unknown',
                participantId: 'demo-sol',
                kind: 'clarification',
                startDate: null,
                endDate: null,
                note: 'Petición interna pendiente de traducir.',
            }),
            demoCondition({
                id: 'demo-mar-preference',
                participantId: 'demo-mar',
                kind: 'preference',
                preferenceMode: 'avoid',
                startDate: '2026-11-11',
                endDate: '2026-11-15',
                note: 'Preferiría evitar estos días.',
            }),
            demoCondition({
                id: 'demo-mar-course',
                participantId: 'demo-mar',
                kind: 'clarification',
                startDate: '2026-11-04',
                endDate: '2026-11-05',
                note: 'Curso: confirmar si debe bloquear esos días.',
            }),
        ],
    };
}
