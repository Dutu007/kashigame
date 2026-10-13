// 用户于 2026-10-13 确认的完整校准参数；游戏和调整工具共用。
const LAMP_ASSEMBLY_LAYOUT = {
  tool: 'lamp-assembly-layout', version: 1, coordinateSpace: 'game-1920x1080', origin: [0.5, 0.5], bodyFrame: 7,
  textures: { body: 'POTTERY_FORMING', spout: 'POTTERY_LAMP_SPOUT_RAW', handle: 'POTTERY_LAMP_HANDLE_RAW' },
  parts: {
    body: { x: 745.96, y: 595.95, width: 500, height: 500, rotationDeg: 0, layer: 0, rotation: 0, flipX: false },
    spout: { x: 969.46, y: 608.1, width: 190, height: 190, rotationDeg: -27.9, layer: 1, rotation: -0.4869, flipX: false },
    handle: { x: 547.95, y: 610.01, width: 170, height: 150, rotationDeg: -52.3, layer: 2, rotation: -0.9128000000000001, flipX: false },
  },
  seams: {
    version: 2, method: 'feather', enabled: true, colorEnabled: true,
    colors: { spout: { brightness: 0.74, saturation: 1 }, handle: { brightness: 1, saturation: 1 } },
    coordinateSpace: 'part-normalized', blurUnit: 'game-pixel',
    regions: [
      { part: 'spout', x: 0.2002923633754354, y: 0.49025321947137734, rx: 0.21052631578947367, ry: 0.39473684210526316,
        blur: 10, opacity: 0.7, feather: 0.01, edgeStrength: 0.4, edgeFeather: 0.3 },
      { part: 'handle', x: 0.3378565459033885, y: 0.7089243586699698, rx: 0.20588235294117646, ry: 0.16666666666666666,
        blur: 20, opacity: 0.9, feather: 0.9, edgeStrength: 0.7, edgeFeather: 0.3 },
      { part: 'handle', x: 0.7186218375055734, y: 0.6923989389599486, rx: 0.23529411764705882, ry: 0.16666666666666666,
        blur: 20, opacity: 0.9, feather: 0.9, edgeStrength: 0.7, edgeFeather: 0.3 },
    ],
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = LAMP_ASSEMBLY_LAYOUT;
