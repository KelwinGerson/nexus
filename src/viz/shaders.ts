const noiseLib = /* glsl */ `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`

export const lineVertex = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec3 aNormal;
  attribute vec3 aBinormal;
  attribute vec3 aTangent;
  attribute float aT;
  attribute float aAngle;

  uniform float uRadius;
  uniform float uTime;
  uniform float uIrregular;
  uniform float uJoin;
  uniform float uTip;
  uniform float uKind;
  uniform float uBreath;

  varying float vT;
  varying float vAngle;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldTangent;

  ${noiseLib}

  void main() {
    vT = aT;
    vAngle = aAngle;
    vUv = vec2(aAngle / 6.2831853, aT * 3.6);

    float breath = 1.0 + uBreath * sin(uTime * 0.85 + aT * 3.2);
    float along = pow(clamp(aT, 0.0, 1.0), 0.55);
    float taper = mix(uJoin, uTip, along);

    if (uKind < 0.5) {
      float h = aCenter.y + 2.16;
      float above = smoothstep(-0.12, 0.04, h);
      float buttress = exp(-max(h, 0.0) * 2.15);
      float flare = 1.0 + 1.55 * buttress * above;
      float lobe = 1.0 + 0.26 * buttress * above * (0.45 + 0.55 * sin(aAngle * 3.0 + 0.5));
      float crown = mix(1.0, 0.26, smoothstep(0.62, 1.0, aT));
      taper = flare * lobe * crown;
    }

    float tip = smoothstep(0.84, 1.0, aT);
    float root = 1.0 - smoothstep(0.0, 0.05, aT);
    if (uKind > 0.5 && uKind < 1.5) {
      taper *= 1.0 - tip * 0.9;
    }
    if (uKind > 1.5 && uKind < 2.5) {
      taper *= 1.0 - tip * 0.96;
    }

    float plates = pow(abs(sin(aAngle * 3.2 + fbm(vec2(aT * 2.4, aAngle)) * 2.1)), 1.6);
    float bark = (fbm(vec2(aT * 7.0, aAngle * 1.6)) - 0.5) * 0.2;
    float furrow = plates * 0.16;
    float wobble = 1.0 + uIrregular * 0.08 * sin(aT * 11.0 + aAngle * 2.4);
    float r = max(uRadius * taper * breath * (1.0 + bark - furrow) * wobble, 0.0016);

    float ovalX = uKind < 0.5 ? 1.16 : 1.0;
    float ovalZ = uKind < 0.5 ? 0.86 : 1.0;
    vec3 radial = aNormal * cos(aAngle) * ovalX + aBinormal * sin(aAngle) * ovalZ;
    float capPush = 0.0;
    if (uKind > 0.5) {
      capPush = uRadius * 0.5 * (root * root - tip * tip);
    }
    vec3 pos = aCenter + radial * r + aTangent * capPush;
    vec3 worldNormal = normalize(mat3(modelMatrix) * radial);

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = worldNormal;
    vWorldTangent = normalize(mat3(modelMatrix) * aTangent);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

export const lineFragment = /* glsl */ `
  uniform float uPurity;
  uniform float uSacred;
  uniform float uFed;
  uniform float uKind;
  uniform vec3 uClean;
  uniform vec3 uMuddy;
  uniform vec3 uSacredTint;
  uniform vec3 uCameraPos;
  uniform sampler2D uBarkColor;
  uniform sampler2D uBarkNormal;
  uniform sampler2D uBarkRough;
  uniform float uHasBark;

  varying float vT;
  varying float vAngle;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldTangent;

  ${noiseLib}

  void main() {
    if (vWorldPos.y < -2.17) discard;

    vec3 n = normalize(vWorldNormal);
    if (uHasBark > 0.5) {
      vec3 t = normalize(vWorldTangent);
      vec3 btan = normalize(cross(n, t));
      vec3 mapN = texture2D(uBarkNormal, vUv).xyz * 2.0 - 1.0;
      n = normalize(t * mapN.x + btan * mapN.y + n * mapN.z);
    }
    vec3 v = normalize(uCameraPos - vWorldPos);
    float ndv = max(dot(n, v), 0.0);
    float fres = pow(1.0 - ndv, 2.4);

    float grain = fbm(vec2(vT * 16.0, vAngle * 0.45));
    float rings = fbm(vec2(vT * 3.4 + grain, vAngle * 1.8));
    float plates = pow(0.38 + 0.62 * abs(sin(vAngle * 3.1 + rings * 2.8 + vT * 0.8)), 0.85);
    float crack = smoothstep(0.72, 0.96, fbm(vec2(vT * 9.0, vAngle * 2.6)));

    vec3 wood = mix(uMuddy, uClean, uPurity);
    if (uKind < 0.5) {
      vec3 deep = vec3(0.06, 0.038, 0.02);
      vec3 mid = vec3(0.18, 0.11, 0.06);
      vec3 high = vec3(0.3, 0.19, 0.1);
      wood = mix(deep, mid, plates);
      wood = mix(wood, high, grain * 0.28);
      float moss = smoothstep(0.55, 0.95, sin(vAngle - 0.8) * 0.5 + 0.5) * (1.0 - vT);
      wood = mix(wood, vec3(0.08, 0.1, 0.06), moss * 0.32);
    } else if (uKind > 2.5) {
      wood = mix(vec3(0.07, 0.05, 0.035), wood, 0.22);
    }

    vec3 albedo = wood * mix(0.52, 1.02, plates) * mix(0.86, 1.04, grain);
    albedo *= 1.0 - crack * 0.22;
    if (uHasBark > 0.5) {
      vec3 bark = texture2D(uBarkColor, vUv).rgb;
      float rough = texture2D(uBarkRough, vUv).r;
      albedo = mix(albedo * 0.55, bark * wood * 2.4, 0.78);
      albedo *= mix(1.08, 0.72, rough);
    }

    vec3 key = normalize(vec3(0.52, 0.78, 0.34));
    vec3 rim = normalize(vec3(-0.48, 0.28, -0.62));
    float wrap = max(dot(n, key) * 0.55 + 0.32, 0.0);
    float rimL = pow(max(dot(n, rim), 0.0), 1.35) * 0.22;
    vec3 col = albedo * (0.08 + 0.92 * wrap);
    col += albedo * fres * 0.12;
    col += vec3(0.3, 0.22, 0.14) * rimL;

    float sapMask = 0.0;
    if (uKind < 0.5) {
      float vein = pow(1.0 - abs(sin(vAngle * 2.0 + vT * 0.35)), 10.0);
      sapMask = vein * smoothstep(0.22, 0.92, vT);
    } else {
      sapMask = (1.0 - plates) * 0.45 + pow(1.0 - ndv, 1.5) * 0.4;
      sapMask *= smoothstep(0.22, 0.78, vT);
    }
    col += uSacredTint * uSacred * sapMask * 0.55;
    col += uSacredTint * uSacred * uSacred * fres * sapMask * 0.2;
    col += vec3(0.28, 0.2, 0.1) * uFed * (0.22 + 0.4 * fres + sapMask * 0.18);

    gl_FragColor = vec4(col, 1.0);
  }
`

export const parasiteVertex = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec3 aNormal;
  attribute vec3 aBinormal;
  attribute float aT;
  attribute float aAngle;

  uniform float uRadius;
  uniform float uTime;
  uniform float uVigor;

  varying float vT;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vT = aT;
    float alive = smoothstep(0.0, 0.08, uVigor);
    float cut = step(aT, uVigor);
    float breath = 1.0 + 0.07 * sin(uTime * 1.8 + aT * 16.0);
    float bump = 1.0 + 0.28 * sin(aT * 40.0 + aAngle * 4.0);
    float r = uRadius * breath * bump * alive * mix(0.12, 1.0, cut);

    vec3 radial = aNormal * cos(aAngle) + aBinormal * sin(aAngle);
    vec3 pos = aCenter + radial * r;
    vWorldNormal = normalize(mat3(modelMatrix) * radial);
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

export const parasiteFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uCameraPos;
  uniform float uVigor;

  varying float vT;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    if (uVigor < 0.01) discard;
    vec3 n = normalize(vWorldNormal);
    vec3 v = normalize(uCameraPos - vWorldPos);
    float ndv = max(dot(n, v), 0.0);
    float wrap = max(dot(n, normalize(vec3(0.25, 0.75, 0.35))) * 0.5 + 0.5, 0.0);
    vec3 col = uColor * (0.2 + 0.8 * wrap);
    col *= 0.7 + 0.3 * sin(vT * 28.0);
    col += vec3(0.1, 0.05, 0.03) * pow(1.0 - ndv, 2.0);
    gl_FragColor = vec4(col, 1.0);
  }
