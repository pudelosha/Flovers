const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
const read = file => fs.readFileSync(path.join(__dirname, file));
const spec = JSON.parse(read('scenarios.json'));
function verify(bundle, providerSha) {
  if (!/^[a-f0-9]{40}$/.test(providerSha || '') || bundle.provider_sha !== providerSha ||
      bundle.format !== 1 || bundle.verified !== true ||
      bundle.previous_mobile_commit !== spec.previous_mobile_commit ||
      bundle.manifest_sha256 !== sha(read('scenarios.json')) ||
      Object.keys(bundle.cases).sort().join() !== spec.scenarios.map(c => c.id).sort().join()) {
    throw new Error('Missing, stale, incomplete or unverified provider bundle');
  }
  Object.values(bundle.cases).forEach(c => {
    if (!c.exchanges.length) throw new Error('Missing exchange');
    c.exchanges.forEach(e => {
      // JSON number representations (0.0 versus 0) differ across Python and JS.
      // The digest protects the exact Python canonical JSON string too.
      if (sha(e.canonical_response) !== e.sha256 || canonical(JSON.parse(e.canonical_response)) !== canonical(e.response)) {
        throw new Error('Corrupted provider response');
      }
    });
  });
  const previous = JSON.parse(read('previous.json'));
  if (previous.commit !== spec.previous_mobile_commit) throw new Error('Wrong previous client');
  previous.files.forEach(entry => {
    const raw = read(entry.path);
    const blob = crypto.createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
    if (sha(raw) !== entry.sha256 || blob !== entry.git_blob) throw new Error('Modified pinned client source');
  });
  return bundle;
}
module.exports = {verify, spec, canonical};
