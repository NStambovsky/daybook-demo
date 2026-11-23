import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
test('private app refuses missing and example credentials before accessing data',async()=>{
 for(const env of [{},{APP_PASSWORD:'REPLACE_WITH_YOUR_OWN_PASSWORD',SESSION_SECRET:'REPLACE_WITH_A_RANDOM_SECRET'},{APP_PASSWORD:'local-test-password',SESSION_SECRET:'short'}]) {
  const response=await worker.fetch(new Request('https://test.invalid/api/entries'),env);
  assert.equal(response.status,503);
 }
});
