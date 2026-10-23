(function (root) {
  'use strict';
  const op = (type, count = 1) => ({ type, count });
  const row = (ops, repeat, stitches) => ({ ops, repeat, stitches });
  const sc = n => row([op('sc', n)], 1, n);
  const inc = n => row([...(n ? [op('sc', n)] : []), op('inc')], 6, (n + 2) * 6);
  const dec = n => row([...(n ? [op('sc', n)] : []), op('dec')], 6, (n + 1) * 6);
  const magic = n => row([op('mr', n)], 1, n);
  function generate(f) {
    if (!f || !['pointed', 'round'].includes(f.ear) || typeof f.tail !== 'boolean' || !/^#[0-9a-f]{6}$/i.test(f.body) || !/^#[0-9a-f]{6}$/i.test(f.accent)) throw new Error('색상과 귀·꼬리 항목을 다시 확인해 주세요.');
    const parts = [
      { name: '머리', count: 1, color: f.body, rows: [magic(6), inc(0), inc(1), inc(2), inc(3), inc(4), ...Array.from({length: 6}, () => sc(36)), dec(4), dec(3), dec(2), dec(1), dec(0)], finish: '14단부터 솜을 조금씩 넣습니다. 17단 후 남은 6코 앞고리를 실로 모아 닫고 실 끝을 숨깁니다.' },
      { name: '몸통', count: 1, color: f.body, rows: [magic(6), inc(0), inc(1), inc(2), inc(3), ...Array.from({length: 5}, () => sc(30)), dec(3), dec(2), dec(1)], finish: '11단부터 솜을 넣습니다. 입구 12코는 닫지 않고 머리에 꿰맬 긴 실을 남깁니다.' },
      { name: '귀', count: 2, color: f.accent, rows: f.ear === 'pointed' ? [magic(4), row([op('sc'), op('inc')], 2, 6), row([op('sc'), op('inc')], 3, 9), sc(9)] : [magic(6), inc(0), sc(12), sc(12)], finish: '솜 없이 납작하게 누릅니다. 입구를 꿰맬 긴 실을 남기고 마감합니다.' },
      { name: '팔', count: 2, color: f.body, rows: [magic(6), sc(6), sc(6), sc(6)], finish: '솜은 생략하거나 끝에만 소량 넣습니다. 입구를 납작하게 눌러 꿰맬 실을 남깁니다.' },
      { name: '다리', count: 2, color: f.body, rows: [magic(6), row([op('sc'), op('inc')], 3, 9), sc(9), sc(9)], finish: '소량의 솜을 넣습니다. 입구를 닫지 않고 부착할 실을 남깁니다.' }
    ];
    if (f.tail) parts.push({ name: '꼬리', count: 1, color: f.accent, rows: [magic(6), ...Array.from({length: 4}, () => sc(6))], finish: '솜은 소량만 넣고 입구를 닫지 않은 채 부착할 실을 남깁니다. 짧고 둥근 꼬리 초안입니다.' });
    return { features: {...f}, parts };
  }
  function validate(pattern) {
    const errors = [];
    if (!pattern || !Array.isArray(pattern.parts) || !pattern.parts.length) return {ok: false, errors: ['부위 데이터가 없습니다.'], rounds: 0};
    let rounds = 0;
    for (const part of pattern.parts) {
      let previous = 0;
      if (!Number.isInteger(part.count) || part.count < 1 || !Array.isArray(part.rows) || !part.rows.length) { errors.push(`${part.name}: 제작 개수 또는 단 데이터 오류`); continue; }
      part.rows.forEach((r, i) => {
        rounds++;
        const label = `${part.name} ${i + 1}단`;
        if (!Number.isInteger(r.repeat) || r.repeat < 1 || !Number.isInteger(r.stitches) || r.stitches < 1 || !Array.isArray(r.ops) || !r.ops.length) {errors.push(`${label}: 단 데이터 오류`); return;}
        let used = 0, made = 0;
        for (const o of r.ops) {
          if (!['mr', 'sc', 'inc', 'dec'].includes(o.type) || !Number.isInteger(o.count) || o.count < 1) {errors.push(`${label}: 지원하지 않는 뜨기 지시`); continue;}
          if (o.type === 'mr') { if (i !== 0 || r.ops.length !== 1 || r.repeat !== 1) errors.push(`${label}: 매직링 위치 오류`); made += o.count; }
          if (o.type === 'sc') { used += o.count; made += o.count; }
          if (o.type === 'inc') { used += o.count; made += o.count * 2; }
          if (o.type === 'dec') { used += o.count * 2; made += o.count; }
        }
        if (i === 0 && r.ops[0].type !== 'mr') errors.push(`${label}: 매직링으로 시작해야 합니다`);
        if (used * r.repeat !== previous) errors.push(`${label}: 이전 단 ${previous}코 중 ${used * r.repeat}코 사용`);
        if (made * r.repeat !== r.stitches) errors.push(`${label}: 계산 ${made * r.repeat}코, 표시 ${r.stitches}코 불일치`);
        previous = r.stitches;
      });
    }
    return { ok: errors.length === 0, errors, rounds };
  }
  function instruction(r) {
    const words = r.ops.map(o => ({mr: `매직링에 짧은뜨기 ${o.count}코`, sc: `짧은뜨기 ${o.count}코`, inc: `늘림 ${o.count}회`, dec: `줄임 ${o.count}회`}[o.type])).join(', ');
    return r.repeat === 1 ? words : `(${words}) × ${r.repeat}회`;
  }
  const api = { generate, validate, instruction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Crochet = api;
})(typeof window !== 'undefined' ? window : globalThis);
