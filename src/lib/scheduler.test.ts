import { describe, expect, test } from 'bun:test';

import {
    createDefaultScheduleConfiguration,
    type Condition,
    type Participant,
    type Session,
} from './domain';
import {
    acceptanceConfiguration,
    acceptanceParticipants,
    createAcceptanceWorkspace,
} from './acceptance-fixture';
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
    scheduleConfig: createDefaultScheduleConfiguration(),
    participantColumnEligibility: participants.map((participant) => ({
        participantId: participant.id,
        columnIds: ['general'],
    })),
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

    test('generates multiple assignments across configured columns', () => {
        const result = generateSchedule({
            session: {
                ...session,
                scheduleConfig: {
                    ...createDefaultScheduleConfiguration(),
                    mode: 'columns',
                    columns: [
                        {
                            ...createDefaultScheduleConfiguration().columns[0],
                            id: 'morning',
                            label: 'Morning',
                            requiredPeople: 1,
                        },
                        {
                            ...createDefaultScheduleConfiguration().columns[0],
                            id: 'evening',
                            label: 'Evening',
                            requiredPeople: 1,
                        },
                    ],
                },
                participantColumnEligibility: [
                    { participantId: 'person-a', columnIds: ['morning'] },
                    { participantId: 'person-b', columnIds: ['evening'] },
                ],
            },
            participants: participants.slice(0, 2),
            conditions: [],
            attempt: 1,
            generatedAt: '2026-09-19T10:00:00.000Z',
        });

        expect(result.assignments).toHaveLength(60);
        expect(new Set(result.assignments.map((assignment) => assignment.columnId))).toEqual(
            new Set(['morning', 'evening']),
        );
    });

    test('applies independent cadence and rest rules', () => {
        const configuration = createDefaultScheduleConfiguration();
        const result = generateSchedule({
            session: {
                ...session,
                scheduleConfig: {
                    ...configuration,
                    columns: [
                        {
                            ...configuration.columns[0],
                            requiredPeople: 1,
                            intervalDays: 3,
                            restDaysAfterAssignment: 2,
                        },
                    ],
                },
                participantColumnEligibility: [
                    { participantId: 'person-a', columnIds: ['general'] },
                    { participantId: 'person-b', columnIds: ['general'] },
                ],
            },
            participants: participants.slice(0, 2),
            conditions: [],
            attempt: 1,
            generatedAt: '2026-09-19T10:00:00.000Z',
        });

        expect(result.assignments).toHaveLength(10);
        expect(new Set(result.assignments.map((assignment) => assignment.date)).size).toBe(10);
    });

    test('solves a constrained choice by backtracking instead of accepting a dead end', () => {
        const configuration = createDefaultScheduleConfiguration();
        const result = generateSchedule({
            session: {
                ...session,
                scheduleConfig: {
                    ...configuration,
                    columns: [
                        {
                            ...configuration.columns[0],
                            restDaysAfterAssignment: 1,
                        },
                    ],
                },
            },
            participants: participants.slice(0, 2),
            conditions: [
                {
                    id: 'backtrack-preference',
                    sessionId: session.id,
                    participantId: 'person-b',
                    kind: 'preference',
                    preferenceMode: 'avoid',
                    startDate: '2026-11-01',
                    endDate: '2026-11-01',
                    weekdays: null,
                    note: 'Synthetic preference.',
                    reusable: false,
                    createdAt: '2026-09-19T10:00:00.000Z',
                },
                {
                    id: 'backtrack-restriction',
                    sessionId: session.id,
                    participantId: 'person-b',
                    kind: 'restriction',
                    preferenceMode: null,
                    startDate: '2026-11-02',
                    endDate: '2026-11-02',
                    weekdays: null,
                    note: 'Synthetic restriction.',
                    reusable: false,
                    createdAt: '2026-09-19T10:00:00.000Z',
                },
            ],
            attempt: 1,
            generatedAt: '2026-09-19T10:00:00.000Z',
        });

        expect(result.issues.filter((item) => item.kind === 'unassigned')).toHaveLength(0);
        expect(result.assignments[0]?.participantId).toBe('person-b');
        expect(result.assignments[1]?.participantId).toBe('person-a');
    });

    test('covers the acceptance fixture across multiple columns and cadences', () => {
        const workspace = createAcceptanceWorkspace();
        const acceptanceSession = workspace.sessions[0];
        if (!acceptanceSession) {
            throw new Error('Acceptance fixture is missing its session.');
        }
        const result = generateSchedule({
            session: acceptanceSession,
            participants: acceptanceParticipants,
            conditions: workspace.conditions,
            attempt: 1,
            generatedAt: '2026-09-26T10:00:00.000Z',
        });

        expect(result.assignments).toHaveLength(60);
        expect(result.issues.filter((item) => item.kind === 'unassigned')).toHaveLength(0);
        expect(new Set(result.assignments.map((assignment) => assignment.columnId))).toEqual(
            new Set(acceptanceConfiguration.columns.map((column) => column.id)),
        );
        expect(
            result.assignments.some(
                (assignment) =>
                    assignment.participantId === 'acceptance-alpha' &&
                    assignment.date >= '2026-11-10' &&
                    assignment.date <= '2026-11-12',
            ),
        ).toBe(false);
    });
});
