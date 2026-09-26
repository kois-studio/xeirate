import { describe, expect, test } from 'bun:test';

import { emptyWorkspace } from './domain';
import {
    clearWorkspace,
    LEGACY_STORAGE_KEY,
    loadWorkspace,
    STORAGE_KEY,
    type StorageLike,
    saveWorkspace,
} from './persistence';

function createMemoryStorage(initialValue?: string): StorageLike & { value: string | null } {
    const values = new Map<string, string>();
    if (initialValue) {
        values.set(STORAGE_KEY, initialValue);
    }

    return {
        get value() {
            return values.get(STORAGE_KEY) ?? null;
        },
        getItem(key) {
            return values.get(key) ?? null;
        },
        removeItem(key) {
            values.delete(key);
        },
        setItem(key, nextValue) {
            values.set(key, nextValue);
        },
    };
}

describe('workspace persistence', () => {
    test('returns an empty workspace when storage has no saved data', () => {
        const result = loadWorkspace(createMemoryStorage());

        expect(result.status).toBe('empty');
        expect(result.workspace).toEqual(emptyWorkspace());
    });

    test('round-trips a versioned workspace envelope', () => {
        const storage = createMemoryStorage();
        const workspace = {
            participants: [{ id: 'person-1', alias: 'Lúa' }],
            sessions: [
                {
                    id: 'session-1',
                    month: '2026-11',
                    participantIds: ['person-1'],
                    createdAt: '2026-09-19T10:00:00.000Z',
                    schedule: null,
                },
            ],
            activeSessionId: 'session-1',
            conditions: [],
        };

        expect(saveWorkspace(storage, workspace, '2026-09-19T10:05:00.000Z')).toEqual({
            status: 'saved',
        });
        expect(loadWorkspace(storage)).toEqual({ status: 'loaded', workspace });
    });

    test('rejects malformed or unsupported data without throwing', () => {
        const malformed = createMemoryStorage('{"schemaVersion":99,"workspace":null}');

        expect(loadWorkspace(malformed)).toEqual({
            status: 'invalid',
            workspace: emptyWorkspace(),
        });
    });

    test('handles unavailable storage safely', () => {
        expect(loadWorkspace(undefined)).toEqual({ status: 'empty', workspace: emptyWorkspace() });
        expect(saveWorkspace(undefined, emptyWorkspace())).toEqual({ status: 'unavailable' });
    });

    test('migrates the first local schema without losing participants or sessions', () => {
        const legacy = createMemoryStorage();
        legacy.setItem(
            LEGACY_STORAGE_KEY,
            JSON.stringify({
                schemaVersion: 1,
                updatedAt: '2026-09-19T10:00:00.000Z',
                workspace: {
                    participants: [{ id: 'person-1', alias: 'Lúa' }],
                    sessions: [
                        {
                            id: 'session-1',
                            month: '2026-11',
                            participantIds: ['person-1'],
                            createdAt: '2026-09-19T10:00:00.000Z',
                        },
                    ],
                    activeSessionId: 'session-1',
                },
            }),
        );

        const result = loadWorkspace(legacy);

        expect(result.status).toBe('migrated');
        expect(result.workspace.conditions).toEqual([]);
        expect(result.workspace.participants[0]?.alias).toBe('Lúa');
    });

    test('migrates the condition schema before schedules are introduced', () => {
        const schemaTwo = createMemoryStorage(
            JSON.stringify({
                schemaVersion: 2,
                updatedAt: '2026-09-19T10:00:00.000Z',
                workspace: {
                    participants: [{ id: 'person-1', alias: 'Lúa' }],
                    sessions: [
                        {
                            id: 'session-1',
                            month: '2026-11',
                            participantIds: ['person-1'],
                            createdAt: '2026-09-19T10:00:00.000Z',
                        },
                    ],
                    activeSessionId: 'session-1',
                    conditions: [
                        {
                            id: 'condition-1',
                            sessionId: 'session-1',
                            participantId: 'person-1',
                            kind: 'preference',
                            startDate: '2026-11-05',
                            endDate: '2026-11-08',
                            note: 'Intentar evitar estos días.',
                            reusable: false,
                            createdAt: '2026-09-19T10:00:00.000Z',
                        },
                    ],
                },
            }),
        );

        const result = loadWorkspace(schemaTwo);

        expect(result.status).toBe('migrated');
        expect(result.workspace.sessions[0]?.schedule).toBeNull();
        expect(result.workspace.conditions[0]?.preferenceMode).toBe('avoid');
    });

    test('migrates schema three conditions into the fixed-condition model', () => {
        const schemaThree = createMemoryStorage(
            JSON.stringify({
                schemaVersion: 3,
                updatedAt: '2026-09-19T10:00:00.000Z',
                workspace: {
                    participants: [{ id: 'person-1', alias: 'Lúa' }],
                    sessions: [
                        {
                            id: 'session-1',
                            month: '2026-11',
                            participantIds: ['person-1'],
                            createdAt: '2026-09-19T10:00:00.000Z',
                            schedule: null,
                        },
                    ],
                    activeSessionId: 'session-1',
                    conditions: [
                        {
                            id: 'condition-1',
                            sessionId: 'session-1',
                            participantId: 'person-1',
                            kind: 'restriction',
                            preferenceMode: null,
                            startDate: null,
                            endDate: null,
                            note: 'No trabaja durante una condición antigua.',
                            reusable: false,
                            createdAt: '2026-09-19T10:00:00.000Z',
                        },
                    ],
                },
            }),
        );

        const result = loadWorkspace(schemaThree);

        expect(result.status).toBe('migrated');
        expect(result.workspace.conditions[0]?.weekdays).toBeNull();
        expect(result.workspace.conditions[0]?.sessionId).toBe('session-1');
    });

    test('migrates schema four weekday conditions into weekday selections', () => {
        const schemaFour = createMemoryStorage(
            JSON.stringify({
                schemaVersion: 4,
                updatedAt: '2026-09-19T10:00:00.000Z',
                workspace: {
                    participants: [{ id: 'person-1', alias: 'Lúa' }],
                    sessions: [
                        {
                            id: 'session-1',
                            month: '2026-11',
                            participantIds: ['person-1'],
                            createdAt: '2026-09-19T10:00:00.000Z',
                            schedule: null,
                        },
                    ],
                    activeSessionId: 'session-1',
                    conditions: [
                        {
                            id: 'condition-1',
                            sessionId: null,
                            participantId: 'person-1',
                            kind: 'restriction',
                            preferenceMode: null,
                            startDate: null,
                            endDate: null,
                            weekday: 2,
                            note: 'No trabaja los martes.',
                            reusable: true,
                            createdAt: '2026-09-19T10:00:00.000Z',
                        },
                    ],
                },
            }),
        );

        const result = loadWorkspace(schemaFour);

        expect(result.status).toBe('migrated');
        expect(result.workspace.conditions[0]?.weekdays).toEqual([2]);
    });

    test('clears the local workspace through the storage boundary', () => {
        const storage = createMemoryStorage();
        saveWorkspace(storage, emptyWorkspace(), '2026-09-19T10:00:00.000Z');
        storage.setItem(LEGACY_STORAGE_KEY, 'legacy');

        clearWorkspace(storage);

        expect(storage.value).toBeNull();
        expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    });
});
