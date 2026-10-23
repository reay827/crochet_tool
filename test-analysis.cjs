'use strict';
const assert=require('node:assert/strict');
const {analyze,toFeatures}=require('./analysis.cjs');
const {createServer}=require('./serve.cjs');
const Crochet=require('./pattern.js');
const image='data:image/jpeg;base64,/9j/2Q=='; // transport validation fixture only; not an actual model test
const good={supported:true,name:'작은 캐릭터',front_valid:true,back_valid:true,same_character:true,reason:'단순 캐릭터',body:'#ffffff',accent:'#7fa6bc',head_patch:true,head_color:'#7fa6bc',head_boundary:'notched',ear:'pointed',tail:'yes',notes:'이마 중앙에서 몸 색이 머리 위 색 영역으로 올라옵니다.'};
async function withServer(options,run){const server=createServer(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await run(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(r=>server.close(r));}}
async function main(){
  let sent;
  const a=await analyze({front:image,back:null},{apiKey:'test-not-a-real-key',fetchImpl:async(url,options)=>{sent={url,body:JSON.parse(options.body)};return {ok:true,json:async()=>({status:'completed',steps:[{type:'thought',summary:'ignored'},{type:'model_output',content:[{type:'text',text:JSON.stringify(good)}]}]})};}});
  assert.equal(sent.url.includes('generativelanguage.googleapis.com'),true);
  assert.equal(sent.url.endsWith('/interactions'),true);
  assert.equal(sent.body.response_format.mime_type,'application/json');
  assert.equal(sent.body.store,false);
  assert.equal(sent.body.input[1].type,'image');
  assert.match(sent.body.input[0].text,/FRONT/);assert.match(sent.body.input[2].text,/BACK 이미지 없음/);
  assert.equal(Crochet.validate(Crochet.generate(toFeatures(a))).ok,true);
  assert.equal(Crochet.generate(toFeatures(a)).parts[0].rows[0].color,good.head_color);
  assert.equal(Crochet.generate(toFeatures(a)).parts[0].rows[5].color,good.body);
  assert.throws(()=>toFeatures({...a,head_color:'bad'}));
  assert.equal(toFeatures({...a,tail:'unknown'}).tail,false);
  assert.throws(()=>toFeatures({...a,body:'<script>'}));
  assert.throws(()=>toFeatures({...a,ear:'unknown'}));
  assert.equal(toFeatures(a).tail,false,'no rear must suppress tail even when AI says yes');
  assert.equal(toFeatures(a,true).tail,true);
  assert.throws(()=>toFeatures({...a,front_valid:false}),/정면/);
  assert.throws(()=>toFeatures({...a,back_valid:false},true),/뒷면/);
  assert.throws(()=>toFeatures({...a,same_character:false},true),/같은 캐릭터/);
  for(const ear of ['pointed','round','long','none'])assert.equal(Crochet.validate(Crochet.generate(toFeatures({...a,ear},false))).ok,true);
  await assert.rejects(analyze({front:image},{apiKey:'fake',fetchImpl:async()=>{throw new TypeError('fetch failed');}}),/네트워크 접근 권한/);
  await assert.rejects(analyze({front:image},{apiKey:'fake',fetchImpl:async()=>({ok:false,status:429})}),/무료/);
  await assert.rejects(analyze({front:image},{apiKey:'fake',fetchImpl:async()=>({ok:false,status:503})}),/혼잡/);
  await assert.rejects(analyze({front:image},{apiKey:'fake',fetchImpl:async()=>({ok:true,json:async()=>({status:'failed',steps:[]})})}),/끝내지/);
  let calls=0;
  await withServer({apiKey:'fake',freeTierConfirmed:false,analyzeImpl:async()=>{calls++;return good;}},async base=>{
    assert.equal((await (await fetch(base+'/api/status')).json()).configured,false);
    assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({images:{front:image}})})).status,503);
    assert.equal(calls,0);
    assert.equal((await fetch(base+'/.env')).status,404);
  });
  await withServer({apiKey:'fake',freeTierConfirmed:true,analyzeImpl:async()=>{calls++;return good;}},async base=>{
    const post=body=>fetch(base+'/api/analyze',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal((await post({images:{front:'bad'}})).status,400);
    assert.equal((await post({images:{back:image}})).status,400);
    assert.equal((await post({images:[image,image]})).status,400);
    assert.equal(calls,0);
    const response=await post({images:{front:image,back:image}});assert.equal(response.status,200);
    const data=await response.json();assert.equal(data.pattern.parts.length,6);assert.equal(data.check.ok,true);
    assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:'{}'})).status,403);
    const frontOnly=await post({images:{front:image}});assert.equal(frontOnly.status,200);const frontOnlyData=await frontOnly.json();assert.equal(frontOnlyData.pattern.parts.some(p=>p.name==='꼬리'),false);assert.equal(frontOnlyData.pattern.features.tail,false);
    for(let i=2;i<10;i++)assert.equal((await post({images:{front:image}})).status,200);
    assert.equal((await post({images:{front:image}})).status,429);
  });
  await withServer({apiKey:'fake',freeTierConfirmed:true,analyzeImpl:async()=>({...good,supported:false,reason:'복잡한 형태는 지원하지 않습니다.'})},async base=>{
    const r=await fetch(base+'/api/analyze',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({images:{front:image}})});
    assert.equal(r.status,422);assert.equal('pattern' in await r.json(),false);
  });
  console.log('PASS: mocked Gemini parsing, input validation, missing free-tier confirmation blocks calls, generation, unsupported input, origin protection, session cap. No external API calls.');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
