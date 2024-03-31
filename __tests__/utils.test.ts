import test from 'ava';
import { completedPieceCount, getPieceCount } from '../src/utils.js';

test('completedPieceCount', t => {
    t.deepEqual(completedPieceCount(Buffer.from([0x80])), 1);
    t.deepEqual(completedPieceCount(Buffer.from([0xFF])), 8);
    t.deepEqual(completedPieceCount(Buffer.from([0x33, 0x44])), 6);
})

test('getPieceCount', t => {
    // When exact pieces
    const exactExpectation = {
        pieceCount: 10,
        lastPieceSize: 15,
    }

    t.deepEqual(getPieceCount(150, 15), exactExpectation);

    // When non-exact pieces
    const nonExactExpectation = {
        pieceCount: 10,
        lastPieceSize: 14,
    }

    t.deepEqual(getPieceCount(149, 15), nonExactExpectation);
})
