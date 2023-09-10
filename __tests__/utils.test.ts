import test from 'ava';
import { completedPieceCount } from '../src/utils.js';

test('completedPieceCount', t => {
    t.deepEqual(completedPieceCount(Buffer.from([0x80])), 1);
    t.deepEqual(completedPieceCount(Buffer.from([0xFF])), 8);
    t.deepEqual(completedPieceCount(Buffer.from([0x33, 0x44])), 6);
})
