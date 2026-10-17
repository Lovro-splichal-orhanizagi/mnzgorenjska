export interface UnattributedYellowEvent {
 source: 'dfb'; matchId: string; sourceUrl: string; side: 0 | 1; clock: string; minute: number;
 reason: 'unknown-role' | 'player-coach'; eventSha256: string; ordinal: number; profileId: string | null;
}
export const UNATTRIBUTED_YELLOW_PREFIX: string;
export function encodeUnattributedYellow(event: UnattributedYellowEvent): string;
export function parseUnattributedYellow(warning: unknown): UnattributedYellowEvent | null;
export function unattributedYellowEvents(warnings: unknown): UnattributedYellowEvent[];
