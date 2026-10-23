'use strict';
const $ = id => document.getElementById(id);
let images = {front:null,back:null};
let urls = {front:null,back:null};
const slotVersion={front:0,back:0},loading={front:false,back:false};
let configured = false;
let working = false;
let uploadVersion = 0;
let generated = false;
let yarnPalette;
let currentFeatures;
function clearImage(role) {
  ++uploadVersion;++slotVersion[role];loading[role]=false;
  if(urls[role])URL.revokeObjectURL(urls[role]);urls[role]=null;images[role]=null;
  $(`${role}-preview`).removeAttribute('src');$(`${role}-preview-wrap`).hidden=true;
  resetResult();updateButton();
}
function updateButton() { $('analyze').disabled = !configured || working || !images.front || loading.front || loading.back; }
async function connectionStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error();
    const status = await res.json(); configured = status.configured;
    $('connection').textContent = configured ? 'Gemini 연결 준비 완료 · 무료 프로젝트인지 확인한 설정입니다. 무료 한도에 도달하면 중단합니다.' : '무료 이미지 분석 연결 준비 중 · Google AI Studio의 무료 프로젝트와 API 키 설정이 필요합니다. 아직 이미지를 전송하지 않습니다.';
  } catch { $('connection').textContent = '이미지 분석 서버에 연결하지 못했습니다. 로컬 사이트 서버를 실행해 주세요.'; configured = false; }
  updateButton();
}
function readyMessage(){return !images.front?'정면 이미지를 선택해야 시작할 수 있어요.':images.back?'정면·뒷면 준비 완료 · 분석을 시작할 수 있어요.':'정면 준비 완료 · 뒷면이 없으므로 꼬리는 만들지 않습니다.';}
for(const role of ['front','back']){
  $(`${role}-image`).addEventListener('change',async e=>{
    const files=Array.from(e.target.files);clearImage(role);const version=slotVersion[role];
    $(`${role}-error`).textContent='';$('pattern-error').textContent='';
    if(!files.length){$('progress').textContent=readyMessage();return;}
    const file=files[0];
    if(files.length!==1||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){$(`${role}-error`).textContent='PNG·JPG·WebP 이미지 한 장, 10MB 이하로 선택해 주세요.';e.target.value='';$('progress').textContent=readyMessage();return;}
    loading[role]=true;updateButton();$('progress').textContent='이미지를 준비하고 있습니다.';
    const url=URL.createObjectURL(file);
    try{
      const probe=new Image();probe.src=url;await probe.decode();
      if(version!==slotVersion[role]){URL.revokeObjectURL(url);return;}
      const scale=Math.min(1,1536/Math.max(probe.naturalWidth,probe.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(probe.naturalWidth*scale));canvas.height=Math.max(1,Math.round(probe.naturalHeight*scale));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(probe,0,0,canvas.width,canvas.height);
      images[role]=canvas.toDataURL('image/jpeg',0.85);urls[role]=url;
      $(`${role}-preview`).src=url;$(`${role}-preview-wrap`).hidden=false;$(`${role}-filename`).textContent=file.name;
    }catch{URL.revokeObjectURL(url);if(version===slotVersion[role]){$(`${role}-error`).textContent='이미지를 읽지 못했습니다. 다른 파일로 다시 선택해 주세요.';e.target.value='';}}
    finally{if(version===slotVersion[role]){loading[role]=false;updateButton();$('progress').textContent=readyMessage();}}
  });
  $(`${role}-remove`).addEventListener('click',()=>{clearImage(role);$(`${role}-image`).value='';$(`${role}-error`).textContent='';$('pattern-error').textContent='';$('progress').textContent=readyMessage();});
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function swatch(color){return `<svg class="swatch" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="${yarnPalette.color(color)}" stroke="#667066" stroke-width="1"/></svg>`;}
function colorWords(text){return String(text).replace(/머리 위 색/g,yarnPalette.label(currentFeatures.headPatch?currentFeatures.headColor:currentFeatures.body)).replace(/몸 색/g,yarnPalette.label(currentFeatures.body));}
function renderRow(r,i) {
  const color=r.colorSections ? r.colorSections.map(s=>`${escapeHtml(yarnPalette.label(s.color))} ${s.stitches}코`).join(' → ') : `${swatch(r.color)}${escapeHtml(yarnPalette.label(r.color))}`;
  const directions=r.colorSections ? `<ol class="color-directions">${r.colorSections.map(s=>`<li>${swatch(s.color)}<strong>${escapeHtml(yarnPalette.label(s.color))}</strong>: ${escapeHtml(Crochet.instruction(s))} → ${s.stitches}코</li>`).join('')}</ol>` : escapeHtml(Crochet.instruction(r));
  return `<tr><td>${i+1}단</td><td>${color}</td><td>${directions}${r.note?`<br><strong>${escapeHtml(colorWords(r.note))}</strong>`:''}</td><td>${r.stitches}코</td></tr>`;
}
function resetResult() { generated = false; $('result').hidden = true; $('parts').replaceChildren(); $('analysis-result').hidden = true; }
$('analyze').addEventListener('click', async () => {
  if (working || !configured || !images.front || loading.front || loading.back) return;
  const version = uploadVersion;
  working = true; updateButton(); resetResult(); $('pattern-error').textContent = '';
  $('progress').textContent = '이미지를 분석하고 코 수를 검사하고 있습니다… 응답에 최대 2분이 걸릴 수 있습니다.';
  try {
    const response = await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images}),signal:AbortSignal.timeout(130000)});
    const data = await response.json();
    if (version !== uploadVersion) return;
    if (!response.ok) throw new Error(data.error || '분석 요청에 실패했습니다.');
    const p = data.pattern, a = data.analysis, f = p.features, check = Crochet.validate(p);
    if (!check.ok) throw new Error('코 수 검사 실패');
    currentFeatures=f;yarnPalette=YarnPalette.create(f);
    const earName={pointed:'뾰족한 귀',round:'둥근 귀',long:'긴 귀',none:'귀 없음'}[f.ear];
    const tailNote=!f.hasRear?'뒷면 없음 · 꼬리 생성 안 함':f.tail?'꼬리 있음 · 후면에서 확인':a.tail==='unknown'?'후면에서 꼬리 확인 불가 · 생략':'꼬리 없음';
    const featureSummary = `${f.name||'캐릭터'} · ${earName} · ${tailNote} · 몸 ${yarnPalette.label(f.body)}${f.ear!=='none'?` / 귀 ${yarnPalette.label(f.earColor||f.accent)}`:''}${f.tail?` / 꼬리 ${yarnPalette.label(f.tailColor||f.accent)}`:''}${f.headPatch ? ` / 머리 위 ${yarnPalette.label(f.headColor)}${f.headBoundary==='notched'?' · 이마 중앙이 올라오는 배색':' (1~5단)'}` : ''}`;
    const notes = [String(a.notes).replace(/#[0-9a-f]{6}\b/gi,''), f.headPatch ? (f.headBoundary==='notched'?'머리 1~3단은 머리 위 색, 4~5단은 중앙에 몸 색이 올라오는 배색, 6단부터 몸 색입니다. 원본의 곡선은 두 단의 계단형 배색으로 근사합니다.':'머리 위 색상 영역은 1~5단의 둥근 덮개로 표현합니다. 원본의 굴곡진 경계와 정확히 같지는 않습니다.') : '', !f.hasRear?'뒷면 이미지가 없으므로 정면에 꼬리가 보이더라도 꼬리는 생성하지 않았습니다.':a.tail==='unknown'?'뒷면에서 꼬리를 확실히 확인할 수 없어 생략했습니다.':''].filter(Boolean).join(' ');
    $('analysis-summary').textContent = featureSummary; $('analysis-notes').textContent = colorWords(notes); $('analysis-result').hidden = false;
    $('result-title').textContent=`${f.name||'캐릭터'} 인형 초안`;
    $('yarn-palette').innerHTML=`<h3>인형 몸체 실 · ${yarnPalette.entries.length}색</h3><ul>${yarnPalette.entries.map(c=>`<li>${swatch(c.hex)}<strong>${escapeHtml(c.id)}</strong> <span>${escapeHtml(c.roles.join(' · '))}</span></li>`).join('')}</ul><p class="muted">같은 알파벳은 같은 실입니다. 원형 견본을 보고 실을 고르세요. 얼굴 자수실은 별도로 준비합니다.</p>`;
    $('materials').textContent = `${yarnPalette.entries.map(c=>`${c.id} 실`).join(', ')}, 얼굴 자수용 실, 해당 실 라벨에 맞는 코바늘, 솜, 돗바늘, 가위, 단수링.`;
    $('parts').innerHTML = p.parts.map(part => `<section class="part"><div class="part-title"><h3>${part.name} · ${part.count}개</h3><span>실 색상은 각 단에서 확인</span></div><table><thead><tr><th scope="col">단</th><th scope="col">실 색상</th><th scope="col">뜨기 지시</th><th scope="col">완료 코</th></tr></thead><tbody>${part.rows.map(renderRow).join('')}</tbody></table><p class="finish">${escapeHtml(colorWords(part.finish))}</p></section>`).join('');
    $('summary').textContent = `${featureSummary} · AI 이미지 분석 기준. ${colorWords(notes)}`;
    $('checks').textContent = `✓ 자동 코 수 검사 통과 · ${p.parts.length}종 부위, ${check.rounds}개 단 정의의 이전 코 사용량·완료 코 수 일치${f.headBoundary==='notched'&&f.headPatch?' · 배색 구간 합계·뜨기 순서 일치':''} (동일 부위 복제 전 기준)`;
    const assembly = ['머리와 몸통에 솜을 넣고 마감합니다. 몸통 입구 12코를 머리 아래 15~16단 부근에 중심을 맞춰 시침하고 둘레를 꿰맵니다.'];
    if(f.ear!=='none')assembly.push('귀 2개를 납작하게 눌러 머리 윗부분 3~6단 부근의 양쪽에 대칭으로 시침한 뒤 꿰맵니다.');
    assembly.push('팔 2개를 몸통 양옆 10~12단 부근에, 다리 2개를 몸통 아래 앞쪽 3~5단 부근에 시침하고 꿰맵니다.');
    if (f.tail) assembly.push('꼬리를 몸통 뒤 중심의 4~6단 부근에 시침하고 입구 둘레를 꿰매 고정합니다.');
    assembly.push('참고 이미지의 얼굴을 보며 자수실로 머리 정면 9~11단 부근에 눈을 대칭으로 수놓습니다. 코와 입 등은 단순한 자수로 표현합니다.', '모든 실 끝을 내부에 숨기고 느슨한 부착 부위가 없는지 확인합니다. 실제 형태와 부착 위치는 숙련자의 제작 검증을 받아 조정해야 합니다.');
    $('assembly').innerHTML = assembly.map(s => `<li>${s}</li>`).join('');
    generated = true; $('progress').textContent = '이미지 분석과 도안 생성이 완료되었습니다.'; $('result').hidden = false; $('result-title').focus(); $('result').scrollIntoView({behavior:'smooth', block:'start'});
  } catch (err) {
    if (version === uploadVersion) {resetResult(); $('pattern-error').textContent = err.name === 'TimeoutError' ? '분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.' : err.message; $('progress').textContent = '도안을 생성하지 못했습니다. 안내를 확인해 주세요.';}
  } finally { working = false; updateButton(); }
});
$('print').addEventListener('click', () => { if (generated) window.print(); });
connectionStatus();
