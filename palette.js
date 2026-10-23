(function(root){
  'use strict';
  function normalize(hex){if(!/^#[0-9a-f]{6}$/i.test(hex))throw new Error('실 색상 값이 올바르지 않습니다.');return hex.toUpperCase();}
  function create(features){
    const roles=[['body','몸·팔다리']];
    const accentRoles=[];if(features.ear!=='none')accentRoles.push('귀');if(features.tail&&features.hasRear)accentRoles.push('꼬리');
    if(accentRoles.length)roles.push(['accent',accentRoles.join('·')]);if(features.headPatch)roles.push(['headColor','머리 위']);
    const entries=[],aliases=new Map();
    const distance=(a,b)=>Math.hypot(...[1,3,5].map(i=>parseInt(a.slice(i,i+2),16)-parseInt(b.slice(i,i+2),16)));
    for(const [key,role]of roles){const hex=normalize(features[key]);let entry=entries.find(e=>distance(e.hex,hex)<=32);if(!entry){entry={id:String.fromCharCode(65+entries.length),hex,roles:[]};entries.push(entry);}entry.roles.push(role);aliases.set(hex,entry);}
    const find=hex=>{const entry=aliases.get(normalize(hex));if(!entry)throw new Error('도안에 없는 실 색상입니다.');return entry;};
    return {entries,label(hex){return find(hex).id;},color(hex){return find(hex).hex;}};
  }
  const api={normalize,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YarnPalette=api;
})(typeof window!=='undefined'?window:globalThis);
