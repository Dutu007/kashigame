// 染谱预览：模板区域数据、染碟色板、灵感卡
// 区域编号图与 rXX.png 由 tools/build_region_map.py 离线生成，禁止有损压缩。
const REGION_DATA_VERSION = 3;
const REGION_SIZE = 1254; // 编号图与蒙版的逻辑尺寸

// 八味基础色在前，扩展色在后；素白染液与未染色的暖米色底布分开。
const DYE_COLORS = [
 {hex:'#ffffff', name:'素白', base:true},
 {hex:'#c14a36', name:'朱红'},
 {hex:'#8a2f24', name:'深红'},
 {hex:'#cf943f', name:'赭黄'},
 {hex:'#e2b54b', name:'明黄'},
 {hex:'#274a78', name:'靛蓝'},
 {hex:'#6aa6c4', name:'浅蓝'},
 {hex:'#3f9ea0', name:'湖蓝'},
 {hex:'#2f8f8c', name:'孔雀绿'},
 {hex:'#4d8a58', name:'松绿'},
 {hex:'#b06a3a', name:'赭石'},
 {hex:'#d97b3f', name:'橙棕'},
 {hex:'#c76a94', name:'玫红'},
 {hex:'#7a4a78', name:'紫棠'},
 {hex:'#6b4632', name:'深褐'},
 {hex:'#382c26', name:'深褐黑'}
];
const CREAM_HEX = '#f3e6c8';

// 只展示、不自动上色的建议色组
const INSPIRATION_CARDS = [
 {name:'艾得莱斯', colors:['#c14a36','#2f8f8c','#274a78','#cf943f','#ffffff']},
 {name:'葡萄架下', colors:['#2f8f8c','#6aa6c4','#c76a94','#382c26','#ffffff']},
 {name:'火焰山暮', colors:['#8a2f24','#d97b3f','#cf943f','#6b4632','#ffffff']},
 {name:'巴旦木春', colors:['#274a78','#4d8a58','#e2b54b','#b06a3a','#ffffff']}
];

const REGION_TEMPLATES = {
 p01: {
  id:'p01',
  size:REGION_SIZE,
  axis:627,
  map:'assets/patterns/workshop/region_map.png',
  maskDir:'assets/patterns/workshop/regions/',
  blank:'assets/patterns/workshop/pattern_dye_blank.png',
  lines:'assets/patterns/workshop/lines.png',
  shadow:'assets/patterns/workshop/masks/mask_shadow.png',
  light:'assets/patterns/workshop/masks/mask_light.png',
  // 绘制/命中优先级：后画的覆盖先画的
  drawOrder:[0,9,10,8,16,17,6,7,3,1,4,5,11,12,13,14,15,2],
  regions:[
   {id:0,name:'背景底布'},{id:1,name:'主花瓣'},{id:2,name:'主花心'},{id:3,name:'主花光晕'},
   {id:4,name:'左侧花'},{id:5,name:'右侧花'},{id:6,name:'上边角花'},{id:7,name:'下边角花'},
   {id:8,name:'中央茎蔓'},{id:9,name:'左卷草'},{id:10,name:'右卷草'},
   {id:11,name:'中轴菱形'},{id:12,name:'腰菱左'},{id:13,name:'腰菱右'},
   {id:14,name:'下菱左'},{id:15,name:'下菱右'},
   {id:16,name:'左边饰'},{id:17,name:'右边饰'}
  ],
  symmetryPairs:[[4,5],[9,10],[12,13],[14,15],[16,17]],
  kindGroups:{corner:[6,7], diamond:[11,12,13,14,15], border:[16,17]},
  tassel:{main:1, border:16},
  defaultName:'杏花卷草·染谱'
 }
};

function regionTemplate(id){ return REGION_TEMPLATES[id] || REGION_TEMPLATES.p01; }
function regionName(tplId, rid){
 const t=regionTemplate(tplId), r=t.regions.find(x=>x.id===rid);
 return r?r.name:('区域 '+rid);
}
// 计算一次点击实际影响的区域（对称联动 + 同类一起染，合并去重）
function expandRegions(tplId, rid, symmetryOn, kindOn){
 const t=regionTemplate(tplId);
 const set=new Set([rid]);
 if(symmetryOn){
  for(const [a,b] of t.symmetryPairs){
   if(a===rid)set.add(b);
   if(b===rid)set.add(a);
  }
 }
 if(kindOn){
  for(const k of Object.keys(t.kindGroups)){
   const g=t.kindGroups[k];
   if(g.includes(rid))g.forEach(x=>set.add(x));
  }
 }
 return [...set].sort((a,b)=>a-b);
}
