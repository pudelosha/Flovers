const fs = require('fs');
const {verify} = require('./bundle.cjs');
const evidence = JSON.parse(fs.readFileSync(process.env.CONTRACT_BUNDLE, 'utf8'));
const copy = () => JSON.parse(JSON.stringify(evidence));
test('accepts only a complete successful provider run for this commit', () => {
  expect(verify(copy(), process.env.CONTRACT_PROVIDER_SHA)).toEqual(evidence);
});
test('rejects another provider commit', () => {
  expect(() => verify(copy(), '0'.repeat(40))).toThrow();
});
test('rejects an artifact from an unsuccessful provider run', () => {
  const b = copy(); b.verified = false;
  expect(() => verify(b, process.env.CONTRACT_PROVIDER_SHA)).toThrow();
});
test('rejects a different specification', () => {
  const b = copy(); b.manifest_sha256 = '0'.repeat(64);
  expect(() => verify(b, process.env.CONTRACT_PROVIDER_SHA)).toThrow();
});
test('rejects missing cases rather than silently reducing coverage', () => {
  const b = copy(); delete b.cases['completion-today'];
  expect(() => verify(b, process.env.CONTRACT_PROVIDER_SHA)).toThrow();
});
test('rejects a response changed after provider verification', () => {
  const b = copy(); b.cases['completion-today'].exchanges[0].response.body.xp_awarded = 999;
  expect(() => verify(b, process.env.CONTRACT_PROVIDER_SHA)).toThrow();
});
test('rejects a changed serialized response even if the parsed body is unchanged', () => {
  const b = copy(); b.cases['completion-today'].exchanges[0].canonical_response += ' ';
  expect(() => verify(b, process.env.CONTRACT_PROVIDER_SHA)).toThrow();
});
