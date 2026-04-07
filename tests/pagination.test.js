import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePagination } from '../shared/http/pagination.js';

test('parsePagination returns defaults when query is empty', () => {
  const pagination = parsePagination({});
  assert.deepEqual(pagination, { limit: 20, offset: 0 });
});

test('parsePagination clamps limit to maxLimit', () => {
  const pagination = parsePagination({ limit: '500', offset: '2' }, { defaultLimit: 20, maxLimit: 100 });
  assert.deepEqual(pagination, { limit: 100, offset: 2 });
});

test('parsePagination throws on negative offset', () => {
  assert.throws(
    () => parsePagination({ limit: '10', offset: '-1' }),
    /Parâmetros de paginação inválidos/
  );
});

test('parsePagination throws on non-integer limit', () => {
  assert.throws(
    () => parsePagination({ limit: 'abc', offset: '0' }),
    /Parâmetros de paginação inválidos/
  );
});
