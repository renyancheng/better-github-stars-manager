import type { SyncProgress } from '@/types';

export type SyncActionWithAutoTag = 'syncIncremental' | 'syncFull' | 'syncRescan';
type AutoTagPhase = Extract<SyncProgress['phase'], 'incremental' | 'full'>;

export function autoTagPhaseForSync(action: SyncActionWithAutoTag): AutoTagPhase | null {
  switch (action) {
    case 'syncIncremental':
      return 'incremental';
    case 'syncFull':
      return 'full';
    case 'syncRescan':
      return null;
  }
}

export async function runSyncActionWithAutoTag<TSync>(
  action: SyncActionWithAutoTag,
  sync: () => Promise<TSync>,
  autoTag: (phase: AutoTagPhase) => Promise<{ tagged: number }>,
): Promise<{ sync: TSync; autoTag: { tagged: number } | null }> {
  const syncResult = await sync();
  const phase = autoTagPhaseForSync(action);
  return {
    sync: syncResult,
    autoTag: phase ? await autoTag(phase) : null,
  };
}
