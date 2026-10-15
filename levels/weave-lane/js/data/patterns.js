// 十二幅艾德莱斯绸蓝本（纹样册）。
// big  = 完整蓝本图（assets/patterns/blueprints，辨纹扎线的三段拓样也取自它）；
// thumb= 纹样册缩略图（assets/patterns/thumbnails）；
// palette = 该蓝本的原始三档色（base 底布 / main 主纹 / turquoise 晕色），用于"蓝本与成品"对照渲染；
// warp  = 蓝本自带的七段扎束留白（1 扎束留白 / 0 不扎），p01 为可玩章节，其余 p02–p12 待后续章节解锁。
const BLUEPRINTS=[
 {id:'p01',num:'01',name:'杏花卷草',group:'第一章 · 花草入门',meaning:'杏花与卷草缠绕，柔婉清丽',locked:false,
  big:'assets/patterns/blueprints/pattern_01_apricot_scroll_vine.png',thumb:'assets/patterns/thumbnails/pattern_01_thumb.png',
  palette:{base:'#f3e6c8',main:'#c14a36',turquoise:'#2f8f8c'},warp:[1,0,0,1,0,0,1]},
 {id:'p02',num:'02',name:'星眸菱花',group:'第二章 · 吉祥意象',meaning:'星眸与菱花交叠，明快灵动',locked:true,
  big:'assets/patterns/blueprints/pattern_02_star_eye_diamond_flower.png',thumb:'assets/patterns/thumbnails/pattern_02_thumb.png',
  palette:{base:'#f3e6c8',main:'#e2b54b',turquoise:'#274a78'},warp:[1,0,0,1,0,0,1]},
 {id:'p03',num:'03',name:'石榴花结',group:'第二章 · 吉祥意象',meaning:'石榴花结连环，寓意多福',locked:true,
  big:'assets/patterns/blueprints/pattern_03_pomegranate_flower_knot.png',thumb:'assets/patterns/thumbnails/pattern_03_thumb.png',
  palette:{base:'#f3e6c8',main:'#c14a36',turquoise:'#4d8a58'},warp:[1,0,0,1,0,0,1]},
 {id:'p04',num:'04',name:'火焰山纹',group:'第二章 · 吉祥意象',meaning:'火焰山形起伏，热烈奔放',locked:true,
  big:'assets/patterns/blueprints/pattern_04_flame_mountain.png',thumb:'assets/patterns/thumbnails/pattern_04_thumb.png',
  palette:{base:'#f3e6c8',main:'#d97b3f',turquoise:'#6b4632'},warp:[1,0,0,1,0,0,1]},
 {id:'p05',num:'05',name:'琉璃水滴',group:'第二章 · 吉祥意象',meaning:'琉璃水滴垂落，清透晶莹',locked:true,
  big:'assets/patterns/blueprints/pattern_05_liuli_waterdrop.png',thumb:'assets/patterns/thumbnails/pattern_05_thumb.png',
  palette:{base:'#f3e6c8',main:'#3f9ea0',turquoise:'#6aa6c4'},warp:[1,0,0,1,0,0,1]},
 {id:'p06',num:'06',name:'古城窗花',group:'第三章 · 风物光影',meaning:'古城窗花格纹，质朴端庄',locked:true,
  big:'assets/patterns/blueprints/pattern_06_old_city_window_lattice.png',thumb:'assets/patterns/thumbnails/pattern_06_thumb.png',
  palette:{base:'#f3e6c8',main:'#cf943f',turquoise:'#6b4632'},warp:[1,0,0,1,0,0,1]},
 {id:'p07',num:'07',name:'胡杨秋叶',group:'第三章 · 风物光影',meaning:'胡杨秋叶飘举，苍劲洒脱',locked:true,
  big:'assets/patterns/blueprints/pattern_07_poplar_autumn_leaf.png',thumb:'assets/patterns/thumbnails/pattern_07_thumb.png',
  palette:{base:'#f3e6c8',main:'#b06a3a',turquoise:'#d97b3f'},warp:[1,0,0,1,0,0,1]},
 {id:'p08',num:'08',name:'葡萄藤影',group:'第三章 · 风物光影',meaning:'葡萄藤影连绵，丰饶绵长',locked:true,
  big:'assets/patterns/blueprints/pattern_08_grape_vine_shadow.png',thumb:'assets/patterns/thumbnails/pattern_08_thumb.png',
  palette:{base:'#f3e6c8',main:'#2f8f8c',turquoise:'#c76a94'},warp:[1,0,0,1,0,0,1]},
 {id:'p09',num:'09',name:'丝路灯影',group:'第三章 · 风物光影',meaning:'丝路灯影摇曳，悠远温暖',locked:true,
  big:'assets/patterns/blueprints/pattern_09_silk_road_lantern_shadow.png',thumb:'assets/patterns/thumbnails/pattern_09_thumb.png',
  palette:{base:'#f3e6c8',main:'#e2b54b',turquoise:'#7a4a78'},warp:[1,0,0,1,0,0,1]},
 {id:'p10',num:'10',name:'茶花毯纹',group:'第四章 · 织染生活',meaning:'茶花铺作毯纹，饱满富丽',locked:true,
  big:'assets/patterns/blueprints/pattern_10_camellia_carpet.png',thumb:'assets/patterns/thumbnails/pattern_10_thumb.png',
  palette:{base:'#f3e6c8',main:'#c76a94',turquoise:'#4d8a58'},warp:[1,0,0,1,0,0,1]},
 {id:'p11',num:'11',name:'彩绸流苏',group:'第四章 · 织染生活',meaning:'彩绸流苏垂坠，轻盈华丽',locked:true,
  big:'assets/patterns/blueprints/pattern_11_colored_silk_tassel.png',thumb:'assets/patterns/thumbnails/pattern_11_thumb.png',
  palette:{base:'#f3e6c8',main:'#c14a36',turquoise:'#e2b54b'},warp:[1,0,0,1,0,0,1]},
 {id:'p12',num:'12',name:'青砖花格',group:'第四章 · 织染生活',meaning:'青砖花格错落，沉稳典雅',locked:true,
  big:'assets/patterns/blueprints/pattern_12_blue_brick_lattice.png',thumb:'assets/patterns/thumbnails/pattern_12_thumb.png',
  palette:{base:'#f3e6c8',main:'#274a78',turquoise:'#6aa6c4'},warp:[1,0,0,1,0,0,1]}
];
function blueprintById(id){return BLUEPRINTS.find(b=>b.id===id)||BLUEPRINTS[0];}
// 一份新的织造计划：选定蓝本、继承其自带扎束留白、无额外私章结、尚未逐区域配色。
function defaultPlan(bpOrId){
 const bp=typeof bpOrId==='string'?blueprintById(bpOrId):bpOrId;
 return {blueprint:bp.id,warp:bp.warp.slice(),extraTie:0};
}
