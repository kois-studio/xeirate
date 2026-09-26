import { z } from 'zod';

const identifierSchema = z.string().min(1).max(120);
const dateSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const weekdaySchema = z.number().int().min(0).max(6);

export const participantSchema = z.object({
    id: identifierSchema,
    alias: z.string().trim().min(1).max(40),
});

const sessionBaseSchema = z.object({
    id: identifierSchema,
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    participantIds: z.array(identifierSchema).max(100),
    createdAt: z.iso.datetime(),
});

const conditionSchemaV3 = z.object({
    id: identifierSchema,
    sessionId: identifierSchema,
    participantId: identifierSchema,
    kind: z.enum(['restriction', 'preference', 'clarification']),
    preferenceMode: z.enum(['avoid', 'prefer']).nullable(),
    startDate: dateSchema.nullable(),
    endDate: dateSchema.nullable(),
    note: z.string().trim().min(1).max(180),
    reusable: z.boolean(),
    createdAt: z.iso.datetime(),
});

const conditionSchemaV4 = z.object({
    id: identifierSchema,
    sessionId: identifierSchema.nullable(),
    participantId: identifierSchema,
    kind: z.enum(['restriction', 'preference', 'clarification']),
    preferenceMode: z.enum(['avoid', 'prefer']).nullable(),
    startDate: dateSchema.nullable(),
    endDate: dateSchema.nullable(),
    weekday: weekdaySchema.nullable(),
    note: z.string().trim().min(1).max(180),
    reusable: z.boolean(),
    createdAt: z.iso.datetime(),
});

const conditionSchema = z
    .object({
        id: identifierSchema,
        sessionId: identifierSchema.nullable(),
        participantId: identifierSchema,
        kind: z.enum(['restriction', 'preference', 'clarification']),
        preferenceMode: z.enum(['avoid', 'prefer']).nullable(),
        startDate: dateSchema.nullable(),
        endDate: dateSchema.nullable(),
        weekdays: z.array(weekdaySchema).max(7).nullable(),
        note: z.string().trim().min(1).max(180),
        reusable: z.boolean(),
        createdAt: z.iso.datetime(),
    })
    .superRefine((condition, context) => {
        if (condition.startDate && condition.endDate && condition.startDate > condition.endDate) {
            context.addIssue({
                code: 'custom',
                path: ['endDate'],
                message: 'The end date must not be before the start date.',
            });
        }
        if (condition.kind === 'preference' && !condition.preferenceMode) {
            context.addIssue({
                code: 'custom',
                path: ['preferenceMode'],
                message: 'A preference needs an avoid or prefer mode.',
            });
        }
        if (condition.kind !== 'preference' && condition.preferenceMode) {
            context.addIssue({
                code: 'custom',
                path: ['preferenceMode'],
                message: 'Only preferences can have a preference mode.',
            });
        }
        if (
            condition.weekdays !== null &&
            new Set(condition.weekdays).size !== condition.weekdays.length
        ) {
            context.addIssue({
                code: 'custom',
                path: ['weekdays'],
                message: 'Weekday selections must be unique.',
            });
        }
    });

export const scheduleColumnSchema = z
    .object({
        id: identifierSchema,
        label: z.string().trim().min(1).max(60),
        weekdays: z.array(weekdaySchema).min(1).max(7),
        intervalDays: z.number().int().min(1).max(31),
        requiredPeople: z.number().int().min(1).max(20),
        shiftDurationHours: z.number().positive().max(168).nullable(),
        startTime: timeSchema.nullable(),
        endTime: timeSchema.nullable(),
        restDaysAfterAssignment: z.number().int().min(0).max(31),
    })
    .superRefine((column, context) => {
        if (new Set(column.weekdays).size !== column.weekdays.length) {
            context.addIssue({
                code: 'custom',
                path: ['weekdays'],
                message: 'Column weekdays must be unique.',
            });
        }
        if ((column.startTime === null) !== (column.endTime === null)) {
            context.addIssue({
                code: 'custom',
                path: ['endTime'],
                message: 'A shift time range needs both a start and an end.',
            });
        }
    });

