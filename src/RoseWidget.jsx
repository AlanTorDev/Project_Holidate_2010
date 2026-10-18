import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * <CrystalRose />
 * Bông hồng pha lê hồng viền vàng 3D giữa vũ trụ (procedural, không cần file model).
 *  - Kéo chuột / vuốt để xoay, cuộn / chụm để zoom
 *  - Lúc mới tải hoa nở dần từ nụ; click / chạm nhẹ để khép rồi nở lại kèm pháo sáng
 *  - Tự xoay chậm, dừng khi đang kéo
 *
 * Cài đặt: npm i three   (cần three >= 0.150, khuyến nghị >= 0.160)
 * Next.js: thêm "use client"; ở dòng đầu file này.
 *
 * Props:
 *  height    : chiều cao container (mặc định "100%")
 *  particles : bật / tắt hạt sáng + bokeh nền (mặc định true)
 */

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/* =====================================================================
 *  Tiện ích dùng chung
 * ===================================================================== */
function outline(v, pointed) {
  if (pointed) return Math.max(0.03, Math.sin(Math.PI * Math.pow(v, 0.75)));
  const w =
    v < 0.6
      ? 0.28 + 0.72 * Math.sin((v / 0.6) * (Math.PI / 2))
      : Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.6) / 0.4, 2)));
  return Math.max(0.03, w);
}

function makeSpriteTexture() {
  const size = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}

// Nền vũ trụ gần như đen cho variant "crystal": chỉ còn chút tinh vân hồng tím rất nhạt + sao li ti
function makeCosmosTexture() {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#030208";
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = "lighter";
  const cols = ["255,70,160", "130,80,255", "255,120,200", "90,120,255"];
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const r = 160 + Math.random() * 320;
    const c = cols[i % cols.length];
    const a = 0.04 + Math.random() * 0.07;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${c},${a})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const r = Math.random() * 1.2 + 0.3;
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "255,200,230"},${0.25 + Math.random() * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeParticles({ count, rMin, rMax, size, palette, sprite, flatten = 1, opacity = 1 }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = rMin + Math.random() * (rMax - rMin);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * flatten;
    positions[i * 3 + 2] = r * Math.cos(phi);
    c.set(palette[Math.floor(Math.random() * palette.length)]);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size,
    map: sprite,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

/* =====================================================================
 *  Variant "crystal": hoa hồng pha lê hồng (như viên kim cương hồng)
 *  - Cánh hoa tròn, cong úp tự nhiên; lòng cánh là kính hồng nhạt trong mờ
 *  - Viền cánh là dải mặt cắt (facet) hồng đậm lấp lánh như đá cắt giác
 *  - Mỗi cánh có sợi dây vàng hồng mảnh chạy dọc viền, tim hoa là vòng xoắn bằng dây vàng
 *  - Hoa nở bằng cách cánh vừa xoay ra vừa cuộn mép ra ngoài (uốn cong ngay trên GPU)
 * ===================================================================== */
const GEM_VERT = `
  uniform float uBend;
  uniform float uWidth;
  uniform float uHeight;
  uniform float uOpen;
  uniform float uCupC;
  uniform float uCupO;
  uniform float uCurlC;
  uniform float uCurlO;
  uniform float uRuffle;
  uniform float uSeed;
  varying vec3 vPosV;
  varying vec2 vUv;
  void main() {
    vec3 p = position;
    if (uBend > 0.5) {
      float xn = p.x / (uWidth * 0.5);
      float v = max(p.y / uHeight, 0.0);
      float cup = mix(uCupC, uCupO, uOpen);
      float curl = mix(uCurlC, uCurlO, uOpen);
      p.z += -cup * xn * xn
           + curl * v * v * v
           + uRuffle * uOpen * sin(xn * 5.0 + v * 7.0 + uSeed * 6.28318) * v * v
           - (1.0 - uOpen) * 0.25 * uHeight * v * v;
    }
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vPosV = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const GEM_FRAG = `
  uniform float uMode;
  uniform float uSeed;
  uniform float uTime;
  uniform vec3 uBody;
  uniform vec3 uRim;
  varying vec3 vPosV;
  varying vec2 vUv;
  float h21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  vec3 h23(vec2 p) {
    return vec3(h21(p), h21(p + 17.1), h21(p + 41.7));
  }
  // môi trường studio giả (gắn với camera)
  vec3 envMap(vec3 R) {
    vec3 sky = mix(vec3(0.16, 0.12, 0.20), vec3(0.75, 0.55, 0.70), R.y * 0.5 + 0.5);
    float l1 = pow(max(dot(R, normalize(vec3(0.5, 0.8, 0.6))), 0.0), 16.0);
    float l2 = pow(max(dot(R, normalize(vec3(-0.8, 0.3, 0.5))), 0.0), 12.0);
    float l3 = pow(max(dot(R, normalize(vec3(0.0, -0.5, 0.8))), 0.0), 20.0);
    return sky * 0.6
         + l1 * vec3(1.0, 0.92, 0.95)
         + l2 * vec3(0.8, 0.9, 1.0) * 0.8
         + l3 * vec3(1.0, 0.7, 0.85) * 0.7;
  }
  void main() {
    vec3 nrm = normalize(cross(dFdx(vPosV), dFdy(vPosV)));
    vec3 V = normalize(-vPosV);
    if (dot(nrm, V) < 0.0) nrm = -nrm;

    // ---- vàng hồng (dây viền, tim xoắn ốc, cuống) ----
    if (uMode > 0.5) {
      vec3 R = reflect(-V, nrm);
      float ndv = max(dot(nrm, V), 0.0);
      vec3 gold = vec3(0.96, 0.72, 0.48);
      vec3 col = gold * (0.25 + 0.45 * ndv) + envMap(R) * gold * 0.9;
      gl_FragColor = vec4(col, 1.0);
      return;
    }

    // ---- cánh pha lê ----
    float u = abs(vUv.x * 2.0 - 1.0);
    float rimK = max(smoothstep(0.6, 0.95, u), smoothstep(0.85, 1.0, vUv.y));

    // lòng cánh: kính hồng nhạt, mặt cắt lớn
    vec2 ci = floor(vUv * vec2(5.0, 6.0)) + uSeed * 13.0;
    vec3 nf = normalize(nrm + (h23(ci) - 0.5) * 0.7);
    float ndv = max(dot(nf, V), 0.0);
    float F = pow(1.0 - ndv, 3.0);
    vec3 R = reflect(-V, nf);
    vec3 irid = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + ndv * 1.2 + uTime * 0.04));
    vec3 inner = uBody * (0.5 + 0.5 * ndv) + envMap(R) * (0.25 + 0.75 * F) * 0.7 + irid * F * 0.2;
    float aInner = 0.30 + 0.45 * F;

    // viền cánh: dải mặt cắt hồng đậm lấp lánh
    vec2 cr = floor(vec2(u * 7.0, vUv.y * 22.0)) + uSeed * 7.0;
    float fr = h21(cr);
    float fr2 = h21(cr + 3.7);
    vec3 rimCol = uRim * (0.5 + 0.9 * fr)
                + vec3(1.0, 0.9, 0.95) * step(0.82, fr2) * 0.7
                + envMap(reflect(-V, nrm)) * 0.25 * F;

    vec3 col = mix(inner, rimCol, rimK);
    float a = mix(aInner, 0.93, rimK);
    gl_FragColor = vec4(col, a);
  }
