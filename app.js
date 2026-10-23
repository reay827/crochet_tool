'use strict';
const $ = id => document.getElementById(id);
let images = [];
let urls = [];
let configured = false;
let working = false;
let uploadVersion = 0;
let generated = false;
function clearImage() {
  urls.forEach(url => URL.revokeObjectURL(url)); urls = []; images = [];
  $('previews').replaceChildren();
  $('preview-wrap').hidden = true;
  resetResult(); updateButton();
}
function updateButton() { $('analyze').disabled = !configured || working || !images.length; }
async function connectionStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error();
    const status = await res.json(); configured = status.configured;
    $('connection').textContent = configured ? 'Gemini 연결 준비 완료 · 무료 프로젝트인지 확인한 설정입니다. 무료 한도에 도달하면 중단합니다.' : '무료 이미지 분석 연결 준비 중 · Google AI Studio의 무료 프로젝트와 API 키 설정이 필요합니다. 아직 이미지를 전송하지 않습니다.';
  } catch { $('connection').textContent = '이미지 분석 서버에 연결하지 못했습니다. 로컬 사이트 서버를 실행해 주세요.'; configured = false; }
  updateButton();
}
$('image').addEventListener('change', async e => {
  const version = ++uploadVersion;
  const files = Array.from(e.target.files);
  clearImage(); $('upload-error').textContent = '';
  $('pattern-error').textContent = ''; $('progress').textContent = '이미지를 준비하고 있습니다.';
  if (!files.length) { $('progress').textContent = '먼저 이미지를 선택해 주세요.'; return; }
  if (files.length > 2 || files.some(file => !['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 10*1024*1024)) {
    $('upload-error').textContent = 'PNG·JPG·WebP 형식, 한 장당 10MB 이하로 1~2장을 선택해 주세요.'; e.target.value = ''; $('progress').textContent = '이미지를 다시 선택해 주세요.'; return;
  }
  const pendingUrls = [], pendingImages = [];
  try {
    for (const file of files) {
      const url = URL.createObjectURL(file); pendingUrls.push(url);
      const probe = new Image(); probe.src = url; await probe.decode();
      const scale = Math.min(1,1536 / Math.max(probe.naturalWidth,probe.naturalHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(probe.naturalWidth*scale)); canvas.height = Math.max(1,Math.round(probe.naturalHeight*scale));
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(probe,0,0,canvas.width,canvas.height);
      pendingImages.push(canvas.toDataURL('image/jpeg',0.85));
    }
    if (version !== uploadVersion) { pendingUrls.forEach(url=>URL.revokeObjectURL(url)); return; }
    urls = pendingUrls; images = pendingImages;
    urls.forEach((url,i)=>{const img=document.createElement('img');img.src=url;img.alt=`캐릭터 참고 이미지 ${i+1}`;$('previews').append(img);});
    $('preview-wrap').hidden = false; $('filename').textContent = files.map(f=>f.name).join(' / ');
    $('progress').textContent = '이미지 준비 완료 · 분석 버튼을 누르면 특징을 자동으로 읽습니다.'; updateButton();
  } catch {
    pendingUrls.forEach(url=>URL.revokeObjectURL(url));
    if (version === uploadVersion) { $('upload-error').textContent = '이미지를 읽지 못했습니다. 다른 이미지 파일로 다시 선택해 주세요.'; e.target.value = ''; $('progress').textContent = '이미지를 다시 선택해 주세요.'; }
  }
});
$('remove').addEventListener('click', () => { ++uploadVersion; clearImage(); $('image').value = ''; $('upload-error').textContent = ''; $('pattern-error').textContent = ''; $('progress').textContent = '먼저 이미지를 선택해 주세요.'; });
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function resetResult() { generated = false; $('result').hidden = true; $('parts').replaceChildren(); $('analysis-result').hidden = true; }
$('analyze').addEventListener('click', async () => {
  if (working || !configured || !images.length) return;
  const version = uploadVersion;
  working = true; updateButton(); resetResult(); $('pattern-error').textContent = '';
  $('progress').textContent = '이미지를 분석하고 코 수를 검사하고 있습니다…';
  try {
    const response = await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images}),signal:AbortSignal.timeout(55000)});
    const data = await response.json();
    if (version !== uploadVersion) return;
    if (!response.ok) throw new Error(data.error || '분석 요청에 실패했습니다.');
    const p = data.pattern, a = data.analysis, f = p.features, check = Crochet.validate(p);
    if (!check.ok) throw new Error('코 수 검사 실패');
    const featureSummary = `고양이형 · ${f.ear === 'pointed' ? '뾰족한 귀' : '둥근 귀'} · 꼬리 ${a.tail === 'unknown' ? '확인 불가 · 초안에서 생략' : f.tail ? '있음' : '없음'} · 몸 ${f.body} / 귀·꼬리 ${f.accent}`;
    const notes = [a.notes, a.tail === 'unknown' ? '꼬리가 가려져 있는지 확인할 수 없어 이번 초안에서는 생략했습니다. 뒷모습을 함께 선택하면 더 정확히 확인할 수 있습니다.' : ''].filter(Boolean).join(' ');
    $('analysis-summary').textContent = featureSummary; $('analysis-notes').textContent = notes; $('analysis-result').hidden = false;
    $('parts').innerHTML = p.parts.map(part => `<section class="part"><div class="part-title"><h3>${part.name} · ${part.count}개</h3><span><i class="swatch" style="background:${part.color}"></i>${part.color}</span></div><table><thead><tr><th scope="col">단</th><th scope="col">뜨기 지시</th><th scope="col">완료 코</th></tr></thead><tbody>${part.rows.map((r, i) => `<tr><td>${i + 1}단</td><td>${escapeHtml(Crochet.instruction(r))}</td><td>${r.stitches}코</td></tr>`).join('')}</tbody></table><p class="finish">${part.finish}</p></section>`).join('');
    $('summary').textContent = `${featureSummary} · AI 이미지 분석 기준. ${notes}`;
    $('checks').textContent = `✓ 자동 코 수 검사 통과 · ${p.parts.length}종 부위, ${check.rounds}개 단 정의의 이전 코 사용량·완료 코 수 일치 (동일 부위 복제 전 기준)`;
    const assembly = ['머리와 몸통에 솜을 넣고 마감합니다. 몸통 입구 12코를 머리 아래 15~16단 부근에 중심을 맞춰 시침하고 둘레를 꿰맵니다.', '귀 2개를 납작하게 눌러 머리 윗부분 3~6단 부근의 양쪽에 대칭으로 시침한 뒤 꿰맵니다.', '팔 2개를 몸통 양옆 10~12단 부근에, 다리 2개를 몸통 아래 앞쪽 3~5단 부근에 시침하고 꿰맵니다.'];
    if (f.tail) assembly.push('꼬리를 몸통 뒤 중심의 4~6단 부근에 시침하고 입구 둘레를 꿰매 고정합니다.');
    assembly.push('검정 자수실로 머리 정면 9~11단 부근에 눈을 좌우 대칭으로 수놓습니다. 가운데 작은 코와 입, 분홍색 볼을 수놓습니다. 머리 위 파란 무늬는 이번 기본 도안에 포함되지 않습니다.', '모든 실 끝을 내부에 숨기고 느슨한 부착 부위가 없는지 확인합니다. 실제 형태와 부착 위치는 숙련자의 제작 검증을 받아 조정해야 합니다.');
    $('assembly').innerHTML = assembly.map(s => `<li>${s}</li>`).join('');
    generated = true; $('progress').textContent = '이미지 분석과 도안 생성이 완료되었습니다.'; $('result').hidden = false; $('result-title').focus(); $('result').scrollIntoView({behavior:'smooth', block:'start'});
  } catch (err) {
    if (version === uploadVersion) {resetResult(); $('pattern-error').textContent = err.name === 'TimeoutError' ? '분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.' : err.message; $('progress').textContent = '도안을 생성하지 못했습니다. 안내를 확인해 주세요.';}
  } finally { working = false; updateButton(); }
});
$('print').addEventListener('click', () => { if (generated) window.print(); });
connectionStatus();
