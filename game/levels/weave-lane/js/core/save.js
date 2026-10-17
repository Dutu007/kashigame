// 本地存档：染谱草稿、作品册、设置。纯 localStorage，失败显式返回 false。
const SAVE_KEYS = {
 draft:'weavelane.draft.v1',
 works:'weavelane.works.v1',
 settings:'weavelane.settings.v1'
};
const SAVE_DATA_VERSION = 1;
const DEFAULT_SETTINGS = {soundOn:true};

function _storage(){
 try{ return window.localStorage; }catch(e){ return null; }
}
function _read(key, fallback){
 const value=Campaign.read(key);return value==null?fallback:value;
}
function _write(key, value){
 return Campaign.write(key,value);
}

// ---- 草稿：模板、最终区域颜色、是否动过、联动开关、作品名（不存动画中间态）----
function loadDraft(){
 const d=_read(SAVE_KEYS.draft, null);
 if(!d||!d.templateId||!d.colors)return null;
 return migrateRegionRecord(d);
}
// Older saves used 18 semantic groups. Expand them onto the matching black-line
// cells once, while retaining the original localStorage record until next save.
function migrateRegionRecord(record){
 const version=record.regionVersion||record.dataVersion||1;
 if(version>=REGION_DATA_VERSION)return record;
 if(!record.templateId&&!record.regionColors)return record;
 const tpl=regionTemplate(record.templateId||record.blueprint);
 const expand=o=>{
  const out={};
  for(const r of tpl.regions){
   const sourceId=version===2?r.previousId:(r.legacyId??r.id);
   if(sourceId==null)continue;
   const v=o&&o[sourceId];if(v!==undefined)out[r.id]=v;
  }
  return out;
 };
 const next=Object.assign({},record,{regionVersion:REGION_DATA_VERSION});
 if(record.regionColors){next.regionColors=expand(record.regionColors);next.regionTouched=expand(record.regionTouched);}
 else{next.colors=expand(record.colors);next.touched=expand(record.touched);}
 return next;
}
function saveDraft(draft){
 const data=Object.assign({v:SAVE_DATA_VERSION, regionVersion:REGION_DATA_VERSION, savedAt:Date.now()}, draft);
 return _write(SAVE_KEYS.draft, data);
}
function clearDraft(){
 Campaign.write(SAVE_KEYS.draft,null);
}

// ---- 作品册：确认配色并织造完成后写入 ----
function loadWorks(){
 const w=_read(SAVE_KEYS.works, []);
 return Array.isArray(w)?w.map(migrateRegionRecord):[];
}
function saveWork(work){
 const works=loadWorks();
 const idx=works.findIndex(w=>w.workId===work.workId);
 if(idx>=0)works[idx]=Object.assign({},works[idx],work);
 else works.unshift(work);
 return _write(SAVE_KEYS.works, works);
}
function findWork(workId){ return loadWorks().find(w=>w.workId===workId); }

// ---- 设置（音效开关等）----
function loadSettings(){
 return Object.assign({}, DEFAULT_SETTINGS, _read(SAVE_KEYS.settings, {}));
}
function saveSettings(patch){
 const next=Object.assign(loadSettings(), patch||{});
 return _write(SAVE_KEYS.settings, next);
}
