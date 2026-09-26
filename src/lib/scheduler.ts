import {
    type Condition,
    getDaysInMonth,
    type Participant,
    type Schedule,
    type ScheduleIssue,
    type Session,
} from './domain';

export type ScheduleInput = {
    session: Session;
    participants: Participant[];
    conditions: Condition[];
    attempt: number;
    generatedAt?: string;
};

type Candidate = {
    participant: Participant;
    score: number;
    jitter: number;
};

function dateForDay(month: string, day: number): string {
    return `${month}-${String(day).padStart(2, '0')}`;
}

function conditionApplies(condition: Condition, date: string): boolean {
    if (condition.weekdays !== null) {
        const weekday = new Date(`${date}T12:00:00`).getDay();
        if (!condition.weekdays.includes(weekday)) {
            return false;
        }
    }

    return (
        (!condition.startDate || condition.startDate <= date) &&
        (!condition.endDate || condition.endDate >= date)
    );
}

function createRandom(seedText: string): () => number {
    let state = 2166136261;
    for (const character of seedText) {
        state ^= character.charCodeAt(0);
        state = Math.imul(state, 16777619);
    }

    return () => {
        state = Math.imul(state + 0x6d2b79f5, 1_664_525) + 1_013_904_223;
        return ((state >>> 0) % 1_000_000) / 1_000_000;
    };
}

function isWeekend(date: string): boolean {
    const day = new Date(`${date}T12:00:00`).getDay();
    return day === 0 || day === 6;
}

function issue(
    id: string,
    severity: ScheduleIssue['severity'],
    kind: ScheduleIssue['kind'],
    message: string,
    date: string | null,
    participantId: string | null,
): ScheduleIssue {
    return { id, severity, kind, message, date, participantId };
}

export function generateSchedule({
    session,
    participants,
    conditions,
    attempt,
    generatedAt = new Date().toISOString(),
}: ScheduleInput): Schedule {
    const random = createRandom(`${session.id}:${attempt}`);
    const days = getDaysInMonth(session.month);
    const sessionConditions = conditions.filter(
        (condition) => condition.sessionId === null || condition.sessionId === session.id,
    );
    const assignmentCounts = new Map(participants.map((participant) => [participant.id, 0]));
    const weekendCounts = new Map(participants.map((participant) => [participant.id, 0]));
    const assignments: Schedule['assignments'] = [];
    const issues: ScheduleIssue[] = [];
    let totalScore = 0;
    let preferenceBreaks = 0;
    let previousParticipantId: string | null = null;

    for (let day = 1; day <= days; day += 1) {
        const date = dateForDay(session.month, day);
        const eligibleParticipants = participants.filter((participant) =>
            sessionConditions.every(
                (condition) =>
                    condition.participantId !== participant.id ||
                    condition.kind !== 'restriction' ||
                    !conditionApplies(condition, date),
            ),
        );

        const candidates: Candidate[] = eligibleParticipants.map((participant) => {
            const count = assignmentCounts.get(participant.id) ?? 0;
            const weekendCount = weekendCounts.get(participant.id) ?? 0;
            const relevantPreferences = sessionConditions.filter(
                (condition) =>
                    condition.participantId === participant.id &&
                    condition.kind === 'preference' &&
                    conditionApplies(condition, date),
            );
            const preferencePenalty = relevantPreferences.reduce(
                (penalty, condition) =>
                    penalty + (condition.preferenceMode === 'avoid' ? 120 : -35),
                0,
            );
            const consecutivePenalty = previousParticipantId === participant.id ? 90 : 0;
            const score = count * 100 + weekendCount * 25 + preferencePenalty + consecutivePenalty;

            return { participant, score, jitter: random() * 15 };
        });

        candidates.sort((left, right) => {
            const scoreDifference = left.score - right.score;
            return scoreDifference === 0 ? left.jitter - right.jitter : scoreDifference;
        });

        const selected = candidates[0];
        if (!selected) {
            issues.push(
                issue(
                    `unassigned-${date}`,
                    'error',
                    'unassigned',
                    'No hay una persona disponible para este día con las restricciones actuales.',
                    date,
                    null,
                ),
            );
            previousParticipantId = null;
            continue;
        }

        assignments.push({ date, participantId: selected.participant.id });
        assignmentCounts.set(
            selected.participant.id,
            (assignmentCounts.get(selected.participant.id) ?? 0) + 1,
        );
        if (isWeekend(date)) {
            weekendCounts.set(
                selected.participant.id,
                (weekendCounts.get(selected.participant.id) ?? 0) + 1,
            );
        }
        totalScore += selected.score + selected.jitter;
        previousParticipantId = selected.participant.id;

        const brokenPreferences = sessionConditions.filter(
            (condition) =>
                condition.participantId === selected.participant.id &&
                condition.kind === 'preference' &&
                condition.preferenceMode === 'avoid' &&
                conditionApplies(condition, date),
        );
        for (const condition of brokenPreferences) {
            preferenceBreaks += 1;
            issues.push(
                issue(
                    `preference-${condition.id}-${date}`,
                    'warning',
                    'preference',
                    'Esta preferencia no se ha podido respetar en esta propuesta.',
                    date,
                    condition.participantId,
                ),
            );
        }
    }

    for (const condition of sessionConditions.filter((item) => item.kind === 'clarification')) {
        issues.push(
            issue(
                `clarification-${condition.id}`,
                'warning',
                'clarification',
                'Hay una petición que necesita revisión antes de dar el calendario por bueno.',
                condition.startDate,
                condition.participantId,
            ),
        );
    }

    const counts = [...assignmentCounts.values()];
    const minAssignments = counts.length > 0 ? Math.min(...counts) : 0;
    const maxAssignments = counts.length > 0 ? Math.max(...counts) : 0;

    return {
        attempt,
        generatedAt,
        assignments,
        score: Number(totalScore.toFixed(3)),
        fairness: {
            minAssignments,
            maxAssignments,
            maxDifference: maxAssignments - minAssignments,
            preferenceBreaks,
        },
        issues,
    };
}