export const scheduleConfigurationSchema = z.object({
    mode: z.enum(['single', 'columns']),
    columns: z.array(scheduleColumnSchema).min(1).max(24),
    allowMultipleAssignmentsPerDay: z.boolean(),
});

const participantColumnEligibilitySchema = z.object({
    participantId: identifierSchema,
    columnIds: z.array(identifierSchema).max(24),
});

const oldScheduleAssignmentSchema = z.object({
    date: dateSchema,
    participantId: identifierSchema,
});

const oldScheduleIssueSchema = z.object({
    id: identifierSchema,
    severity: z.enum(['error', 'warning', 'info']),
    kind: z.enum(['unassigned', 'preference', 'clarification']),
    date: dateSchema.nullable(),
    participantId: identifierSchema.nullable(),
    message: z.string().trim().min(1).max(240),
});

const oldScheduleSchema = z.object({
    attempt: z.number().int().nonnegative(),
    generatedAt: z.iso.datetime(),
    assignments: z.array(oldScheduleAssignmentSchema).max(31),
    score: z.number().refine(Number.isFinite, { message: 'The score must be finite.' }),
    fairness: z.object({
        minAssignments: z.number().int().nonnegative(),
        maxAssignments: z.number().int().nonnegative(),
        maxDifference: z.number().int().nonnegative(),
        preferenceBreaks: z.number().int().nonnegative(),
    }),
    issues: z.array(oldScheduleIssueSchema).max(1000),
});

export const scheduleAssignmentSchema = z.object({
    slotId: identifierSchema,
    date: dateSchema,
    columnId: identifierSchema,
    participantId: identifierSchema,
});

export const scheduleIssueSchema = z.object({
    id: identifierSchema,
    severity: z.enum(['error', 'warning', 'info']),
    kind: z.enum(['unassigned', 'preference', 'clarification']),
    date: dateSchema.nullable(),
    participantId: identifierSchema.nullable(),
    message: z.string().trim().min(1).max(240),
});

export const scheduleSchema = z.object({
    attempt: z.number().int().nonnegative(),
    generatedAt: z.iso.datetime(),
    assignments: z.array(scheduleAssignmentSchema).max(2000),
    score: z.number().refine(Number.isFinite, { message: 'The score must be finite.' }),
    fairness: z.object({
        minAssignments: z.number().int().nonnegative(),
        maxAssignments: z.number().int().nonnegative(),
        maxDifference: z.number().int().nonnegative(),
        preferenceBreaks: z.number().int().nonnegative(),
    }),
    issues: z.array(scheduleIssueSchema).max(2000),
});

const legacySessionSchemaV5 = sessionBaseSchema.extend({
    schedule: oldScheduleSchema.nullable(),
});

const sessionSchema = sessionBaseSchema.extend({
    scheduleConfig: scheduleConfigurationSchema,
    participantColumnEligibility: z.array(participantColumnEligibilitySchema).max(100),
    schedule: scheduleSchema.nullable(),
});

const sessionWorkspaceSchemaV1 = z.object({
    participants: z.array(participantSchema).max(100),
    sessions: z.array(sessionBaseSchema).max(24),
    activeSessionId: identifierSchema.nullable(),
});

const legacyConditionSchema = z.object({
    id: identifierSchema,
    sessionId: identifierSchema,
    participantId: identifierSchema,
    kind: z.enum(['restriction', 'preference', 'clarification']),
    startDate: dateSchema.nullable(),
    endDate: dateSchema.nullable(),
    note: z.string().trim().min(1).max(180),
    reusable: z.boolean(),
    createdAt: z.iso.datetime(),
});

const sessionWorkspaceSchemaV2 = sessionWorkspaceSchemaV1.extend({
    conditions: z.array(legacyConditionSchema).max(1000),
});

