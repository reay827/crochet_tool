const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {analyze, validateImages, toFeatures} = require('./analysis.cjs');
const Crochet = require('./pattern.js');
if (fs.existsSync(path.join(__dirname,'.env'))) process.loadEnvFile(path.join(__dirname,'.env'));
const files = {'/':'index.html','/index.html':'index.html','/app.js':'app.js','/pattern.js':'pattern.js','/style.css':'style.css'};
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
function createServer({apiKey=process.env.GEMINI_API_KEY,freeTierConfirmed=process.env.GEMINI_FREE_TIER_CONFIRMED==='yes',model='gemini-3.8-flash',analyzeImpl=analyze}={}) {
  let busy=false,calls=0;
  const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  return http.createServer(async(req,res)=>{
  const host=req.headers.host;
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host||'')) {send(res,403,{error:'로컬 접속만 지원합니다.'});return;}
  const pathname=new URL(req.url,`http://${host}`).pathname;
  if (pathname==='/api/status' && req.method==='GET') {send(res,200,{configured:Boolean(apiKey)&&freeTierConfirmed,remaining:Math.max(0,10-calls)});return;}
  if (pathname==='/api/analyze' && req.method==='POST') {
    if (req.headers.origin!==`http://${host}` || !req.headers['content-type']?.startsWith('application/json')) {send(res,403,{error:'사이트에서 다시 요청해 주세요.'});return;}
    if (!apiKey || !freeTierConfirmed) {send(res,503,{error:'무료 이미지 분석 연결 전입니다. 결제가 연결되지 않은 Google AI Studio 무료 프로젝트를 확인하고 키를 설정해야 합니다.'});return;}
    if (busy || calls>=10) {send(res,429,{error:busy?'다른 분석이 진행 중입니다. 완료 후 다시 시도해 주세요.':'이 실행의 테스트 10회 한도에 도달했습니다. 비용을 확인한 뒤 서버를 다시 시작해 주세요.'});return;}
    busy=true;
    try {
      let bytes=0;const chunks=[];
      for await(const chunk of req) {bytes+=chunk.length;if(bytes>13*1024*1024){send(res,413,{error:'이미지가 너무 큽니다. 더 작은 파일로 다시 시도해 주세요.'});return;}chunks.push(chunk);}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{send(res,400,{error:'요청을 읽지 못했습니다. 이미지를 다시 선택해 주세요.'});return;}
      validateImages(body.images);calls++;
      const analysis=await analyzeImpl(body.images,{apiKey,model});
      if (!analysis.supported || analysis.ear==='unknown') {send(res,422,{error:analysis.supported?'귀가 잘 보이는 이미지로 다시 시도해 주세요.':(analysis.reason||'고양이형 캐릭터 이미지를 선택해 주세요.')});return;}
      const pattern=Crochet.generate(toFeatures(analysis)),check=Crochet.validate(pattern);
      if (!check.ok) {send(res,500,{error:'자동 코 수 검사에 실패해 도안을 표시하지 않았습니다. 개발자 확인이 필요합니다.'});return;}
      send(res,200,{analysis,pattern,check});
    }catch(err){send(res,502,{error:err.name==='TimeoutError'?'분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.':err.message});}finally{busy=false;}
    return;
  }
  if(req.method!=='GET'){send(res,405,{error:'지원하지 않는 요청입니다.'});return;}
  const file = files[pathname];
  if (!file) {res.writeHead(404); res.end('Not found'); return;}
  fs.readFile(path.join(__dirname,file),(err,data) => {
    if (err) {res.writeHead(500); res.end('Read error'); return;}
    res.writeHead(200, {'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'}); res.end(data);
  });
  });
}
if(require.main===module) createServer().listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
module.exports={createServer};
