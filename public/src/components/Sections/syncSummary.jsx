// Shared by Corporate Member (EN sync) and Delivery Tracking (DE sync) — see
// specs/016-fix-partner-sync/contracts/member-card-sync.md for the response shape.

const OPTIONAL_COUNTS = [
    ['moved', 'moved'],
    ['not_found', 'not found'],
    ['conflict', 'conflicts'],
    ['already_active', 'already active'],
    ['superseded', 'superseded'],
];

export const formatSyncSummary = (partner, d, langLabel) => {
    const parts = [
        `${d.inserted ?? 0} inserted`,
        `${d.updated ?? 0} updated`,
        `${d.deactivated ?? 0} deactivated`,
        `${d.invitations_queued ?? 0} invitations queued`,
        ...OPTIONAL_COUNTS.filter(([key]) => d[key] > 0).map(([key, label]) => `${d[key]} ${label}`),
    ];
    return `Synced "${partner}" (${langLabel}): ${parts.join(', ')}`;
};

// Moves and conflicts need the admin's attention, so they are listed in a dialog
// instead of being folded into the snackbar count.
export const showSyncDetails = (openDialog, partner, d) => {
    const moves = d.moves ?? [];
    const conflicts = d.conflicts ?? [];
    if (moves.length === 0 && conflicts.length === 0) return;

    openDialog(
        <>
            {moves.length > 0 && (
                <>
                    <strong>Moved to {partner}</strong>
                    <ul style={{ marginTop: 4 }}>
                        {moves.map((m) => (
                            <li key={`m-${m.mobile_number}`}>{m.mobile_number} — moved from {m.from_partner}</li>
                        ))}
                    </ul>
                </>
            )}
            {conflicts.length > 0 && (
                <>
                    <strong>Not applied (card belongs to another partner)</strong>
                    <ul style={{ marginTop: 4 }}>
                        {conflicts.map((c) => (
                            <li key={`c-${c.mobile_number}`}>{c.mobile_number} — {c.action} blocked, owned by {c.owner_partner}</li>
                        ))}
                    </ul>
                </>
            )}
        </>,
        'Sync Details',
        { text: 'OK', color: 'primary' },
        () => { },
        () => { }
    );
};
