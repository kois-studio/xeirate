import { describe, expect, test } from 'bun:test';
import { createDefaultScheduleConfiguration, createSession } from './domain';
import { formatScheduleForSharing } from './export';

describe('formatScheduleForSharing', () => {
    test('creates a readable Spanish share text with review notes', () => {
        const session = createSession({
            id: 'session-1',
            month: '2026-11',
            participantIds: ['person-1'],
            createdAt: '2026-09-19T10:00:00.000Z',
            scheduleConfig: createDefaultScheduleConfiguration(),
            participantColumnEligibility: [{ participantId: 'person-1', columnIds: ['general'] }],
            schedule: null,
        });

        const text = formatScheduleForSharing(session, [{ id: 'person-1', alias: 'Nube' }], {
            attempt: 2,
            generatedAt: '2026-09-19T10:00:00.000Z',
            assignments: [
                {
                    slotId: 'general-2026-11-01-1',
                    date: '2026-11-01',
                    columnId: 'general',
                    participantId: 'person-1',
                },
            ],
            score: 0,
            fairness: {
                minAssignments: 1,
                maxAssignments: 1,
                maxDifference: 0,
                preferenceBreaks: 0,
            },
            issues: [
                {
                    id: 'clarification-1',
                    severity: 'warning',
                    kind: 'clarification',
                    date: null,
                    participantId: 'person-1',
                    message: 'Hay una petición que necesita revisión.',
                },
            ],
        });

        expect(text).toContain('Guardias de noviembre de 2026');
        expect(text).toContain('1 nov: Nube');
        expect(text).toContain('Revisar antes de compartir como definitivo:');
        expect(text).toContain('Hay una petición que necesita revisión.');
    });

    test('keeps column labels when sharing a multi-column proposal', () => {
        const baseConfiguration = createDefaultScheduleConfiguration();
        const session = createSession({
            id: 'session-columns',
            month: '2026-11',
            participantIds: ['person-1', 'person-2'],
            createdAt: '2026-09-19T10:00:00.000Z',
            scheduleConfig: {
                ...baseConfiguration,
                mode: 'columns',
                columns: [
                    { ...baseConfiguration.columns[0], id: 'general', label: 'General' },
                    { ...baseConfiguration.columns[0], id: 'urgent', label: 'Urgencias' },
                ],
            },
            participantColumnEligibility: [
                { participantId: 'person-1', columnIds: ['general'] },
                { participantId: 'person-2', columnIds: ['urgent'] },
            ],
            schedule: null,
        });

        const text = formatScheduleForSharing(
            session,
            [
                { id: 'person-1', alias: 'Nube' },
                { id: 'person-2', alias: 'Brisa' },
            ],
            {
                attempt: 1,
                generatedAt: '2026-09-19T10:00:00.000Z',
                assignments: [
                    {
                        slotId: 'general-2026-11-01-1',
                        date: '2026-11-01',
                        columnId: 'general',
                        participantId: 'person-1',
                    },
                    {
                        slotId: 'urgent-2026-11-01-1',
                        date: '2026-11-01',
                        columnId: 'urgent',
                        participantId: 'person-2',
                    },
                ],
                score: 0,
                fairness: {
                    minAssignments: 1,
                    maxAssignments: 1,
                    maxDifference: 0,
                    preferenceBreaks: 0,
                },
                issues: [],
            },
        );

        expect(text).toContain('1 nov: General: Nube, Urgencias: Brisa');
    });
});
