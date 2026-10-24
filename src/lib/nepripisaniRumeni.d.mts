interface YellowEvidence {
 matchId: string; sourceUrl: string; side: 0 | 1; clock: string; minute: number;
 eventSha256: string; ordinal: number;
}
export type UnattributedYellowEvent = YellowEvidence & (
 { source: 'dfb'; reason: 'unknown-role' | 'player-coach'; profileId: string | null } |
 { source: 'fussball'; reason: 'not-published'; profileId: null }
);
export const UNATTRIBUTED_YELLOW_PREFIX: string;
export function encodeUnattributedYellow(event: UnattributedYellowEvent): string;
export function parseUnattributedYellow(warning: unknown): UnattributedYellowEvent | null;
export function unattributedYellowEvents(warnings: unknown): UnattributedYellowEvent[];
