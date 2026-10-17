// Phaser adapter for the same PNG sequences that the weave-lane canvas uses.
const HeroActor = (() => {
  const actions = ['idle', 'walkLeft', 'walkRight'];
  const key = (id, action, frame = 0) => `hero:${id}:${action}:${frame}`;
  const animation = (id, action) => `hero:${id}:${action}`;
  const selected = () => GameCharacters.normalize(Campaign.snapshot().character);
  function preload(scene) {
    const id = selected();
    for (const action of actions) {
      const count = GameCharacters.pose(id, action).frames;
      for (let i = 0; i < count; i++) scene.load.image(key(id, action, i), GameCharacters.frame(id, action, i));
    }
  }
  function prepare(scene) {
    const id = selected();
    for (const action of actions.filter(action => action !== 'idle')) {
      const name = animation(id, action);
      if (!scene.anims.exists(name)) scene.anims.create({
        key: name,
        frames: Array.from({ length: GameCharacters.pose(id, action).frames }, (_, i) => ({ key: key(id, action, i) })),
        frameRate: GameCharacters.pose(id, action).frames / GameCharacters.walkCycleSeconds,
        repeat: -1,
      });
    }
  }
  function create(scene, x, y, facing = 1) {
    const id = selected();
    const sprite = scene.add.sprite(x, y, key(id, 'idle'))
      .setOrigin(0.5, GameCharacters.footY / GameCharacters.frameHeight)
      .setScale(184 / GameCharacters.visibleHeight).setDepth(10);
    sprite.heroId = id;
    sprite.facing = facing;
    sprite.heroPose = 'idle';
    return sprite;
  }
  function update(sprite, direction, moving, onGround, speed = 220) {
    if (direction) { sprite.facing = direction; sprite.heroPose = direction < 0 ? 'walkLeft' : 'walkRight'; }
    if (moving && onGround) {
      sprite.anims.timeScale = Math.abs(speed) / 220;
      sprite.play(animation(sprite.heroId, sprite.heroPose), true);
    } else {
      sprite.anims.stop();
      const texture = key(sprite.heroId, sprite.heroPose);
      if (sprite.texture.key !== texture) sprite.setTexture(texture);
    }
  }
  return { preload, prepare, create, update };
})();
