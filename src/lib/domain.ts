import { z } from 'zod';

const identifierSchema = z.string().min(1).max(120);
const dateSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/);

export const participantSchema = z.object({
    id: identifierSchema,
    alias: z.string().trim().min(1).max(40),
});

export const sessionSchema = z.object({
    id: identifierSchema,
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    participantIds: z.array(identifierSchema).max(100),
    createdAt: z.iso.datetime(),
});

export const conditionSchema = z
    .object({
        id: identifierSchema,
        sessionId: identifierSchema,
        participantId: identifierSchema,
        kind: z.enum(['restriction', 'preference', 'clarification']),
        startDate: dateSchema.nullable(),
        endDate: dateSchema.nullable(),
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
    });

const sessionWorkspaceSchema = z.object({
    participants: z.array(participantSchema).max(100),
    sessions: z.array(sessionSchema).max(24),
    activeSessionId: identifierSchema.nullable(),
});

export const workspaceSchema = sessionWorkspaceSchema.extend({
    conditions: z.array(conditionSchema).max(1000),
});

export const storageEnvelopeSchema = z.object({
    schemaVersion: z.literal(2),
    updatedAt: z.iso.datetime(),
    workspace: workspaceSchema,
});

export const legacyStorageEnvelopeSchema = z.object({
    schemaVersion: z.literal(1),
    updatedAt: z.iso.datetime(),
    workspace: sessionWorkspaceSchema,
});

export type Participant = z.infer<typeof participantSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type ConditionKind = Condition['kind'];
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

export function migrateLegacyWorkspace(
    workspace: z.infer<typeof sessionWorkspaceSchema>,
): Workspace {
    return { ...workspace, conditions: [] };
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

export function formatMonth(month: string): string {
    const date = new Date(`${month}-01T12:00:00`);
    if (Number.isNaN(date.getTime())) {
        return month;
    }

    return new Intl.DateTimeFormat('es-ES', {
        month: 'long',
        year: 'numeric',
    }).format(date);
}
