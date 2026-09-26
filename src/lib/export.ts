import { formatMonth, type Participant, type Schedule, type Session } from './domain';

type ShareLanguage = 'en' | 'es';

const shareCopy = {
    en: {
        unnamed: 'Unnamed',
        shiftsFor: 'Shifts for {month}',
        proposal: 'Proposal {attempt} · Xeirate',
        review: 'Review before sharing as final:',
        issue: {
            unassigned: 'No person is available for this day with the current restrictions.',
            preference: 'This preference could not be respected in this proposal.',
            clarification: 'There is a request that needs review before the calendar is final.',
        },
    },
    es: {
        unnamed: 'Sin nombre',
        shiftsFor: 'Guardias de {month}',
        proposal: 'Propuesta {attempt} · Xeirate',
        review: 'Revisar antes de compartir como definitivo:',
        issue: {
            unassigned:
                'No hay una persona disponible para este día con las restricciones actuales.',
            preference: 'Esta preferencia no se ha podido respetar en esta propuesta.',
            clarification:
                'Hay una petición que necesita revisión antes de dar el calendario por bueno.',
        },
    },
} satisfies Record<ShareLanguage, object>;

function participantAlias(
    participants: Participant[],
    participantId: string,
    language: ShareLanguage,
): string {
    return (
        participants.find((participant) => participant.id === participantId)?.alias ??
        shareCopy[language].unnamed
    );
}

function formatDate(date: string, language: ShareLanguage): string {
    return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
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
    language: ShareLanguage = 'es',
): string {
    const copy = shareCopy[language];
    const month = formatMonth(session.month, language === 'es' ? 'es-ES' : 'en-US');
    const lines = [
        copy.shiftsFor.replace('{month}', month),
        copy.proposal.replace('{attempt}', String(schedule.attempt)),
        '',
    ];

    const assignmentsByDate = new Map<string, Schedule['assignments']>();
    for (const assignment of schedule.assignments) {
        const assignments = assignmentsByDate.get(assignment.date) ?? [];
        assignments.push(assignment);
        assignmentsByDate.set(assignment.date, assignments);
    }

    for (const [date, assignments] of assignmentsByDate) {
        const values = assignments.map((assignment) => {
            const participant = participantAlias(participants, assignment.participantId, language);
            if (session.scheduleConfig.mode === 'columns') {
                const column = session.scheduleConfig.columns.find(
                    (item) => item.id === assignment.columnId,
                )?.label;
                return column ? `${column}: ${participant}` : participant;
            }
            return participant;
        });
        lines.push(`${formatDate(date, language)}: ${values.join(', ')}`);
    }

    if (schedule.issues.length > 0) {
        lines.push('', copy.review);
        for (const item of schedule.issues) {
            const date = item.date ? ` (${formatDate(item.date, language)})` : '';
            const alias = item.participantId
                ? ` · ${participantAlias(participants, item.participantId, language)}`
                : '';
            const issueMessage = language === 'es' ? item.message : copy.issue[item.kind];
            lines.push(`- ${issueMessage}${date}${alias}`);
        }
    }

    return lines.join('\n');
}
