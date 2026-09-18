export const npcScenes = {
  returnMaster: {
    speaker: '阿依提老师傅',
    text: '材料和纹样都齐了。染缸旁的水阀锁着三枚纹样轮——按“水波—石榴—巴旦木”的次序转动就能开启。水引蓝、花承红、果点黄，这正是艾德莱斯的三色记忆。',
    action: '去转动水阀',
  },
  acceptance: {
    speaker: '阿依提老师傅',
    text: '纹样有呼吸，颜色也有层次。你完成的不只是一匹绸，更亲手记住了这门技艺。',
    action: '接受认可',
  },
}

export const cultureDiscoveries = {
  silk: {
    title: '蚕丝束',
    description: '柔韧、细密的丝线，是织造艾德莱斯绸的基础材料。',
    culture: '艾德莱斯采用经线扎染：先扎结经线，再分层染色，最后织造成绸。纹样因此带有自然晕染和流动边缘。',
    source: '文化来源：新疆传统丝织与经线扎染工艺',
    image: '/assets/props/clue-silk-bundle.png',
  },
  pattern: {
    title: '艾德莱斯纹样样本',
    description: '蓝、红、黄相互衔接的流动几何纹样。',
    culture: '纹样并非印在成品表面，而是在经线阶段预先设计。染后的经线进入织机，最终组合成富有节奏的图案。',
    source: '文化来源：艾德莱斯绸纹样与分层染色技艺',
    image: '/assets/props/clue-pattern-sample.png',
  },
}
