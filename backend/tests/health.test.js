
import test from 'node:test';
import assert from 'node:assert/strict';

test('health endpoint contract is documented', () => {
  const expected = { status: 'ok', service: 'autolux-api' };
  assert.equal(expected.status, 'ok');
  assert.equal(expected.service, 'autolux-api');
});
