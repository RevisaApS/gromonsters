/* Rigs for the starter creatures, one per creature id. Read by living.js; see its header for every field.
   Positions are 0..1 in the 1254 x 1254 cut-out picture (x right, y down). */
window.STARTER_RIGS = {
  lamb: {
    element: 'fire', size: 0.76, offset: [-0.04, 0.03], ground: [0.45, 0.83], shadow: 0.25, strike: [0.9, 0.5], glow: 0.25,
    lash: '#1e1210',
    eyes: [
      { c: [0.493, 0.435], rx: 0.066, ry: 0.068, skin: [0.57, 0.40] },
      { c: [0.675, 0.412], rx: 0.037, ry: 0.064, skin: [0.62, 0.385] }
    ],
    bones: [
      { tag: 'tail', c: [0.23, 0.6], r: 0.09, p: [0.29, 0.62], amp: 0.1, sp: 2.4, swing: -0.2 },
      { tag: 'ear', c: [0.3, 0.44], r: 0.09, p: [0.37, 0.42], amp: 0.06, sp: 1.6, swing: 0.2 },
      { tag: 'ear', c: [0.76, 0.39], r: 0.07, p: [0.71, 0.38], amp: 0.06, sp: 1.7, ph: 1, swing: -0.15 },
      { tag: 'part', c: [0.48, 0.2], r: 0.13, ry: 0.09, p: [0.5, 0.3], amp: 0.04, sp: 1.3 },
      { tag: 'head', c: [0.53, 0.4], r: 0.3, p: [0.52, 0.58], amp: 0.025, sp: 0.9 },
      { tag: 'chest', type: 'breath', c: [0.46, 0.65], r: 0.22, p: [0.46, 0.82], amp: 0.02, sp: 1.9 },
      { type: 'shift', c: [0.53, 0.4], r: 0.3, amp: 0.012 },
      { type: 'shift', c: [0.58, 0.45], r: 0.15, amp: 0.022 },
      { tag: 'leg', c: [0.47, 0.79], r: 0.06, p: [0.46, 0.72], amp: 0 },
      { tag: 'leg', c: [0.63, 0.79], r: 0.06, p: [0.6, 0.71], amp: 0 }
    ],
    emit: [{ at: [0.5, 0.17], rate: 1.6 }, { at: [0.22, 0.57], rate: 1 }]
  },
  ram: {
    element: 'fire', size: 0.72, offset: [-0.05, 0.04], jump: 0.65, ground: [0.45, 0.93], shadow: 0.36, strike: [0.88, 0.45], glow: 0.35,
    lash: '#1a0d08',
    eyes: [
      { c: [0.63, 0.261], rx: 0.052, ry: 0.033, tilt: 0.45, skin: [0.69, 0.30] },
      { c: [0.743, 0.278], rx: 0.012, ry: 0.022, skin: [0.70, 0.30] }
    ],
    bones: [
      { tag: 'tail', c: [0.17, 0.46], r: 0.1, p: [0.24, 0.5], amp: 0.08, sp: 2, swing: -0.2 },
      { tag: 'ear', c: [0.48, 0.22], r: 0.06, p: [0.52, 0.24], amp: 0.05, sp: 1.5 },
      { tag: 'ear', c: [0.79, 0.23], r: 0.04, p: [0.76, 0.24], amp: 0.05, sp: 1.6, ph: 1 },
      { tag: 'head', c: [0.65, 0.25], r: 0.22, p: [0.6, 0.4], amp: 0.02, sp: 0.8 },
      { tag: 'chest', type: 'breath', c: [0.55, 0.5], r: 0.2, p: [0.55, 0.7], amp: 0.015, sp: 1.7 },
      { type: 'shift', c: [0.65, 0.25], r: 0.22, amp: 0.008 },
      { type: 'shift', c: [0.69, 0.28], r: 0.09, amp: 0.016 },
      { tag: 'leg', c: [0.78, 0.66], r: 0.13, p: [0.72, 0.56], amp: 0.03, sp: 1.2, swing: -0.25 }
    ],
    emit: [{ at: [0.3, 0.12], rate: 1.4 }, { at: [0.82, 0.12], rate: 1.4 }]
  },
  pup: {
    element: 'leaf', size: 0.76, offset: [-0.04, 0.03], ground: [0.48, 0.84], shadow: 0.24, strike: [0.9, 0.52], glow: 0.05,
    lash: '#1d2a10',
    eyes: [
      { c: [0.547, 0.466], rx: 0.061, ry: 0.07, lid: '#829736', lid2: '#f8ecb9' },
      { c: [0.717, 0.452], rx: 0.048, ry: 0.065, skin: [0.685, 0.385], skin2: [0.78, 0.49] }
    ],
    bones: [
      { tag: 'tail', c: [0.25, 0.5], r: 0.14, p: [0.3, 0.6], amp: 0.1, sp: 2.2, swing: -0.25 },
      { tag: 'ear', c: [0.39, 0.31], r: 0.1, p: [0.44, 0.38], amp: 0.06, sp: 1.6, swing: 0.2 },
      { tag: 'ear', c: [0.77, 0.3], r: 0.09, p: [0.74, 0.36], amp: 0.06, sp: 1.7, ph: 1, swing: -0.2 },
      { tag: 'part', c: [0.59, 0.23], r: 0.11, p: [0.61, 0.34], amp: 0.06, sp: 1.4 },
      { tag: 'head', c: [0.6, 0.45], r: 0.3, p: [0.58, 0.63], amp: 0.025, sp: 0.9 },
      { tag: 'chest', type: 'breath', c: [0.5, 0.7], r: 0.2, p: [0.5, 0.84], amp: 0.02, sp: 1.9 },
      { type: 'shift', c: [0.6, 0.45], r: 0.3, amp: 0.012 },
      { type: 'shift', c: [0.63, 0.48], r: 0.15, amp: 0.022 },
      { tag: 'leg', c: [0.48, 0.79], r: 0.06, p: [0.47, 0.72], amp: 0 },
      { tag: 'leg', c: [0.66, 0.78], r: 0.06, p: [0.64, 0.71], amp: 0 }
    ],
    emit: [{ at: [0.58, 0.17], rate: 1 }, { at: [0.24, 0.46], rate: 0.8 }]
  },
  wolf: {
    element: 'leaf', size: 0.72, offset: [-0.05, 0.04], jump: 0.65, ground: [0.5, 0.94], shadow: 0.38, strike: [0.92, 0.5], glow: 0.05,
    lash: '#152008',
    eyes: [
      { c: [0.75, 0.343], rx: 0.058, ry: 0.03, tilt: 0.6, skin: [0.73, 0.29], skin2: [0.74, 0.395] },
      { c: [0.868, 0.364], rx: 0.032, ry: 0.024, tilt: -0.5, skin: [0.86, 0.325], skin2: [0.875, 0.405] }
    ],
    bones: [
      { tag: 'tail', c: [0.17, 0.25], r: 0.2, p: [0.28, 0.42], amp: 0.06, sp: 1.6, swing: -0.15 },
      { tag: 'ear', c: [0.65, 0.1], r: 0.1, p: [0.66, 0.2], amp: 0.05, sp: 1.5 },
      { tag: 'ear', c: [0.9, 0.14], r: 0.08, p: [0.88, 0.22], amp: 0.05, sp: 1.6, ph: 1 },
      { tag: 'part', c: [0.55, 0.38], r: 0.14, p: [0.6, 0.45], amp: 0.03, sp: 1.2 },
      { tag: 'head', c: [0.78, 0.32], r: 0.2, p: [0.7, 0.48], amp: 0.02, sp: 0.8 },
      { tag: 'chest', type: 'breath', c: [0.6, 0.6], r: 0.2, p: [0.6, 0.8], amp: 0.015, sp: 1.7 },
      { type: 'shift', c: [0.78, 0.32], r: 0.2, amp: 0.008 },
      { type: 'shift', c: [0.8, 0.36], r: 0.1, amp: 0.016 },
      { tag: 'leg', c: [0.88, 0.62], r: 0.12, p: [0.8, 0.56], amp: 0.03, sp: 1.2, swing: -0.25 }
    ],
    emit: [{ at: [0.5, 0.3], rate: 1 }, { at: [0.42, 0.2], rate: 0.8 }]
  },
  manta: {
    element: 'water', size: 0.82, offset: [-0.03, -0.02], ground: [0.5, 0.86], pivot: [0.52, 0.55], shadow: 0.24, strike: [0.86, 0.55], glow: 0,
    hover: { h: 0.05, amp: 0.025, sp: 1.6, tilt: 0.04 },
    lash: '#0b1a4a',
    eyes: [
      { c: [0.518, 0.481], rx: 0.066, ry: 0.072, skin: [0.6, 0.45], skin2: [0.52, 0.565] },
      { c: [0.719, 0.474], rx: 0.045, ry: 0.064, skin: [0.66, 0.45], skin2: [0.71, 0.56] }
    ],
    bones: [
      { tag: 'part', c: [0.18, 0.6], r: 0.16, p: [0.33, 0.58], amp: 0.1, sp: 2.2, swing: -0.2 },
      { tag: 'part', c: [0.8, 0.6], r: 0.12, p: [0.7, 0.58], amp: 0.1, sp: 2.2, ph: 3.14, swing: 0.2 },
      { tag: 'ear', c: [0.42, 0.29], r: 0.07, p: [0.42, 0.36], amp: 0.05, sp: 1.5 },
      { tag: 'ear', c: [0.69, 0.29], r: 0.06, p: [0.68, 0.36], amp: 0.05, sp: 1.6, ph: 1 },
      { tag: 'tail', c: [0.24, 0.34], r: 0.12, p: [0.36, 0.45], amp: 0.1, sp: 1.8, swing: -0.2 },
      { tag: 'chest', type: 'breath', c: [0.55, 0.6], r: 0.2, p: [0.55, 0.72], amp: 0.015, sp: 1.6 },
      { type: 'shift', c: [0.6, 0.48], r: 0.25, amp: 0.012 },
      { type: 'shift', c: [0.62, 0.5], r: 0.13, amp: 0.022 }
    ],
    emit: [{ at: [0.2, 0.32], rate: 1.2 }]
  },
  narwhal: {
    element: 'water', size: 0.82, offset: [-0.06, -0.02], ground: [0.58, 0.86], pivot: [0.58, 0.55], shadow: 0.22, strike: [0.88, 0.5], glow: 0,
    hover: { h: 0.05, amp: 0.022, sp: 1.4, tilt: 0.05 },
    lash: '#0b1a4a',
    eyes: [
      { c: [0.57, 0.487], rx: 0.078, ry: 0.079, skin: [0.655, 0.47], skin2: [0.6, 0.575] },
      { c: [0.765, 0.476], rx: 0.041, ry: 0.071, skin: [0.715, 0.47], skin2: [0.765, 0.565] }
    ],
    bones: [
      { tag: 'tail', c: [0.25, 0.45], r: 0.15, p: [0.37, 0.53], amp: 0.1, sp: 2, swing: -0.2 },
      { tag: 'part', c: [0.43, 0.63], r: 0.1, p: [0.5, 0.61], amp: 0.12, sp: 2.4, swing: 0.2 },
      { tag: 'part', c: [0.81, 0.63], r: 0.06, p: [0.78, 0.6], amp: 0.12, sp: 2.4, ph: 1.5 },
      { tag: 'ear', c: [0.73, 0.33], r: 0.09, p: [0.69, 0.39], amp: 0.03, sp: 1.3 },
      { tag: 'chest', type: 'breath', c: [0.6, 0.6], r: 0.2, p: [0.6, 0.73], amp: 0.015, sp: 1.6 },
      { type: 'shift', c: [0.62, 0.5], r: 0.25, amp: 0.012 },
      { type: 'shift', c: [0.67, 0.52], r: 0.14, amp: 0.022 }
    ],
    emit: [{ at: [0.77, 0.27], rate: 1.2 }]
  }
};
