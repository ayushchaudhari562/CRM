// Voice notes older than 30 days are deleted from storage; the meeting keeps its length ("expired").
import { fakeDb } from './helpers';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/env';
import { deleteOldVoiceNotes } from '../src/storage';

/* eslint-disable @typescript-eslint/no-explicit-any */
const realFetch = globalThis.fetch;
const realKey = env.storageKey;
after(() => {
  globalThis.fetch = realFetch;
  env.storageKey = realKey;
});

describe('deleteOldVoiceNotes', () => {
  it('no storage key -> does nothing', async () => {
    env.storageKey = null;
    assert.equal(await deleteOldVoiceNotes(), 0);
  });

  it('deletes old files from storage, then clears their path', async () => {
    env.storageKey = 'sb_secret_test';
    const now = new Date('2026-12-31T00:00:00Z');
    let where: any;
    let cleared: string[] = [];
    let deleted: string[] = [];
    fakeDb({
      meeting: {
        findMany: async (args: any) => {
          where = args.where;
          return cleared.length ? [] : [
            { id: 'm1', voiceNoteUrl: 'usr_001/voice/a.m4a' },
            { id: 'm2', voiceNoteUrl: 'usr_002/voice/b.m4a' },
          ];
        },
        updateMany: async (args: any) => {
          cleared = args.where.id.in;
          assert.equal(args.data.voiceNoteUrl, null);
          return { count: cleared.length };
        },
      },
    });
    globalThis.fetch = (async (url: string, init: any) => {
      assert.match(url, /\/object\/visit-files$/);
      assert.equal(init.method, 'DELETE');
      deleted = JSON.parse(init.body).prefixes;
      return new Response('[]', { status: 200 });
    }) as typeof fetch;

    assert.equal(await deleteOldVoiceNotes(now), 2);
    assert.equal(where.createdAt.lt.toISOString(), '2026-12-01T00:00:00.000Z'); // 30 days back
    assert.deepEqual(deleted, ['usr_001/voice/a.m4a', 'usr_002/voice/b.m4a']);
    assert.deepEqual(cleared, ['m1', 'm2']);
  });

  it('storage error -> paths are NOT cleared (retried next day)', async () => {
    env.storageKey = 'sb_secret_test';
    let cleared = false;
    fakeDb({
      meeting: {
        findMany: async () => [{ id: 'm1', voiceNoteUrl: 'usr_001/voice/a.m4a' }],
        updateMany: async () => ((cleared = true), { count: 1 }),
      },
    });
    globalThis.fetch = (async () => new Response('nope', { status: 500 })) as typeof fetch;
    await assert.rejects(deleteOldVoiceNotes());
    assert.equal(cleared, false);
  });
});
