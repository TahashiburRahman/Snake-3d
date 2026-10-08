// 3D Chaser Snake v5 - Realistic 3D Wildlife Edition
// Upgrades: Realistic serpent anatomy, natural lighting/materials, varied wild food items (replacing crystals),
// procedural scale bumps, organic terrain & vegetation, and optimized HUD.
(function () {
    'use strict';

    var CELL = 2;             // ground tile size
    var SPACING = 0.62;       // tighter connected spacing between body segments
    var START_SEGMENTS = 9;
    var TURN_RATE = 2.4;     // rad/sec
    var BASE_SPEED = 7;
    var HEAD_R = 0.52;
    var BODY_R = 0.44;

    var FOG_COL = 0xcadced;

    var scene = new THREE.Scene();

    // Natural atmospheric sky gradient
    (function () {
        var c = document.createElement('canvas');
        c.width = 2; c.height = 256;
        var g = c.getContext('2d');
        var gr = g.createLinearGradient(0, 0, 0, 256);
        gr.addColorStop(0, '#3a72b0');    // clear sky blue
        gr.addColorStop(0.35, '#72a2ce');
        gr.addColorStop(0.7, '#b2cee3');  // soft haze near horizon
        gr.addColorStop(1, '#cadced');
        g.fillStyle = gr;
        g.fillRect(0, 0, 2, 256);
        scene.background = new THREE.CanvasTexture(c);
    })();
    scene.fog = new THREE.Fog(FOG_COL, 38, 110);

    var camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.3, 240);
    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Natural sunlight and balanced sky/ground ambient bounce
    var hemiLight = new THREE.HemisphereLight(0xdde9f5, 0x5a5040, 0.65);
    scene.add(hemiLight);

    var sun = new THREE.DirectionalLight(0xfffaec, 1.15);
    sun.position.set(12, 34, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -38;
    sun.shadow.camera.right = 38;
    sun.shadow.camera.top = 38;
    sun.shadow.camera.bottom = -38;
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 85;
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.025;
    scene.add(sun);
    scene.add(sun.target);

    // Helpers
    var UNIT = new THREE.BoxGeometry(1, 1, 1);
    var matCache = {};
    function lam(color) {
        if (!matCache[color]) matCache[color] = new THREE.MeshStandardMaterial({ color: color, roughness: 0.85, metalness: 0.05 });
        return matCache[color];
    }

    // Procedural scale texture for realistic reptilian skin
    var scaleTexture = (function () {
        var cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        var cx = cv.getContext('2d');
        cx.fillStyle = '#264e22';
        cx.fillRect(0, 0, 128, 128);
        cx.fillStyle = '#1e401b';
        var step = 8;
        for (var y = 0; y < 128; y += step) {
            for (var x = 0; x < 128; x += step) {
                var ox = ((y / step) % 2) * (step / 2);
                cx.beginPath();
                cx.ellipse((x + ox) % 128, y + step / 2, step * 0.42, step * 0.35, 0, 0, Math.PI * 2);
                cx.fill();
            }
        }
        var t = new THREE.CanvasTexture(cv);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(4, 2);
        return t;
    })();

    // Procedural ground canvas: subtle meadow soil & grass variations
    var GTILES = 64, GPX = 32, GPERIOD = GTILES * CELL, GSIZE = 240;
    var GFAM = [
        [0x36632d, 0x3d7034], [0x3a6a30, 0x427536], [0x315c29, 0x38682e],
        [0x406e33, 0x477a38], [0x3d6630, 0x375e2c], [0x39652f, 0x417235]
    ];
    var GZONE = [[0, 1, 2, 3], [2, 3, 5, 1], [4, 0, 1, 2], [3, 2, 0, 5]];
    function tileCss(hex, k) {
        var r = Math.min(255, ((hex >> 16) & 255) * k) | 0;
        var g = Math.min(255, ((hex >> 8) & 255) * k) | 0;
        var b = Math.min(255, (hex & 255) * k) | 0;
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    var groundTex = (function () {
        var c = document.createElement('canvas');
        c.width = c.height = GTILES * GPX;
        var g = c.getContext('2d');
        g.fillStyle = '#223d1d';
        g.fillRect(0, 0, c.width, c.height);
        for (var i = 0; i < GTILES; i++) {
            for (var j = 0; j < GTILES; j++) {
                var ti = i < 32 ? i : i - 64, tj = j < 32 ? j : j - 64;
                var zx = ((Math.floor((ti + 8) / 16) % 4) + 4) % 4, zz = ((Math.floor((tj + 8) / 16) % 4) + 4) % 4;
                var fam = (ti >= -2 && ti <= 1 && tj >= -2 && tj <= 1) ? GFAM[5] : GFAM[GZONE[zz][zx]];
                var k = 0.9 + 0.18 * Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453 % 1);
                g.fillStyle = tileCss(fam[((ti + tj) & 1) === 0 ? 0 : 1], k);
                g.fillRect(i * GPX + 1, j * GPX + 1, GPX - 2, GPX - 2);
            }
        }
        var t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(GSIZE / GPERIOD, GSIZE / GPERIOD);
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return t;
    })();

    var ground = new THREE.Mesh(new THREE.PlaneGeometry(GSIZE, GSIZE), new THREE.MeshStandardMaterial({
        map: groundTex, roughness: 0.92, metalness: 0.04
    }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    function updateGround(x, z) {
        var gx = Math.round(x / CELL) * CELL, gz = Math.round(z / CELL) * CELL, h = GSIZE / 2;
        ground.position.set(gx, 0, gz);
        groundTex.offset.set(((gx - h) / GPERIOD) % 1, (1 - (gz + h) / GPERIOD) % 1);
    }
    updateGround(0, 0);

    // Terrain zones (swamp / long grass / rocky)
    function hash2(ix, iz, salt) {
        var h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(salt, 1274126177)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }
    function vnoise(x, z, salt) {
        var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
        fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
        var a = hash2(ix, iz, salt), b = hash2(ix + 1, iz, salt), c = hash2(ix, iz + 1, salt), d = hash2(ix + 1, iz + 1, salt);
        return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
    }
    function sstep(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
    var TW = { s: 0, g: 0, r: 0 };
    function terrainW(x, z) {
        var a = vnoise(x * 0.016, z * 0.016, 11) * 0.7 + vnoise(x * 0.04, z * 0.04, 12) * 0.3;
        var b = vnoise(x * 0.02, z * 0.02, 21) * 0.7 + vnoise(x * 0.05, z * 0.05, 22) * 0.3;
        var safe = sstep(14, 28, Math.hypot(x, z));
        var ws = sstep(0.38, 0.31, a) * safe, wg = sstep(0.60, 0.67, a) * safe;
        TW.s = ws; TW.g = wg; TW.r = sstep(0.57, 0.64, b) * safe * (1 - ws) * (1 - wg);
    }
    var SLOW = { s: 0.5, g: 0.4, r: 0.35 };

    var TN = 256, TH = TN / 2, TSTEP = 8;
    var terrCanvas = document.createElement('canvas');
    terrCanvas.width = terrCanvas.height = TN;
    var terrCtx = terrCanvas.getContext('2d');
    var terrImg = terrCtx.createImageData(TN, TN);
    var terrTex = new THREE.CanvasTexture(terrCanvas);
    terrTex.generateMipmaps = false;
    terrTex.minFilter = THREE.LinearFilter;
    terrTex.magFilter = THREE.LinearFilter;
    terrTex.anisotropy = 1;
    var terrMesh = new THREE.Mesh(new THREE.PlaneGeometry(TN, TN), new THREE.MeshStandardMaterial({
        map: terrTex, transparent: true, depthWrite: false, roughness: 0.9, metalness: 0.05
    }));
    terrMesh.rotation.x = -Math.PI / 2;
    terrMesh.position.y = 0.02;
    terrMesh.receiveShadow = true;
    scene.add(terrMesh);

    var tCur = { x: 1e9, z: 1e9 }, tBuild = null;
    function terrStart(gx, gz) { tBuild = { gx: gx, gz: gz, row: 0 }; }
    function terrStep(rows) {
        if (!tBuild) return;
        var d = terrImg.data, x0 = tBuild.gx - TH, z0 = tBuild.gz - TH, end = Math.min(TN, tBuild.row + rows);
        for (var j = tBuild.row; j < end; j++) {
            for (var i = 0; i < TN; i++) {
                var x = x0 + i + 0.5, z = z0 + j + 0.5, idx = (j * TN + i) * 4;
                terrainW(x, z);
                var ws = TW.s, wg = TW.g, wr = TW.r, tot = ws + wg + wr;
                if (tot < 1e-4) { ws = 0; wg = 1; wr = 0; tot = 1; }
                var fs = ws / tot, fg = wg / tot, fr = wr / tot;
                var m1 = vnoise(x * 0.22, z * 0.22, 31), m2 = vnoise(x * 0.8, z * 0.8, 32), m3 = vnoise(x * 0.09, z * 0.09, 33);
                var st = sstep(0.6, 0.72, m3);
                var sr = 38 + 32 * m1, sg = 58 + 18 * m1, sb = 42 - 8 * m1; // earthy swamp peat
                sr += (18 - sr) * st; sg += (68 - sg) * st; sb += (72 - sb) * st;
                var rk = m2 < 0.22 ? 0.78 : 1;
                var mot = 0.85 + 0.28 * m2;
                d[idx] = (sr * fs + (30 + 26 * m1) * fg + (115 + 38 * m1) * rk * fr) * mot;
                d[idx + 1] = (sg * fs + (64 + 30 * m1) * fg + (110 + 26 * m1) * rk * fr) * mot;
                d[idx + 2] = (sb * fs + (32 + 10 * m1) * fg + (102 + 18 * m1) * rk * fr) * mot;
                d[idx + 3] = Math.min(1, TW.s + TW.g + TW.r) * 230;
            }
        }
        tBuild.row = end;
        if (end >= TN) {
            terrCtx.putImageData(terrImg, 0, 0);
            terrTex.needsUpdate = true;
            terrMesh.position.set(tBuild.gx, 0.02, tBuild.gz);
            tCur.x = tBuild.gx; tCur.z = tBuild.gz;
            tBuild = null;
        }
    }
    function updateTerrain(x, z) {
        if (tBuild) { terrStep(24); return; }
        if (Math.abs(x - tCur.x) > 6 || Math.abs(z - tCur.z) > 6) {
            terrStart(Math.round(x / TSTEP) * TSTEP, Math.round(z / TSTEP) * TSTEP);
            terrStep(24);
        }
    }
    function forceTerrain(x, z) {
        var gx = Math.round(x / TSTEP) * TSTEP, gz = Math.round(z / TSTEP) * TSTEP;
        if (!tBuild && tCur.x === gx && tCur.z === gz) return;
        terrStart(gx, gz);
        terrStep(TN);
    }

    // Terrain decor: natural puddles, reeds, stones, meadow grass
    var dummy = new THREE.Object3D(), tmpCol = new THREE.Color();
    var tuftGeo = new THREE.ConeGeometry(0.12, 0.85, 4).translate(0, 0.42, 0);
    var reedGeo = new THREE.CylinderGeometry(0.035, 0.06, 1.1, 5).translate(0, 0.55, 0);
    var puddleGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    var pebbleGeo = new THREE.IcosahedronGeometry(0.45, 0);
    var tuftMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    var puddleMat = new THREE.MeshStandardMaterial({ color: 0x1f4a46, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.82 });
    var pebbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.05, flatShading: true });
    var GRASS_COLS = [0x30622a, 0x3d7432, 0x487e38, 0x2b5424];
    var REED_COLS = [0x666832, 0x7a793c, 0x585c2c];
    var PEB_COLS = [0x827e74, 0x969084, 0x6e6a60, 0xa59c8e];
    var PUD_COLS = [0x92b0a8, 0x7a9690, 0x647e70];

    function instList(c, geo, mat, list) {
        if (!list.length) return;
        var im = new THREE.InstancedMesh(geo, mat, list.length);
        for (var i = 0; i < list.length; i++) {
            var e = list[i];
            dummy.position.set(e[0], e[1], e[2]);
            dummy.rotation.set(e[3], e[4], e[5]);
            dummy.scale.set(e[6], e[7], e[8]);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            tmpCol.setHex(e[9]);
            im.setColorAt(i, tmpCol);
        }
        im.frustumCulled = false;
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        scene.add(im);
        c.meshes.push(im);
    }

    function terrainDecor(c, cx, cz) {
        var rnd = chunkRng(cx, cz, 3), x0 = cx * CHUNK, z0 = cz * CHUNK, tufts = [], reeds = [], pud = [], peb = [];
        for (var i = 0; i < 48; i++) {
            var x = x0 + rnd() * CHUNK, z = z0 + rnd() * CHUNK, r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd(), k, an;
            terrainW(x, z);
            if (TW.s > 0.5) {
                if (r1 < 0.4) {
                    var ps = 1.1 + r3 * 2.0;
                    pud.push([x, 0.04, z, 0, r2 * 6, 0, ps, 1, ps * (0.6 + 0.4 * r4), PUD_COLS[Math.floor(r2 * 3)]]);
                } else {
                    for (k = 0; k < 3; k++) {
                        an = k * 2.1 + r2 * 6;
                        reeds.push([x + Math.cos(an) * 0.35, 0, z + Math.sin(an) * 0.35, (r3 - 0.5) * 0.25, 0, (r4 - 0.5) * 0.25, 1, 1.3 + ((r2 * 7 + k) % 1) * 0.9, 1, REED_COLS[(k + Math.floor(r1 * 9)) % 3]]);
                    }
                }
            } else if (TW.r > 0.5) {
                for (k = 0; k < 3; k++) {
                    an = k * 2.3 + r2 * 6;
                    peb.push([x + Math.cos(an) * 0.5, 0.1, z + Math.sin(an) * 0.5, 0, an, 0, 0.35 + r3 * 0.5, 0.25 + r4 * 0.25, 0.35 + ((r2 * 3 + k * 0.3) % 1) * 0.4, PEB_COLS[(k + Math.floor(r1 * 9)) % 4]]);
                }
            }
        }
        instList(c, puddleGeo, puddleMat, pud);
        instList(c, reedGeo, tuftMat, reeds);
        instList(c, tuftGeo, tuftMat, tufts);
        instList(c, pebbleGeo, pebbleMat, peb);
    }

    // Tall grass with wind sway and natural parting
    var grassU = { t: { value: 0 }, snake: { value: new THREE.Vector3() } };
    var grassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.02 });
    grassMat.onBeforeCompile = function (sh) {
        sh.uniforms.uTime = grassU.t;
        sh.uniforms.uSnake = grassU.snake;
        sh.vertexShader = 'uniform float uTime;\nuniform vec3 uSnake;\n' + sh.vertexShader
            .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vColor *= mix(0.48, 1.0, position.y);\n#endif')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\n' +
                ' vec4 gB = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);\n' +
                ' float gk = position.y * position.y;\n' +
                ' transformed.x += sin(uTime * 1.5 + gB.x * 0.28 + gB.z * 0.21) * 0.3 * gk;\n' +
                ' transformed.z += cos(uTime * 1.2 + gB.x * 0.17 + gB.z * 0.33) * 0.22 * gk;\n' +
                ' vec2 gd = gB.xz - uSnake.xz;\n' +
                ' float gl = length(gd) + 0.0001;\n' +
                ' float gp = (1.0 - smoothstep(0.2, 1.7, gl)) * gk;\n' +
                ' transformed.xz += gd / gl * gp * 0.7;\n' +
                '#endif');
    };
    var grassGeo = new THREE.ConeGeometry(0.18, 1, 5, 1, true).translate(0, 0.5, 0);
    var TALL_COLS = [0x255628, 0x316e32, 0x487f39, 0x224d26, 0x5a883e];
    var GC = 0.9;
    function terrainGrass(c, cx, cz) {
        var rnd = chunkRng(cx, cz, 4), x0 = cx * CHUNK, z0 = cz * CHUNK, n = Math.floor(CHUNK / GC), list = [], ix, iz, k, x, z, ra, rb, rc, rd, wg, h;
        for (ix = 0; ix < n; ix++) for (iz = 0; iz < n; iz++) for (k = 0; k < 2; k++) {
            ra = rnd(); rb = rnd(); rc = rnd(); rd = rnd();
            x = x0 + (ix + 0.1 + 0.8 * ra) * GC; z = z0 + (iz + 0.1 + 0.8 * rb) * GC;
            terrainW(x, z);
            wg = TW.g;
            if (wg < 0.3 || (wg < 0.7 && rd > (wg - 0.3) / 0.4)) continue;
            h = (1.8 + 0.8 * rc) * (0.45 + 0.55 * sstep(0.3, 0.8, wg));
            list.push([x, 0, z, (ra - 0.5) * 0.35, 0, (rb - 0.5) * 0.35, 0.9 + 0.5 * rd, h, 0.9 + 0.5 * rc, TALL_COLS[Math.floor(rd * 5) % 5]]);
        }
        instList(c, grassGeo, grassMat, list);
    }

    // Lawn decor: delicate wild clover and subtle meadow wildflowers
    var flowerGeo = new THREE.SphereGeometry(0.09, 6, 5);
    var FLOWER_COLS = [0xf2ebe2, 0xe8d06b, 0xd47ba2, 0xa488c9, 0xe8976b];
    function lawnDecor(c, cx, cz) {
        var rnd = chunkRng(cx, cz, 5), x0 = cx * CHUNK, z0 = cz * CHUNK, tufts = [], fl = [];
        for (var i = 0; i < 80; i++) {
            var x = x0 + rnd() * CHUNK, z = z0 + rnd() * CHUNK, r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd();
            terrainW(x, z);
            if (TW.s + TW.g + TW.r > 0.08) continue;
            if (r1 < 0.82) {
                tufts.push([x, 0, z, (r2 - 0.5) * 0.3, 0, (r3 - 0.5) * 0.3, 1, 0.22 + r4 * 0.3, 1, GRASS_COLS[Math.floor(r2 * 4)]]);
            } else {
                tufts.push([x, 0, z, 0, 0, 0, 0.8, 0.36, 0.8, GRASS_COLS[Math.floor(r2 * 4)]]);
                fl.push([x, 0.38, z, 0, 0, 0, 1, 1, 1, FLOWER_COLS[Math.floor(r3 * 5)]]);
            }
        }
        instList(c, tuftGeo, tuftMat, tufts);
        instList(c, flowerGeo, tuftMat, fl);
    }

    // Chunked world: natural weathered boulders, mossy monoliths, fallen trunks
    var CHUNK = 40, CHUNK_R = 2, SAFE_R = 16;
    var chunks = {};
    var OB_COLS = [0x504e4a, 0x625f58, 0x474944, 0x6e685f, 0x3d433b, 0x5a564e, 0x736c64];
    var pillarGeo = new THREE.CylinderGeometry(0.85, 1.05, 1, 12);
    var rockGeo = new THREE.IcosahedronGeometry(1, 1);
    var rockMats = OB_COLS.map(function (c) {
        return new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0.04, flatShading: true });
    });

    function chunkRng(cx, cz, salt) {
        var a = (Math.imul(cx, 374761393) + Math.imul(cz, 668265263) + Math.imul(salt | 0, 2246822519) + 1013904223) | 0;
        return function () {
            a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function addMesh(c, geo, mat, x, y, z, sx, sy, sz, ry, shadow) {
        var m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.scale.set(sx, sy, sz);
        m.rotation.y = ry || 0;
        m.castShadow = !!shadow;
        m.receiveShadow = true;
        m.updateMatrix();
        m.matrixAutoUpdate = false;
        scene.add(m);
        c.meshes.push(m);
    }

    function makeChunk(cx, cz) {
        var c = { cx: cx, cz: cz, meshes: [], obs: [], items: [] };
        var rnd = chunkRng(cx, cz), x0 = cx * CHUNK, z0 = cz * CHUNK, spots = [];
        var n = 5 + Math.floor(rnd() * 5), i, j, t, x, z, ok, type, col, sa, sb, sc;
        for (i = 0; i < n; i++) {
            x = x0 + 2.5 + rnd() * (CHUNK - 5);
            z = z0 + 2.5 + rnd() * (CHUNK - 5);
            type = rnd(); col = Math.floor(rnd() * OB_COLS.length); sa = rnd(); sb = rnd(); sc = rnd();
            ok = Math.hypot(x, z) > SAFE_R + 4;
            for (j = 0; ok && j < spots.length; j++) {
                if (Math.hypot(x - spots[j][0], z - spots[j][1]) < 8) ok = false;
            }
            if (!ok) continue;
            spots.push([x, z]);
            if (type < 0.45) { // Weathered natural boulder
                var rs = 0.95 + sa * 0.9;
                addMesh(c, rockGeo, rockMats[col], x, rs * 0.52, z, rs, rs * (0.65 + sb * 0.45), rs * (0.85 + sc * 0.35), sa * 6, true);
                c.obs.push({ x: x, z: z, hx: 0, hz: 0, r: rs * 0.9 });
            } else if (type < 0.72) { // Natural stone pillar / cliff crag
                var pr = 0.65 + sa * 0.35, ph = 2.4 + sb * 2.2;
                addMesh(c, pillarGeo, rockMats[col], x, ph / 2, z, pr, ph, pr, sa * 4, true);
                c.obs.push({ x: x, z: z, hx: 0, hz: 0, r: pr });
            } else { // Cluster of river stones
                for (t = 0; t < 3; t++) {
                    var ang = (t + sa) * 2.1, dd = 0.8 + t * 0.8 * (0.6 + sb * 0.6);
                    var bx = x + Math.cos(ang) * dd, bz = z + Math.sin(ang) * dd;
                    var bs = 1.0 + (t === 0 ? 0.45 : sc * 0.35), bh = 0.9 + ((t + col) % 3) * 0.6;
                    addMesh(c, rockGeo, rockMats[(col + t) % rockMats.length], bx, bh * 0.45, bz, bs, bh, bs, sa + t, true);
                    c.obs.push({ x: bx, z: bz, hx: 0, hz: 0, r: bs * 0.85 });
                }
            }
        }

        terrainDecor(c, cx, cz);
        terrainGrass(c, cx, cz);
        lawnDecor(c, cx, cz);

        // Pickups: regular growth food + varied wild food items (replacing crystals completely)
        var prng = chunkRng(cx, cz, 1), nf = prng() < 0.35 ? 1 : 0, nc = 4 + Math.floor(prng() * 4), rv, pid;
        for (i = 0; i < nf + nc; i++) {
            x = x0 + 3 + prng() * (CHUNK - 6); z = z0 + 3 + prng() * (CHUNK - 6); rv = prng();
            pid = cx + ',' + cz + ':' + i;
            if (collected.has(pid) || blocked(c, x, z, 1.4)) continue;
            if (i < nf) {
                addItem(c, 'food', pid, x, z, 0); // Core growth food: Orchard Apple / Crisp Fruit
            } else {
                // Varied wild food types: 0: Apple (15 pts), 1: Mushroom (30 pts), 2: Berries (45 pts), 3: Golden Acorn (90 pts)
                var foodType = rv < 0.1 ? 3 : rv < 0.45 ? 0 : rv < 0.75 ? 1 : 2;
                addItem(c, 'wild_food', pid, x, z, foodType);
            }
        }

        var qr = chunkRng(cx, cz, 2);
        if (qr() < 0.4) {
            x = x0 + 4 + qr() * (CHUNK - 8); z = z0 + 4 + qr() * (CHUNK - 8);
            var pk = qr() < 0.5 ? 'speed' : 'grow';
            pid = cx + ',' + cz + ':p';
            if (!collected.has(pid) && !blocked(c, x, z, 1.6)) addItem(c, pk, pid, x, z, 0);
        }
        return c;
    }

    function freeChunk(c) {
        c.meshes.forEach(function (m) { scene.remove(m); if (m.isInstancedMesh && m.dispose) m.dispose(); });
        c.items.forEach(function (it) { scene.remove(it.m); });
    }
    function clearChunks() {
        for (var k in chunks) freeChunk(chunks[k]);
        chunks = {};
        fxList.forEach(function (f) { scene.remove(f.m); });
        fxList = [];
    }

    function updateChunks(all) {
        var cx = Math.floor(pos.x / CHUNK), cz = Math.floor(pos.z / CHUNK), k, c, ring, dx, dz, made = 0;
        for (k in chunks) {
            c = chunks[k];
            if (Math.abs(c.cx - cx) > CHUNK_R + 1 || Math.abs(c.cz - cz) > CHUNK_R + 1) {
                freeChunk(c);
                delete chunks[k];
            }
        }
        for (ring = 0; ring <= CHUNK_R; ring++) {
            for (dz = -ring; dz <= ring; dz++) {
                for (dx = -ring; dx <= ring; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
                    k = (cx + dx) + ',' + (cz + dz);
                    if (!chunks[k]) {
                        chunks[k] = makeChunk(cx + dx, cz + dz);
                        if (!all && ++made >= 1) return;
                    }
                }
            }
        }
    }

    function hitObstacle(x, z, r) {
        var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK), a, b, c, i, o, px, pz;
        for (a = -1; a <= 1; a++) {
            for (b = -1; b <= 1; b++) {
                c = chunks[(cx + a) + ',' + (cz + b)];
                if (!c) continue;
                for (i = 0; i < c.obs.length; i++) {
                    o = c.obs[i];
                    if (o.r > 0) {
                        if (Math.hypot(x - o.x, z - o.z) < o.r + r) return true;
                    } else {
                        px = Math.max(o.x - o.hx, Math.min(x, o.x + o.hx));
                        pz = Math.max(o.z - o.hz, Math.min(z, o.z + o.hz));
                        if (Math.hypot(x - px, z - pz) < r) return true;
                    }
                }
            }
        }
        return false;
    }

    // Realistic Serpent Models & Materials
    var headGeo = new THREE.SphereGeometry(HEAD_R, 28, 20);
    var snoutGeo = new THREE.CylinderGeometry(0.24, 0.42, 0.52, 16);
    var eyeGeo = new THREE.SphereGeometry(0.14, 16, 14);
    var pupilGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.16, 8);
    var tongueMat = new THREE.MeshStandardMaterial({ color: 0x6e121e, roughness: 0.35 });
    var mouthGeo = new THREE.SphereGeometry(0.28, 16, 12);
    var mouthMat = new THREE.MeshStandardMaterial({ color: 0x481119, roughness: 0.4 });

    // Subtle scale-like materials with realistic serpent hues
    var headMat = new THREE.MeshStandardMaterial({
        color: 0x245620, roughness: 0.36, metalness: 0.06, bumpMap: scaleTexture, bumpScale: 0.03
    });
    var underbellyMat = new THREE.MeshStandardMaterial({
        color: 0xc8d7a4, roughness: 0.45, metalness: 0.02
    });
    var eyeMat = new THREE.MeshStandardMaterial({
        color: 0xd49b28, roughness: 0.15, metalness: 0.15 // glossy golden reptilian iris
    });
    var pupilMat = new THREE.MeshBasicMaterial({ color: 0x050406 });

    // Body materials: deep emerald/forest shades with subtle natural chevron gradients
    var BODY_COLS = [0x22521e, 0x275a22, 0x2f6828, 0x36722d, 0x2c6326, 0x23541f];
    var bodyMats = BODY_COLS.map(function (c) {
        return new THREE.MeshStandardMaterial({
            color: c, roughness: 0.38, metalness: 0.05, bumpMap: scaleTexture, bumpScale: 0.025
        });
    });

    function buildHead() {
        var g = new THREE.Group();
        // Serpents have a sleek, tapered triangular skull
        var skull = new THREE.Mesh(headGeo, headMat);
        skull.scale.set(1.02, 0.76, 1.25);
        skull.castShadow = true;
        skull.receiveShadow = true;
        g.add(skull);

        // Underbelly plate for head
        var belly = new THREE.Mesh(headGeo, underbellyMat);
        belly.scale.set(0.92, 0.4, 1.2);
        belly.position.set(0, -0.22, 0);
        g.add(belly);

        // Slender tapered snout
        var snout = new THREE.Mesh(snoutGeo, headMat);
        snout.rotation.x = -Math.PI / 2;
        snout.position.set(0, -0.06, -0.56);
        snout.scale.set(1, 1, 0.9);
        snout.castShadow = true;
        g.add(snout);

        // Realistic jaw interior (opens naturally when eating)
        var mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, -0.2, -0.5);
        mouth.visible = false;
        g.add(mouth);
        g.userData.mouth = mouth;
        g.userData.snout = snout;

        // Reptilian eyes with glossy golden irises & vertical slit pupils
        [-1, 1].forEach(function (sx) {
            var eyeG = new THREE.Group();
            eyeG.position.set(sx * 0.34, 0.16, -0.26);
            var eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.castShadow = true;
            eyeG.add(eye);
            var pupil = new THREE.Mesh(pupilGeo, pupilMat);
            pupil.rotation.x = Math.PI / 2;
            pupil.position.set(sx * 0.04, 0, -0.11);
            eyeG.add(pupil);
            g.add(eyeG);
        });

        // Forked tongue with natural slender flicker
        var tongue = new THREE.Group();
        tongue.position.set(0, -0.12, -0.82);
        var stem = new THREE.Mesh(UNIT, tongueMat);
        stem.scale.set(0.045, 0.02, 0.36);
        stem.position.z = -0.18;
        tongue.add(stem);
        [-1, 1].forEach(function (sx) {
            var fork = new THREE.Mesh(UNIT, tongueMat);
            fork.scale.set(0.03, 0.02, 0.2);
            fork.position.set(sx * 0.05, 0, -0.42);
            fork.rotation.y = -sx * 0.45;
            tongue.add(fork);
        });
        g.add(tongue);
        g.userData.tongue = tongue;
        return g;
    }

    // Realistic Wild Food & Power-up Pickups (No crystals)
    var collected = new Set();
    var foodHarvested = 0, dynId = 0, nearT = 0, fxList = [];

    // Distinct 3D Wild Food Models
    function makeAppleMesh(isRare) {
        var g = new THREE.Group();
        var appleGeo = new THREE.SphereGeometry(0.38, 18, 16);
        var appleCol = isRare ? 0xd49818 : 0xb31e24; // Golden apple vs orchard red apple
        var appleMat = new THREE.MeshStandardMaterial({
            color: appleCol, roughness: 0.28, metalness: 0.08
        });
        var body = new THREE.Mesh(appleGeo, appleMat);
        body.scale.set(1.05, 1.0, 1.05);
        body.castShadow = true;
        g.add(body);
        // Wood stem
        var stemGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.22, 6);
        var stemMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });
        var stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(0, 0.42, 0);
        stem.rotation.z = 0.2;
        g.add(stem);
        // Green leaf
        var leafGeo = new THREE.ConeGeometry(0.08, 0.22, 5);
        var leafMat = new THREE.MeshStandardMaterial({ color: 0x3d7e2e, roughness: 0.5 });
        var leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(0.07, 0.46, 0.04);
        leaf.rotation.set(0.3, 0, -0.9);
        g.add(leaf);
        return g;
    }

    function makeMushroomMesh() {
        var g = new THREE.Group();
        // Domed boletus cap
        var capGeo = new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
        var capMat = new THREE.MeshStandardMaterial({ color: 0x7a3e1d, roughness: 0.45, metalness: 0.05 });
        var cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(0, 0.24, 0);
        cap.scale.set(1.15, 0.9, 1.15);
        cap.castShadow = true;
        g.add(cap);
        // Stalk
        var stemGeo = new THREE.CylinderGeometry(0.14, 0.22, 0.5, 12);
        var stemMat = new THREE.MeshStandardMaterial({ color: 0xede4d4, roughness: 0.75 });
        var stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(0, 0.05, 0);
        stem.castShadow = true;
        g.add(stem);
        return g;
    }

    function makeBerryClusterMesh() {
        var g = new THREE.Group();
        var berryGeo = new THREE.SphereGeometry(0.16, 12, 10);
        var berryMat = new THREE.MeshStandardMaterial({ color: 0x2d1a4e, roughness: 0.25, metalness: 0.1 }); // ripe glossy blackberries
        var offsets = [
            [0, 0.22, 0], [0.15, 0.12, 0.05], [-0.14, 0.12, -0.06],
            [0.02, 0.08, 0.16], [-0.05, 0.08, -0.15]
        ];
        offsets.forEach(function (pos) {
            var b = new THREE.Mesh(berryGeo, berryMat);
            b.position.set(pos[0], pos[1], pos[2]);
            b.castShadow = true;
            g.add(b);
        });
        // Tiny stem
        var stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.18, 6);
        var stemMat = new THREE.MeshStandardMaterial({ color: 0x3d6628, roughness: 0.8 });
        var stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(0, 0.34, 0);
        g.add(stem);
        return g;
    }

    var FOOD_SPECS = [
        { name: 'Red Apple', pts: 15, build: function () { return makeAppleMesh(false); } },
        { name: 'Forest Mushroom', pts: 30, build: makeMushroomMesh },
        { name: 'Wild Berries', pts: 45, build: makeBerryClusterMesh },
        { name: 'Golden Apple', pts: 90, build: function () { return makeAppleMesh(true); } }
    ];

    function blocked(c, x, z, m) {
        for (var i = 0; i < c.obs.length; i++) {
            var o = c.obs[i];
            if (o.r > 0 ? Math.hypot(x - o.x, z - o.z) < o.r + m : (Math.abs(x - o.x) < o.hx + m && Math.abs(z - o.z) < o.hz + m)) return true;
        }
        return false;
    }

    // Natural power-ups: Sun-Essence & Life-Seed
    var puCoreGeo = { speed: new THREE.OctahedronGeometry(0.48, 0).scale(0.8, 1.3, 0.8), grow: new THREE.IcosahedronGeometry(0.46, 0) };
    var puRingGeo = new THREE.TorusGeometry(0.78, 0.06, 8, 24);
    var PU = {
        speed: { col: 0xdf9a1b, em: 0x8a5408, txt: 'SPEED SURGE', css: '#df9a1b' },
        grow: { col: 0x48b64e, em: 0x1f6624, txt: 'GROWTH +3', css: '#48b64e' }
    };
    function buildPowerup(kind) {
        var d = PU[kind], g = new THREE.Group();
        var core = new THREE.Mesh(puCoreGeo[kind], new THREE.MeshStandardMaterial({
            color: d.col, emissive: d.em, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.15, flatShading: true
        }));
        core.castShadow = true;
        g.add(core);
        var ring = new THREE.Mesh(puRingGeo, new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: d.col, emissiveIntensity: 0.65, roughness: 0.4
        }));
        ring.rotation.x = Math.PI / 2.3;
        g.add(ring);
        g.userData.ring = ring;
        return g;
    }

    function addItem(c, kind, id, x, z, type) {
        var m, sc = 1.15, val = 10, y0 = 0.8;
        if (kind === 'food') {
            // Core orchard fruit (always available growth food)
            m = makeAppleMesh(false);
            sc = 1.25; y0 = 0.85; val = 10;
        } else if (kind === 'wild_food') {
            var spec = FOOD_SPECS[type || 0];
            m = spec.build();
            sc = type === 3 ? 1.35 : 1.2;
            val = spec.pts;
            y0 = 0.8;
        } else {
            m = buildPowerup(kind);
            sc = 1.25; y0 = 1.1; val = 25;
        }
        m.position.set(x, y0, z);
        m.scale.setScalar(sc);
        scene.add(m);
        c.items.push({ id: id, kind: kind, x: x, z: z, val: val, m: m, s: sc, y0: y0, ph: x * 0.7 + z * 1.3, type: type || 0 });
    }

    function animateItems(now, dt) {
        for (var k in chunks) {
            var its = chunks[k].items;
            for (var i = 0; i < its.length; i++) {
                var it = its[i], m = it.m;
                m.rotation.y += dt * (it.kind === 'food' ? 1.8 : 2.2);
                m.position.set(it.x, it.y0 + Math.sin(now * 3.0 + it.ph) * 0.12, it.z);
                m.scale.setScalar(it.s * (1 + (m.userData.ring ? 0.12 : 0.08) * Math.sin(now * 4.0 + it.ph)));
                if (m.userData.ring) m.userData.ring.rotation.z += dt * 3.5;
            }
        }
    }

    // Effects State
    var boostT = 0, boostK = 0, growQueue = 0, growTimer = 0, growGlow = 0;
    var mouthOpen = 0, kick = 0, sparkT = 0, waves = [], terrK = 1, terrName = '', puffT = 0;
    var TERR_COLS = { swamp: [0x2f4625, 0x4d5b28, 0x224a48], grass: [0x3c7032, 0x588c38], rock: [0x787265, 0x5e5950] };
    var BOOST_TIME = 4.5, BOOST_MULT = 1.45;

    function eachMat(m, fn) {
        if (m.material) fn(m.material);
        m.children.forEach(function (ch) { eachMat(ch, fn); });
    }

    // Natural suction collect effect: food smoothly sucked into snake's open mouth
    function startFx(it) {
        var mats = [];
        eachMat(it.m, function (mat) { mats.push(mat); });
        it.m.traverse(function (o) {
            if (o.material) { o.material = o.material.clone(); o.material.transparent = true; }
        });
        mats = [];
        eachMat(it.m, function (mat) { mats.push(mat); });
        fxList.push({
            type: 'suck', m: it.m, mats: mats, s: it.s, t: 0,
            x0: it.m.position.x, y0: it.m.position.y, z0: it.m.position.z
        });
    }

    // Soft ground ripple ring
    var ringGeo = new THREE.RingGeometry(0.85, 1, 36);
    function ringFx(x, z, col) {
        var m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
            color: col, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, fog: false
        }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.08, z);
        scene.add(m);
        fxList.push({ type: 'ring', m: m, mats: [m.material], t: 0 });
    }

    // Floating text with clean typography
    function textFx(txt, css, x, z) {
        var c = document.createElement('canvas');
        c.width = 280; c.height = 96;
        var g = c.getContext('2d');
        g.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 8; g.strokeStyle = 'rgba(20,24,20,0.85)';
        g.strokeText(txt, 140, 48);
        g.fillStyle = css;
        g.fillText(txt, 140, 48);
        var tex = new THREE.CanvasTexture(c);
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
        sp.scale.set(3.0, 1.0, 1);
        sp.position.set(x, 2.0, z);
        sp.renderOrder = 10;
        scene.add(sp);
        fxList.push({ type: 'text', m: sp, mats: [sp.material], tex: tex, t: 0, y0: 2.0 });
    }

    function updateFx(dt) {
        for (var i = fxList.length - 1; i >= 0; i--) {
            var f = fxList[i], q, e, done = false;
            f.t += dt;
            if (f.type === 'suck') {
                q = Math.min(1, f.t / 0.26); e = q * q;
                f.m.position.set(f.x0 + (pos.x - f.x0) * e, f.y0 + (0.65 - f.y0) * e, f.z0 + (pos.z - f.z0) * e);
                f.m.scale.setScalar(f.s * (1 - 0.88 * e));
                f.m.rotation.y += dt * 12;
                done = q >= 1;
                f.mats.forEach(function (mt) { mt.opacity = 1 - 0.7 * e; });
            } else if (f.type === 'ring') {
                q = Math.min(1, f.t / 0.65);
                f.m.scale.setScalar(0.6 + 6.5 * (1 - Math.pow(1 - q, 2)));
                f.mats[0].opacity = 0.8 * (1 - q);
                done = q >= 1;
            } else if (f.type === 'text') {
                q = Math.min(1, f.t / 0.95);
                f.m.position.y = f.y0 + 1.5 * q;
                f.m.scale.set(3.0 * (1 + 0.15 * Math.sin(Math.min(1, q * 4) * Math.PI)), 1.0 * (1 + 0.15 * Math.sin(Math.min(1, q * 4) * Math.PI)), 1);
                f.mats[0].opacity = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
                done = q >= 1;
            }
            if (done) {
                scene.remove(f.m);
                f.mats.forEach(function (mt) { mt.dispose(); });
                if (f.tex) f.tex.dispose();
                fxList.splice(i, 1);
            }
        }
    }

    function addWave(amp, speedSegs, sigma) { waves.push({ p: -1, a: amp, v: speedSegs, s: sigma || 1.3 }); }

    function takePickup(it) {
        var txt = '+' + it.val, css = '#ffffff';
        score += it.val;
        mouthOpen = 1;
        if (it.kind === 'food') {
            length += 1;
            foodHarvested += 1;
            burst(it.x, it.z, [0xb31e24, 0x48a832, 0xf0d080], 16, 0.7);
            headPop = 0.9;
            addSegment();
            layoutSegments();
            addWave(0.5, 16, 1.3);
            css = '#e85d64';
            txt += ' APPLE';
        } else if (it.kind === 'wild_food') {
            foodHarvested += 1;
            var spec = FOOD_SPECS[it.type];
            headPop = Math.max(headPop, 0.45);
            mouthOpen = 0.75;
            var cols = it.type === 0 ? [0xb31e24, 0x408a28] :
                       it.type === 1 ? [0x7a3e1d, 0xede4d4] :
                       it.type === 2 ? [0x422668, 0x306830] : [0xd49818, 0xffe27a];
            burst(it.x, it.z, cols, 14, 0.8);
            addWave(0.28, 18, 1.1);
            css = it.type === 3 ? '#e5a820' : it.type === 2 ? '#b88ee8' : it.type === 1 ? '#e6ba8c' : '#f06d72';
            txt += ' ' + spec.name.toUpperCase();
        } else if (it.kind === 'speed') {
            boostT = BOOST_TIME;
            kick = 1;
            headPop = 1;
            burst(it.x, it.z, [0xdf9a1b, 0xffce54, 0xffffff], 22, 0.85);
            ringFx(it.x, it.z, 0xdf9a1b);
            addWave(0.48, 34, 1.6);
            txt += ' ' + PU.speed.txt; css = PU.speed.css;
        } else if (it.kind === 'grow') {
            growQueue += 3;
            growTimer = 0.1;
            growGlow = 1;
            kick = 0.6;
            headPop = 1;
            burst(it.x, it.z, [0x48b64e, 0x76d87c, 0xffffff], 22, 0.85);
            ringFx(it.x, it.z, 0x48b64e);
            addWave(0.65, 12, 1.8);
            txt += ' ' + PU.grow.txt; css = PU.grow.css;
        }
        ringFx(pos.x, pos.z, 0xffffff);
        textFx(txt, css, pos.x, pos.z);
        startFx(it);
        updateHud();
    }

    function collectPickups() {
        var cx = Math.floor(pos.x / CHUNK), cz = Math.floor(pos.z / CHUNK), a, b, c, i, it;
        for (a = -1; a <= 1; a++) {
            for (b = -1; b <= 1; b++) {
                c = chunks[(cx + a) + ',' + (cz + b)];
                if (!c) continue;
                for (i = c.items.length - 1; i >= 0; i--) {
                    it = c.items[i];
                    if (Math.hypot(pos.x - it.x, pos.z - it.z) < HEAD_R + 0.6) {
                        c.items.splice(i, 1);
                        collected.add(it.id);
                        takePickup(it);
                    }
                }
            }
        }
    }

    function ensureNearFood() {
        var cx = Math.floor(pos.x / CHUNK), cz = Math.floor(pos.z / CHUNK), a, b, c, i, it, n = 0, tries = 0, an, d, x, z, tc;
        for (a = -1; a <= 1; a++) {
            for (b = -1; b <= 1; b++) {
                c = chunks[(cx + a) + ',' + (cz + b)];
                if (!c) continue;
                for (i = 0; i < c.items.length; i++) {
                    it = c.items[i];
                    if ((it.kind === 'food' || it.kind === 'wild_food') && Math.hypot(it.x - pos.x, it.z - pos.z) < 45) n++;
                }
            }
        }
        if (n >= 1) return;
        do {
            an = heading + (Math.random() * 2 - 1) * 1.8;
            d = 12 + Math.random() * 14;
            x = pos.x + Math.sin(an) * d;
            z = pos.z - Math.cos(an) * d;
            tries++;
        } while (tries < 50 && (nearSnake(x, z, 2.5) || hitObstacle(x, z, 2)));
        tc = chunks[Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK)];
        if (tc) addItem(tc, 'food', 'd' + (++dynId), x, z, 0);
    }

    // Natural organic particle burst
    var parts = [];
    var partGeo = new THREE.SphereGeometry(0.1, 6, 5);
    function burst(x, z, cols, n, y) {
        cols = cols || [0x428236, 0x8ab84d, 0xf0d080];
        n = n || 18;
        for (var i = 0; i < n; i++) {
            var a = Math.random() * Math.PI * 2, sp = 2.5 + Math.random() * 4.5;
            var mat = new THREE.MeshBasicMaterial({
                color: cols[i % cols.length], transparent: true, opacity: 0.9, depthWrite: false
            });
            var m = new THREE.Mesh(partGeo, mat);
            m.position.set(x, y || 0.7, z);
            scene.add(m);
            parts.push({ m: m, vx: Math.cos(a) * sp, vy: 1.8 + Math.random() * 3.5, vz: Math.sin(a) * sp, life: 0.75 });
        }
    }

    function spark(x, z, cols) {
        cols = cols || [0xdf9a1b, 0x8a5408];
        var mat = new THREE.MeshBasicMaterial({
            color: cols[Math.floor(Math.random() * cols.length)], transparent: true, opacity: 0.9, depthWrite: false, fog: false
        });
        var m = new THREE.Mesh(partGeo, mat);
        m.position.set(x + (Math.random() - 0.5) * 0.45, 0.3 + Math.random() * 0.45, z + (Math.random() - 0.5) * 0.45);
        scene.add(m);
        parts.push({ m: m, vx: (Math.random() - 0.5) * 1.2, vy: 0.4 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 1.2, life: 0.45 });
    }

    // Speed lines
    var lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });
    var lines = [], lineV = new THREE.Vector3();
    (function () {
        for (var i = 0; i < 40; i++) {
            var m = new THREE.Mesh(UNIT, lineMat);
            m.visible = false;
            m.frustumCulled = false;
            scene.add(m);
            lines.push({ m: m, u: 0, v: 0, w: 5 + Math.random() * 35, len: 2 });
        }
    })();
    function resetLine(l, far) {
        var a = Math.random() * Math.PI * 2, r = 1.6 + Math.random() * 4.5;
        l.u = Math.cos(a) * r; l.v = Math.sin(a) * r * 0.7;
        l.w = far ? 30 + Math.random() * 14 : 6 + Math.random() * 36;
        l.len = 2 + Math.random() * 3.5;
    }
    lines.forEach(function (l) { resetLine(l, false); });
    function updateLines(dt) {
        var on = boostK > 0.02;
        lineMat.opacity = 0.5 * boostK;
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i];
            l.m.visible = on;
            if (!on) continue;
            l.w -= dt * 68;
            if (l.w < 2) resetLine(l, true);
            lineV.set(l.u, l.v, -l.w).applyQuaternion(camera.quaternion).add(camera.position);
            l.m.position.copy(lineV);
            l.m.quaternion.copy(camera.quaternion);
            l.m.scale.set(0.025, 0.025, l.len);
        }
    }

    // Natural Sky & Sun
    function radialTex(stops, size) {
        var cv = document.createElement('canvas');
        cv.width = cv.height = size;
        var g = cv.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        stops.forEach(function (st) { gr.addColorStop(st[0], st[1]); });
        g.fillStyle = gr;
        g.fillRect(0, 0, size, size);
        return new THREE.CanvasTexture(cv);
    }
    var sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: radialTex([[0, 'rgba(255,252,240,1)'], [0.25, 'rgba(255,242,190,0.95)'], [0.5, 'rgba(255,214,140,0.3)'], [1, 'rgba(255,180,90,0)']], 128),
        transparent: true, depthWrite: false, fog: false
    }));
    sunSpr.scale.set(54, 54, 1);
    var glowSpr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: radialTex([[0, 'rgba(255,244,200,0.6)'], [0.4, 'rgba(255,210,140,0.2)'], [1, 'rgba(255,190,120,0)']], 128),
        transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending
    }));
    glowSpr.scale.set(130, 130, 1);
    scene.add(glowSpr);
    scene.add(sunSpr);
    var SUN_EL = 14 * Math.PI / 180, SUN_AZ = -0.2;
    var SUN_DIR = new THREE.Vector3(Math.sin(SUN_AZ) * Math.cos(SUN_EL), Math.sin(SUN_EL), -Math.cos(SUN_AZ) * Math.cos(SUN_EL));

    function cloudTex(seed) {
        var cv = document.createElement('canvas');
        cv.width = 256; cv.height = 128;
        var g = cv.getContext('2d'), rnd = chunkRng(seed, 7, 9), i, n = 9, px = [], layer;
        for (i = 0; i < n; i++) px.push([46 + (i / (n - 1)) * 164 + (rnd() - 0.5) * 14, 70 - Math.sin((i / (n - 1)) * Math.PI) * (10 + rnd() * 14), 20 + rnd() * 16 + Math.sin((i / (n - 1)) * Math.PI) * 14]);
        for (layer = 0; layer < 2; layer++) {
            for (i = 0; i < n; i++) {
                var cx = px[i][0], cy = px[i][1] + (layer === 0 ? 6 : -3), r = px[i][2] * (layer === 0 ? 1 : 0.95);
                var gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
                gr.addColorStop(0, layer === 0 ? 'rgba(180,198,222,0.92)' : 'rgba(255,255,255,0.95)');
                gr.addColorStop(0.65, layer === 0 ? 'rgba(180,198,222,0.5)' : 'rgba(255,255,255,0.65)');
                gr.addColorStop(1, 'rgba(255,255,255,0)');
                g.fillStyle = gr;
                g.fillRect(cx - r, cy - r, r * 2, r * 2);
            }
        }
        return new THREE.CanvasTexture(cv);
    }
    var cloudTexs = [cloudTex(1), cloudTex(2), cloudTex(3)], clouds = [];
    (function () {
        for (var i = 0; i < 18; i++) {
            var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexs[i % 3], transparent: true, depthWrite: false, fog: false }));
            var w = 70 + Math.random() * 60;
            sp.scale.set(w, w * 0.5, 1);
            scene.add(sp);
            clouds.push({ s: sp, wx: (Math.random() - 0.5) * 280, wz: (Math.random() - 0.5) * 280, alt: 20 + Math.random() * 20, v: 0.9 + Math.random() * 1.4 });
        }
    })();
    function updateSky(dt) {
        sunSpr.position.copy(camera.position).addScaledVector(SUN_DIR, 185);
        glowSpr.position.copy(camera.position).addScaledVector(SUN_DIR, 186);
        for (var i = 0; i < clouds.length; i++) {
            var c = clouds[i];
            c.wx += dt * c.v;
            var rx = ((c.wx - pos.x + 140) % 280 + 280) % 280 - 140, rz = ((c.wz - pos.z + 140) % 280 + 280) % 280 - 140;
            var e = Math.max(Math.abs(rx), Math.abs(rz)) / 140, d = Math.hypot(rx, rz);
            c.s.position.set(pos.x + rx, c.alt, pos.z + rz);
            c.s.material.opacity = 0.9 * (1 - sstep(0.8, 1, e)) * Math.min(1, Math.max(0, (d - 30) / 40));
        }
    }

    // Optimized Minimap (radar radar with clear natural food indicators)
    var MAP_S = 164, MAP_R = 45, mapT = 0;
    var mapC = document.getElementById('minimap-canvas');
    if (!mapC) {
        mapC = document.createElement('canvas');
        mapC.id = 'minimap-canvas';
        document.body.appendChild(mapC);
    }
    mapC.width = mapC.height = MAP_S;
    var mapG = mapC.getContext('2d');
    var mapPx = 0, mapPy = 0, mapIn = true;
    function mapPt(x, z, clampIt) {
        var dx = x - pos.x, dz = z - pos.z, a = dx * Math.cos(heading) + dz * Math.sin(heading);
        var u = dx * Math.sin(heading) - dz * Math.cos(heading), d = Math.hypot(a, u), k = (MAP_S / 2 - 8) / MAP_R;
        mapIn = d <= MAP_R;
        if (!mapIn) { if (!clampIt) return false; a *= MAP_R / d; u *= MAP_R / d; }
        mapPx = MAP_S / 2 + a * k; mapPy = MAP_S / 2 - u * k;
        return true;
    }

    function drawMinimapFood(kind, type, big) {
        var g = mapG, r = big;
        if (kind === 'food') {
            // Crisp apple: bright coral dot
            g.fillStyle = '#e8484d'; g.beginPath();
            g.arc(mapPx, mapPy, r, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.stroke();
        } else if (kind === 'wild_food') {
            // Varied wild food types
            var col = type === 0 ? '#e8484d' : type === 1 ? '#e6ba8c' : type === 2 ? '#9e62cf' : '#e5ad28';
            g.beginPath(); g.arc(mapPx, mapPy, r, 0, Math.PI * 2);
            g.fillStyle = col; g.fill();
            g.strokeStyle = '#ffffff'; g.lineWidth = 1.0; g.stroke();
        } else {
            g.beginPath(); g.arc(mapPx, mapPy, r, 0, Math.PI * 2);
            g.fillStyle = kind === 'speed' ? '#e2a325' : '#45b84c';
            g.fill();
            g.strokeStyle = '#ffffff'; g.lineWidth = 1.4; g.stroke();
        }
    }

    function updateMinimap(dt) {
        mapT -= dt;
        if (mapT > 0) return;
        mapT = 0.04;
        var g = mapG, c = MAP_S / 2, i, a, b, ch, it, o, pulse = 1 + 0.2 * Math.sin(performance.now() / 150);
        var cx = Math.floor(pos.x / CHUNK), cz = Math.floor(pos.z / CHUNK);
        g.clearRect(0, 0, MAP_S, MAP_S);

        // Clip terrain to radar circle
        g.save();
        g.beginPath(); g.arc(c, c, c - 3, 0, Math.PI * 2); g.clip();
        var CP = 6, nn = Math.ceil(MAP_S / CP), hc = Math.cos(heading), hs = Math.sin(heading), kk = (MAP_S / 2 - 8) / MAP_R, ii, jj, sa, su, wm;
        for (ii = 0; ii < nn; ii++) for (jj = 0; jj < nn; jj++) {
            sa = ((ii + 0.5) * CP - c) / kk; su = (c - (jj + 0.5) * CP) / kk;
            terrainW(pos.x + sa * hc + su * hs, pos.z + sa * hs - su * hc);
            wm = Math.max(TW.s, TW.g, TW.r);
            if (wm < 0.05) continue;
            g.globalAlpha = Math.min(0.75, wm);
            g.fillStyle = (TW.s >= TW.g && TW.s >= TW.r) ? '#385e43' : (TW.g >= TW.r ? '#2d6330' : '#8c8476');
            g.fillRect(ii * CP, jj * CP, CP, CP);
        }
        g.globalAlpha = 1;
        g.restore();

        // Compass grid lines
        g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
        g.beginPath(); g.arc(c, c, (c - 8) * 0.5, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(c, 8); g.lineTo(c, MAP_S - 8); g.moveTo(8, c); g.lineTo(MAP_S - 8, c); g.stroke();

        // Obstacles (slate dots)
        for (a = -2; a <= 2; a++) for (b = -2; b <= 2; b++) {
            ch = chunks[(cx + a) + ',' + (cz + b)];
            if (!ch) continue;
            g.fillStyle = 'rgba(180,185,195,0.4)';
            for (i = 0; i < ch.obs.length; i++) {
                o = ch.obs[i];
                if (mapPt(o.x, o.z, false)) g.fillRect(mapPx - 1.5, mapPy - 1.5, 3, 3);
            }
        }

        // Wild food & pickups
        for (a = -2; a <= 2; a++) for (b = -2; b <= 2; b++) {
            ch = chunks[(cx + a) + ',' + (cz + b)];
            if (ch) for (i = 0; i < ch.items.length; i++) {
                it = ch.items[i];
                if (mapPt(it.x, it.z, true)) {
                    g.globalAlpha = mapIn ? 1 : 0.72;
                    var rad = it.kind === 'food' ? 4.5 : it.kind === 'wild_food' ? (it.type === 3 ? 5.2 : 4.0) : 5.0 * pulse;
                    drawMinimapFood(it.kind, it.type, rad);
                }
            }
        }
        g.globalAlpha = 1;

        // Snake Body: connected forest green trail
        g.fillStyle = '#54a34b';
        for (i = 0; i < segs.length; i += 2) {
            if (mapPt(segs[i].position.x, segs[i].position.z, false)) {
                g.beginPath(); g.arc(mapPx, mapPy, 2.2, 0, Math.PI * 2); g.fill();
            }
        }
        // Head arrow (always points straight forward)
        g.fillStyle = '#e5ad28'; g.strokeStyle = '#ffffff'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(c, c - 8); g.lineTo(c + 5, c + 5); g.lineTo(c, c + 2); g.lineTo(c - 5, c + 5); g.closePath();
        g.fill(); g.stroke();
    }

    // State
    var head, segs, trail, pos, heading, speed, score, length, alive;
    var camHeading, camPos = new THREE.Vector3();
    var tilt = 0, fov = 68;
    var animT = 0, headPop = 0;
    var keys = {};

    var elScore = document.getElementById('score');
    var elLength = document.getElementById('length');
    var elFood = document.getElementById('food-count') || document.getElementById('crystals');
    var elOver = document.getElementById('gameover');
    var elFinal = document.getElementById('finalscore');
    var elStats = document.getElementById('finalstats');
    var elBoostBadge = document.getElementById('badge-boost');
    var elGrowBadge = document.getElementById('badge-grow');
    var elTerrBadge = document.getElementById('badge-terrain');
    var elVig = document.getElementById('vignette');
    var hideK = 0, hideO = -1;

    function addSegment(instant) {
        var k = segs.length;
        var bodyMat = bodyMats[k % bodyMats.length];
        var bodyGeo = new THREE.SphereGeometry(BODY_R, 20, 16);
        var m = new THREE.Mesh(bodyGeo, bodyMat);
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.born = instant ? -99 : animT;

        // Subtle ventral underbelly patch for natural anatomy
        var bellyGeo = new THREE.SphereGeometry(BODY_R * 0.95, 14, 10);
        var belly = new THREE.Mesh(bellyGeo, underbellyMat);
        belly.position.set(0, -BODY_R * 0.28, 0);
        belly.scale.set(0.95, 0.45, 1.05);
        m.add(belly);

        m.position.set(pos.x, BODY_R, pos.z);
        scene.add(m);
        segs.push(m);
    }

    function nearSnake(x, z, d) {
        if (Math.hypot(x - pos.x, z - pos.z) < d) return true;
        for (var i = 0; i < segs.length; i++) {
            if (Math.hypot(x - segs[i].position.x, z - segs[i].position.z) < d) return true;
        }
        return false;
    }

    function reset() {
        if (segs) segs.forEach(function (s) { scene.remove(s); });
        if (head) scene.remove(head);

        pos = { x: 0, z: 0 };
        heading = 0;
        speed = BASE_SPEED;
        score = 0;
        length = START_SEGMENTS;
        foodHarvested = 0;
        alive = true;
        segs = [];
        trail = [];

        head = buildHead();
        head.position.set(0, HEAD_R, 0);
        scene.add(head);
        headPop = 0;

        // Pre-fill trail straight behind the head
        for (var i = 0; i < 400; i++) {
            trail.push({ x: 0, z: i * 0.05 });
        }
        for (var s = 0; s < START_SEGMENTS; s++) addSegment(true);
        layoutSegments();

        camHeading = heading;
        var f = fwd(camHeading);
        camPos.set(pos.x - f.x * 6.2, 3.2, pos.z - f.z * 6.2);
        camera.position.copy(camPos);

        collected = new Set();
        boostT = 0; boostK = 0; growQueue = 0; growTimer = 0; growGlow = 0;
        mouthOpen = 0; kick = 0; waves = []; terrK = 1; terrName = ''; hideK = 0; hideO = -1;
        if (elVig) elVig.style.opacity = '0';
        updateBadges();
        clearChunks();
        forceTerrain(pos.x, pos.z);
        updateChunks(true);
        ensureNearFood();
        updateHud();
        if (elOver) elOver.classList.add('hidden');
    }

    function fwd(h) { return { x: Math.sin(h), z: -Math.cos(h) }; }

    function updateHud() {
        if (elScore) elScore.textContent = 'SCORE ' + score;
        if (elLength) elLength.textContent = 'LENGTH ' + length;
        if (elFood) elFood.textContent = 'FOOD ' + foodHarvested;
    }

    function updateBadges() {
        if (elBoostBadge) {
            if (boostT > 0) {
                elBoostBadge.textContent = 'SPEED SURGE ' + boostT.toFixed(1) + 's';
                elBoostBadge.style.display = 'block';
            } else {
                elBoostBadge.style.display = 'none';
            }
        }
        if (elGrowBadge) {
            if (growQueue > 0 || growGlow > 0.05) {
                elGrowBadge.textContent = 'GROWING' + (growQueue > 0 ? ' +' + growQueue : '');
                elGrowBadge.style.display = 'block';
            } else {
                elGrowBadge.style.display = 'none';
            }
        }
        if (elTerrBadge) {
            if (terrName) {
                var info = {
                    swamp: 'SWAMP \u2014 SLOWED',
                    grass: 'TALL GRASS \u2014 CONCEALED & SLOWED',
                    rock: 'ROCKY CRAGS \u2014 SLOWED'
                }[terrName];
                elTerrBadge.textContent = info || '';
                elTerrBadge.style.display = 'block';
            } else {
                elTerrBadge.style.display = 'none';
            }
        }
    }

    // Smooth connected movement & spine-aligned segment orientation
    var segDir = new THREE.Vector3();
    function layoutSegments() {
        var acc = 0, idx = 0, n = segs.length;
        var px = pos.x, pz = pos.z;
        for (var i = 0; i < trail.length && idx < n; i++) {
            var p = trail[i];
            var d = Math.hypot(p.x - px, p.z - pz);
            if (d > 0) {
                while (idx < n && acc + d >= SPACING * (idx + 1)) {
                    var t = (SPACING * (idx + 1) - acc) / d;
                    var nx = px + (p.x - px) * t;
                    var nz = pz + (p.z - pz) * t;
                    segs[idx].position.set(nx, BODY_R, nz);
                    // Orient segment to flow smoothly along spine curve
                    var prevX = idx === 0 ? pos.x : segs[idx - 1].position.x;
                    var prevZ = idx === 0 ? pos.z : segs[idx - 1].position.z;
                    segDir.set(prevX - nx, 0, prevZ - nz);
                    if (segDir.lengthSq() > 0.001) {
                        segs[idx].rotation.y = Math.atan2(segDir.x, segDir.z);
                    }
                    idx++;
                }
                acc += d;
            }
            px = p.x; pz = p.z;
        }
        var last = trail[trail.length - 1];
        for (; idx < n; idx++) segs[idx].position.set(last.x, BODY_R, last.z);

        // Natural serpent taper: neck thickens, body stays supple, tail tapers to a slender tip
        for (var k = 0; k < n; k++) {
            var normK = k / Math.max(1, n - 1);
            // Realistic serpentine thickness profile: gentle swelling at middle, tapered tail
            var taper = (1.05 - 0.52 * Math.pow(normK, 1.4));
            // Subtle undulating breathing wave
            var undulate = 1 + 0.035 * Math.sin(animT * 8 - k * 0.7);
            var sc = taper * undulate;

            var age = (animT - segs[k].userData.born) / 0.35, bump = 0;
            if (age < 1) { age = Math.max(0, age) - 1; sc *= 1 + 2.4 * age * age * age + 1.4 * age * age; }
            for (var wi = 0; wi < waves.length; wi++) {
                var wd = k - waves[wi].p;
                bump += waves[wi].a * Math.exp(-wd * wd / (2 * waves[wi].s * waves[wi].s));
            }
            sc *= 1 + bump;
            // Overlapping elliptical scales for continuous connected serpent body
            segs[k].scale.set(sc * 1.05, sc * 0.88, sc * 1.15);
            segs[k].position.y = BODY_R * (sc * 0.9);
        }
    }

    function gameOver() {
        alive = false;
        if (elFinal) elFinal.textContent = 'FINAL SCORE ' + score;
        if (elStats) elStats.innerHTML = 'Length: <b>' + length + '</b> &bull; Food Foraged: <b>' + foodHarvested + '</b>';
        if (elOver) elOver.classList.remove('hidden');
    }

    function update(dt) {
        animT += dt;
        var turn = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) turn -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) turn += 1;
        if (keys['ArrowUp'] || keys['KeyW']) speed = BASE_SPEED * 1.55;
        else if (keys['ArrowDown'] || keys['KeyS']) speed = BASE_SPEED * 0.65;
        else speed = BASE_SPEED;

        if (boostT > 0) speed *= BOOST_MULT;
        terrainW(pos.x, pos.z);
        terrK += ((1 - SLOW.s * TW.s - SLOW.g * TW.g - SLOW.r * TW.r) - terrK) * Math.min(1, dt * 6);
        speed *= terrK;
        hideK += (sstep(0.35, 0.8, TW.g) - hideK) * Math.min(1, dt * 5);
        if (Math.round(hideK * 50) / 50 !== hideO) {
            hideO = Math.round(hideK * 50) / 50;
            if (elVig) elVig.style.opacity = hideO.toString();
        }
        terrName = TW.s > 0.5 ? 'swamp' : TW.g > 0.5 ? 'grass' : TW.r > 0.5 ? 'rock' : '';

        if (alive) {
            if (boostT > 0) boostT = Math.max(0, boostT - dt);
            if (growQueue > 0) {
                growTimer -= dt;
                if (growTimer <= 0) {
                    growTimer = 0.16;
                    growQueue--;
                    length++;
                    addSegment();
                    addWave(0.3, 22, 1.0);
                    updateHud();
                }
            }
            if (boostT > 0 && (sparkT -= dt) <= 0) {
                sparkT = 0.04;
                spark(pos.x - Math.sin(heading) * 0.6, pos.z + Math.cos(heading) * 0.6);
            }
            if (terrName && (puffT -= dt) <= 0) {
                puffT = 0.07;
                spark(pos.x - Math.sin(heading) * 0.5, pos.z + Math.cos(heading) * 0.5, TERR_COLS[terrName]);
            }
            heading += turn * TURN_RATE * dt;
            var f = fwd(heading);
            pos.x += f.x * speed * dt;
            pos.z += f.z * speed * dt;

            var t0 = trail[0];
            if (Math.hypot(pos.x - t0.x, pos.z - t0.z) > 0.05) {
                trail.unshift({ x: pos.x, z: pos.z });
                var maxLen = Math.ceil((segs.length + 2) * SPACING / 0.05) + 40;
                if (trail.length > maxLen * 2) trail.length = maxLen * 2;
            }
            head.position.set(pos.x, HEAD_R, pos.z);
            head.rotation.y = -heading;
            layoutSegments();

            // Self collision (skip front segments near head)
            for (var i = 5; i < segs.length; i++) {
                var sp = segs[i].position;
                if (Math.hypot(pos.x - sp.x, pos.z - sp.z) < HEAD_R + BODY_R - 0.28) {
                    gameOver();
                    break;
                }
            }

            if (alive && hitObstacle(pos.x, pos.z, HEAD_R * 0.85)) gameOver();
            if (alive) collectPickups();
        }

        var now = performance.now() / 1000;
        updateGround(pos.x, pos.z);
        updateTerrain(pos.x, pos.z);
        grassU.t.value = now;
        grassU.snake.value.set(pos.x, 0, pos.z);
        sun.target.position.set(pos.x, 0, pos.z);
        sun.position.set(pos.x + 12, 34, pos.z + 10);
        updateChunks(false);
        animateItems(now, dt);
        updateFx(dt);
        nearT -= dt;
        if (nearT <= 0) { nearT = 0.5; ensureNearFood(); }

        // Realistic tongue flick
        var tp = (now % 1.6) / 0.45;
        var tg = head.userData.tongue;
        tg.visible = tp < 1 && mouthOpen < 0.05;
        tg.scale.z = Math.max(0.05, Math.sin(Math.min(tp, 1) * Math.PI));
        headPop = Math.max(0, headPop - dt * 4.5);
        head.scale.setScalar(1 + 0.25 * headPop);

        // Natural jaw opening animation when eating
        mouthOpen = Math.max(0, mouthOpen - dt * 3.2);
        var open = Math.min(1, mouthOpen * 2), hm = head.userData.mouth;
        hm.visible = open > 0.03;
        hm.scale.set(1.05, 0.05 + 1.1 * open, 1.15);
        head.userData.snout.position.y = -0.06 + 0.12 * open;

        // Waves down the spine
        for (var wv = waves.length - 1; wv >= 0; wv--) {
            waves[wv].p += waves[wv].v * dt;
            if (waves[wv].p > segs.length + 3) waves.splice(wv, 1);
        }
        if (!alive) layoutSegments();

        // Boost & grow subtle earthen emissive
        boostK += ((boostT > 0 ? 1 : 0) - boostK) * Math.min(1, dt * 6);
        growGlow = Math.max(0, growGlow - dt * (growQueue > 0 ? 0 : 0.8));
        kick = Math.max(0, kick - dt * 2.5);
        var bI = boostK * (0.35 + 0.1 * Math.sin(animT * 18)), gI = growGlow * 0.5;
        var gc = gI > bI ? 0x228833 : 0xaa6600, gv = Math.max(gI, bI);
        headMat.emissive.setHex(gc); headMat.emissiveIntensity = gv;
        for (var bm = 0; bm < bodyMats.length; bm++) {
            bodyMats[bm].emissive.setHex(gc);
            bodyMats[bm].emissiveIntensity = gv;
        }
        updateBadges();

        for (var pi = parts.length - 1; pi >= 0; pi--) {
            var p = parts[pi];
            p.life -= dt;
            p.vy -= 11 * dt;
            p.m.position.x += p.vx * dt;
            p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt);
            p.m.position.z += p.vz * dt;
            p.m.material.opacity = Math.max(0, p.life / 0.75);
            if (p.life <= 0) {
                scene.remove(p.m);
                p.m.material.dispose();
                parts.splice(pi, 1);
            }
        }

        // Smooth third-person chase camera
        var dh = heading - camHeading;
        dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        camHeading += dh * Math.min(1, dt * 4.2);
        var cf = fwd(camHeading);
        var back = 6.4 + boostK * 1.3;
        var tx = pos.x - cf.x * back;
        var tz = pos.z - cf.z * back;
        var k = Math.min(1, dt * 6.5);
        camPos.x += (tx - camPos.x) * k;
        camPos.y += (3.3 - camPos.y) * k;
        camPos.z += (tz - camPos.z) * k;
        camera.position.copy(camPos);
        camera.lookAt(pos.x + cf.x * 4.2, 0.65, pos.z + cf.z * 4.2);

        // FOV & subtle camera roll into turns
        var fovT = 68 + (speed - BASE_SPEED) * 1.5 + boostK * 5.5 + kick * 6.5;
        fov += (fovT - fov) * Math.min(1, dt * 4);
        if (Math.abs(camera.fov - fov) > 0.01) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
        }
        tilt += ((alive ? turn : 0) * 0.065 - tilt) * Math.min(1, dt * 5);
        camera.rotateZ(-tilt);
        if (boostK > 0.05) {
            camera.position.x += (Math.random() - 0.5) * 0.05 * boostK;
            camera.position.y += (Math.random() - 0.5) * 0.05 * boostK;
        }

        updateLines(dt);
        updateMinimap(dt);
        updateSky(dt);
    }

    window.addEventListener('keydown', function (e) {
        keys[e.code] = true;
        if (e.code.indexOf('Arrow') === 0 || e.code === 'Space') e.preventDefault();
        if (!alive && (e.code === 'Enter' || e.code === 'Space')) reset();
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });
    window.addEventListener('blur', function () { keys = {}; });

    var btnRestart = document.getElementById('restart');
    if (btnRestart) btnRestart.addEventListener('click', reset);

    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    var last = performance.now();
    function loop(now) {
        var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
        last = now;
        update(dt);
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
    }

    // Expose reset to external UI if needed
    window.__snakeReset = reset;

    reset();
    requestAnimationFrame(loop);
})();