`

export const groundVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const groundFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    float d = length(vPos.xy);
    float ring = smoothstep(3.4, 0.2, d);
    float core = smoothstep(1.4, 0.0, d);
    vec3 soil = vec3(0.04, 0.03, 0.02);
    if (uHasMap > 0.5) {
      soil = texture2D(uMap, vUv * 4.0).rgb * 0.45;
    }
    gl_FragColor = vec4(soil, mix(ring * 0.4, 0.94, core));
  }
`

export const leafVertex = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec3 aOut;
  attribute vec3 aUp;
  attribute float aPhase;
  attribute float aScale;
  attribute float aAlive;

  uniform float uTime;
  uniform float uWet;
  uniform float uGlow;

  varying vec2 vUv;
  varying float vAlive;
  varying float vShade;

  void main() {
    vUv = uv;
    vAlive = aAlive;
    float sway = sin(uTime * 1.15 + aPhase) * 0.14 * aAlive;
    vec3 side = normalize(cross(aOut, aUp));
    vec3 lift = aUp + aOut * 0.35;
    vec3 pos = aOffset
      + aOut * (position.y * aScale)
      + side * (position.x * aScale * 0.55)
      + lift * (sway * aScale)
      + aUp * (0.02 * uWet);
    vShade = 0.65 + 0.35 * uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

export const leafFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uWet;
  uniform float uGlow;
  uniform vec3 uGlowTint;

  varying vec2 vUv;
  varying float vAlive;
  varying float vShade;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float blade = 1.0 - abs(p.x) / (0.28 + 0.55 * (1.0 - vUv.y));
    blade *= smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
    if (blade < 0.12 || vAlive < 0.04) discard;
    vec3 midrib = uColor * 0.55;
    vec3 col = mix(midrib, uColor, smoothstep(0.0, 0.18, abs(p.x)));
    col *= vShade * mix(0.55, 1.05, vAlive);
    col = mix(col, col * vec3(1.15, 1.08, 0.85), uWet * 0.35);
    col += uGlowTint * uGlow * 0.22 * vUv.y;
    gl_FragColor = vec4(col, 0.92);
  }
`
