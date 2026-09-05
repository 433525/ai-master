(() => {
  "use strict";

  const PALETTES = [
    [0x6ee7f5, 0x2f75c9], [0xba9aff, 0x7148bf], [0xffce7b, 0xc96a39],
    [0x75efbd, 0x239b77], [0xff92bf, 0xb44c83], [0x94aeff, 0x4b55bc],
    [0xf2b0ff, 0x9954b8], [0x84d9ff, 0x357fb8], [0xffaa72, 0xb45158],
    [0x96f4d5, 0x368f9b],
  ];
  const STATUS = {
    completed: { color: 0x72f6e4, label: "已抵达" },
    available: { color: 0xa790ff, label: "可探索" },
    locked: { color: 0x49526e, label: "尚未解锁" },
  };
  const QUALITY = { auto: 1.35, high: 1.8, calm: 0.85 };
  // 真实恒星光谱型色温（O/B蓝 → A蓝白 → F白 → G暖黄 → K橙 → M红矮星）
  const STELLAR_SPECTRA = [0x9bb0ff, 0xaabfff, 0xf2f8ff, 0xfff4e8, 0xffd2a1, 0xff9d6f, 0xff6b4a];
  // 每个星系对应一颗主恒星色温（按章节固定，保证稳定观感）
  const PRIMARY_STELLAR = [0xfff4e8, 0xaabfff, 0xffd2a1, 0x9bb0ff, 0xff9d6f, 0xf2f8ff, 0xffd2a1, 0xaabfff, 0xfff4e8, 0xff6b4a];

  const canvas = document.querySelector("#space");
  const loading = document.querySelector("#loading");
  const errorCard = document.querySelector("#errorCard");
  const errorMessage = document.querySelector("#errorMessage");
  const panel = document.querySelector("#knowledgePanel");
  const atlasPanel = document.querySelector("#atlasPanel");
  const galaxyTitle = document.querySelector("#galaxyTitle");
  const backButton = document.querySelector("#backButton");
  const orbitHint = document.querySelector("#orbitHint");
  const planetPreview = document.querySelector("#planetPreview");
  const label = document.createElement("div");
  label.className = "star-label";
  document.body.appendChild(label);

  let renderer, scene, camera, raycaster, clock, glowTexture, spikeTexture;
  let universeGroup, galaxyGroup, skyGroup;
  let universeMap = [], planets = [], relationshipLines = [], activeGalaxy = null;
  let selectedPlanet = null, hoveredPlanet = null, mapData = null;
  let pointer = new THREE.Vector2(3, 3);
  let pointerClient = { x: -1000, y: -1000 };
  let targetRotation = { x: -0.16, y: 0.14, zoom: 118 };
  let cameraState = { x: -0.16, y: 0.14, zoom: 118 };
  let drag = null, inertia = { vx: 0, vy: 0, active: false }, raf = 0, quality = "auto", ambientAudio = false;
  let paused = false, selectedPulse = 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const orbitGeo = new THREE.RingGeometry(0.99, 1, 80);
  const sphereGeo = new THREE.SphereGeometry(1, 36, 28);
  const starGeo = new THREE.SphereGeometry(1, 18, 14);

  const planetVertex = `
    varying vec3 vNormal; varying vec3 vPosition; varying vec3 vWorldPos;
    void main(){
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const planetFragment = `
    uniform vec3 colorA; uniform vec3 colorB; uniform float time; uniform float energy;
    varying vec3 vNormal; varying vec3 vPosition; varying vec3 vWorldPos;
    // 3D simplex-like noise for terrain
    vec3 mod289(vec3 p){return p-floor(p*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 p){return p-floor(p*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    float fbm(vec3 p){
      float v = 0.0; float a = 0.5;
      for(int i = 0; i < 4; i++){ v += a * snoise(p); p *= 2.0; a *= 0.5; }
      return v;
    }
    void main(){
      // Multi-octave noise for terrain
      vec3 p = vPosition * 2.5;
      float terrain = fbm(p + vec3(time * 0.03, 0.0, 0.0));
      float detail = snoise(p * 4.0 + vec3(time * 0.05)) * 0.3;
      float mixValue = clamp(terrain * 0.6 + detail + 0.5, 0.0, 1.0);
      // Continental bands
      float bands = sin(vPosition.y * 5.0 + terrain * 2.0) * 0.15 + 0.5;
      mixValue = clamp(mixValue * 0.7 + bands * 0.3, 0.0, 1.0);
      vec3 base = mix(colorA, colorB, mixValue);
      // Rim / atmosphere edge
      float edge = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.6);
      // Specular highlight (simulated light from upper-left)
      vec3 lightDir = normalize(vec3(-0.5, 0.7, 0.5));
      float spec = pow(max(dot(normalize(vNormal), lightDir), 0.0), 16.0) * 0.25;
      // Diffuse lighting: 降低环境光基底，模拟微弱环境漫反射而非通体自发光
      float diff = max(dot(normalize(vNormal), lightDir), 0.0) * 0.45 + 0.42;
      gl_FragColor = vec4(base * diff + spec + edge * energy * 0.4, 1.0);
    }
  `;
  const atmosphereVertex = `varying vec3 vNormal; varying vec3 vPos; void main(){vNormal=normalize(normalMatrix*normal);vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
  const atmosphereFragment = `uniform vec3 glow; uniform float pulse; varying vec3 vNormal; varying vec3 vPos;
    void main(){
      float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.4);
      // Add color variation based on position for atmospheric bands
      float bands = sin(vPos.y * 8.0) * 0.05 + 0.95;
      vec3 atmColor = glow * bands;
      gl_FragColor = vec4(atmColor, rim * (0.12 + pulse * 0.2));
    }`;

  // 主恒星光球着色器：中心暖黄→外缘蓝白的柔和色阶渐变（物理：恒星临边昏暗+色温梯度）
  const starCoreVertex = `varying vec3 vNormal; varying vec3 vViewDir;
    void main(){
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }`;
  const starCoreFragment = `uniform vec3 coreColor; uniform vec3 edgeColor; uniform float time; uniform float intensity;
    varying vec3 vNormal; varying vec3 vViewDir;
    void main(){
      // 临边昏暗：视线与法线夹角越大越暗（中心亮黄→外缘过渡）
      float mu = max(dot(vNormal, vViewDir), 0.0);
      float limb = pow(mu, 1.6);
      // 柔和色阶：中心暖黄，向外过渡到淡蓝白光
      vec3 col = mix(edgeColor, coreColor, limb);
      // 轻微耀斑起伏（不做过度爆炸强光）
      float flare = 0.92 + 0.08 * sin(time * 1.3);
      // 钳制亮度防止过曝死白（HDR高光钳位）
      col *= intensity * flare;
      gl_FragColor = vec4(col, 1.0);
    }`;

  function showToast(message) {
    const toast = document.querySelector("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function createRenderer() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    // 深邃近黑色宇宙底色，带极淡冷蓝/暗紫红银河暗星云色调（物理：宇宙微波背景+暗星云吸收）
    renderer.setClearColor(0x04060f, 1);
    renderer.outputEncoding = THREE.sRGBEncoding;
    // HDR曝光控制：ACES电影色调映射，钳制高光避免中心光球过曝死白（物理：HDR tone mapping）
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    // DPI设备像素比：Electron高缩放屏不糊，同时上限防止性能崩塌
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[quality]));
    scene = new THREE.Scene();
    // 稀薄体积雾：仅远处有淡淡星云雾气，不近场白雾（指数雾，距离衰减自然）
    scene.fog = new THREE.FogExp2(0x06091a, 0.0016);
    camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 1000);
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 1.2;
    clock = new THREE.Clock();
    glowTexture = createGlowTexture();
    spikeTexture = createSpikeTexture();
    skyGroup = new THREE.Group(); universeGroup = new THREE.Group(); galaxyGroup = new THREE.Group();
    scene.add(skyGroup, universeGroup, galaxyGroup);
    buildSky();
    // 上下文重建后 renderer 是全新实例，重置尺寸守卫，确保后续 resize() 重新设置画布尺寸
    _lastW = 0; _lastH = 0; _lastDpr = 0;
    resize();
  }

  function createGlowTexture() {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = textureCanvas.height = 128;
    const context = textureCanvas.getContext("2d");
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(.12, "rgba(210,238,255,.9)");
    gradient.addColorStop(.42, "rgba(125,163,255,.28)");
    gradient.addColorStop(1, "rgba(72,107,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  // 亮星光衍射星芒纹理：中心柔光晕+4道十字衍射（物理：恒星衍射spike，仅亮星可见）
  function createSpikeTexture() {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = textureCanvas.height = 128;
    const context = textureCanvas.getContext("2d");
    context.clearRect(0, 0, 128, 128);
    const center = 64;
    // 中心柔光晕
    const halo = context.createRadialGradient(center, center, 0, center, center, 22);
    halo.addColorStop(0, "rgba(255,255,255,1)");
    halo.addColorStop(.25, "rgba(255,255,255,.55)");
    halo.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = halo;
    context.fillRect(0, 0, 128, 128);
    // 四道衍射星芒（细长渐隐）
    context.globalCompositeOperation = "lighter";
    const spikeGrad = (angle) => {
      const g = context.createLinearGradient(center - Math.cos(angle) * 64, center - Math.sin(angle) * 64, center + Math.cos(angle) * 64, center + Math.sin(angle) * 64);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(.5, "rgba(255,255,255,.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      context.strokeStyle = g;
      context.lineWidth = 1.2;
      context.beginPath();
      context.moveTo(center - Math.cos(angle) * 64, center - Math.sin(angle) * 64);
      context.lineTo(center + Math.cos(angle) * 64, center + Math.sin(angle) * 64);
      context.stroke();
    };
    spikeGrad(0); spikeGrad(Math.PI / 2); spikeGrad(Math.PI / 4); spikeGrad(-Math.PI / 4);
    context.globalCompositeOperation = "source-over";
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  // Sky star shader with per-star twinkle
  const skyStarVS = `
    attribute float size;
    attribute float phase;
    uniform float time;
    varying vec3 vColor;
    varying float vTwinkle;
    void main() {
      vColor = color;
      vTwinkle = 0.7 + 0.3 * sin(time * 1.0 + phase * 6.283);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (220.0 / max(-mvPosition.z, 1.0));
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  const skyStarFS = `
    varying vec3 vColor;
    varying float vTwinkle;
    void main() {
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      if (d > 0.5) discard;
      float alpha = 1.0 - smoothstep(0.0, 0.5, d);
      // 真实宇宙大部分恒星很暗淡，降低整体alpha避免过曝
      gl_FragColor = vec4(vColor * vTwinkle, alpha * 0.42);
    }
  `;

  function buildSky() {
    // === 1. 远场背景星（海量微弱）：极暗小点，模拟遥远星系恒星，无光晕 ===
    const farCount = reducedMotion ? 1400 : 3200;
    const farPos = new Float32Array(farCount * 3);
    const farCol = new Float32Array(farCount * 3);
    const farSize = new Float32Array(farCount);
    const farPhase = new Float32Array(farCount);
    for (let i = 0; i < farCount; i += 1) {
      const radius = 300 + Math.random() * 260;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      farPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      farPos[i * 3 + 1] = radius * Math.cos(phi);
      farPos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      // 极暗，偏冷蓝白，亮度很低
      const dim = 0.12 + Math.random() * 0.18;
      const tint = Math.random();
      farCol[i * 3] = (0.6 + tint * 0.4) * dim;
      farCol[i * 3 + 1] = (0.7 + tint * 0.3) * dim;
      farCol[i * 3 + 2] = (0.9 + tint * 0.1) * dim;
      farSize[i] = 0.4 + Math.random() * 0.5;
      farPhase[i] = Math.random();
    }
    const farGeo = new THREE.BufferGeometry();
    farGeo.setAttribute("position", new THREE.BufferAttribute(farPos, 3));
    farGeo.setAttribute("color", new THREE.BufferAttribute(farCol, 3));
    farGeo.setAttribute("size", new THREE.BufferAttribute(farSize, 1));
    farGeo.setAttribute("phase", new THREE.BufferAttribute(farPhase, 1));
    skyGroup.add(new THREE.Points(farGeo, new THREE.ShaderMaterial({
      vertexShader: skyStarVS, fragmentShader: skyStarFS,
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 } },
    })));

    // === 2. 银河系盘面（中等+亮星）：银核偏置、银盘有明暗条带、远离银核密度降低 ===
    const diskCount = reducedMotion ? 700 : 1500;
    const diskPos = new Float32Array(diskCount * 3);
    const diskCol = new Float32Array(diskCount * 3);
    const diskSize = new Float32Array(diskCount);
    const diskPhase = new Float32Array(diskCount);
    // 银盘倾角：让银河亮核斜向出现在画面中
    const diskTiltX = 0.62, diskTiltZ = 0.18;
    const cosX = Math.cos(diskTiltX), sinX = Math.sin(diskTiltX);
    const cosZ = Math.cos(diskTiltZ), sinZ = Math.sin(diskTiltZ);
    for (let i = 0; i < diskCount; i += 1) {
      // 盘面半径：中心密边缘疏（指数分布模拟银盘密度）
      const r = Math.pow(Math.random(), 0.5) * 360;
      const angle = Math.random() * Math.PI * 2;
      // 盘面厚度：薄盘，中心核球略厚
      const thickness = (r < 60 ? 22 : 10) * (Math.random() - 0.5);
      let x = Math.cos(angle) * r;
      let y = thickness;
      let z = Math.sin(angle) * r;
      // 绕X轴倾斜盘面
      let y1 = y * cosX - z * sinX;
      let z1 = y * sinX + z * cosX;
      // 绕Z轴微旋
      let x2 = x * cosZ - y1 * sinZ;
      let y2 = x * sinZ + y1 * cosZ;
      // 银核偏移到画面斜向
      x2 += 60; y2 += 30;
      diskPos[i * 3] = x2;
      diskPos[i * 3 + 1] = y2;
      diskPos[i * 3 + 2] = z1;
      // 颜色：按真实恒星光谱型色温分配，银核偏暖黄，外缘偏冷蓝
      const coreDist = Math.sqrt(x2 * x2 + y2 * y2 + z1 * z1);
      let specIdx;
      if (coreDist < 70) specIdx = 3 + Math.floor(Math.random() * 2); // 银核：G/K暖黄
      else if (coreDist < 180) specIdx = 1 + Math.floor(Math.random() * 3); // 内盘：A/F/G
      else specIdx = Math.random() < 0.6 ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 5); // 外缘：偏蓝
      const spec = new THREE.Color(STELLAR_SPECTRA[specIdx]);
      const brightness = 0.5 + Math.random() * 0.5;
      diskCol[i * 3] = spec.r * brightness;
      diskCol[i * 3 + 1] = spec.g * brightness;
      diskCol[i * 3 + 2] = spec.b * brightness;
      diskSize[i] = 0.7 + Math.random() * 1.6;
      diskPhase[i] = Math.random();
    }
    const diskGeo = new THREE.BufferGeometry();
    diskGeo.setAttribute("position", new THREE.BufferAttribute(diskPos, 3));
    diskGeo.setAttribute("color", new THREE.BufferAttribute(diskCol, 3));
    diskGeo.setAttribute("size", new THREE.BufferAttribute(diskSize, 1));
    diskGeo.setAttribute("phase", new THREE.BufferAttribute(diskPhase, 1));
    skyGroup.add(new THREE.Points(diskGeo, new THREE.ShaderMaterial({
      vertexShader: skyStarVS, fragmentShader: skyStarFS,
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 } },
    })));

    // === 3. 亮星（少量）：带衍射星芒，真实色温，大小随距离变化 ===
    const brightCount = reducedMotion ? 18 : 42;
    for (let i = 0; i < brightCount; i += 1) {
      const r = 140 + Math.random() * 280;
      const angle = Math.random() * Math.PI * 2;
      const thickness = (Math.random() - 0.5) * 30;
      let x = Math.cos(angle) * r;
      let y = thickness;
      let z = Math.sin(angle) * r;
      let y1 = y * cosX - z * sinX;
      let z1 = y * sinX + z * cosX;
      let x2 = x * cosZ - y1 * sinZ;
      let y2 = x * sinZ + y1 * cosZ;
      x2 += 60; y2 += 30;
      const spec = new THREE.Color(STELLAR_SPECTRA[Math.floor(Math.random() * STELLAR_SPECTRA.length)]);
      // 衍射星芒sprite
      const spike = new THREE.Sprite(new THREE.SpriteMaterial({
        map: spikeTexture, color: spec.getHex(), transparent: true, opacity: 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      spike.position.set(x2, y2, z1);
      const s = 6 + Math.random() * 10;
      spike.scale.set(s, s, 1);
      spike.userData = { baseOpacity: 0.85, phase: Math.random() * Math.PI * 2 };
      skyGroup.add(spike);
    }
  }

  function disposeObject(root) {
    root.traverse((object) => {
      if (object.geometry && object.geometry !== sphereGeo && object.geometry !== starGeo && object.geometry !== orbitGeo) object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => material.dispose());
    });
    root.clear();
  }

  function resetGroups() {
    disposeObject(universeGroup); disposeObject(galaxyGroup);
    universeMap = []; planets = []; relationshipLines = [];
  }

  /**
   * Build a realistic spiral galaxy particle cloud.
   * Uses logarithmic spiral arms with core bulge, density variation, and color gradient.
   */
  // Custom shader for galaxy particles: per-particle size + soft circular falloff
  const galaxyPointVS = `
    attribute float size;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (260.0 / max(-mvPosition.z, 1.0));
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  const galaxyPointFS = `
    uniform float uOpacity;
    varying vec3 vColor;
    void main() {
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      if (d > 0.5) discard;
      float alpha = 1.0 - smoothstep(0.0, 0.5, d);
      gl_FragColor = vec4(vColor, alpha * uOpacity);
    }
  `;

  function makeParticleCloud(count, color, radius, flat = false) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const baseColor = new THREE.Color(color);
    const armCount = 2 + Math.floor(Math.random() * 3); // 2-4 arms
    const armTightness = 2.5 + Math.random() * 1.5; // spiral tightness
    const coreColor = new THREE.Color(0xfff4d6).lerp(baseColor, 0.3); // warm white-gold core
    const armColor = baseColor.clone();
    const edgeColor = baseColor.clone().lerp(new THREE.Color(0x1a2a55), 0.5); // cool dark edges

    for (let i = 0; i < count; i += 1) {
      const t = Math.random();
      // Core bulge: 28% of particles concentrated in center
      const isCore = t < 0.28;
      const r = isCore
        ? Math.pow(Math.random(), 2.2) * radius * 0.22
        : Math.pow(t, 0.55) * radius;

      // Logarithmic spiral arm angle
      const arm = Math.floor(Math.random() * armCount);
      const armOffset = (arm / armCount) * Math.PI * 2;
      const spiralAngle = Math.log(r * 0.3 + 1) * armTightness + armOffset;

      // Scatter: tight in core, wider in arms
      const scatter = isCore ? 0.15 : 0.28;
      const angle = spiralAngle + (Math.random() - 0.5) * scatter * (isCore ? 1 : 2.5);

      // Vertical thickness: thin disk, slightly thicker core (galactic bulge)
      const yScale = isCore ? 0.12 : flat ? 0.05 : 0.04;
      const y = (Math.random() - 0.5) * radius * yScale * (isCore ? 2.5 : 1);

      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * r * (flat ? 0.6 : 1);

      // Color: warm core → arm color → cool edges
      const colorT = r / radius;
      let c;
      if (isCore) {
        c = coreColor.clone().lerp(armColor, Math.random() * 0.3);
      } else if (colorT < 0.5) {
        c = armColor.clone().lerp(edgeColor, colorT * 0.8);
      } else {
        c = armColor.clone().lerp(edgeColor, (colorT - 0.5) * 1.2 + 0.4);
      }
      const brightness = 0.6 + Math.random() * 0.4;
      col[i * 3] = c.r * brightness;
      col[i * 3 + 1] = c.g * brightness;
      col[i * 3 + 2] = c.b * brightness;

      // Per-particle size: bright core giants → dim arm dwarfs
      sizes[i] = isCore ? 2.0 + Math.random() * 2.5 : 0.6 + Math.random() * 1.2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return new THREE.Points(geometry, new THREE.ShaderMaterial({
      vertexShader: galaxyPointVS, fragmentShader: galaxyPointFS,
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uOpacity: { value: 0.72 } },
    }));
  }

  /**
   * Build a diffuse nebula gas cloud — soft, low-density, large radius.
   */
  function makeNebulaCloud(count, color, radius, flat = false) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const baseColor = new THREE.Color(color);
    for (let i = 0; i < count; i += 1) {
      // Smooth random distribution with slight clustering
      const r = Math.pow(Math.random(), 0.8) * radius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = flat ? (Math.random() - 0.5) * radius * 0.08 : r * Math.cos(phi) * 0.3;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) * (flat ? 0.5 : 1);
      const c = baseColor.clone().lerp(new THREE.Color(0x2a3a6a), Math.random() * 0.6);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      sizes[i] = 1.5 + Math.random() * 3.0;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return new THREE.Points(geometry, new THREE.ShaderMaterial({
      vertexShader: galaxyPointVS, fragmentShader: galaxyPointFS,
      vertexColors: true, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uOpacity: { value: 0.18 } },
    }));
  }

  function galaxyPosition(index, total) {
    const columns = 5;
    const col = index % columns;
    const row = Math.floor(index / columns);
    return new THREE.Vector3((col - 2) * 35 + (row ? 15 : 0), (row ? -18 : 14) + (index % 2 ? 2 : -2), row ? -8 : 4);
  }

  function buildUniverse() {
    resetGroups();
    mapData.galaxies.forEach((galaxy, index) => {
      const palette = PALETTES[index % PALETTES.length];
      const group = new THREE.Group();
      const position = galaxyPosition(index, mapData.galaxies.length);
      group.position.copy(position);
      // Outer nebula gas (diffuse, large, faint)
      const nebula = makeNebulaCloud(reducedMotion ? 80 : 180, palette[0], 16 + galaxy.stars.length * .3, index % 2 === 0);
      group.add(nebula);
      // Spiral arm particle cloud
      const cloud = makeParticleCloud(reducedMotion ? 190 : 430, palette[0], 9 + galaxy.stars.length * .22, index % 2 === 0);
      group.add(cloud);
      // 双层核心光晕：柔和内层+稀薄外层（降低不透明度防止过曝死白）
      const haloInner = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xfff4d6, transparent: true, opacity: .28, depthWrite: false, blending: THREE.AdditiveBlending }));
      haloInner.scale.set(10, 10, 1); group.add(haloInner);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: palette[0], transparent: true, opacity: .18, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.set(24, 24, 1); group.add(halo);
      // 主恒星光球：真实色温渐变（中心暖黄→外缘蓝白），非纯色发光球
      const stellarColor = new THREE.Color(PRIMARY_STELLAR[index % PRIMARY_STELLAR.length]);
      const coreUniforms = { coreColor: { value: stellarColor.clone() }, edgeColor: { value: stellarColor.clone().lerp(new THREE.Color(0xbfd4ff), 0.7) }, time: { value: 0 }, intensity: { value: 0.85 } };
      const core = new THREE.Mesh(new THREE.SphereGeometry(1.1, 28, 22), new THREE.ShaderMaterial({ uniforms: coreUniforms, vertexShader: starCoreVertex, fragmentShader: starCoreFragment }));
      group.add(core);
      // 稀薄日冕光晕：外层真实恒星大气，不过度爆炸式强光
      const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 18), new THREE.ShaderMaterial({
        uniforms: { glow: { value: stellarColor.clone().lerp(new THREE.Color(0xaac8ff), 0.5) }, pulse: { value: 0.15 } },
        vertexShader: atmosphereVertex, fragmentShader: atmosphereFragment, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
      }));
      group.add(coreGlow);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(11, 12, 9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.userData = { galaxy, index, hitType: "galaxy", core, cloud, halo, haloInner, coreGlow, nebula };
      group.add(hit);
      universeGroup.add(group);
      universeMap.push(hit);
    });
    targetRotation = { x: -.18, y: .15, zoom: 118 }; cameraState = { ...targetRotation };
  }

  function layoutPosition(index, count, radius) {
    const angle = index * 2.399963229728653 + .25;
    const ring = Math.sqrt((index + .45) / count);
    const r = ring * radius;
    return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle * 1.7) * r * .56, Math.sin(angle) * r * .36);
  }

  function createPlanet(star, index, count, palette) {
    const group = new THREE.Group();
    const position = layoutPosition(index, count, 21);
    group.position.copy(position);
    const state = STATUS[star.status] || STATUS.locked;
    const primary = new THREE.Color(star.status === "locked" ? 0x3c4560 : palette[0]);
    const secondary = new THREE.Color(star.status === "locked" ? 0x151b31 : palette[1]);
    // 真实恒星色温：按index分配光谱型（O/B蓝→A蓝白→F白→G暖黄→K橙→M红矮）
    const stellarTint = new THREE.Color(STELLAR_SPECTRA[(index + (star.chapter || 0)) % STELLAR_SPECTRA.length]);
    // Per-planet color variety: 向真实恒星色温偏移，降低饱和度避免通体过曝发白
    if (star.status !== "locked") {
      primary.lerp(stellarTint, 0.45);
      secondary.lerp(stellarTint.clone().multiplyScalar(0.55), 0.4);
      const hsl = {};
      primary.getHSL(hsl);
      primary.setHSL(hsl.h, Math.min(0.7, hsl.s * 0.8), Math.min(0.55, hsl.l * 0.7));
      secondary.getHSL(hsl);
      secondary.setHSL(hsl.h, Math.min(0.6, hsl.s * 0.7), Math.min(0.32, hsl.l * 0.6));
    }
    const size = .82 + (index === 0 ? .34 : 0) + Math.min(1.1, count / 15) * .12 + (Math.random() - 0.5) * .15;
    const rotSpeed = .0015 + Math.random() * .003;
    // 体积越小亮度越低（能量值随尺寸衰减），避免小星球过曝
    const baseEnergy = star.status === "completed" ? 1 : .42;
    const sizeFactor = Math.min(1, size / 1.1);
    const uniforms = { colorA: { value: primary }, colorB: { value: secondary }, time: { value: Math.random() * 7 }, energy: { value: baseEnergy * sizeFactor } };
    const core = new THREE.Mesh(sphereGeo, new THREE.ShaderMaterial({ uniforms, vertexShader: planetVertex, fragmentShader: planetFragment }));
    core.scale.setScalar(size); group.add(core);
    // Cloud layer: semi-transparent sphere slightly larger than surface
    const cloudUniforms = { time: { value: Math.random() * 5 }, opacity: { value: star.status === "locked" ? 0.04 : 0.15 }, color: { value: new THREE.Color(0xffffff).lerp(primary, 0.3) } };
    const cloudShader = `varying vec3 vNormal; varying vec3 vPos;
      float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
      void main(){vNormal=normalize(normalMatrix*normal);vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
    const cloudFrag = `uniform float time; uniform float opacity; uniform vec3 color;
      varying vec3 vNormal; varying vec3 vPos;
      float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<3;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
      void main(){
        float n=fbm(vPos*3.5+vec3(time*0.02,0.0,0.0));
        float cloud=smoothstep(0.4,0.7,n);
        float rim=pow(1.0-abs(dot(vNormal,vec3(0.,0.,1.))),2.0);
        gl_FragColor=vec4(color,cloud*opacity*(0.6+rim*0.4));
      }`;
    const clouds = new THREE.Mesh(sphereGeo, new THREE.ShaderMaterial({ uniforms: cloudUniforms, vertexShader: cloudShader, fragmentShader: cloudFrag, transparent: true, depthWrite: false, blending: THREE.NormalBlending }));
    clouds.scale.setScalar(size * 1.06); group.add(clouds);
    const atmosphere = new THREE.Mesh(sphereGeo, new THREE.ShaderMaterial({ uniforms: { glow: { value: new THREE.Color(state.color) }, pulse: { value: star.status === "completed" ? 1 : .25 } }, vertexShader: atmosphereVertex, fragmentShader: atmosphereFragment, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
    atmosphere.scale.setScalar(size * 1.15); group.add(atmosphere);
    const orbit = new THREE.Mesh(orbitGeo, new THREE.MeshBasicMaterial({ color: state.color, transparent: true, opacity: star.status === "locked" ? .08 : .32, side: THREE.DoubleSide, depthWrite: false }));
    orbit.scale.set(size * (1.55 + Math.random() * .5), size * (.42 + Math.random() * .15), 1); orbit.rotation.x = Math.PI * .5; orbit.rotation.z = Math.random() * .6; group.add(orbit);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(size * 1.9, 12, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.userData = { hitType: "planet", star, core, atmosphere, clouds, cloudUniforms, orbit, uniforms, state, index, position: position.clone(), group, rotSpeed };
    group.add(hit); planets.push(hit);
    return group;
  }

  function buildRelationshipLines(galaxy, positions, color) {
    const segments = []; const kinds = [];
    galaxy.connections.forEach(([a, b, kind]) => {
      if (!positions[a] || !positions[b]) return;
      segments.push(positions[a].x, positions[a].y, positions[a].z, positions[b].x, positions[b].y, positions[b].z);
      kinds.push({ a, b, kind });
    });
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(segments, 3));
    // 知识关联线：稀薄星云丝状弱光，低亮度不抢天体焦点
    const base = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .06, depthWrite: false }));
    galaxyGroup.add(base);
    relationshipLines.push({ line: base, links: kinds });
  }

  function buildGalaxy(galaxy) {
    resetGroups(); activeGalaxy = galaxy;
    document.body.dataset.view = "galaxy";
    atlasPanel.classList.add("hidden"); backButton.classList.add("show"); galaxyTitle.classList.add("show"); orbitHint.classList.add("galaxy");
    document.querySelector("#galaxyTitle p").textContent = galaxy.name_en;
    document.querySelector("#galaxyTitle h2").textContent = galaxy.name;
    document.querySelector("#galaxyTitle span").textContent = `${galaxy.progress}% EXPLORED`;
    const palette = PALETTES[(galaxy.chapter - 1) % PALETTES.length];
    const color = new THREE.Color(palette[0]);
    // Outer diffuse nebula
    const outerNebula = makeNebulaCloud(reducedMotion ? 120 : 350, color, 42, false);
    outerNebula.material.uniforms.uOpacity.value = .12; galaxyGroup.add(outerNebula);
    // Spiral arm atmosphere
    const atmosphere = makeParticleCloud(reducedMotion ? 230 : 620, color, 29, false);
    atmosphere.material.uniforms.uOpacity.value = .14; galaxyGroup.add(atmosphere);
    // 中心恒星光晕双层：柔和不爆炸（降低不透明度防止过曝）
    const coreGlowInner = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xfff4d6, transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending }));
    coreGlowInner.scale.set(12, 12, 1); galaxyGroup.add(coreGlowInner);
    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending }));
    coreGlow.scale.set(25, 25, 1); galaxyGroup.add(coreGlow);
    // 中心主恒星光球：真实色温渐变 + 稀薄日冕
    const stellarColor = new THREE.Color(PRIMARY_STELLAR[(galaxy.chapter - 1) % PRIMARY_STELLAR.length]);
    const coreUniforms = { coreColor: { value: stellarColor.clone() }, edgeColor: { value: stellarColor.clone().lerp(new THREE.Color(0xbfd4ff), 0.7) }, time: { value: 0 }, intensity: { value: 0.9 } };
    const coreStar = new THREE.Mesh(new THREE.SphereGeometry(1.6, 32, 24), new THREE.ShaderMaterial({ uniforms: coreUniforms, vertexShader: starCoreVertex, fragmentShader: starCoreFragment }));
    galaxyGroup.add(coreStar);
    const coreCorona = new THREE.Mesh(new THREE.SphereGeometry(2.4, 28, 20), new THREE.ShaderMaterial({
      uniforms: { glow: { value: stellarColor.clone().lerp(new THREE.Color(0xaac8ff), 0.5) }, pulse: { value: 0.2 } },
      vertexShader: atmosphereVertex, fragmentShader: atmosphereFragment, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
    }));
    galaxyGroup.add(coreCorona);
    // Store references for animation
    galaxyGroup.userData = { outerNebula, coreGlowInner, coreStar, coreCorona, coreUniforms };
    const positions = [];
    galaxy.stars.forEach((star, index) => { const planet = createPlanet(star, index, galaxy.stars.length, palette); positions.push(planet.position); galaxyGroup.add(planet); });
    buildRelationshipLines(galaxy, positions, color);
    // Flat dust disk
    const dust = makeParticleCloud(reducedMotion ? 90 : 250, color, 35, true); dust.material.uniforms.uOpacity.value = .22; galaxyGroup.add(dust);
    targetRotation = { x: -.14, y: .15, zoom: 48 }; cameraState = { ...targetRotation };
  }

  function backToUniverse() {
    activeGalaxy = null; selectedPlanet = null; hoveredPlanet = null; panel.classList.remove("show"); label.classList.remove("show");
    document.body.dataset.view = "universe"; atlasPanel.classList.remove("hidden"); backButton.classList.remove("show"); galaxyTitle.classList.remove("show"); orbitHint.classList.remove("galaxy");
    buildUniverse();
  }

  function setPanel(hit) {
    selectedPlanet = hit; selectedPulse = 0;
    const { star, state } = hit.userData;
    panel.classList.add("show");
    document.querySelector("#panelCode").textContent = `CHAPTER ${String(star.chapter).padStart(2, "0")} / STAR ${String(star.index + 1).padStart(2, "0")}`;
    document.querySelector("#panelTitle").textContent = star.title;
    document.querySelector("#panelDesc").textContent = star.desc || "这颗星球正在等待你的探索。";
    planetPreview.style.setProperty("--planet-color", `#${new THREE.Color(state.color).getHexString()}`);
    planetPreview.style.background = `radial-gradient(circle at 35% 30%,#fff,#${new THREE.Color(state.color).getHexString()} 12%,#353478 48%,#10142f 73%)`;
    const relation = relatedPlanets(hit).slice(0, 4);
    document.querySelector("#relationList").innerHTML = relation.length ? relation.map((item) => `<span>${item.userData.star.title}</span>`).join("") : "<span>知识网络建立中</span>";
    const learn = document.querySelector("#learnButton");
    learn.href = star.url;
    learn.classList.toggle("locked", star.status === "locked");
    learn.innerHTML = star.status === "locked" ? "等待前置星球解锁" : "进入知识学习 <span>→</span>";
  }

  function relatedPlanets(hit) {
    const related = new Set();
    relationshipLines.forEach(({ links }) => links.forEach((link) => {
      if (link.a === hit.userData.index) related.add(link.b);
      if (link.b === hit.userData.index) related.add(link.a);
    }));
    return [...related].map((index) => planets.find((planet) => planet.userData.index === index)).filter(Boolean);
  }

  function updateFocus() {
    if (!activeGalaxy) return;
    const neighbors = selectedPlanet ? new Set(relatedPlanets(selectedPlanet)) : null;
    planets.forEach((planet) => {
      const isSelected = planet === selectedPlanet;
      const isNeighbor = neighbors && neighbors.has(planet);
      const isFaded = selectedPlanet && !isSelected && !isNeighbor;
      planet.userData.core.material.uniforms.energy.value = isSelected ? 1.5 : isNeighbor ? .86 : isFaded ? .15 : planet.userData.star.status === "completed" ? 1 : .46;
      planet.userData.atmosphere.material.uniforms.pulse.value = isSelected ? 1.1 : isNeighbor ? .58 : isFaded ? .04 : .24;
      planet.userData.orbit.material.opacity = isSelected ? .78 : isNeighbor ? .44 : isFaded ? .025 : planet.userData.star.status === "locked" ? .08 : .32;
      if (planet.userData.cloudUniforms) planet.userData.cloudUniforms.opacity.value = isSelected ? .28 : isNeighbor ? .16 : isFaded ? .02 : planet.userData.star.status === "locked" ? .04 : .15;
    });
    relationshipLines.forEach(({ line, links }) => {
      const related = selectedPlanet && links.some((link) => link.a === selectedPlanet.userData.index || link.b === selectedPlanet.userData.index);
      line.material.opacity = selectedPlanet ? (related ? .32 : .02) : .06;
    });
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointerClient = { x: event.clientX, y: event.clientY };
    raycaster.setFromCamera(pointer, camera);
    return activeGalaxy ? raycaster.intersectObjects(planets, false)[0] : raycaster.intersectObjects(universeMap, false)[0];
  }

  function updateHover(event) {
    if (drag) return;
    const result = pick(event); const next = result?.object || null;
    if (hoveredPlanet === next) return;
    hoveredPlanet = next;
    if (activeGalaxy && next?.userData?.hitType === "planet") {
      label.textContent = next.userData.star.title; label.style.left = `${Math.min(event.clientX + 13, innerWidth - 210)}px`; label.style.top = `${Math.max(18, event.clientY)}px`; label.classList.add("show"); canvas.style.cursor = "pointer";
    } else if (!activeGalaxy && next?.userData?.hitType === "galaxy") {
      label.textContent = next.userData.galaxy.name; label.style.left = `${Math.min(event.clientX + 13, innerWidth - 180)}px`; label.style.top = `${Math.max(18, event.clientY)}px`; label.classList.add("show"); canvas.style.cursor = "pointer";
    } else { label.classList.remove("show"); canvas.style.cursor = drag ? "grabbing" : "grab"; }
  }

  function onPointerDown(event) {
    drag = { x: event.clientX, y: event.clientY, rotationX: targetRotation.x, rotationY: targetRotation.y, moved: false, lastX: event.clientX, lastY: event.clientY, lastT: performance.now(), vx: 0, vy: 0 };
    inertia.active = false;
    try { canvas.setPointerCapture?.(event.pointerId); } catch (e) { /* 某些环境pointerId无效时忽略，不影响拖拽/点击 */ }
    canvas.style.cursor = "grabbing";
  }
  function onPointerMove(event) {
    if (drag) {
      const dx = event.clientX - drag.x; const dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      targetRotation.y = drag.rotationY + dx * .006; targetRotation.x = Math.max(-.85, Math.min(.85, drag.rotationX + dy * .004));
      // Track velocity for momentum
      const now = performance.now();
      const ddx = event.clientX - drag.lastX; const ddy = event.clientY - drag.lastY;
      const dt = Math.max(1, now - drag.lastT);
      drag.vx = ddx / dt; drag.vy = ddy / dt;
      drag.lastX = event.clientX; drag.lastY = event.clientY; drag.lastT = now;
    } else updateHover(event);
  }
  function onPointerUp(event) {
    const wasDrag = drag?.moved;
    // Transfer velocity to inertia for momentum effect
    if (wasDrag && drag.vx !== undefined) {
      inertia.vx = drag.vx * .012; inertia.vy = drag.vy * .008;
      inertia.active = Math.abs(inertia.vx) > .0005 || Math.abs(inertia.vy) > .0005;
    }
    drag = null; canvas.style.cursor = "grab";
    if (wasDrag) return;
    const result = pick(event); if (!result) { if (activeGalaxy) { selectedPlanet = null; panel.classList.remove("show"); updateFocus(); } return; }
    const hit = result.object;
    if (hit.userData.hitType === "galaxy") buildGalaxy(hit.userData.galaxy);
    if (hit.userData.hitType === "planet") { setPanel(hit); updateFocus(); }
  }
  function onWheel(event) { event.preventDefault(); inertia.active = false; targetRotation.zoom = Math.max(activeGalaxy ? 28 : 74, Math.min(activeGalaxy ? 78 : 168, targetRotation.zoom + event.deltaY * .035)); }

  let _lastW = 0, _lastH = 0, _lastDpr = 0;
  function resize() {
    if (!renderer) return;
    const dpr = Math.min(devicePixelRatio || 1, QUALITY[quality]);
    // 尺寸与像素比未变化时跳过：防止 ResizeObserver 与 setSize 互相触发造成冗余调用
    if (innerWidth === _lastW && innerHeight === _lastH && dpr === _lastDpr) return;
    _lastW = innerWidth; _lastH = innerHeight; _lastDpr = dpr;
    // 顺序关键：先设像素比再设尺寸——three.js 中 setPixelRatio 仅对下一次 setSize 生效。
    // 否则 Electron 页面切换后不触发 resize 事件时，canvas 保持 300x150 默认分辨率被 CSS 拉伸发虚
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight);
  }

  function updateCamera() {
    // Apply inertia momentum
    if (inertia.active) {
      targetRotation.y += inertia.vx;
      targetRotation.x = Math.max(-.85, Math.min(.85, targetRotation.x + inertia.vy));
      inertia.vx *= .93; inertia.vy *= .93;
      if (Math.abs(inertia.vx) < .0002 && Math.abs(inertia.vy) < .0002) inertia.active = false;
    }
    // Spring-like camera easing: critically-damped lerp with slightly higher factors
    const t = reducedMotion ? .15 : .085;
    cameraState.x += (targetRotation.x - cameraState.x) * t;
    cameraState.y += (targetRotation.y - cameraState.y) * t;
    cameraState.zoom += (targetRotation.zoom - cameraState.zoom) * .09;
    const z = cameraState.zoom; const x = z * Math.sin(cameraState.y) * Math.cos(cameraState.x); const y = z * Math.sin(cameraState.x); const zz = z * Math.cos(cameraState.y) * Math.cos(cameraState.x);
    camera.position.set(x, y, zz); camera.lookAt(0, 0, 0);
  }

  function animate() {
    raf = requestAnimationFrame(animate);
    if (!renderer || document.hidden || paused) return;
    const time = clock.getElapsedTime();
    updateCamera();
    // 极缓慢自转：几乎肉眼难以察觉（真实星系自转周期极长）
    skyGroup.rotation.y += reducedMotion ? .000005 : .000018;
    // 更新两层背景星的闪烁时间
    skyGroup.children.forEach((child) => {
      if (child.material && child.material.uniforms && child.material.uniforms.time) child.material.uniforms.time.value = time;
      else if (child.userData && child.userData.baseOpacity !== undefined) child.material.opacity = child.userData.baseOpacity * (0.75 + 0.25 * Math.sin(time * 1.5 + child.userData.phase));
    });
    if (!activeGalaxy) {
      universeMap.forEach((hit, index) => {
        const { core, cloud, halo, haloInner, coreGlow, nebula } = hit.userData;
        cloud.rotation.y += .0012;
        if (nebula) nebula.rotation.y += .0006;
        core.scale.setScalar(.9 + Math.sin(time * .8 + index) * .12);
        if (core.material.uniforms && core.material.uniforms.time) core.material.uniforms.time.value = time + index;
        if (haloInner) haloInner.material.opacity = .22 + Math.sin(time * .9 + index) * .05;
        halo.material.opacity = .14 + Math.sin(time * .65 + index) * .025;
        if (coreGlow) coreGlow.scale.setScalar(1 + Math.sin(time * .5 + index * 0.7) * .1);
      });
      universeGroup.rotation.y += reducedMotion ? 0 : .00014;
    } else {
      galaxyGroup.rotation.y += reducedMotion ? 0 : .00035;
      // Animate galaxy-level effects
      if (galaxyGroup.userData.outerNebula) galaxyGroup.userData.outerNebula.rotation.y += .0003;
      if (galaxyGroup.userData.coreGlowInner) galaxyGroup.userData.coreGlowInner.material.opacity = .26 + Math.sin(time * 1.1) * .06;
      if (galaxyGroup.userData.coreUniforms) galaxyGroup.userData.coreUniforms.time.value = time;
      if (galaxyGroup.userData.coreCorona) {
        galaxyGroup.userData.coreCorona.scale.setScalar(1 + Math.sin(time * 0.6) * 0.05);
        galaxyGroup.userData.coreCorona.material.uniforms.pulse.value = 0.18 + Math.sin(time * 0.8) * 0.05;
      }
      planets.forEach((planet, index) => {
        const { core, atmosphere, clouds, cloudUniforms, orbit, uniforms, rotSpeed } = planet.userData;
        uniforms.time.value = time + index * .2; core.rotation.y += rotSpeed; atmosphere.rotation.y -= rotSpeed * .5; orbit.rotation.z += .002;
        if (clouds) { cloudUniforms.time.value = time + index * .15; clouds.rotation.y += rotSpeed * .7; }
        if (planet === selectedPlanet) { const scale = 1 + Math.sin(time * 2.4) * .075; planet.scale.setScalar(scale); } else planet.scale.lerp(new THREE.Vector3(1, 1, 1), .12);
      });
      if (selectedPlanet) { selectedPulse += .05; selectedPlanet.userData.orbit.rotation.z += .009; }
    }
    renderer.render(scene, camera);
  }

  async function loadUniverse() {
    loading.classList.remove("hide"); errorCard.classList.remove("show");
    try {
      const response = await fetch("../data/knowledge-universe.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`服务器返回 ${response.status}`);
      const payload = await response.json(); if (!payload.success || !Array.isArray(payload.galaxies)) throw new Error("星图数据格式无效");
      mapData = payload; document.querySelector("#galaxyCount").textContent = payload.summary.galaxies; document.querySelector("#starCount").textContent = payload.summary.stars; document.querySelector("#completedCount").textContent = payload.summary.completed;
      buildUniverse(); loading.classList.add("hide");
    } catch (error) {
      console.error("Knowledge universe failed to load", error); errorMessage.textContent = error.message || "本地星图服务未响应。"; errorCard.classList.add("show"); loading.classList.add("hide");
    }
  }

  function initControls() {
    canvas.addEventListener("pointerdown", onPointerDown); canvas.addEventListener("pointermove", onPointerMove); canvas.addEventListener("pointerup", onPointerUp); canvas.addEventListener("pointercancel", () => { drag = null; inertia.active = false; }); canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", resize, { passive: true });
    // 页面从后台/其他页切回时主动刷新尺寸：Electron loadFile 导航不触发 resize 事件，
    // 且窗口跨显示器移动后 devicePixelRatio 可能变化（如 100%↔150% 缩放屏）
    document.addEventListener("visibilitychange", () => {
      paused = document.hidden;
      if (!document.hidden) resize();
    });
    // ResizeObserver 兜底：Electron 侧栏/面板等布局变化未伴随 window resize 时也能校正
    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(canvas);
    }
    backButton.addEventListener("click", backToUniverse); document.querySelector("#homeButton").addEventListener("click", backToUniverse); document.querySelector("#dashboardButton").addEventListener("click", () => location.assign("../dashboard/index.html")); document.querySelector("#panelClose").addEventListener("click", () => { selectedPlanet = null; panel.classList.remove("show"); updateFocus(); }); document.querySelector("#retryButton").addEventListener("click", () => { errorCard.classList.remove("show"); paused = false; loadUniverse(); });
    document.querySelector("#qualityButton").addEventListener("click", (event) => { quality = quality === "auto" ? "high" : quality === "high" ? "calm" : "auto"; event.currentTarget.textContent = `画质 / ${quality.toUpperCase()}`; resize(); showToast(quality === "calm" ? "已切换至轻量星图" : "星图画质已更新"); });
    document.querySelector("#musicButton").addEventListener("click", async (event) => { const audio = document.querySelector("#bgm"); try { if (ambientAudio) { audio.pause(); ambientAudio = false; } else { await audio.play(); ambientAudio = true; } event.currentTarget.textContent = `声音 / ${ambientAudio ? "ON" : "OFF"}`; } catch { showToast("浏览器需要一次点击后才能播放声音"); } });
    document.querySelector("#listenButton").addEventListener("click", () => { if (!selectedPlanet) return; if (!("speechSynthesis" in window)) { showToast("当前浏览器不支持语音朗读"); return; } speechSynthesis.cancel(); const text = `${selectedPlanet.userData.star.title}。${selectedPlanet.userData.star.desc}`; const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "zh-CN"; utterance.rate = .92; speechSynthesis.speak(utterance); });
    window.addEventListener("keydown", (event) => { if (event.key === "Escape") { if (panel.classList.contains("show")) { selectedPlanet = null; panel.classList.remove("show"); updateFocus(); } else if (activeGalaxy) backToUniverse(); } });
    canvas.addEventListener("webglcontextlost", (event) => { event.preventDefault(); paused = true; errorMessage.textContent = "星图图形上下文被系统暂停。点击重新连接即可恢复。"; errorCard.classList.add("show"); });
    canvas.addEventListener("webglcontextrestored", () => { paused = false; errorCard.classList.remove("show"); createRenderer(); loadUniverse(); });
  }

  if (!window.THREE) { errorMessage.textContent = "本地 Three.js 资源缺失，无法绘制星图。"; errorCard.classList.add("show"); loading.classList.add("hide"); return; }
  try {
    createRenderer();
    // 首次尺寸设置：createRenderer 只设了像素比未设尺寸，canvas 默认 300x150 会被拉伸发虚。
    // 多次校正以覆盖 Electron 导航后布局/DPR 延迟结算：立即一次、下一帧一次、300ms 后再兜底一次
    resize();
    requestAnimationFrame(() => requestAnimationFrame(resize));
    setTimeout(resize, 300);
    initControls(); loadUniverse(); animate();
  } catch (error) { console.error(error); errorMessage.textContent = "浏览器未能初始化 WebGL 星图。"; errorCard.classList.add("show"); loading.classList.add("hide"); }
})();