const sessionWorkspaceSchemaV3 = z.object({
    participants: z.array(participantSchema).max(100),
    sessions: z.array(legacySessionSchemaV5).max(24),
    activeSessionId: identifierSchema.nullable(),
    conditions: z.array(conditionSchemaV3).max(1000),
});

const sessionWorkspaceSchemaV4 = z.object({
    participants: z.array(participantSchema).max(100),
    sessions: z.array(legacySessionSchemaV5).max(24),
    activeSessionId: identifierSchema.nullable(),
    conditions: z.array(conditionSchemaV4).max(1000),
});

const sessionWorkspaceSchemaV5 = z.object({
    participants: z.array(participantSchema).max(100),
    sessions: z.array(legacySessionSchemaV5).max(24),
    activeSessionId: identifierSchema.nullable(),
    conditions: z.array(conditionSchema).max(1000),
});

export const workspaceSchema = z.object({
    participants: z.array(participantSchema).max(100),
    sessions: z.array(sessionSchema).max(24),
    activeSessionId: identifierSchema.nullable(),
    conditions: z.array(conditionSchema).max(1000),
});

export const storageEnvelopeSchema = z.object({
    schemaVersion: z.literal(6),
    updatedAt: z.iso.datetime(),
    workspace: workspaceSchema,
});

export const legacyStorageEnvelopeSchema = z.object({
    schemaVersion: z.literal(1),
    updatedAt: z.iso.datetime(),
    workspace: sessionWorkspaceSchemaV1,
});

export const legacyStorageEnvelopeV2Schema = z.object({
    schemaVersion: z.literal(2),
    updatedAt: z.iso.datetime(),
    workspace: sessionWorkspaceSchemaV2,
});

export const legacyStorageEnvelopeV3Schema = z.object({
    schemaVersion: z.literal(3),
    updatedAt: z.iso.datetime(),
    workspace: sessionWorkspaceSchemaV3,
});

export const legacyStorageEnvelopeV4Schema = z.object({
    schemaVersion: z.literal(4),
    updatedAt: z.iso.datetime(),
    workspace: sessionWorkspaceSchemaV4,
});

export const legacyStorageEnvelopeV5Schema = z.object({
    schemaVersion: z.literal(5),
    updatedAt: z.iso.datetime(),
    workspace: sessionWorkspaceSchemaV5,
});

export type Participant = z.infer<typeof participantSchema>;
export type ScheduleColumn = z.infer<typeof scheduleColumnSchema>;
export type ScheduleConfiguration = z.infer<typeof scheduleConfigurationSchema>;
export type ParticipantColumnEligibility = z.infer<typeof participantColumnEligibilitySchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type ConditionKind = Condition['kind'];
export type PreferenceMode = NonNullable<Condition['preferenceMode']>;
export type ScheduleAssignment = z.infer<typeof scheduleAssignmentSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type ScheduleIssue = z.infer<typeof scheduleIssueSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type StorageEnvelope = z.infer<typeof storageEnvelopeSchema>;

export const ALL_WEEKDAY_VALUES = [0, 1, 2, 3, 4, 5, 6];

export function createDefaultScheduleConfiguration(): ScheduleConfiguration {
    return {
        mode: 'single',
        columns: [createDefaultScheduleColumn()],
        allowMultipleAssignmentsPerDay: false,
    };
}

export function createDefaultScheduleColumn(): ScheduleColumn {
    return {
        id: 'general',
        label: 'General',
        weekdays: [...ALL_WEEKDAY_VALUES],
        intervalDays: 1,
        requiredPeople: 1,
        shiftDurationHours: null,
        startTime: null,
        endTime: null,
        restDaysAfterAssignment: 0,
    };
}

export function emptyWorkspace(): Workspace {
    return {
        participants: [],
        sessions: [],
        activeSessionId: null,
        conditions: [],
    };
}