`;

function makeGemMaterial({
  mode = 0,
  seed = 0,
  uTime,
  width = 1,
  height = 1,
  bend = 1,
  cup = [0.2, 0.1],
  curl = [0, 0.3],
  ruffle = 0.03,
  body = 0xf4b8cf,
  rim = 0xdc3a74,
}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime,
      uMode: { value: mode },
      uSeed: { value: seed },
      uBend: { value: bend },
      uWidth: { value: width },
      uHeight: { value: height },
      uOpen: { value: 0 },
      uCupC: { value: cup[0] },
      uCupO: { value: cup[1] },
      uCurlC: { value: curl[0] },
      uCurlO: { value: curl[1] },
      uRuffle: { value: ruffle },
      uBody: { value: new THREE.Color(body) },
      uRim: { value: new THREE.Color(rim) },
    },
    transparent: true,
    depthWrite: mode > 0.5, // kính không ghi depth, dây vàng thì có
    side: THREE.DoubleSide,
    vertexShader: GEM_VERT,
    fragmentShader: GEM_FRAG,
  });
}

// Cánh hoa PHẲNG (chưa uốn); việc uốn cong làm trong vertex shader để animate được
function createFlatPetalGeometry(width, height, pointed = false) {
  const geo = new THREE.PlaneGeometry(1, 1, 12, 16);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * 2; // -1..1
    const v = pos.getY(i) + 0.5; // 0..1
    pos.setXYZ(i, u * outline(v, pointed) * width * 0.5, v * height, 0);
  }
  geo.computeVertexNormals();
  return geo;
}

// Sợi dây mảnh chạy dọc viền cánh (cũng phẳng, được uốn cùng cánh trong shader)
function createRimWireGeometry(width, height, radius = 0.011) {
  const N = 22;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const v = i / N;
    pts.push(new THREE.Vector3(outline(v, false) * width * 0.5, v * height, 0));
  }
  for (let i = N - 1; i >= 1; i--) {
    const v = i / N;
    pts.push(new THREE.Vector3(-outline(v, false) * width * 0.5, v * height, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
  return new THREE.TubeGeometry(curve, 120, radius, 6, true);
}

function buildGlassRose(rose) {
  const lerp = THREE.MathUtils.lerp;
  const uTime = { value: 0 };
  const groups = []; // để sắp xếp thứ tự vẽ các lớp trong suốt
  const petals = [];

  /* ----- Cánh hoa: xếp xoắn ốc (góc vàng), nhỏ ở tim → to ở ngoài ----- */
  const PETALS = 26;
  for (let i = 0; i < PETALS; i++) {
    const t = i / (PETALS - 1); // 0 = tim hoa, 1 = cánh ngoài
    const size = lerp(0.38, 1.3, Math.pow(t, 0.9));
    const width = size * lerp(1.0, 1.2, t);

    const bodyMat = makeGemMaterial({
      seed: Math.random(),
      uTime,
      width,
      height: size,
      cup: [size * lerp(0.9, 0.5, t), size * lerp(0.55, 0.2, t)],
      curl: [0, size * lerp(0.0, 0.55, Math.pow(t, 1.3))],
      ruffle: lerp(0.0, 0.05, t),
      rim: new THREE.Color(0xd23570).lerp(new THREE.Color(0xea6a9a), Math.random() * 0.6),
    });
    const wireMat = makeGemMaterial({
      mode: 1,
      uTime,
      width,
      height: size,
      cup: [size * lerp(0.9, 0.5, t), size * lerp(0.55, 0.2, t)],
      curl: [0, size * lerp(0.0, 0.55, Math.pow(t, 1.3))],
      ruffle: lerp(0.0, 0.05, t),
    });
    // dây vàng dùng cùng thông số uốn với cánh để bám sát viền
    wireMat.uniforms.uSeed.value = bodyMat.uniforms.uSeed.value;

    const body = new THREE.Mesh(createFlatPetalGeometry(width, size), bodyMat);
    const wire = new THREE.Mesh(createRimWireGeometry(width, size), wireMat);
    body.frustumCulled = false;
    wire.frustumCulled = false;
    body.add(wire);

    const pivot = new THREE.Object3D();
    pivot.position.y = lerp(0.25, -0.02, t);
    pivot.rotation.y = i * GOLDEN_ANGLE;
    body.position.z = lerp(0.04, 0.2, t);
    pivot.add(body);
    rose.add(pivot);

    groups.push({ ref: body, wire, center: new THREE.Vector3(0, size * 0.55, size * 0.15), d: 0 });
    petals.push({
      mesh: body,
      mats: [bodyMat, wireMat],
      t,
      tilt: lerp(0.08, 1.25, Math.pow(t, 1.1)),
      phase: Math.random() * Math.PI * 2,
    });
  }

  /* ----- Tim hoa: vòng xoắn bằng dây vàng ----- */
  const goldMat = () => makeGemMaterial({ mode: 1, bend: 0, uTime });
  const spiral = new THREE.Group();
  spiral.position.y = 0.55;
  const spiralPts = [];
  const TURNS = 2.4;
  for (let k = 0; k <= 90; k++) {
    const f = k / 90;
    const th = f * TURNS * Math.PI * 2;
    const r = 0.02 + 0.24 * f;
    spiralPts.push(new THREE.Vector3(r * Math.cos(th), -1.0 * r * r, r * Math.sin(th)));
  }
  const spiralMesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 240, 0.013, 6, false),
    goldMat()
  );
  spiralMesh.renderOrder = -1;
  spiral.add(spiralMesh);
  rose.add(spiral);

  /* ----- Cuống vàng + cành nhỏ ----- */
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.05, 0),
    new THREE.Vector3(0.05, -0.8, 0.05),
    new THREE.Vector3(-0.08, -1.6, -0.05),
    new THREE.Vector3(0.05, -2.6, 0),
  ]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 40, 0.04, 8, false), goldMat());
  stem.renderOrder = -1;
  rose.add(stem);

  /* ----- Lá pha lê hình oval nhọn, cuống lá bằng dây vàng ----- */
  const leafSpecs = [
    { y: -0.85, ry: 0.5, s: 0.95 },
    { y: -0.85, ry: 0.5 + Math.PI, s: 0.9 },
    { y: -1.5, ry: 1.3, s: 0.78 },
    { y: -1.5, ry: 1.3 + Math.PI, s: 0.74 },
  ];
  leafSpecs.forEach((sp) => {
    const w = 0.55 * sp.s;
    const h = 0.95 * sp.s;
    const mat = makeGemMaterial({
      seed: Math.random(),
      uTime,
      width: w,
      height: h,
      cup: [0.06, 0.06],
      curl: [0.12, 0.12],
      ruffle: 0,
      body: 0xe9bfd0,
      rim: 0xd9487f,
    });
    mat.uniforms.uOpen.value = 1;
    const leaf = new THREE.Mesh(createFlatPetalGeometry(w, h, true), mat);
    leaf.frustumCulled = false;
    const pivot = new THREE.Object3D();
    pivot.position.set(0, sp.y, 0);
    pivot.rotation.y = sp.ry;
    leaf.position.z = 0.25;
    leaf.rotation.x = 1.6;
    pivot.add(leaf);
    rose.add(pivot);
    groups.push({ ref: leaf, wire: null, center: new THREE.Vector3(0, h * 0.5, 0.05), d: 0 });

    const dir = new THREE.Vector3(Math.sin(sp.ry), 0, Math.cos(sp.ry));
    const twig = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, sp.y, 0),
      dir.clone().multiplyScalar(0.12).add(new THREE.Vector3(0, sp.y + 0.03, 0)),
      dir.clone().multiplyScalar(0.25).add(new THREE.Vector3(0, sp.y - 0.02, 0)),
    ]);
    const twigMesh = new THREE.Mesh(new THREE.TubeGeometry(twig, 16, 0.012, 6, false), goldMat());
    twigMesh.renderOrder = -1;
    rose.add(twigMesh);
  });

  // Sắp xếp thứ tự vẽ từ xa tới gần để các tấm trong suốt chồng lên nhau hiện đúng
  const tmp = new THREE.Vector3();
  const sort = (camera) => {
    for (const g of groups) {
      g.d = camera.position.distanceTo(g.ref.localToWorld(tmp.copy(g.center)));
    }
    groups
      .slice()
      .sort((a, b) => b.d - a.d)
      .forEach((g, i) => {
        g.ref.renderOrder = i * 2;
        if (g.wire) g.wire.renderOrder = i * 2 + 1;
      });
  };

  return { petals, sort, uTime, spiral };
}

/* =====================================================================
 *  Component
 * ===================================================================== */
export default function CrystalRose({ height = "100%", particles = true }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let width = mount.clientWidth || 600;
    let heightPx = mount.clientHeight || 600;

    /* ----- Scene / camera / renderer ----- */
    const scene = new THREE.Scene();
    const bgTex = makeCosmosTexture();
    scene.background = bgTex;

    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 100);
    camera.position.set(0, 0.7, 7.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, heightPx);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    /* ----- Post-processing (glow) ----- */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, heightPx), 0.5, 0.7, 0.55));
    composer.addPass(new OutputPass());

    /* ----- Rose ----- */
    const rose = new THREE.Group();
    rose.rotation.x = 0.35; // nghiêng đầu hoa về phía người xem
    scene.add(rose);
    const glass = buildGlassRose(rose);
    const petals = glass.petals;

    /* ----- Hạt sáng + bokeh nền ----- */
    const sprite = makeSpriteTexture();
    let stars = null;
    let sparkles = null;
    let bokeh = null;
    if (particles) {
      stars = makeParticles({
        count: 900,
        rMin: 5,
        rMax: 20,
        size: 0.06,
        palette: [0xffffff, 0xffc2dd, 0xaed4ff],
        sprite,
      });
      scene.add(stars);

      bokeh = makeParticles({
        count: 70,
        rMin: 3,
        rMax: 10,
        size: 0.7,
        palette: [0xff6fb5, 0xb58cff, 0x7fa8ff],
        sprite,
        opacity: 0.15,
      });
      scene.add(bokeh);

      sparkles = makeParticles({
        count: 260,
        rMin: 1.2,
        rMax: 3.2,
        size: 0.07,
        palette: [0xffffff, 0xffd1e6],
        sprite,
        flatten: 0.8,
      });
      sparkles.position.y = 0.4;
      scene.add(sparkles);
    }

    /* ----- Hiệu ứng pháo lấp lánh khi hoa nở lại ----- */
    const BURST = 140;
    const burstPos = new Float32Array(BURST * 3);
    const burstVel = new Float32Array(BURST * 3);
    const burstGeo = new THREE.BufferGeometry();
    burstGeo.setAttribute("position", new THREE.BufferAttribute(burstPos, 3));
    const burstMat = new THREE.PointsMaterial({
      size: 0.12,
      map: sprite,
      color: 0xffd0e0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const burst = new THREE.Points(burstGeo, burstMat);
    burst.frustumCulled = false;
    scene.add(burst);
    let burstLife = 0;

    function triggerBurst() {
      for (let i = 0; i < BURST; i++) {
        burstPos[i * 3] = 0;
        burstPos[i * 3 + 1] = 0.4;
        burstPos[i * 3 + 2] = 0.3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 0.8 + Math.random() * 2.2;
        burstVel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        burstVel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
        burstVel[i * 3 + 2] = Math.cos(phi) * speed;
      }
      burstGeo.attributes.position.needsUpdate = true;
      burstLife = 1;
    }

    /* ----- Điều khiển kéo thả ----- */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -0.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 10;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 1.2;

    let resumeTimer = null;
    const onStart = () => {
      controls.autoRotate = false;
      clearTimeout(resumeTimer);
    };
    const onEnd = () => {
      clearTimeout(resumeTimer);
      if (!reduceMotion) resumeTimer = setTimeout(() => (controls.autoRotate = true), 2500);
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);

    // Click nhẹ (không kéo) => khép / nở
    let bloomTarget = 1;
    let downX = 0;
    let downY = 0;
    const el = renderer.domElement;
    const onPointerDown = (e) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
        bloomTarget = bloomTarget > 0.5 ? 0 : 1;
        if (bloomTarget === 1) triggerBurst();
      }
    };
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);

    /* ----- Resize ----- */
    const ro = new ResizeObserver(() => {
      width = mount.clientWidth;
      heightPx = mount.clientHeight;
      if (!width || !heightPx) return;
      camera.aspect = width / heightPx;
      camera.updateProjectionMatrix();
      renderer.setSize(width, heightPx);
      composer.setSize(width, heightPx);
    });
    ro.observe(mount);

    /* ----- Loop ----- */
    const clock = new THREE.Clock();
    let bloomCur = reduceMotion ? 1 : 0; // lúc đầu là nụ, nở dần
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;

      // nở đều theo thời gian (~3,5 giây), khép nhanh hơn
      const d = bloomTarget - bloomCur;
      bloomCur += Math.sign(d) * Math.min(Math.abs(d), dt * (d > 0 ? 0.3 : 0.5));

      for (const p of petals) {
        // cánh ngoài nở trước, cánh trong nở sau
        const local = THREE.MathUtils.clamp(bloomCur * 1.8 - (1 - p.t) * 0.6, 0, 1);
        const x = local - 1;
        const e = 1 + 1.9 * x * x * x + 0.9 * x * x; // nở có chút nảy (overshoot) rồi lắng lại
        const open = 0.2 + 0.8 * e;
        p.mesh.rotation.x = p.tilt * open + Math.sin(time * 0.8 + p.phase) * 0.02;
        for (const m of p.mats) m.uniforms.uOpen.value = THREE.MathUtils.clamp(e, 0, 1.1);
      }

      if (!reduceMotion) {
        rose.position.y = Math.sin(time * 0.9) * 0.06;
        rose.scale.setScalar(1 + Math.sin(time * 1.3) * 0.015);
        if (stars) stars.rotation.y = time * 0.01;
        if (bokeh) bokeh.rotation.y = time * 0.02;
        if (sparkles) {
          sparkles.rotation.y = -time * 0.05;
          sparkles.material.opacity = 0.75 + Math.sin(time * 2.0) * 0.25;
        }
      }

      if (burstLife > 0) {
        burstLife -= dt * 0.7;
        for (let i = 0; i < BURST; i++) {
          burstPos[i * 3] += burstVel[i * 3] * dt;
          burstPos[i * 3 + 1] += burstVel[i * 3 + 1] * dt;
          burstPos[i * 3 + 2] += burstVel[i * 3 + 2] * dt;
          burstVel[i * 3] *= 0.985;
          burstVel[i * 3 + 1] *= 0.985;
          burstVel[i * 3 + 2] *= 0.985;
        }
        burstGeo.attributes.position.needsUpdate = true;
        burstMat.opacity = Math.max(burstLife, 0);
      }

      controls.update();
      glass.uTime.value = time;
      glass.spiral.scale.setScalar(0.4 + 0.6 * Math.min(bloomCur, 1));
      glass.sort(camera);
      composer.render();
    };
    tick();

    /* ----- Dọn dẹp ----- */
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resumeTimer);
      ro.disconnect();
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
        }
      });
      sprite.dispose();
      bgTex.dispose();
      composer.dispose?.();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [particles]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        minHeight: 360,
        overflow: "hidden",
        background: "#030208",
      }}
    >
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
