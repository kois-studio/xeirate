import { z } from 'zod';

const identifierSchema = z.string().min(1).max(120);
const dateSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/);

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
    weekday: z.number().int().min(0).max(6).nullable(),
    note: z.string().trim().min(1).max(180),
    reusable: z.boolean(),
    createdAt: z.iso.datetime(),
});

export const scheduleAssignmentSchema = z.object({
    date: dateSchema,
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
    assignments: z.array(scheduleAssignmentSchema).max(31),
    score: z.number().refine(Number.isFinite, { message: 'The score must be finite.' }),
    fairness: z.object({
        minAssignments: z.number().int().nonnegative(),
        maxAssignments: z.number().int().nonnegative(),
        maxDifference: z.number().int().nonnegative(),
        preferenceBreaks: z.number().int().nonnegative(),
    }),
    issues: z.array(scheduleIssueSchema).max(1000),
});

export const sessionSchema = sessionBaseSchema.extend({
    schedule: scheduleSchema.nullable(),
});

export const conditionSchema = z
    .object({
        id: identifierSchema,
        sessionId: identifierSchema.nullable(),
        participantId: identifierSchema,
        kind: z.enum(['restriction', 'preference', 'clarification']),
        preferenceMode: z.enum(['avoid', 'prefer']).nullable(),
        startDate: dateSchema.nullable(),
        endDate: dateSchema.nullable(),
        weekdays: z.array(z.number().int().min(0).max(6)).max(7).nullable(),
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

const sessionWorkspaceSchemaV1 = z.object({
    participants: z.array(participantSchema).max(100),
    sessions: z.array(sessionBaseSchema).max(24),
    activeSessionId: identifierSchema.nullable(),
});

const sessionWorkspaceSchemaV2 = sessionWorkspaceSchemaV1.extend({
    conditions: z.array(legacyConditionSchema).max(1000),
});

const sessionWorkspaceSchemaV3 = z.object({
    participants: z.array(participantSchema).max(100),
    sessions: z.array(sessionSchema).max(24),
    activeSessionId: identifierSchema.nullable(),
    conditions: z.array(conditionSchemaV3).max(1000),
});

const sessionWorkspaceSchemaV4 = z.object({
    participants: z.array(participantSchema).max(100),
    sessions: z.array(sessionSchema).max(24),
    activeSessionId: identifierSchema.nullable(),
    conditions: z.array(conditionSchemaV4).max(1000),
});

export const workspaceSchema = sessionWorkspaceSchemaV1.extend({
    sessions: z.array(sessionSchema).max(24),
    conditions: z.array(conditionSchema).max(1000),
});

export const storageEnvelopeSchema = z.object({
    schemaVersion: z.literal(5),
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

export type Participant = z.infer<typeof participantSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type ConditionKind = Condition['kind'];
export type PreferenceMode = NonNullable<Condition['preferenceMode']>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type ScheduleIssue = z.infer<typeof scheduleIssueSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type StorageEnvelope = z.infer<typeof storageEnvelopeSchema>;

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

const allWeekdays = [0, 1, 2, 3, 4, 5, 6];

function migrateCondition(condition: z.infer<typeof legacyConditionSchema>): Condition {
    return {
        ...condition,
        preferenceMode: condition.kind === 'preference' ? 'avoid' : null,
        weekdays: condition.reusable ? [...allWeekdays] : null,
    };
}

function migrateSchemaThreeCondition(condition: z.infer<typeof conditionSchemaV3>): Condition {
    return {
        ...condition,
        weekdays: condition.reusable ? [...allWeekdays] : null,
    };
}

function migrateSchemaFourCondition(condition: z.infer<typeof conditionSchemaV4>): Condition {
    return {
        ...condition,
        weekdays:
            condition.weekday === null
                ? condition.reusable
                    ? [...allWeekdays]
                    : null
                : [condition.weekday],
    };
}

function migrateSessions(
    sessions: z.infer<typeof sessionWorkspaceSchemaV1>['sessions'],
): Session[] {
    return sessions.map((session) => ({ ...session, schedule: null }));
}

export function migrateLegacyWorkspace(
    workspace: z.infer<typeof sessionWorkspaceSchemaV1>,
): Workspace {
    return {
        ...workspace,
        sessions: migrateSessions(workspace.sessions),
        conditions: [],
    };
}

export function migrateSchemaTwoWorkspace(
    workspace: z.infer<typeof sessionWorkspaceSchemaV2>,
): Workspace {
    return {
        ...workspace,
        sessions: migrateSessions(workspace.sessions),
        conditions: workspace.conditions.map(migrateCondition),
    };
}

export function migrateSchemaThreeWorkspace(
    workspace: z.infer<typeof sessionWorkspaceSchemaV3>,
): Workspace {
    return {
        ...workspace,
        conditions: workspace.conditions.map(migrateSchemaThreeCondition),
    };
}

export function migrateSchemaFourWorkspace(
    workspace: z.infer<typeof sessionWorkspaceSchemaV4>,
): Workspace {
    return {
        ...workspace,
        conditions: workspace.conditions.map(migrateSchemaFourCondition),
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
