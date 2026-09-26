import { describe, expect, test } from 'bun:test';
import { createSession } from './domain';
import { formatScheduleForSharing } from './export';

describe('formatScheduleForSharing', () => {
    test('creates a readable Spanish share text with review notes', () => {
        const session = createSession({
            id: 'session-1',
            month: '2026-11',
            participantIds: ['person-1'],
            createdAt: '2026-09-19T10:00:00.000Z',
            schedule: null,
        });

        const text = formatScheduleForSharing(session, [{ id: 'person-1', alias: 'Nube' }], {
            attempt: 2,
            generatedAt: '2026-09-19T10:00:00.000Z',
            assignments: [{ date: '2026-11-01', participantId: 'person-1' }],
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
});
