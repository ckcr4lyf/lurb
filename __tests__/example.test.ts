import test from 'ava';
import { alwaysTrue } from '../src/example.js';

test('alwaysTrue', t => {
    t.deepEqual(alwaysTrue(), true);
})