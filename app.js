'use strict';
const $ = id => document.getElementById(id);
let objectUrl;
let uploadVersion = 0;
let generated = false;
function clearImage() {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = undefined;
  $('preview').removeAttribute('src');
  $('preview-wrap').hidden = true;
}
$('image').addEventListener('change', async e => {
  const version = ++uploadVersion;
  const file = e.target.files[0];
  clearImage(); $('upload-error').textContent = '';
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    $('upload-error').textContent = 'PNG·JPG·WebP 형식의 10MB 이하 이미지를 선택해 주세요.'; e.target.value = ''; return;
  }
  const url = URL.createObjectURL(file);
  const probe = new Image(); probe.src = url;
  try {
    await probe.decode();
    if (version !== uploadVersion) { URL.revokeObjectURL(url); return; }
    objectUrl = url; $('preview').src = url; $('preview-wrap').hidden = false;
    $('filename').textContent = file.name;
  } catch {
    URL.revokeObjectURL(url);
    if (version === uploadVersion) { $('upload-error').textContent = '이미지를 읽지 못했습니다. 다른 이미지 파일로 다시 선택해 주세요.'; e.target.value = ''; }
  }
});
$('remove').addEventListener('click', () => { ++uploadVersion; clearImage(); $('image').value = ''; $('upload-error').textContent = ''; });
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function resetResult() { generated = false; $('result').hidden = true; $('parts').replaceChildren(); }
$('features').addEventListener('input', () => {
  if (generated) { resetResult(); $('pattern-error').textContent = '특징을 변경했습니다. 「초안 도안 만들기」를 눌러 새 도안을 확인해 주세요.'; }
});
$('features').addEventListener('submit', e => {
  e.preventDefault(); resetResult(); $('pattern-error').textContent = '';
  try {
    const data = new FormData(e.target);
    const f = {body: data.get('body'), accent: data.get('accent'), ear: data.get('ear'), tail: data.get('tail') === 'yes'};
    const p = Crochet.generate(f), check = Crochet.validate(p);
    if (!check.ok) throw new Error('코 수 검사 실패');
    $('parts').innerHTML = p.parts.map(part => `<section class="part"><div class="part-title"><h3>${part.name} · ${part.count}개</h3><span><i class="swatch" style="background:${part.color}"></i>${part.color}</span></div><table><thead><tr><th scope="col">단</th><th scope="col">뜨기 지시</th><th scope="col">완료 코</th></tr></thead><tbody>${part.rows.map((r, i) => `<tr><td>${i + 1}단</td><td>${escapeHtml(Crochet.instruction(r))}</td><td>${r.stitches}코</td></tr>`).join('')}</tbody></table><p class="finish">${part.finish}</p></section>`).join('');
    $('summary').textContent = `고양이형 · ${f.ear === 'pointed' ? '뾰족한 귀' : '둥근 귀'} · 꼬리 ${f.tail ? '있음' : '없음'} · 몸 ${f.body} / 귀·꼬리 ${f.accent} · 수동 선택한 특징 기준`;
    $('checks').textContent = `✓ 자동 코 수 검사 통과 · ${p.parts.length}종 부위, ${check.rounds}개 단 정의의 이전 코 사용량·완료 코 수 일치 (동일 부위 복제 전 기준)`;
    const assembly = ['머리와 몸통에 솜을 넣고 마감합니다. 몸통 입구 12코를 머리 아래 15~16단 부근에 중심을 맞춰 시침하고 둘레를 꿰맵니다.', '귀 2개를 납작하게 눌러 머리 윗부분 3~6단 부근의 양쪽에 대칭으로 시침한 뒤 꿰맵니다.', '팔 2개를 몸통 양옆 10~12단 부근에, 다리 2개를 몸통 아래 앞쪽 3~5단 부근에 시침하고 꿰맵니다.'];
    if (f.tail) assembly.push('꼬리를 몸통 뒤 중심의 4~6단 부근에 시침하고 입구 둘레를 꿰매 고정합니다.');
    assembly.push('검정 자수실로 머리 정면 9~11단 부근에 눈을 좌우 대칭으로 수놓습니다. 가운데 작은 코와 입, 분홍색 볼을 수놓습니다. 머리 위 파란 무늬는 이번 기본 도안에 포함되지 않습니다.', '모든 실 끝을 내부에 숨기고 느슨한 부착 부위가 없는지 확인합니다. 실제 형태와 부착 위치는 숙련자의 제작 검증을 받아 조정해야 합니다.');
    $('assembly').innerHTML = assembly.map(s => `<li>${s}</li>`).join('');
    generated = true; $('result').hidden = false; $('result-title').focus(); $('result').scrollIntoView({behavior:'smooth', block:'start'});
  } catch { resetResult(); $('pattern-error').textContent = '도안 생성 또는 코 수 검사에 실패했습니다. 특징을 다시 선택해 주세요. 계속 실패하면 현재 선택 항목을 알려주세요.'; }
});
$('print').addEventListener('click', () => { if (generated) window.print(); });
