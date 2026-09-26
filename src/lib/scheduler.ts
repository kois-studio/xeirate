import {
    type Condition,
    getDaysInMonth,
    type Participant,
    type Schedule,
    type ScheduleColumn,
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

type CoverageSlot = {
    id: string;
    date: string;
    day: number;
    column: ScheduleColumn;
    ordinal: number;
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

function buildCoverageSlots(session: Session): CoverageSlot[] {
    const days = getDaysInMonth(session.month);
    const slots: CoverageSlot[] = [];

    for (let day = 1; day <= days; day += 1) {
        const date = dateForDay(session.month, day);
        const weekday = new Date(`${date}T12:00:00`).getDay();

        for (const column of session.scheduleConfig.columns) {
            if (!column.weekdays.includes(weekday) || (day - 1) % column.intervalDays !== 0) {
                continue;
            }
            for (let requiredIndex = 0; requiredIndex < column.requiredPeople; requiredIndex += 1) {
                slots.push({
                    id: `${column.id}-${date}-${requiredIndex + 1}`,
                    date,
                    day,
                    column,
                    ordinal: slots.length,
                });
            }
        }
    }

    return slots;
}

function eligibilityFor(session: Session, participantId: string, columnId: string): boolean {
    const entry = session.participantColumnEligibility.find(
        (item) => item.participantId === participantId,
    );
    return !entry || entry.columnIds.includes(columnId);
}

function hasAssignmentOnDate(
    assignments: Schedule['assignments'],
    participantId: string,
    date: string,
): boolean {
    return assignments.some(
        (assignment) => assignment.participantId === participantId && assignment.date === date,
    );
}

function hasAssignmentInColumn(
    assignments: Schedule['assignments'],
    participantId: string,
    date: string,
    columnId: string,
): boolean {
    return assignments.some(
        (assignment) =>
            assignment.participantId === participantId &&
            assignment.date === date &&
            assignment.columnId === columnId,
    );
}

function dateDistance(left: string, right: string): number {
    const leftTime = new Date(`${left}T12:00:00`).getTime();
    const rightTime = new Date(`${right}T12:00:00`).getTime();
    return Math.round(Math.abs(leftTime - rightTime) / 86_400_000);
}

function lastAssignmentDate(
    assignments: Schedule['assignments'],
    participantId: string,
    beforeDate: string,
): string | null {
    return (
        assignments
            .filter(
                (assignment) =>
                    assignment.participantId === participantId && assignment.date < beforeDate,
            )
            .map((assignment) => assignment.date)
            .sort()
            .at(-1) ?? null
    );
}

export function generateSchedule({
    session,
    participants,
    conditions,
    attempt,
    generatedAt = new Date().toISOString(),
}: ScheduleInput): Schedule {
    const random = createRandom(`${session.id}:${attempt}`);
    const slots = buildCoverageSlots(session);
    const sessionConditions = conditions.filter(
        (condition) => condition.sessionId === null || condition.sessionId === session.id,
    );
    const assignmentCounts = new Map(participants.map((participant) => [participant.id, 0]));
    const weekendCounts = new Map(participants.map((participant) => [participant.id, 0]));
    const assignments: Schedule['assignments'] = [];
    const bestPartialAssignments: Schedule['assignments'] = [];
    const issues: ScheduleIssue[] = [];
    let totalScore = 0;
    let searchNodes = 0;

    function candidatesFor(slot: CoverageSlot): Candidate[] {
        const previousParticipantId = assignments.at(-1)?.participantId ?? null;
        const eligibleParticipants = participants.filter((participant) => {
            if (!eligibilityFor(session, participant.id, slot.column.id)) {
                return false;
            }
            if (
                !session.scheduleConfig.allowMultipleAssignmentsPerDay &&
                hasAssignmentOnDate(assignments, participant.id, slot.date)
            ) {
                return false;
            }
            if (hasAssignmentInColumn(assignments, participant.id, slot.date, slot.column.id)) {
                return false;
            }
            const lastDate = lastAssignmentDate(assignments, participant.id, slot.date);
            if (
                lastDate &&
                dateDistance(lastDate, slot.date) <= slot.column.restDaysAfterAssignment
            ) {
                return false;
            }
            return sessionConditions.every(
                (condition) =>
                    condition.participantId !== participant.id ||
                    condition.kind !== 'restriction' ||
                    !conditionApplies(condition, slot.date),
            );
        });

        const candidates = eligibleParticipants.map((participant) => {
            const count = assignmentCounts.get(participant.id) ?? 0;
            const weekendCount = weekendCounts.get(participant.id) ?? 0;
            const relevantPreferences = sessionConditions.filter(
                (condition) =>
                    condition.participantId === participant.id &&
                    condition.kind === 'preference' &&
                    conditionApplies(condition, slot.date),
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
        return candidates;
    }

    function search(slotIndex: number): boolean {
        searchNodes += 1;
        if (searchNodes > 100_000) {
            return false;
        }
        if (assignments.length > bestPartialAssignments.length) {
            bestPartialAssignments.splice(0, bestPartialAssignments.length, ...assignments);
        }
        if (slotIndex >= slots.length) {
            return true;
        }

        const slot = slots[slotIndex];
        if (!slot) {
            return true;
        }
        for (const candidate of candidatesFor(slot)) {
            const assignment = {
                slotId: slot.id,
                date: slot.date,
                columnId: slot.column.id,
                participantId: candidate.participant.id,
            };
            assignments.push(assignment);
            assignmentCounts.set(
                candidate.participant.id,
                (assignmentCounts.get(candidate.participant.id) ?? 0) + 1,
            );
            if (isWeekend(slot.date)) {
                weekendCounts.set(
                    candidate.participant.id,
                    (weekendCounts.get(candidate.participant.id) ?? 0) + 1,
                );
            }
            totalScore += candidate.score + candidate.jitter;

            if (search(slotIndex + 1)) {
                return true;
            }

            totalScore -= candidate.score + candidate.jitter;
            if (isWeekend(slot.date)) {
                weekendCounts.set(
                    candidate.participant.id,
                    (weekendCounts.get(candidate.participant.id) ?? 0) - 1,
                );
            }
            assignmentCounts.set(
                candidate.participant.id,
                (assignmentCounts.get(candidate.participant.id) ?? 0) - 1,
            );
            assignments.pop();
        }
        return false;
    }

    const solved = search(0);
    if (!solved) {
        assignments.splice(0, assignments.length, ...bestPartialAssignments);
        const assignedSlotIds = new Set(assignments.map((assignment) => assignment.slotId));
        for (const slot of slots) {
            if (assignedSlotIds.has(slot.id)) {
                continue;
            }
            issues.push(
                issue(
                    `unassigned-${slot.id}`,
                    'error',
                    'unassigned',
                    'No hay una persona disponible para este turno con la configuración y restricciones actuales.',
                    slot.date,
                    null,
                ),
            );
        }
    }

    if (!solved) {
        for (const participant of participants) {
            assignmentCounts.set(participant.id, 0);
            weekendCounts.set(participant.id, 0);
        }
        for (const assignment of assignments) {
            assignmentCounts.set(
                assignment.participantId,
                (assignmentCounts.get(assignment.participantId) ?? 0) + 1,
            );
            if (isWeekend(assignment.date)) {
                weekendCounts.set(
                    assignment.participantId,
                    (weekendCounts.get(assignment.participantId) ?? 0) + 1,
                );
            }
        }
        totalScore = 0;
    }

    let preferenceBreaks = 0;
    for (const assignment of assignments) {
        for (const condition of sessionConditions.filter(
            (item) =>
                item.participantId === assignment.participantId &&
                item.kind === 'preference' &&
                item.preferenceMode === 'avoid' &&
                conditionApplies(item, assignment.date),
        )) {
            preferenceBreaks += 1;
            issues.push(
                issue(
                    `preference-${condition.id}-${assignment.slotId}`,
                    'warning',
                    'preference',
                    'Esta preferencia no se ha podido respetar en esta propuesta.',
                    assignment.date,
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
