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
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  ${noiseLib}

  void main() {
    vT = aT;
    vAngle = aAngle;

    float breath = 1.0 + uBreath * sin(uTime * 1.05 + aT * 4.0);
    float along = pow(clamp(aT, 0.0, 1.0), 0.62);
    float taper = mix(uJoin, uTip, along);

    if (uKind < 0.5) {
      float flare = 1.0 + 0.9 * pow(1.0 - aT, 2.4);
      float crown = mix(1.0, 0.62, smoothstep(0.58, 1.0, aT));
      taper = flare * crown;
    }

    float tip = smoothstep(0.86, 1.0, aT);
    float root = 1.0 - smoothstep(0.0, 0.045, aT);
    if (uKind > 0.5 && uKind < 1.5) {
      taper *= 1.0 - tip * 0.88;
    }

    float lump = (noise(vec2(aT * 5.5, aAngle * 1.2)) - 0.5) * 0.16;
    float ridge = 0.055 * sin(aAngle * 6.0 + aT * 2.4);
    float wobble = 1.0 + uIrregular * 0.1 * sin(aT * 14.0 + aAngle * 3.0);
    float r = max(uRadius * taper * breath * (1.0 + lump + ridge) * wobble, 0.002);

    vec3 radial = aNormal * cos(aAngle) + aBinormal * sin(aAngle);
    float capPush = 0.0;
    if (uKind > 0.5) {
      capPush = uRadius * 0.55 * (root * root - tip * tip);
    }
    vec3 pos = aCenter + radial * r + aTangent * capPush;
    vec3 worldNormal = normalize(mat3(modelMatrix) * radial);

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = worldNormal;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

export const lineFragment = /* glsl */ `
  uniform float uPurity;
  uniform float uSacred;
  uniform float uKind;
  uniform vec3 uClean;
  uniform vec3 uMuddy;
  uniform vec3 uSacredTint;
  uniform vec3 uCameraPos;

  varying float vT;
  varying float vAngle;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  ${noiseLib}

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 v = normalize(uCameraPos - vWorldPos);
    float ndv = max(dot(n, v), 0.0);
    float fres = pow(1.0 - ndv, 2.6);

    float grain = noise(vec2(vT * 18.0, vAngle * 0.55));
    float rings = noise(vec2(vT * 4.0 + grain, vAngle * 2.2));
    float furrow = pow(0.42 + 0.58 * abs(sin(vAngle * 4.5 + rings * 3.4 + vT * 1.1)), 0.7);
    vec3 wood = mix(uMuddy, uClean, uPurity);
    if (uKind < 0.5) {
      wood = mix(vec3(0.16, 0.12, 0.09), vec3(0.32, 0.24, 0.17), 0.45 + 0.35 * furrow);
    } else if (uKind > 2.5) {
      wood = mix(vec3(0.14, 0.11, 0.08), wood, 0.35);
    }

    vec3 albedo = wood * mix(0.62, 1.08, furrow) * mix(0.9, 1.06, grain);
    vec3 lightDir = normalize(vec3(0.45, 0.85, 0.4));
    float wrap = max(dot(n, lightDir) * 0.5 + 0.5, 0.0);
    vec3 col = albedo * (0.16 + 0.84 * wrap);
    col += albedo * fres * 0.16;

    float sapRise = uKind > 0.5 ? smoothstep(0.18, 0.72, vT) : 0.0;
    float sap = (1.0 - furrow) * 0.5 + pow(1.0 - ndv, 1.6) * 0.45;
    col += uSacredTint * uSacred * sap * sapRise * 0.62;
    col += uSacredTint * uSacred * uSacred * fres * sapRise * 0.22;

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
