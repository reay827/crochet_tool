const assert = require('node:assert/strict');
const {generate, validate} = require('./pattern.js');
for (const ear of ['pointed', 'round']) for (const tail of [true, false]) {
  const p = generate({body: '#f8f5ed', accent: '#7fa6bc', ear, tail});
  assert.equal(validate(p).ok, true);
  assert.equal(p.parts.some(x => x.name === '꼬리'), tail);
  const broken = structuredClone(p);
  broken.parts[0].rows[1].stitches++;
  assert.equal(validate(broken).ok, false, 'reject wrong output count');
  const brokenInput = structuredClone(p);
  brokenInput.parts[0].rows[2].ops[0].count++;
  brokenInput.parts[0].rows[2].stitches += 6;
  assert.equal(validate(brokenInput).ok, false, 'reject wrong consumed count even if output matches');
}
assert.equal(validate({parts: []}).ok, false);
assert.throws(() => generate({body:'bad', accent:'#ffffff', ear:'pointed', tail:true}));
console.log('PASS: 4 feature combinations; output/consumption corruption rejected; invalid input rejected.');
