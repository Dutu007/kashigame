// 阿木提（全章唯一 NPC）剧情对话
// 节点：序章开场 / 染院迎接 / 染缸叮嘱 / 未扎束兜底 / 染后回访 / 染成收尾
// 阿木提情绪：neutral 平静 · gentle 温和 · happy 欢迎 · guide 讲解 · serious 叮嘱 · praise 赞许

// 选角进入老织坊后自动播放
const AMUTI_INTRO = [
 { speaker: '阿木提', text: '门开着，进来吧，别站在太阳底下。', emotion: 'gentle' },
 { speaker: '阿依苏', text: '师傅，我们在找一段会发光的蓝——它曾出现在巷子、门框和旧绸上。', emotion: 'neutral' },
 { speaker: '阿木提', text: '会发光的不是蓝，是有人还记得它该往哪里走。', emotion: 'neutral' }
];

// 扎好白坯后首次走进染院（自动播放一次）
const AMUTI_DYE_WELCOME = [
 { speaker: '阿木提', text: '哦呀，你们到底是找来了——欢迎，到我的染院了。我抄近道，先过来等你们。', emotion: 'happy' },
 { speaker: '阿木提', text: '你看架子上这些彩绸，红蓝黄绿，记的全是喀什人的日子。每一种颜色，都有自己的故事。', emotion: 'guide' },
 { speaker: '阿木提', text: '织是骨架，染是魂魄。扎住的地方不吃色，线一松开，花就活了。', emotion: 'guide' },
 { speaker: '阿木提', text: '院里三口缸各管一层：底色缸打底，主纹缸染主花，晕色缸染卷草的边。', emotion: 'guide' },
 { speaker: '阿依苏', text: '那颜色……要怎么配才好看？', emotion: 'confused' },
 { speaker: '阿木提', text: '颜色全是地里长出来的：蓝草打靛是蓝，红花茜草是红，石榴皮、槐米熬出黄。水引蓝、花承红、果点黄，照着蓝本选，错不了。', emotion: 'guide' },
 { speaker: '阿依苏', text: '下缸的时候，有什么要当心的吗？', emotion: 'confused' },
 { speaker: '阿木提', text: '真正的染织急不得——先读懂纹样，再扎结留白，最后让颜色一层一层走进丝线里。', emotion: 'serious' },
 { speaker: '阿木提', text: '打底一遭、主花两遭、晕边一遭，每回出缸晒透太阳，色才上得牢；取线早了色浅，晚了色闷。', emotion: 'serious' },
 { speaker: '阿木提', text: '道理说完了，手艺得靠手试。走到染缸跟前按 E，先配缸，再下缸。', emotion: 'guide' }
];

// 染缸前第一次按 E（播完进入染谱）
const AMUTI_DYE_BRIEF = [
 { speaker: '阿木提', text: '去吧，我在旁边看着——手稳、心静，错不了。', emotion: 'serious' }
];

// 没扎白坯就进染院 / 按染缸
const AMUTI_DYE_EMPTY = [
 { speaker: '阿木提', text: '空着手可下不了缸。先回织房，把白坯拼好、扎好，再来找我。', emotion: 'serious' }
];

// 染成后回染院找阿木提
const AMUTI_DYE_REVISIT = [
 { speaker: '阿木提', text: '还舍不得走？缸里的颜色跑不了，楼上的好风景可不等人哟。', emotion: 'gentle' }
];

// 三缸染成、对比收藏后
const AMUTI_DYE_DONE = [
 { speaker: '阿木提', text: '不错，不错。纹样有呼吸，颜色也有层次——你完成的不只是一匹绸，是亲手记住了这门技艺。', emotion: 'praise' },
 { speaker: '阿木提', text: '刚出缸的颜色是死的，晒透太阳才亮。第一块新绸织成了，剩下的巷子，会记住它的样子。', emotion: 'praise' },
 { speaker: '阿依苏', text: '走，上楼顶看看——让整条巷子，都挂上它。', emotion: 'happy' }
];
