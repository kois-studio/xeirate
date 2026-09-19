import { formatMonth, type Participant, type Schedule, type Session } from './domain';

function participantAlias(participants: Participant[], participantId: string): string {
    return (
        participants.find((participant) => participant.id === participantId)?.alias ?? 'Sin nombre'
    );
}

function formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'short',
    })
        .format(new Date(`${date}T12:00:00`))
        .replace('.', '');
}

export function formatScheduleForSharing(
    session: Session,
    participants: Participant[],
    schedule: Schedule,
): string {
    const lines = [
        `Guardias de ${formatMonth(session.month)}`,
        `Propuesta ${schedule.attempt} · Xeirate`,
        '',
    ];

    for (const assignment of schedule.assignments) {
        lines.push(
            `${formatDate(assignment.date)}: ${participantAlias(participants, assignment.participantId)}`,
        );
    }

    if (schedule.issues.length > 0) {
        lines.push('', 'Revisar antes de compartir como definitivo:');
        for (const item of schedule.issues) {
            const date = item.date ? ` (${formatDate(item.date)})` : '';
            const alias = item.participantId
                ? ` · ${participantAlias(participants, item.participantId)}`
                : '';
            lines.push(`- ${item.message}${date}${alias}`);
        }
    }

    return lines.join('\n');
}
