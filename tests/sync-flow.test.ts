import assert from 'node:assert/strict';
import { runSyncActionWithAutoTag } from '../src/background/sync-flow.ts';

const pass: string[] = [];
const fail: string[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  Promise.resolve(fn())
    .then(() => {
      pass.push(name);
      console.log(`  ✓ ${name}`);
    })
    .catch((e) => {
      fail.push(name);
      console.log(`  ✗ ${name}\n    ${(e as Error).message}`);
    });
}

console.log('Sync flow orchestration:');

test('syncIncremental runs sync first, then auto-tag', async () => {
  const order: string[] = [];
  const result = await runSyncActionWithAutoTag(
    'syncIncremental',
    async () => {
      order.push('sync');
      return { added: 3 };
    },
    async (phase) => {
      order.push(`auto:${phase}`);
      return { tagged: 2 };
    },
  );
  assert.deepEqual(order, ['sync', 'auto:incremental']);
  assert.deepEqual(result, { sync: { added: 3 }, autoTag: { tagged: 2 } });
});

test('syncFull runs full sync first, then auto-tag', async () => {
  const order: string[] = [];
  const result = await runSyncActionWithAutoTag(
    'syncFull',
    async () => {
      order.push('sync');
      return { added: 10, updated: 4 };
    },
    async (phase) => {
      order.push(`auto:${phase}`);
      return { tagged: 7 };
    },
  );
  assert.deepEqual(order, ['sync', 'auto:full']);
  assert.deepEqual(result, { sync: { added: 10, updated: 4 }, autoTag: { tagged: 7 } });
});

test('syncRescan skips auto-tag', async () => {
  const order: string[] = [];
  const result = await runSyncActionWithAutoTag(
    'syncRescan',
    async () => {
      order.push('sync');
      return { tombstoned: 1, revived: 2 };
    },
    async (phase) => {
      order.push(`auto:${phase}`);
      return { tagged: 99 };
    },
  );
  assert.deepEqual(order, ['sync']);
  assert.deepEqual(result, { sync: { tombstoned: 1, revived: 2 }, autoTag: null });
});

await new Promise((resolve) => setTimeout(resolve, 50));
console.log(fail.length ? `\n❌ ${fail.length} FAILED` : '\n✅ All sync flow tests passed');
process.exit(fail.length ? 1 : 0);
