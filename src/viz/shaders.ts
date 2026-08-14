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

  varying float vT;
  varying float vAngle;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vT = aT;
    vAngle = aAngle;

    float breath = 1.0 + 0.016 * sin(uTime * 1.15 + aT * 6.28318);
    float body = smoothstep(0.0, 0.12, aT) * (1.0 - smoothstep(0.82, 1.0, aT));
    float taper = mix(0.22, 1.12, body);
    float tip = smoothstep(0.86, 1.0, aT);
    float root = 1.0 - smoothstep(0.0, 0.07, aT);
    float cap = max(tip, root);
    float wobble = 1.0 + uIrregular * 0.14 * sin(aT * 22.0 + aAngle * 4.0 + uTime * 0.55);
    float r = uRadius * breath * taper * wobble * (1.0 - cap * 0.92);

    vec3 radial = aNormal * cos(aAngle) + aBinormal * sin(aAngle);
    float capPush = uRadius * 0.9 * (root * root - tip * tip);
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
  uniform vec3 uClean;
  uniform vec3 uMuddy;
  uniform vec3 uSacredTint;
  uniform vec3 uCameraPos;

  varying float vT;
  varying float vAngle;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

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

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 v = normalize(uCameraPos - vWorldPos);
    float ndv = max(dot(n, v), 0.0);
    float fres = pow(1.0 - ndv, 2.4);

    float fiber = 0.58 + 0.42 * sin(vAngle * 10.0 + noise(vec2(vT * 8.0, vAngle * 2.0)) * 2.2);
    float grain = mix(0.84, 1.12, noise(vec2(vT * 14.0, vAngle * 3.2)));
    vec3 albedo = mix(uMuddy, uClean, uPurity) * mix(0.74, 1.05, fiber) * grain;

    vec3 lightDir = normalize(vec3(0.35, 0.8, 0.55));
    float wrap = max(dot(n, lightDir) * 0.55 + 0.45, 0.0);
    vec3 col = albedo * (0.18 + 0.82 * wrap);
    col += albedo * fres * 0.22;

    float inner = 0.18 + 0.72 * pow(1.0 - ndv, 1.35) + 0.16 * fiber;
    col += uSacredTint * uSacred * inner;
    col += uSacredTint * uSacred * uSacred * 0.7;

    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    gl_FragColor = vec4(col, 1.0);
    gl_FragColor.rgb += step(0.72, uSacred) * max(luma - 0.55, 0.0) * uSacredTint * 0.35;
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
    float breath = 1.0 + 0.06 * sin(uTime * 2.1 + aT * 18.0);
    float bump = 1.0 + 0.22 * sin(aT * 54.0 + aAngle * 5.0);
    float r = uRadius * breath * bump * alive * mix(0.15, 1.0, cut);

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
    float wrap = max(dot(n, normalize(vec3(0.2, 0.7, 0.4))) * 0.5 + 0.5, 0.0);
    vec3 col = uColor * (0.22 + 0.78 * wrap);
    col *= 0.75 + 0.25 * sin(vT * 40.0);
    col += vec3(0.12, 0.07, 0.04) * pow(1.0 - ndv, 2.0);
    gl_FragColor = vec4(col, 1.0);
  }
`
