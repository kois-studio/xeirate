import {
    emptyWorkspace,
    legacyStorageEnvelopeSchema,
    legacyStorageEnvelopeV2Schema,
    legacyStorageEnvelopeV3Schema,
    legacyStorageEnvelopeV4Schema,
    legacyStorageEnvelopeV5Schema,
    migrateLegacyWorkspace,
    migrateSchemaFourWorkspace,
    migrateSchemaFiveWorkspace,
    migrateSchemaThreeWorkspace,
    migrateSchemaTwoWorkspace,
    type StorageEnvelope,
    storageEnvelopeSchema,
    type Workspace,
} from './domain';

export const STORAGE_KEY = 'xeirate.workspace';
export const LEGACY_STORAGE_KEY = 'xeirate.workspace.v1';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type LoadResult =
    | { status: 'empty'; workspace: Workspace }
    | { status: 'loaded'; workspace: Workspace }
    | { status: 'migrated'; workspace: Workspace }
    | { status: 'invalid'; workspace: Workspace };

export type SaveResult = { status: 'saved' } | { status: 'unavailable' };

export function loadWorkspace(storage: StorageLike | undefined): LoadResult {
    if (!storage) {
        return { status: 'empty', workspace: emptyWorkspace() };
    }

    let raw: string | null = null;
    let key = STORAGE_KEY;
    try {
        raw = storage.getItem(STORAGE_KEY);
        if (!raw) {
            key = LEGACY_STORAGE_KEY;
            raw = storage.getItem(LEGACY_STORAGE_KEY);
        }
    } catch {
        return { status: 'empty', workspace: emptyWorkspace() };
    }

    if (!raw) {
        return { status: 'empty', workspace: emptyWorkspace() };
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        const currentResult = storageEnvelopeSchema.safeParse(parsed);
        if (currentResult.success) {
            return { status: 'loaded', workspace: currentResult.data.workspace };
        }

        const schemaFiveResult = legacyStorageEnvelopeV5Schema.safeParse(parsed);
        if (schemaFiveResult.success) {
            return {
                status: 'migrated',
                workspace: migrateSchemaFiveWorkspace(schemaFiveResult.data.workspace),
            };
        }

        const schemaFourResult = legacyStorageEnvelopeV4Schema.safeParse(parsed);
        if (schemaFourResult.success) {
            return {
                status: 'migrated',
                workspace: migrateSchemaFourWorkspace(schemaFourResult.data.workspace),
            };
        }

        const schemaThreeResult = legacyStorageEnvelopeV3Schema.safeParse(parsed);
        if (schemaThreeResult.success) {
            return {
                status: 'migrated',
                workspace: migrateSchemaThreeWorkspace(schemaThreeResult.data.workspace),
            };
        }

        const schemaTwoResult = legacyStorageEnvelopeV2Schema.safeParse(parsed);
        if (schemaTwoResult.success) {
            return {
                status: 'migrated',
                workspace: migrateSchemaTwoWorkspace(schemaTwoResult.data.workspace),
            };
        }

        if (key === LEGACY_STORAGE_KEY) {
            const legacyResult = legacyStorageEnvelopeSchema.safeParse(parsed);
            if (legacyResult.success) {
                return {
                    status: 'migrated',
                    workspace: migrateLegacyWorkspace(legacyResult.data.workspace),
                };
            }
        }

        return { status: 'invalid', workspace: emptyWorkspace() };
    } catch {
        return { status: 'invalid', workspace: emptyWorkspace() };
    }
}

export function saveWorkspace(
    storage: StorageLike | undefined,
    workspace: Workspace,
    updatedAt = new Date().toISOString(),
): SaveResult {
    if (!storage) {
        return { status: 'unavailable' };
    }

    const envelope: StorageEnvelope = {
        schemaVersion: 6,
        updatedAt,
        workspace,
    };

    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
        return { status: 'saved' };
    } catch {
        return { status: 'unavailable' };
    }
}

export function clearWorkspace(storage: StorageLike | undefined): void {
    try {
        storage?.removeItem(STORAGE_KEY);
        storage?.removeItem(LEGACY_STORAGE_KEY);
    } catch {
        // A reset is best-effort when browser storage is unavailable.
    }
}
