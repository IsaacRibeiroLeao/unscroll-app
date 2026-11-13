import { assertEquals } from '@std/assert';
import {
  dailyLimit,
  decide,
  isJpeg,
  localDateIn,
  parseRequest,
  sanitizeFeedback,
  sha256Hex,
} from './logic.ts';

const UID = '11111111-1111-4111-8111-111111111111';
const TASK = '22222222-2222-4222-8222-222222222222';

Deno.test('parseRequest accepts own folder (with and without bucket prefix)', () => {
  const a = parseRequest({ taskId: TASK, imagePath: `${UID}/a.jpg` }, UID);
  const b = parseRequest({ taskId: TASK, imagePath: `proofs/${UID}/a.jpg` }, UID);
  assertEquals(a, { ok: true, value: { taskId: TASK, imagePath: `${UID}/a.jpg` } });
  assertEquals(b, a);
});

Deno.test('parseRequest rejects foreign folder, traversal, bad ids', () => {
  const other = '33333333-3333-4333-8333-333333333333';
  assertEquals(parseRequest({ taskId: TASK, imagePath: `${other}/a.jpg` }, UID), {
    ok: false,
    code: 'FORBIDDEN_PATH',
  });
  assertEquals(parseRequest({ taskId: TASK, imagePath: `${UID}/../x.jpg` }, UID), {
    ok: false,
    code: 'FORBIDDEN_PATH',
  });
  assertEquals(parseRequest({ taskId: TASK, imagePath: `${UID}/a/b.jpg` }, UID), {
    ok: false,
    code: 'FORBIDDEN_PATH',
  });
  assertEquals(parseRequest({ taskId: TASK, imagePath: `${UID}/..` }, UID), {
    ok: false,
    code: 'FORBIDDEN_PATH',
  });
  assertEquals(parseRequest({ taskId: 'nope', imagePath: `${UID}/a.jpg` }, UID), {
    ok: false,
    code: 'INVALID_REQUEST',
  });
  assertEquals(parseRequest({ taskId: TASK }, UID), { ok: false, code: 'INVALID_REQUEST' });
  assertEquals(parseRequest(null, UID), { ok: false, code: 'INVALID_REQUEST' });
});

Deno.test('localDateIn uses the user timezone, not UTC', () => {
  const now = new Date('2026-03-11T02:30:00Z');
  assertEquals(localDateIn('America/Sao_Paulo', now), '2026-03-10');
  assertEquals(localDateIn('UTC', now), '2026-03-11');
  assertEquals(localDateIn('Asia/Tokyo', new Date('2026-03-10T15:30:00Z')), '2026-03-11');
});

Deno.test('decide applies the 0.7 confidence threshold and quality gate', () => {
  assertEquals(decide({ approved: true, confidence: 0.7, qualityOk: true }), 'APPROVED');
  assertEquals(decide({ approved: true, confidence: 0.69, qualityOk: true }), 'REJECTED');
  assertEquals(decide({ approved: false, confidence: 0.99, qualityOk: true }), 'REJECTED');
  assertEquals(decide({ approved: true, confidence: 0.99, qualityOk: false }), 'LOW_QUALITY');
});

Deno.test('dailyLimit / sanitizeFeedback / isJpeg / sha256Hex', async () => {
  assertEquals(dailyLimit(false), 1);
  assertEquals(dailyLimit(true), 5);
  assertEquals(sanitizeFeedback('  ok\n\nfeito  ', 'x'), 'ok feito');
  assertEquals(sanitizeFeedback('   ', 'fallback'), 'fallback');
  assertEquals(sanitizeFeedback('a'.repeat(300), 'x').length, 220);
  assertEquals(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), true);
  assertEquals(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), false);
  assertEquals(
    await sha256Hex(new TextEncoder().encode('abc')),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});
