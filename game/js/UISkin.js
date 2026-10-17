// Production UI artwork. Only the middle sections stretch; ornaments keep their proportions.
const UI_SKIN_FILES = {
  goal: 'goal', workshop: 'workshop', confirm: 'confirm', card: 'card',
  panel: 'panel', dialogue: 'dialogue', notice: 'notice',
};
const UI_HEADING_FONT = '"KaiTi","STKaiti","Microsoft YaHei",serif';

function loadUISkin(scene) {
  Object.keys(UI_SKIN_FILES).forEach(key => scene.load.image('skin_' + key,
    'map-assets/UI_RUNTIME/skin-' + key + '.png?v=1'));
}

function prepareUISkin(scene) {
  // Trim transparent padding for predictable layout, without modifying source artwork.
  Object.keys(UI_SKIN_FILES).forEach(key => {
    const texture = scene.textures.get('skin_' + key), source = texture.getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = source.width; canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let l = canvas.width, t = canvas.height, r = 0, b = 0;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 32) {
        l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
      }
    }
    texture.add('art', 0, l, t, r - l + 1, b - t + 1);
    if (key === 'card') texture.add('paper', 0, l + Math.round((r - l) * 0.3), t + Math.round((b - t) * 0.3),
      Math.round((r - l) * 0.4), Math.round((b - t) * 0.4));
    if (key === 'confirm') {
      const w = r - l + 1, h = b - t + 1;
      texture.add('gold', 0, l + Math.round(w * 0.151), t + Math.round(h * 0.808), Math.round(w * 0.321), Math.round(h * 0.133));
      texture.add('teal', 0, l + Math.round(w * 0.531), t + Math.round(h * 0.808), Math.round(w * 0.321), Math.round(h * 0.133));
    }
  });
}

function skinImage(scene, key, x, y, w, h) {
  const image = scene.add.image(x, y, 'skin_' + key, 'art');
  return image.setScale(Math.min(w / image.width, h / image.height));
}

function skinFrame(scene, key, x, y, w, h, options = {}) {
  if (key === 'card') return skinCardFrame(scene, x, y, w, h, options);
  const texture = scene.textures.get('skin_' + key), art = texture.get(options.frame || 'art');
  const cuts = options.cuts || [0.18, 0.18, 0.25, 0.24];
  const sx = [0, Math.round(art.width * cuts[0]), Math.round(art.width * (1 - cuts[1])), art.width];
  const sy = [0, Math.round(art.height * cuts[2]), Math.round(art.height * (1 - cuts[3])), art.height];
  const root = scene.add.container(x, y), parts = [];
  const prefix = (options.frame || 'art') + '_' + cuts.join('_');
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const id = prefix + '_' + row + '_' + col;
    if (!texture.has(id)) texture.add(id, 0, art.cutX + sx[col], art.cutY + sy[row], sx[col + 1] - sx[col], sy[row + 1] - sy[row]);
    const image = scene.add.image(0, 0, texture.key, id).setOrigin(0);
    if (options.hollow && row === 1 && col === 1) image.setVisible(false);
    root.add(image); parts.push(image);
  }
  root.resize = (width, height) => {
    const scale = Math.min(options.scale || 0.5, width / art.width, height / art.height);
    const dx = [0, sx[1] * scale, width - (art.width - sx[2]) * scale, width];
    const dy = [0, sy[1] * scale, height - (art.height - sy[2]) * scale, height];
    parts.forEach((image, i) => {
      const row = Math.floor(i / 3), col = i % 3;
      image.setPosition(dx[col], dy[row]).setDisplaySize(dx[col + 1] - dx[col], dy[row + 1] - dy[row]);
    });
    return root;
  };
  return root.resize(w, h);
}

// Five strips in each direction keep the four central jewels undistorted as well as corners.
function skinCardFrame(scene, x, y, w, h, options) {
  const texture = scene.textures.get('skin_card'), art = texture.get('art');
  const fractions = [0, 0.2, 0.44, 0.56, 0.8, 1];
  const sx = fractions.map(n => Math.round(n * art.width));
  const sy = fractions.map(n => Math.round(n * art.height));
  const root = scene.add.container(x, y), parts = [];
  const paper = options.hollow ? null : scene.add.image(0, 0, texture.key, 'paper').setOrigin(0);
  if (paper) root.add(paper);
  for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
    if (row > 0 && row < 4 && col > 0 && col < 4) continue;
    const id = 'fixed_' + row + '_' + col;
    if (!texture.has(id)) texture.add(id, 0, art.cutX + sx[col], art.cutY + sy[row], sx[col + 1] - sx[col], sy[row + 1] - sy[row]);
    const image = scene.add.image(0, 0, texture.key, id).setOrigin(0);
    root.add(image); parts.push({ image, row, col });
  }
  root.resize = (width, height) => {
    const scale = Math.min(options.scale || 0.25, width / art.width, height / art.height);
    const axis = (size, original) => [0, original * 0.2 * scale, size / 2 - original * 0.06 * scale,
      size / 2 + original * 0.06 * scale, size - original * 0.2 * scale, size];
    const dx = axis(width, art.width), dy = axis(height, art.height);
    if (paper) paper.setPosition(dx[1], dy[1]).setDisplaySize(dx[4] - dx[1], dy[4] - dy[1]);
    parts.forEach(({ image, row, col }) => image.setPosition(dx[col], dy[row])
      .setDisplaySize(dx[col + 1] - dx[col], dy[row + 1] - dy[row]));
    return root;
  };
  return root.resize(w, h);
}

function fitUIText(text, width, height, preferred = 25, minimum = 18) {
  text.setFontSize(preferred);
  while ((text.width > width || text.height > height) && parseInt(text.style.fontSize, 10) > minimum)
    text.setFontSize(parseInt(text.style.fontSize, 10) - 1);
  return text;
}
