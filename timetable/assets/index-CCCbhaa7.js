(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`/timetable/assets/Loos_Normal_Bold-m84q8s_N.otf`,t=`#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`,n=`#version 300 es
precision mediump float;

uniform sampler2D uVideo;
uniform vec2 uResolution;
uniform float uCellSize;
uniform vec2 uOffset;
uniform float uStagger;
uniform float uMinRadius;
uniform float uMaxRadius;
uniform float uRadiusResponse;
uniform float uMinStroke;
uniform float uMaxStroke;
uniform float uStrokeCurve;
uniform float uSolidThreshold;
uniform float uGap;
uniform float uSoftness;
uniform float uBlackPoint;
uniform float uWhitePoint;
uniform float uBrightness;
uniform float uContrast;
uniform float uGamma;
uniform float uInvert;
uniform vec3 uLumWeights;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec4 uContent;
uniform float uShape;

out vec4 fragColor;

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

float sdStar(vec2 p, float r, float n, float m) {
  float an = 3.14159265 / n;
  float en = 3.14159265 / m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}

float sdTriangleIsosceles(vec2 p, vec2 q) {
  p.x = abs(p.x);
  vec2 a = p - q * clamp(dot(p, q) / dot(q, q), 0.0, 1.0);
  vec2 b = p - q * vec2(clamp(p.x / q.x, 0.0, 1.0), 1.0);
  float s = -sign(q.y);
  vec2 d = min(vec2(dot(a, a), s * (p.x * q.y - p.y * q.x)), vec2(dot(b, b), s * (p.y - q.y)));
  return -sqrt(d.x) * sign(d.y);
}

float sdArrows(vec2 p, float r) {
  p = abs(p);
  float shaft = r * 0.2;
  float headW = r * 0.52;
  float headL = r * 0.46;
  float reach = max(r - headL * 0.72, shaft);
  float bar = min(
    sdBox(vec2(p.x, p.y - reach * 0.5), vec2(shaft, reach * 0.5)),
    sdBox(vec2(p.y, p.x - reach * 0.5), vec2(shaft, reach * 0.5))
  );
  float head = min(
    sdTriangleIsosceles(vec2(p.x, r - p.y), vec2(headW, headL)),
    sdTriangleIsosceles(vec2(p.y, r - p.x), vec2(headW, headL))
  );
  return min(bar, head);
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  float cell = max(uCellSize, 1.0);
  vec2 local = pixel - uOffset;
  float row = floor(local.y / cell);
  float rowShift = mod(row, 2.0) * uStagger * cell;
  vec2 shifted = local - vec2(rowShift, 0.0);
  vec2 cellIndex = floor(shifted / cell);
  vec2 center = uOffset + vec2(rowShift, 0.0) + (cellIndex + 0.5) * cell;
  vec2 centerGL = vec2(center.x, uResolution.y - center.y);

  vec2 fromContent = center - uContent.xy;
  vec2 uv = vec2(fromContent.x / max(uContent.z, 0.0001), 1.0 - fromContent.y / max(uContent.w, 0.0001));
  vec3 color = vec3(0.0);
  if (fromContent.x >= 0.0 && fromContent.y >= 0.0 && fromContent.x < uContent.z && fromContent.y < uContent.w) {
    color = texture(uVideo, clamp(uv, 0.0, 1.0)).rgb;
  }

  float lum = dot(color, uLumWeights);
  float range = max(uWhitePoint - uBlackPoint, 0.0001);
  lum = clamp((lum - uBlackPoint) / range, 0.0, 1.0);
  lum = clamp((lum - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
  lum = pow(max(lum, 0.0), max(uGamma, 0.001));
  if (uInvert > 0.5) lum = 1.0 - lum;

  float t = pow(clamp(lum, 0.0, 1.0), max(uStrokeCurve, 0.001));
  float radiusT = clamp(t * uRadiusResponse, 0.0, 1.0);
  float outer = max(mix(uMinRadius, uMaxRadius, radiusT) * cell - uGap, 0.0);
  float stroke = mix(uMinStroke, uMaxStroke, t);
  float inner = lum >= uSolidThreshold - 0.0005 ? 0.0 : max(outer - stroke, 0.0);

  vec2 fromCenter = gl_FragCoord.xy - centerGL;
  float disk;
  float hole;
  if (uShape < 0.5) {
    float d = length(fromCenter);
    float aa = fwidth(d) * max(uSoftness, 0.0);
    if (aa < 0.02) {
      disk = step(d, outer);
      hole = step(d, inner);
    } else {
      disk = smoothstep(aa, -aa, d - outer);
      hole = smoothstep(aa, -aa, d - inner);
    }
  } else {
    float sd = sdBox(fromCenter, vec2(outer * 0.70710678));
    if (uShape < 2.5) sd = uShape < 1.5 ? sd : sdHexagon(fromCenter, outer * 0.866025404);
    else if (uShape < 3.5) sd = sdStar(fromCenter, outer, 4.0, 3.0);
    else if (uShape < 4.5) sd = sdStar(fromCenter, outer, 8.0, 4.5);
    else sd = sdArrows(fromCenter, outer);
    float aa = fwidth(sd) * max(uSoftness, 0.0);
    if (aa < 0.02) {
      disk = step(sd, 0.0);
      hole = step(sd, -stroke);
    } else {
      disk = smoothstep(aa, -aa, sd);
      hole = smoothstep(aa, -aa, sd + stroke);
    }
  }
  float mask = 0.0;
  if (outer > 0.0) {
    mask = inner <= 0.001 ? disk : clamp(disk - hole, 0.0, 1.0);
  }

  fragColor = vec4(mix(uPaper, uInk, mask), 1.0);
}
`;var nr=`#version 300 es
precision mediump float;

uniform sampler2D uVideo;
uniform vec2 uResolution;
uniform float uCellSize;
uniform vec2 uOffset;
uniform float uStagger;
uniform float uMinRadius;
uniform float uMaxRadius;
uniform float uRadiusResponse;
uniform float uMinStroke;
uniform float uMaxStroke;
uniform float uStrokeCurve;
uniform float uSolidThreshold;
uniform float uGap;
uniform float uSoftness;
uniform float uBlackPoint;
uniform float uWhitePoint;
uniform float uBrightness;
uniform float uContrast;
uniform float uGamma;
uniform float uInvert;
uniform vec3 uLumWeights;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec4 uContent;

out vec4 fragColor;

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  float cell = max(uCellSize, 1.0);
  vec2 local = pixel - uOffset;
  float row = floor(local.y / cell);
  float rowShift = mod(row, 2.0) * uStagger * cell;
  vec2 shifted = local - vec2(rowShift, 0.0);
  vec2 cellIndex = floor(shifted / cell);
  vec2 center = uOffset + vec2(rowShift, 0.0) + (cellIndex + 0.5) * cell;
  vec2 centerGL = vec2(center.x, uResolution.y - center.y);

  vec2 fromContent = center - uContent.xy;
  vec2 uv = vec2(fromContent.x / max(uContent.z, 0.0001), 1.0 - fromContent.y / max(uContent.w, 0.0001));
  vec3 color = vec3(0.0);
  if (fromContent.x >= 0.0 && fromContent.y >= 0.0 && fromContent.x < uContent.z && fromContent.y < uContent.w) {
    color = texture(uVideo, clamp(uv, 0.0, 1.0)).rgb;
  }

  float lum = dot(color, uLumWeights);
  float range = max(uWhitePoint - uBlackPoint, 0.0001);
  lum = clamp((lum - uBlackPoint) / range, 0.0, 1.0);
  lum = clamp((lum - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
  lum = pow(max(lum, 0.0), max(uGamma, 0.001));
  if (uInvert > 0.5) lum = 1.0 - lum;

  float t = pow(clamp(lum, 0.0, 1.0), max(uStrokeCurve, 0.001));
  float radiusT = clamp(t * uRadiusResponse, 0.0, 1.0);
  float outer = max(mix(uMinRadius, uMaxRadius, radiusT) * cell - uGap, 0.0);
  float stroke = mix(uMinStroke, uMaxStroke, t);
  float inner = lum >= uSolidThreshold - 0.0005 ? 0.0 : max(outer - stroke, 0.0);

  vec2 fromCenter = gl_FragCoord.xy - centerGL;
  float d = length(fromCenter);
  float aa = fwidth(d) * max(uSoftness, 0.0);
  float disk;
  float hole;
  if (aa < 0.02) {
    disk = step(d, outer);
    hole = step(d, inner);
  } else {
    disk = smoothstep(aa, -aa, d - outer);
    hole = smoothstep(aa, -aa, d - inner);
  }
  float mask = 0.0;
  if (outer > 0.0) {
    mask = inner <= 0.001 ? disk : clamp(disk - hole, 0.0, 1.0);
  }

  fragColor = vec4(mix(uPaper, uInk, mask), 1.0);
}`;function r(e){let t=e.startsWith(`#`)?e.slice(1):e,n=Number.parseInt(t,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}function i(e,t,n){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r);throw e.deleteShader(r),Error(t||`Shader compile failed`)}return r}function a(e){
  let gl=e.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1,premultipliedAlpha:!1});
  if(!gl)throw Error(`WebGL2 is required for the dither renderer.`);
  let buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0,2,gl.FLOAT,!1,0,0);
  let tex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
  function compile(src){
    let prog=gl.createProgram();
    gl.attachShader(prog,i(gl,gl.VERTEX_SHADER,t));
    gl.attachShader(prog,i(gl,gl.FRAGMENT_SHADER,src));
    gl.bindAttribLocation(prog,0,`aPos`);
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog)||`Shader link failed`);
    gl.useProgram(prog);
    gl.uniform1i(gl.getUniformLocation(prog,`uVideo`),0);
    let loc=name=>gl.getUniformLocation(prog,name);
    return {prog,u:{resolution:loc(`uResolution`),cellSize:loc(`uCellSize`),offset:loc(`uOffset`),stagger:loc(`uStagger`),minRadius:loc(`uMinRadius`),maxRadius:loc(`uMaxRadius`),radiusResponse:loc(`uRadiusResponse`),minStroke:loc(`uMinStroke`),maxStroke:loc(`uMaxStroke`),strokeCurve:loc(`uStrokeCurve`),solidThreshold:loc(`uSolidThreshold`),gap:loc(`uGap`),softness:loc(`uSoftness`),blackPoint:loc(`uBlackPoint`),whitePoint:loc(`uWhitePoint`),brightness:loc(`uBrightness`),contrast:loc(`uContrast`),gamma:loc(`uGamma`),invert:loc(`uInvert`),lumWeights:loc(`uLumWeights`),ink:loc(`uInk`),paper:loc(`uPaper`),shape:loc(`uShape`),content:loc(`uContent`)}};
  }
  let rings=compile(nr),full=compile(n),active=null,scratch=document.createElement(`canvas`),scratchCtx=scratch.getContext(`2d`,{alpha:!1}),texW=0,texH=0;
  function use(shape){
    let next=shape<0.5?rings:full;
    next!==active&&(active=next,gl.useProgram(active.prog));
  }
  function bind(){
    gl.viewport(0,0,e.width,e.height);
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.vertexAttribPointer(0,2,gl.FLOAT,!1,0,0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,tex);
  }
  function resize(w,h){
    let rw=Math.max(2,w-w%2),rh=Math.max(2,h-h%2);
    (e.width!==rw||e.height!==rh)&&(e.width=rw,e.height=rh);
    gl.viewport(0,0,e.width,e.height);
  }
  function uploadTex(source,w,h){
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,!0);
    try{
      w!==texW||h!==texH?(gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source),texW=w,texH=h):gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
    }catch{return!1}
    return!0;
  }
  function paint(settings,finish){
    let shape=Number(settings.shape)||0;
    use(shape);
    bind();
    let f=active.u,sum=settings.lumR+settings.lumG+settings.lumB,weights=sum>1e-4?[settings.lumR/sum,settings.lumG/sum,settings.lumB/sum]:[.2126,.7152,.0722],ink=r(settings.ink),paper=r(settings.paper);
    gl.uniform2f(f.resolution,e.width,e.height);
    gl.uniform1f(f.cellSize,settings.cellSize);
    gl.uniform2f(f.offset,settings.offsetX,settings.offsetY);
    gl.uniform1f(f.stagger,settings.stagger);
    gl.uniform1f(f.minRadius,settings.minRadius);
    gl.uniform1f(f.maxRadius,settings.maxRadius);
    gl.uniform1f(f.radiusResponse,settings.radiusResponse);
    gl.uniform1f(f.minStroke,settings.minStroke);
    gl.uniform1f(f.maxStroke,settings.maxStroke);
    gl.uniform1f(f.strokeCurve,settings.strokeCurve);
    gl.uniform1f(f.solidThreshold,settings.solidThreshold);
    gl.uniform1f(f.gap,settings.gap);
    gl.uniform1f(f.softness,settings.softness);
    gl.uniform1f(f.blackPoint,settings.blackPoint);
    gl.uniform1f(f.whitePoint,settings.whitePoint);
    gl.uniform1f(f.brightness,settings.brightness);
    gl.uniform1f(f.contrast,settings.contrast);
    gl.uniform1f(f.gamma,settings.gamma);
    gl.uniform1f(f.invert,+!!settings.invert);
    gl.uniform3f(f.lumWeights,weights[0],weights[1],weights[2]);
    gl.uniform3f(f.ink,ink[0],ink[1],ink[2]);
    gl.uniform3f(f.paper,paper[0],paper[1],paper[2]);
    let content=settings.content;
    content?gl.uniform4f(f.content,content[0],content[1],content[2],content[3]):gl.uniform4f(f.content,0,0,e.width,e.height);
    f.shape&&gl.uniform1f(f.shape,shape);
    gl.drawArrays(gl.TRIANGLES,0,6);
    finish&&gl.finish();
  }
  function upload(source){
    if(!source||!source.width||!source.height)return!1;
    bind();
    return uploadTex(source,source.width,source.height);
  }
  function drawCanvas(source,settings,finish){
    return!!upload(source)&&(paint(settings,finish),!0);
  }
  function draw(video,settings,finish){
    if(!video||video.readyState<2||!video.videoWidth)return!1;
    let w=video.videoWidth,h=video.videoHeight;
    (scratch.width!==w||scratch.height!==h)&&(scratch.width=w,scratch.height=h);
    scratchCtx.drawImage(video,0,0,w,h);
    return!!upload(scratch)&&(paint(settings,finish),!0);
  }
  return resize(1280,720),{draw,drawCanvas,upload,paint,resize,canvas:e};
}var o=`/data/events.csv`,s=`http://fundbureau.de/data/events.csv`,c=`/events.csv`,l=`Europe/Berlin`;function u(e){let t=[],n=[],r=``,i=!1,a=e.replace(/^\uFEFF/,``);for(let e=0;e<a.length;e+=1){let o=a[e];i?o===`"`?a[e+1]===`"`?(r+=`"`,e+=1):i=!1:r+=o:o===`"`?i=!0:o===`,`?(n.push(r),r=``):o===`
`||o===`\r`?(o===`\r`&&a[e+1]===`
`&&(e+=1),n.push(r),r=``,n.some(e=>e.trim()!==``)&&t.push(n),n=[]):r+=o}return(r.length||n.length)&&(n.push(r),n.some(e=>e.trim()!==``)&&t.push(n)),t}function d(e){let t=/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/.exec(String(e??``).trim());if(!t)return null;let n=Number(t[1]),r=Number(t[2]),i=2e3+Number(t[3]);return r<1||r>12||n<1||n>31?null:i*1e4+r*100+n}function f(e=new Date){let t=new Intl.DateTimeFormat(`en-GB`,{timeZone:l,year:`numeric`,month:`2-digit`,day:`2-digit`,hour:`2-digit`,hourCycle:`h23`}).formatToParts(e),n=e=>Number(t.find(t=>t.type===e)?.value),r=n(`year`),i=n(`month`),a=n(`day`),o=n(`hour`),s=Date.UTC(r,i-1,a),c=o<12?s-864e5:s,u=new Date(c);return u.getUTCFullYear()*1e4+(u.getUTCMonth()+1)*100+u.getUTCDate()}function p(e){return e.trim().toLocaleUpperCase(`de-DE`)}function m(e){if(e.length<=13||!e.includes(` `))return[e];let t=e.length/2,n=-1,r=1/0;for(let i=0;i<e.length;i+=1){if(e[i]!==` `)continue;let a=Math.abs(i-t);a<r&&(r=a,n=i)}let i=e.slice(0,n).trim(),a=e.slice(n+1).trim();return!i||!a?[e]:[i,a]}function h(e){let t=[];for(let n of e){let e=p(n[1]??``),r=e?m(e):[];for(let e=2;e<=7;e+=1){let t=(n[e]??``).trim();if(t)for(let e of t.split(`,`)){let t=p(e);t&&r.push(...m(t))}}r.length&&(t.length&&t.push(``),t.push(...r))}return t}function g(e){let t=new Map;for(let n of e){let e=d(n[0]);e!=null&&(t.has(e)||t.set(e,[]),t.get(e).push(n))}return t}function _(e){return[...g(e).keys()].sort((e,t)=>e-t)}function v(e,t=new Date){let n=_(e);if(!n.length)return null;let r=f(t);return n.includes(r)?r:n.find(e=>e>r)??null}function y(e,t){let n=g(e).get(t);return n?h(n):[]}function b(e){if(e==null)return``;let t=Math.floor(e/1e4)%100,n=Math.floor(e%1e4/100),r=e%100;return`${String(r).padStart(2,`0`)}.${String(n).padStart(2,`0`)}.${String(t).padStart(2,`0`)}`}async function ee(e){let t=await fetch(`${e}?t=${Date.now()}`,{cache:`no-store`});if(!t.ok)throw Error(`CSV request failed (${t.status})`);return t.text()}async function te(){let e=[o,c,s],t;for(let n of e)try{return await ee(n)}catch(e){t=e}throw t}var ne=Object.freeze({cellSize:12,offsetX:0,offsetY:0,stagger:0,minRadius:.5,maxRadius:.5,radiusResponse:1,minStroke:0,maxStroke:6,strokeCurve:1,solidThreshold:1,gap:0,softness:0,blackPoint:0,whitePoint:1,brightness:0,contrast:1,gamma:1,invert:!1,lumR:.2126,lumG:.7152,lumB:.0722,ink:`#ffffff`,paper:`#000000`}),x=.4,S=1,C=1.4,re=12,w=3e5,ie=6e4,ae=15e3,T=`Loos Normal Bold`,oe={ditherScale:.04,lineSpacing:.23,letterSpacing:-.055,gray:10,blur:.4,ink:`#ffffff`};function E(e={}){return{...oe,...e}}var D=[{id:`rings`,label:`Rings`,shape:0,tune:E()},{id:`square`,label:`Square`,shape:1,tune:E()},{id:`hexagon`,label:`Hexagon`,shape:2,tune:E()},{id:`star4`,label:`4-point star`,shape:3,tune:E()},{id:`star8`,label:`8-point star`,shape:4,tune:E()},{id:`arrows`,label:`Arrows`,shape:5,tune:E()}],O={...E(),shape:`rings`},k=null,A=document.querySelector(`#view`),j=a(A),M=document.createElement(`canvas`),N=M.getContext(`2d`,{alpha:!1}),P=[],F=[],I=1,L=0,R=0,z=performance.now(),B=null,V=()=>{},H=()=>{};function U(e){let t=Math.min(1,Math.max(0,e));return t*t*(3-2*t)}function se(e,t,n){if(t<=0)return{amount:0,rising:!1};if(t===1){let e=n%1.7999999999999998;return e<x?{amount:U(e/x),rising:!0}:e<1.4?{amount:1,rising:!0}:{amount:1-U((e-x-S)/x),rising:!1}}let r=t*C,i=n%r-e*C;return i<0&&(i+=r),i<x?{amount:U(i/x),rising:!0}:i<1.4?{amount:1,rising:!0}:i<1.7999999999999998?{amount:1-U((i-x-S)/x),rising:!1}:{amount:0,rising:!1}}function W(e=I){return Math.max(1,e*O.ditherScale)}function ce(e){if(e==null)return D[0].id;let t=2166136261,n=String(e);for(let e=0;e<n.length;e+=1)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return D[(t>>>0)%D.length].id}function G(e){return D.find(t=>t.id===e)??D[0]}function le(){return G(O.shape).shape}function ue(e,t){return{stagger:e/C%1,offsetX:e/(C*2)%1*t}}function de(e){let t=W(),n=t/re,r=ue(e,t);return{...ne,cellSize:t,offsetX:r.offsetX,stagger:r.stagger,minStroke:0,maxStroke:6*n,softness:O.blur,ink:O.ink,shape:le()}}function K(){N.letterSpacing=`${O.letterSpacing}em`}function q(e){N.font=`${e}px "${T}"`,N.textAlign=`center`,N.textBaseline=`middle`,K();let t=0,n=0,r=0;for(let e of F){let i=N.measureText(e),a=(i.actualBoundingBoxLeft||0)+(i.actualBoundingBoxRight||0);t=Math.max(t,a||i.width),n=Math.max(n,i.actualBoundingBoxAscent||0),r=Math.max(r,i.actualBoundingBoxDescent||0)}let i=e*O.lineSpacing,a=n+r+Math.max(0,F.length-1)*i;return{widest:t,ascent:n,descent:r,advance:i,block:a}}function fe(e,t){let n=1,r=Math.max(1,Math.floor(t)),i={...q(1),size:1};for(;n<=r;){let a=Math.floor((n+r)/2),o=Math.ceil(W(a)*.5+6),s=Math.max(1,e-o*2),c=Math.max(1,t-o*2),l=q(a);l.widest<=s&&l.block<=c?(i={...l,size:a},n=a+1):r=a-1}return I=i.size,i}function J(){let t=window.innerWidth,n=window.innerHeight,r=Math.min(1,1920/Math.max(t,1),1080/Math.max(n,1));j.resize(Math.max(2,Math.round(t*r)),Math.max(2,Math.round(n*r)));let{width:i,height:a}=j.canvas;A.style.width=t+`px`,A.style.height=n+`px`;(M.width!==i||M.height!==a)&&(M.width=i,M.height=a);if(!F.length)I=1,L=0,R=0;else{let e=fe(i,a);L=e.ascent,R=e.descent}V()}function Y(e=new Date){let t=_(P);return B!=null&&t.includes(B)?B:(B=null,v(P,e))}function X(e=new Date){let t=v(P,e),n=Y(e);H(n,t);let r=n==null?[]:y(P,n);r.join(`
`)!==F.join(`
`)&&(F=r,We+=1,z=performance.now(),J())}function Z(e){let t=_(P);if(!t.length)return;let n=Y(),r=Math.max(0,t.indexOf(n)),i=t[Math.min(t.length-1,Math.max(0,r+e))];B=i===v(P)?null:i,X()}async function Q(){try{P=u(await te())}catch{P.length||setTimeout(Q,ae);return}X()}var ge=[],be=[],xe=``,We=0,Ze=0;
function pe(e){
  let{width:t,height:n}=M;
  if(!F.length){
    let r=`0:`+t+`x`+n;
    if(xe===r)return!1;
    return N.fillStyle=`#000000`,N.fillRect(0,0,t,n),xe=r,!0;
  }
  let r=0;
  for(let i of F)i!==``&&(r+=1);
  let i=t+`x`+n+`|`+I+`|`+O.letterSpacing+`|`+O.lineSpacing+`|`+We,a=0;
  for(let o=0;o<F.length;o++){
    let s=F[o]===``,c=s?null:se(a,r,e);
    s||(a+=1);
    let l=s?-1:Math.round(O.gray+(255-O.gray)*c.amount),u=ge[o];
    u||(ge[o]=u={text:``,index:0,blank:!1,amount:0,rising:!1,gray:0});
    u.text=F[o],u.index=o,u.blank=s,u.amount=c?c.amount:0,u.rising=!!(c&&c.rising),u.gray=l;
    i+=`,`+l;
  }
  if(i===xe)return!1;
  xe=i,N.fillStyle=`#000000`,N.fillRect(0,0,t,n),N.font=`${I}px "${T}"`,N.textAlign=`center`,N.textBaseline=`middle`,K();
  let o=I*O.lineSpacing,s=(n-(L+R+(F.length-1)*o))/2+L,c=t/2;
  be.length=F.length;
  for(let l=0;l<F.length;l++)be[l]=l;
  be.sort((e,t)=>ge[e].amount-ge[t].amount||Number(ge[e].rising)-Number(ge[t].rising)||ge[e].index-ge[t].index);
  for(let l=0;l<be.length;l++){
    let u=ge[be[l]];
    if(u.blank)continue;
    N.fillStyle=`rgb(${u.gray}, ${u.gray}, ${u.gray})`,N.fillText(u.text,c,s+u.index*o);
  }
  return!0;
}
var Ke=[],Ye=null,Qe=-1,Xe=0,vt=null;
function et(){return 1e4+Math.random()*2e4}
function tt(){Ke.length&&(clearTimeout(Xe),Xe=setTimeout(nt,et()))}
function Je(){if(!Ye)return;Ye.pause(),Ye=null,xe=``,tt()}
function ot(){if(vt)return vt;let e=document.createElement(`video`);return e.muted=!0,e.defaultMuted=!0,e.playsInline=!0,e.preload=`none`,e.loop=!1,e.setAttribute(`muted`,``),e.setAttribute(`playsinline`,``),e.style.cssText=`position:fixed;left:0;top:0;width:500px;height:500px;opacity:0;pointer-events:none;z-index:-1`,document.body.appendChild(e),e.addEventListener(`ended`,()=>Ye===e&&Je()),e.addEventListener(`error`,()=>{Ye===e&&e.error&&e.error.code!==1&&Je()}),vt=e}
function it(e){try{return decodeURIComponent(new URL(e,location.href).pathname)}catch{return e}}
async function rt(){let e;try{e=await fetch(`/timetable/assets/video/`)}catch{return[]}if(!e.ok)return[];let t=await e.text(),n=new Set,r=/href\s*=\s*["']([^"']+)["']/gi,i;for(;(i=r.exec(t));){let e=i[1].split(`?`)[0].split(`#`)[0],a;try{a=decodeURIComponent(e)}catch{a=e}if(a.endsWith(`/`))continue;let o=a.split(`/`).filter(Boolean),s=o.pop();if(!s||!/\.(mp4|webm|ogg|mov)$/i.test(s))continue;o.length===0||o.length===1&&o[0]===`.`||o[o.length-1]===`video`?n.add(s):0}return[...n].sort((e,t)=>e.localeCompare(t,`en`)).slice(0,20).map(e=>`/timetable/assets/video/${encodeURIComponent(e)}`)}
function nt(){if(!Ke.length)return;let e=Ke.length,t=0;e>1&&Qe>=0?(t=Math.floor(Math.random()*(e-1)),t>=Qe&&(t+=1)):t=Math.floor(Math.random()*e);Qe=t;let n=ot(),r=Ke[t],i=()=>{if(Ye!==n)return;let e=n.play();e&&e.catch(()=>Ye===n&&Je())},a=()=>{n.removeEventListener(`seeked`,a),i()},o=()=>{n.addEventListener(`seeked`,a);try{n.currentTime=0}catch{}n.seeking||(n.removeEventListener(`seeked`,a),i())};Ye=n,it(n.currentSrc||n.src)===it(r)?o():(n.preload=`auto`,n.addEventListener(`canplay`,()=>{Ye===n&&o()},{once:!0}),n.src=r)}
function $(e){
  requestAnimationFrame($);
  if(e-Ze<32)return;
  Ze=e;
  let t=(e-z)/1e3,n=de(t);
  if(Ye&&Ye.ended)Je();
  if(Ye&&!Ye.ended&&Ye.readyState>=2&&Ye.videoWidth){let r=j.canvas.width,i=j.canvas.height,a=Math.min(r,i)*.5;n.content=[(r-a)/2,(i-a)/2,a,a],j.draw(Ye,n)}else (!pe(t)||j.upload(M))&&j.paint(n);
  if(document.querySelector(`#tune`).classList.contains(`is-hidden`))return;
  let r=document.querySelector(`#stagger`),i=document.querySelector(`#offset-x`);
  r.value=String(n.stagger),i.value=String(n.offsetX/n.cellSize),document.querySelector(`#stagger-out`).textContent=n.stagger.toFixed(2),document.querySelector(`#offset-x-out`).textContent=`${n.offsetX.toFixed(1)}px`;
}
function me(){let e=document.querySelector(`#tune`),t={ditherScale:document.querySelector(`#dither`),lineSpacing:document.querySelector(`#line`),letterSpacing:document.querySelector(`#letter`),gray:document.querySelector(`#gray`),blur:document.querySelector(`#blur`),ink:document.querySelector(`#color`)},n={ditherScale:document.querySelector(`#dither-out`),lineSpacing:document.querySelector(`#line-out`),letterSpacing:document.querySelector(`#letter-out`),gray:document.querySelector(`#gray-out`),blur:document.querySelector(`#blur-out`),ink:document.querySelector(`#color-out`)},r=()=>{O.ditherScale=Number(t.ditherScale.value),O.lineSpacing=Number(t.lineSpacing.value),O.letterSpacing=Number(t.letterSpacing.value),O.gray=Number(t.gray.value),O.blur=Number(t.blur.value),O.ink=t.ink.value;let e=W();n.ditherScale.textContent=`${O.ditherScale.toFixed(3)}× · ${e.toFixed(1)}px`,n.lineSpacing.textContent=O.lineSpacing.toFixed(2),n.letterSpacing.textContent=`${O.letterSpacing.toFixed(3)}em`,n.gray.textContent=String(O.gray),n.blur.textContent=O.blur.toFixed(2),n.ink.textContent=O.ink};for(let[e,n]of Object.entries(t))n.addEventListener(`input`,()=>{r(),(e===`ditherScale`||e===`lineSpacing`||e===`letterSpacing`)&&J()});V=r,r();let i=null,a=(e,n=!1)=>{if(!n&&e===i)return;i=e;let a=G(e).tune;for(let e of Object.keys(t))t[e].value=String(a[e]);r(),J()},o=Object.fromEntries(D.map(e=>[e.id,document.querySelector(`#shape-${e.id}`)])),s=()=>{for(let[e,t]of Object.entries(o))t.classList.toggle(`is-on`,e===O.shape)},c=e=>{if(k!=null)return;let t=ce(e);O.shape=t,s(),a(t)};for(let e of D)o[e.id].addEventListener(`click`,()=>{k=e.id,O.shape=e.id,s(),a(e.id,!0)});let l=document.querySelector(`#event-prev`),u=document.querySelector(`#event-next`),d=document.querySelector(`#event-date`);H=(e,t)=>{let n=_(P),r=n.indexOf(e);l.disabled=r<=0,u.disabled=r<0||r>=n.length-1,d.textContent=b(e),d.classList.toggle(`is-preview`,e!=null&&e!==t),c(e)},l.addEventListener(`click`,()=>Z(-1)),u.addEventListener(`click`,()=>Z(1)),window.addEventListener(`keydown`,t=>{if(t.metaKey||t.ctrlKey||t.altKey)return;let n=t.target instanceof Element?t.target.tagName:``;n!==`INPUT`&&n!==`TEXTAREA`&&(t.key===`ArrowLeft`||t.key===`ArrowRight`?(t.preventDefault(),Z(t.key===`ArrowLeft`?-1:1)):(t.key===`t`||t.key===`T`)&&(t.preventDefault(),e.classList.toggle(`is-hidden`),e.classList.contains(`is-hidden`)&&(B=null,k=null,X())))})}async function he(){let t=new FontFace(T,`url(${e})`);await t.load(),document.fonts.add(t),me(),J(),window.addEventListener(`resize`,J),setInterval(Q,w),setInterval(()=>X(),ie),await Q(),requestAnimationFrame($),rt().then(e=>{Ke=e,e.length&&tt()})}he();