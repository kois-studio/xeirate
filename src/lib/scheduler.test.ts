import { describe, expect, test } from 'bun:test';

import type { Condition, Participant, Session } from './domain';
import { generateSchedule } from './scheduler';

const participants: Participant[] = [
    { id: 'person-a', alias: 'Nube' },
    { id: 'person-b', alias: 'Brisa' },
    { id: 'person-c', alias: 'Lume' },
];

const session: Session = {
    id: 'session-november',
    month: '2026-11',
    participantIds: participants.map((participant) => participant.id),
    createdAt: '2026-09-19T10:00:00.000Z',
    schedule: null,
};

const conditions: Condition[] = [
    {
        id: 'restriction-a',
        sessionId: session.id,
        participantId: 'person-a',
        kind: 'restriction',
        preferenceMode: null,
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        weekdays: null,
        note: 'No disponible esos días.',
        reusable: false,
        createdAt: '2026-09-19T10:00:00.000Z',
    },
    {
        id: 'preference-b',
        sessionId: session.id,
        participantId: 'person-b',
        kind: 'preference',
        preferenceMode: 'avoid',
        startDate: '2026-11-06',
        endDate: '2026-11-08',
        weekdays: null,
        note: 'Preferiría evitar esos días.',
        reusable: false,
        createdAt: '2026-09-19T10:00:00.000Z',
    },
    {
        id: 'clarification-c',
        sessionId: session.id,
        participantId: 'person-c',
        kind: 'clarification',
        preferenceMode: null,
        startDate: null,
        endDate: null,
        weekdays: null,
        note: 'Revisar una petición interna.',
        reusable: false,
        createdAt: '2026-09-19T10:00:00.000Z',
    },
];

describe('schedule generation', () => {
    test('is deterministic for the same session, conditions, and attempt', () => {
        const first = generateSchedule({
            session,
            participants,
            conditions,
            attempt: 1,
            generatedAt: '2026-09-19T10:00:00.000Z',
        });
        const second = generateSchedule({
            session,
            participants,
            conditions,
            attempt: 1,
            generatedAt: '2026-09-19T10:00:00.000Z',
        });

        expect(second).toEqual(first);
    });

    test('respects restrictions and records soft preference issues', () => {
        const result = generateSchedule({
            session,
            participants: participants.slice(0, 2),
            conditions: [
                ...conditions.filter((condition) => condition.participantId !== 'person-c'),
                {
                    id: 'restriction-a-two',
                    sessionId: session.id,
                    participantId: 'person-a',
                    kind: 'restriction',
                    preferenceMode: null,
                    startDate: '2026-11-06',
                    endDate: '2026-11-08',
                    weekdays: null,
                    note: 'Tampoco está disponible durante estos días.',
                    reusable: false,
                    createdAt: '2026-09-19T10:00:00.000Z',
                },
            ],
            attempt: 1,
            generatedAt: '2026-09-19T10:00:00.000Z',
        });

        expect(
            result.assignments.some(
                (assignment) =>
                    assignment.date <= '2026-11-05' && assignment.participantId === 'person-a',
            ),
        ).toBe(false);
        expect(result.issues.some((item) => item.kind === 'preference')).toBe(true);
    });

    test('changes the seeded candidate when retrying', () => {
        const first = generateSchedule({
            session,
            participants,
            conditions: [],
            attempt: 1,
            generatedAt: '2026-09-19T10:00:00.000Z',
        });
        const retry = generateSchedule({
            session,
            participants,
            conditions: [],
            attempt: 2,
            generatedAt: '2026-09-19T10:00:00.000Z',
        });

        expect(retry.attempt).toBe(2);
        expect(retry.assignments).not.toEqual(first.assignments);
    });

    test('reports an error when every participant is restricted', () => {
        const result = generateSchedule({
            session,
            participants: [{ id: 'person-a', alias: 'Nube' }],
            conditions: [
                {
                    id: 'restriction-all',
                    sessionId: session.id,
                    participantId: 'person-a',
                    kind: 'restriction',
                    preferenceMode: null,
                    startDate: null,
                    endDate: null,
                    weekdays: null,
                    note: 'No disponible este mes.',
                    reusable: false,
                    createdAt: '2026-09-19T10:00:00.000Z',
                },
            ],
            attempt: 1,
            generatedAt: '2026-09-19T10:00:00.000Z',
        });

        expect(result.assignments).toHaveLength(0);
        expect(result.issues.filter((item) => item.kind === 'unassigned')).toHaveLength(30);
    });

    test('applies fixed weekday restrictions to the generated session', () => {
        const result = generateSchedule({
            session,
            participants: participants.slice(0, 2),
            conditions: [
                {
                    id: 'fixed-tuesday',
                    sessionId: null,
                    participantId: 'person-a',
                    kind: 'restriction',
                    preferenceMode: null,
                    startDate: null,
                    endDate: null,
                    weekdays: [2, 4],
                    note: 'No trabaja los martes ni los jueves.',
                    reusable: true,
                    createdAt: '2026-09-19T10:00:00.000Z',
                },
            ],
            attempt: 1,
            generatedAt: '2026-09-19T10:00:00.000Z',
        });

        expect(
            result.assignments.some(
                (assignment) =>
                    [2, 4].includes(new Date(`${assignment.date}T12:00:00`).getDay()) &&
                    assignment.participantId === 'person-a',
            ),
        ).toBe(false);
    });
});
