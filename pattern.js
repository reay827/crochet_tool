(function (root) {
  'use strict';
  const op = (type, count = 1) => ({ type, count });
  const row = (ops, repeat, stitches) => ({ ops, repeat, stitches });
  const sc = n => row([op('sc', n)], 1, n);
  const inc = n => row([...(n ? [op('sc', n)] : []), op('inc')], 6, (n + 2) * 6);
  const dec = n => row([...(n ? [op('sc', n)] : []), op('dec')], 6, (n + 1) * 6);
  const magic = n => row([op('mr', n)], 1, n);
  const expand = r => Array.from({length:r.repeat},()=>r.ops.flatMap(o=>Array(o.count).fill(o.type))).flat();
  function generate(f) {
    if (!f || !['pointed','round','long','none'].includes(f.ear) || typeof f.tail !== 'boolean' || !/^#[0-9a-f]{6}$/i.test(f.body) || !/^#[0-9a-f]{6}$/i.test(f.accent)) throw new Error('색상과 귀·꼬리 항목을 다시 확인해 주세요.');
    const includeTail=f.hasRear===true&&f.tail;
    if (f.headPatch !== undefined && typeof f.headPatch !== 'boolean') throw new Error('머리 위 색상 영역을 확인해 주세요.');
    if (f.headPatch && !/^#[0-9a-f]{6}$/i.test(f.headColor)) throw new Error('머리 위 실 색상을 확인해 주세요.');
    if (f.headBoundary !== undefined && !['level','notched'].includes(f.headBoundary)) throw new Error('머리 배색 경계를 확인해 주세요.');
    const parts = [
      { name: '머리', count: 1, color: f.body, rows: [magic(6), inc(0), inc(1), inc(2), inc(3), inc(4), ...Array.from({length: 6}, () => sc(36)), dec(4), dec(3), dec(2), dec(1), dec(0)], finish: '14단부터 솜을 조금씩 넣습니다. 17단 후 남은 6코 앞고리를 실로 모아 닫고 실 끝을 숨깁니다.' },
      { name: '몸통', count: 1, color: f.body, rows: [magic(6), inc(0), inc(1), inc(2), inc(3), ...Array.from({length: 5}, () => sc(30)), dec(3), dec(2), dec(1)], finish: '11단부터 솜을 넣습니다. 입구 12코는 닫지 않고 머리에 꿰맬 긴 실을 남깁니다.' },
      { name: '귀', count: 2, color: f.accent, rows: f.ear === 'pointed' ? [magic(4), row([op('sc'), op('inc')], 2, 6), row([op('sc'), op('inc')], 3, 9), sc(9)] : [magic(6), inc(0), sc(12), sc(12)], finish: '솜 없이 납작하게 누릅니다. 입구를 꿰맬 긴 실을 남기고 마감합니다.' },
      { name: '팔', count: 2, color: f.body, rows: [magic(6), sc(6), sc(6), sc(6)], finish: '솜은 생략하거나 끝에만 소량 넣습니다. 입구를 납작하게 눌러 꿰맬 실을 남깁니다.' },
      { name: '다리', count: 2, color: f.body, rows: [magic(6), row([op('sc'), op('inc')], 3, 9), sc(9), sc(9)], finish: '소량의 솜을 넣습니다. 입구를 닫지 않고 부착할 실을 남깁니다.' }
    ];
    if(f.ear==='none')parts.splice(parts.findIndex(p=>p.name==='귀'),1);
    if(f.ear==='long')parts.find(p=>p.name==='귀').rows=[magic(6),row([op('sc'),op('inc')],3,9),...Array.from({length:7},()=>sc(9))];
    if (includeTail) parts.push({ name: '꼬리', count: 1, color: f.accent, rows: [magic(6), ...Array.from({length: 4}, () => sc(6))], finish: '솜은 소량만 넣고 입구를 닫지 않은 채 부착할 실을 남깁니다. 후면에서 확인한 꼬리를 짧고 둥근 형태로 단순화한 초안입니다.' });
    for (const part of parts) part.rows.forEach(r => {r.color=part.color;r.colorLabel=['귀','꼬리'].includes(part.name)?'귀·꼬리 색':'몸 색';});
    if (f.headPatch) {
      const head=parts[0];
      head.rows.slice(0,5).forEach(r=>{r.color=f.headColor;r.colorLabel='머리 위 색';});
      head.rows[4].note='이 단 마지막 코의 마지막 두 고리는 몸 색 실로 빼서, 6단부터 몸 색으로 이어 뜹니다.';
      head.finish='머리 1~5단은 머리 위 색, 6~17단은 몸 색입니다. 원본의 굴곡진 무늬 경계는 수평 단 경계의 둥근 덮개 형태로 단순화했습니다. 색을 바꾼 실 끝은 안쪽에서 정리합니다. '+head.finish;
      if (f.headBoundary==='notched') {
        const section=(ops,repeat,stitches,color,colorLabel)=>({...row(ops,repeat,stitches),color,colorLabel});
        head.rows[3].colorSections=[
          section([op('sc',2),op('inc'),op('sc',2),op('inc'),op('sc',2)],1,10,f.headColor,'머리 위 색'),
          section([op('inc'),op('sc',2)],1,4,f.body,'몸 색'),
          section([op('inc'),op('sc',2),op('inc'),op('sc',2),op('inc')],1,10,f.headColor,'머리 위 색')
        ];
        head.rows[4].colorSections=[
          section([op('sc',3),op('inc')],2,10,f.headColor,'머리 위 색'),
          section([op('sc',3),op('inc')],2,10,f.body,'몸 색'),
          section([op('sc',3),op('inc')],2,10,f.headColor,'머리 위 색')
        ];
        head.finish='머리는 뒤 중심을 단 시작점으로 정합니다. 1~3단은 머리 위 색, 4~5단은 표의 순서대로 머리 위 색→몸 색→머리 위 색으로 바꿔 이마 중앙에 몸 색이 올라오는 경계를 만듭니다. 6~17단은 몸 색입니다. 몸 색 구간의 중앙을 얼굴 정면으로 하여 귀와 눈을 배치하세요. 바꾸기 직전 코의 마지막 두 고리를 다음 실로 빼고, 사용하지 않는 실은 안쪽에 여유 있게 걸칩니다. 원본의 곡선은 두 단의 계단형 배색으로 근사한 제작 검증 전 초안입니다. 14단부터 솜을 조금씩 넣습니다. 17단 후 남은 6코 앞고리를 실로 모아 닫고 실 끝을 숨깁니다.';
      }
    }
    return { features: {...f,tail:includeTail,hasRear:f.hasRear===true}, parts };
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
        if (r.color !== undefined && !/^#[0-9a-f]{6}$/i.test(r.color)) errors.push(`${label}: 실 색상 오류`);
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
        if (r.colorSections) {
          let total=0;const combined=[];
          if (!Array.isArray(r.colorSections)||!r.colorSections.length) {errors.push(`${label}: 배색 구간 오류`);return;}
          for (const s of r.colorSections) {
            if (!/^#[0-9a-f]{6}$/i.test(s.color)||!Number.isInteger(s.stitches)||s.stitches<1||!Number.isInteger(s.repeat)||s.repeat<1||!Array.isArray(s.ops)||!s.ops.length||s.ops.some(o=>!['sc','inc','dec'].includes(o.type)||!Number.isInteger(o.count)||o.count<1)) {errors.push(`${label}: 배색 데이터 오류`);continue;}
            const sequence=expand(s),produced=sequence.reduce((n,type)=>n+(type==='inc'?2:1),0);
            if(produced!==s.stitches)errors.push(`${label}: 배색 구간 코 수 불일치`);
            total+=s.stitches;combined.push(...sequence);
          }
          if(total!==r.stitches||JSON.stringify(combined)!==JSON.stringify(expand(r)))errors.push(`${label}: 배색 합계 또는 뜨기 순서 불일치`);
        }
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