export function isValidMonth(value: string): boolean {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function createIdentifier(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSession(input: Session): Session {
    return sessionSchema.parse(input);
}

export function createCondition(input: Condition): Condition {
    return conditionSchema.parse(input);
}

function migrateSchedule(schedule: z.infer<typeof oldScheduleSchema>): Schedule {
    return {
        ...schedule,
        assignments: schedule.assignments.map((assignment) => ({
            ...assignment,
            slotId: `general-${assignment.date}`,
            columnId: 'general',
        })),
    };
}

function migrateSession(session: z.infer<typeof legacySessionSchemaV5>): Session {
    const scheduleConfig = createDefaultScheduleConfiguration();
    return {
        ...session,
        scheduleConfig,
        participantColumnEligibility: session.participantIds.map((participantId) => ({
            participantId,
            columnIds: ['general'],
        })),
        schedule: session.schedule ? migrateSchedule(session.schedule) : null,
    };
}

function migrateLegacySession(session: z.infer<typeof sessionBaseSchema>): Session {
    return migrateSession({ ...session, schedule: null });
}

function migrateCondition(condition: z.infer<typeof legacyConditionSchema>): Condition {
    return {
        ...condition,
        preferenceMode: condition.kind === 'preference' ? 'avoid' : null,
        weekdays: condition.reusable ? [...ALL_WEEKDAY_VALUES] : null,
    };
}

function migrateSchemaThreeCondition(condition: z.infer<typeof conditionSchemaV3>): Condition {
    return {
        ...condition,
        weekdays: condition.reusable ? [...ALL_WEEKDAY_VALUES] : null,
    };
}

function migrateSchemaFourCondition(condition: z.infer<typeof conditionSchemaV4>): Condition {
    return {
        ...condition,
        weekdays:
            condition.weekday === null
                ? condition.reusable
                    ? [...ALL_WEEKDAY_VALUES]
                    : null
                : [condition.weekday],
    };
}

export function migrateLegacyWorkspace(
    workspace: z.infer<typeof sessionWorkspaceSchemaV1>,
): Workspace {
    return {
        ...workspace,
        sessions: workspace.sessions.map(migrateLegacySession),
        conditions: [],
    };
}

export function migrateSchemaTwoWorkspace(
    workspace: z.infer<typeof sessionWorkspaceSchemaV2>,
): Workspace {
    return {
        ...workspace,
        sessions: workspace.sessions.map(migrateLegacySession),
        conditions: workspace.conditions.map(migrateCondition),
    };
}

export function migrateSchemaThreeWorkspace(
    workspace: z.infer<typeof sessionWorkspaceSchemaV3>,
): Workspace {
    return {
        ...workspace,
        sessions: workspace.sessions.map(migrateSession),
        conditions: workspace.conditions.map(migrateSchemaThreeCondition),
    };
}

export function migrateSchemaFourWorkspace(
    workspace: z.infer<typeof sessionWorkspaceSchemaV4>,
): Workspace {
    return {
        ...workspace,
        sessions: workspace.sessions.map(migrateSession),
        conditions: workspace.conditions.map(migrateSchemaFourCondition),
    };
}

export function migrateSchemaFiveWorkspace(
    workspace: z.infer<typeof sessionWorkspaceSchemaV5>,
): Workspace {
    return {
        ...workspace,
        sessions: workspace.sessions.map(migrateSession),
        conditions: workspace.conditions,
    };
}

export function getDaysInMonth(month: string): number {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
        return 0;
    }

    const year = Number(match[1]);
    const monthNumber = Number(match[2]);
    if (!Number.isInteger(year) || !Number.isInteger(monthNumber)) {
        return 0;
    }

    return new Date(year, monthNumber, 0).getDate();
}

export function formatMonth(month: string, locale = 'es-ES'): string {
    const date = new Date(`${month}-01T12:00:00`);
    if (Number.isNaN(date.getTime())) {
        return month;
    }

    return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
    }).format(date);
}
