(function(root){
  'use strict';
  function normalize(hex){if(!/^#[0-9a-f]{6}$/i.test(hex))throw new Error('실 색상 값이 올바르지 않습니다.');return hex.toUpperCase();}
  function name(hex){
    const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,l=(max+min)/510;
    if(min>=240&&delta<=15)return '흰색';
    if(max<=50)return '검정색';
    if(delta<22)return l>.77?'연회색':'회색';
    let h=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;h=(h*60+360)%360;
    if(h>=180&&h<255)return l>.55?'하늘색':'파란색';
    if(h>=255&&h<300)return '보라색';
    if(h>=300||h<15)return l>.6?'분홍색':'빨간색';
    if(h<45)return l<.5?'갈색':'주황색';
    if(h<75)return min>190?'크림색':'노란색';
    return '초록색';
  }
  function create(features){
    const roles=[['body','몸·팔다리'],['accent','귀·꼬리']];if(features.headPatch)roles.push(['headColor','머리 위']);
    const entries=[],aliases=new Map();
    const distance=(a,b)=>Math.hypot(...[1,3,5].map(i=>parseInt(a.slice(i,i+2),16)-parseInt(b.slice(i,i+2),16)));
    for(const [key,role]of roles){const hex=normalize(features[key]);let entry=entries.find(e=>distance(e.hex,hex)<=32);if(!entry){entry={id:String.fromCharCode(65+entries.length),hex,name:name(hex),roles:[]};entries.push(entry);}entry.roles.push(role);aliases.set(hex,entry);}
    const find=hex=>{const entry=aliases.get(normalize(hex));if(!entry)throw new Error('도안에 없는 실 색상입니다.');return entry;};
    return {entries,label(hex){const entry=find(hex);return `${entry.id} · ${entry.name}`;},color(hex){return find(hex).hex;}};
  }
  const api={normalize,name,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YarnPalette=api;
})(typeof window!=='undefined'?window:globalThis);
