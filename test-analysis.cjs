'use strict';
const assert=require('node:assert/strict');
const {analyze,toFeatures}=require('./analysis.cjs');
const {createServer}=require('./serve.cjs');
const Crochet=require('./pattern.js');
const image='data:image/jpeg;base64,/9j/2Q=='; // transport validation fixture only; not an actual model test
const good={supported:true,reason:'고양이형 캐릭터',body:'#ffffff',accent:'#7fa6bc',ear:'pointed',tail:'yes',notes:'머리 위 무늬는 생략합니다.'};
async function withServer(options,run){const server=createServer(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await run(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(r=>server.close(r));}}
async function main(){
  let sent;
  const a=await analyze([image],{apiKey:'test-not-a-real-key',fetchImpl:async(url,options)=>{sent={url,body:JSON.parse(options.body)};return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(good)}]}}]})};}});
  assert.equal(sent.url.includes('generativelanguage.googleapis.com'),true);
  assert.equal(sent.body.generationConfig.responseMimeType,'application/json');
  assert.equal(Crochet.validate(Crochet.generate(toFeatures(a))).ok,true);
  assert.equal(toFeatures({...a,tail:'unknown'}).tail,false);
  assert.throws(()=>toFeatures({...a,body:'<script>'}));
  assert.throws(()=>toFeatures({...a,ear:'unknown'}));
  await assert.rejects(analyze([image],{apiKey:'fake',fetchImpl:async()=>({ok:false,status:429})}),/무료/);
  await assert.rejects(analyze([image],{apiKey:'fake',fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{finishReason:'SAFETY'}]})})}),/끝내지/);
  let calls=0;
  await withServer({apiKey:'fake',freeTierConfirmed:false,analyzeImpl:async()=>{calls++;return good;}},async base=>{
    assert.equal((await (await fetch(base+'/api/status')).json()).configured,false);
    assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({images:[image]})})).status,503);
    assert.equal(calls,0);
    assert.equal((await fetch(base+'/.env')).status,404);
  });
  await withServer({apiKey:'fake',freeTierConfirmed:true,analyzeImpl:async()=>{calls++;return good;}},async base=>{
    const post=body=>fetch(base+'/api/analyze',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal((await post({images:['bad']})).status,502);
    assert.equal(calls,0);
    const response=await post({images:[image,image]});assert.equal(response.status,200);
    const data=await response.json();assert.equal(data.pattern.parts.length,6);assert.equal(data.check.ok,true);
    assert.equal((await fetch(base+'/api/analyze',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:'{}'})).status,403);
    for(let i=1;i<10;i++)assert.equal((await post({images:[image]})).status,200);
    assert.equal((await post({images:[image]})).status,429);
  });
  await withServer({apiKey:'fake',freeTierConfirmed:true,analyzeImpl:async()=>({...good,supported:false,reason:'사람형은 지원하지 않습니다.'})},async base=>{
    const r=await fetch(base+'/api/analyze',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({images:[image]})});
    assert.equal(r.status,422);assert.equal('pattern' in await r.json(),false);
  });
  console.log('PASS: mocked Gemini parsing, input validation, missing free-tier confirmation blocks calls, generation, unsupported input, origin protection, session cap. No external API calls.');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
