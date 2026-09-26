import {
    createCondition,
    createSession,
    type Participant,
    type ScheduleConfiguration,
    type Session,
    type Workspace,
} from './domain';

const createdAt = '2026-09-26T10:00:00.000Z';

export const acceptanceParticipants: Participant[] = [
    { id: 'acceptance-alpha', alias: 'Alpha' },
    { id: 'acceptance-bravo', alias: 'Bravo' },
    { id: 'acceptance-charlie', alias: 'Charlie' },
    { id: 'acceptance-delta', alias: 'Delta' },
    { id: 'acceptance-echo', alias: 'Echo' },
];

export const acceptanceConfiguration: ScheduleConfiguration = {
    mode: 'columns',
    allowMultipleAssignmentsPerDay: true,
    columns: [
        {
            id: 'acceptance-general',
            label: 'General',
            weekdays: [0, 1, 2, 3, 4, 5, 6],
            intervalDays: 1,
            requiredPeople: 1,
            shiftDurationHours: 8,
            startTime: '08:00',
            endTime: '16:00',
            restDaysAfterAssignment: 0,
        },
        {
            id: 'acceptance-urgent',
            label: 'Urgencias',
            weekdays: [1, 2, 3, 4, 5],
            intervalDays: 1,
            requiredPeople: 1,
            shiftDurationHours: 24,
            startTime: '08:00',
            endTime: '08:00',
            restDaysAfterAssignment: 2,
        },
        {
            id: 'acceptance-weekend',
            label: 'Fin de semana',
            weekdays: [0, 6],
            intervalDays: 1,
            requiredPeople: 1,
            shiftDurationHours: 24,
            startTime: '08:00',
            endTime: '08:00',
            restDaysAfterAssignment: 2,
        },
    ],
};

export function createAcceptanceSession(): Session {
    return createSession({
        id: 'acceptance-session',
        month: '2026-11',
        participantIds: acceptanceParticipants.map((participant) => participant.id),
        createdAt,
        scheduleConfig: acceptanceConfiguration,
        participantColumnEligibility: [
            {
                participantId: 'acceptance-alpha',
                columnIds: ['acceptance-general'],
            },
            {
                participantId: 'acceptance-bravo',
                columnIds: ['acceptance-general', 'acceptance-urgent'],
            },
            {
                participantId: 'acceptance-charlie',
                columnIds: ['acceptance-general', 'acceptance-urgent'],
            },
            {
                participantId: 'acceptance-delta',
                columnIds: ['acceptance-general', 'acceptance-weekend'],
            },
            {
                participantId: 'acceptance-echo',
                columnIds: ['acceptance-general', 'acceptance-urgent', 'acceptance-weekend'],
            },
        ],
        schedule: null,
    });
}

export function createAcceptanceWorkspace(): Workspace {
    const session = createAcceptanceSession();
    return {
        participants: acceptanceParticipants,
        sessions: [session],
        activeSessionId: session.id,
        conditions: [
            createCondition({
                id: 'acceptance-alpha-course',
                sessionId: session.id,
                participantId: 'acceptance-alpha',
                kind: 'restriction',
                preferenceMode: null,
                startDate: '2026-11-10',
                endDate: '2026-11-12',
                weekdays: null,
                note: 'Synthetic course block.',
                reusable: false,
                createdAt,
            }),
        ],
    };
}
