// ==================== 全局变量 ====================  
var video = document.getElementById('video');  
var cameraCanvas = document.getElementById('camera-canvas');  
var cameraCtx = cameraCanvas.getContext('2d');  
var fogCanvas = document.getElementById('fog-canvas');  
var fogCtx = fogCanvas.getContext('2d');  
var threeContainer = document.getElementById('three-container');  
var hatCanvas = document.getElementById('hat-canvas');  
var hatCtx = hatCanvas.getContext('2d');  
var hatImg = document.getElementById('hat-img');  
var startOverlay = document.getElementById('start-overlay');  
var startBtn = document.getElementById('start-btn');  
var hint = document.getElementById('hint');  
var countdown = document.getElementById('countdown');  
var flash = document.getElementById('flash');  
var bgm = document.getElementById('bgm');  
var finalDisplay = document.getElementById('final-display');  
  
var photo1 = null, photo2 = null, photo3 = null;  
var currentStep = 0;  
var isDrawing = false;  
var clearedPixels = 0;  
var lastX = 0, lastY = 0;  
var isTouchDevice = false;  
  
// Three.js  
var scene, camera3d, renderer, particles, star;  
var treePositions = [], snowPositions = [], auraPositions = [];  
var isSnowing = true, isTreeFormed = false, isAuraMode = false;  
var auraTime = 0;  
  
// 手势检测  
var hands = null;  
var handsClaspedStart = 0;  
var handsClasped = false;  
var step2TimeoutId = null;  
  
// 人脸检测  
var faceMesh = null;  
  
// ==================== 工具函数 ====================  
function resizeCanvas() {  
    var w = window.innerWidth, h = window.innerHeight;  
    cameraCanvas.width = fogCanvas.width = hatCanvas.width = w;  
    cameraCanvas.height = fogCanvas.height = hatCanvas.height = h;  
}  
  
// ==================== 摄像头 ====================  
function startCamera() {  
    return navigator.mediaDevices.getUserMedia({  
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },  
        audio: false  
    }).then(function(stream) {  
        video.srcObject = stream;  
        return video.play();  
    }).then(function() { return true; })  
    .catch(function(e) {  
        alert('无法访问摄像头: ' + e.message);  
        return false;  
    });  
}  
  
function drawCamera() {  
    if (video.readyState >= 2) {  
        cameraCtx.save();  
        cameraCtx.translate(cameraCanvas.width, 0);  
        cameraCtx.scale(-1, 1);  
        cameraCtx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);  
        cameraCtx.restore();  
    }  
    if (currentStep !== 3) requestAnimationFrame(drawCamera);  
}  
  
// ==================== 第一步：擦雾气 ====================  
function initFog() {  
    fogCtx.fillStyle = 'rgba(255, 255, 255, 0.92)';  
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);  
    for (var i = 0; i < 20000; i++) {  
        var x = Math.random() * fogCanvas.width;  
        var y = Math.random() * fogCanvas.height;  
        var g = 200 + Math.random() * 55;  
        fogCtx.fillStyle = 'rgba(' + g + ',' + g + ',' + g + ',' + (Math.random() * 0.3) + ')';  
        fogCtx.fillRect(x, y, 2, 2);  
    }  
    clearedPixels = 0;  
}  
  
function clearFog(x, y) {  
    var radius = isTouchDevice ? 45 : 70;  
    fogCtx.globalCompositeOperation = 'destination-out';  
    fogCtx.beginPath();  
    fogCtx.lineWidth = radius * 2;  
    fogCtx.lineCap = 'round';  
    fogCtx.moveTo(lastX || x, lastY || y);  
    fogCtx.lineTo(x, y);  
    fogCtx.stroke();  
    fogCtx.globalCompositeOperation = 'source-over';  
    lastX = x; lastY = y;  
    clearedPixels += radius * 2;  
      
    var total = fogCanvas.width * fogCanvas.height;  
    var progress = (clearedPixels / total) * 100;  
    if (progress >= 6 && currentStep === 1) {  
        currentStep = 2;  
        takePhoto(1);  
        setTimeout(goToStep2, 500);  
    }  
}  
  
// ==================== 截图 ====================  
function takePhoto(step) {  
    flash.classList.add('active');  
    setTimeout(function() { flash.classList.remove('active'); }, 150);  
      
    var tc = document.createElement('canvas');  
    tc.width = cameraCanvas.width; tc.height = cameraCanvas.height;  
    var tx = tc.getContext('2d');  
    tx.drawImage(cameraCanvas, 0, 0);  
      
    if (step === 1) tx.drawImage(fogCanvas, 0, 0);  
    if ((step === 2 || step === 3) && renderer) {  
        renderer.render(scene, camera3d);  
        tx.drawImage(renderer.domElement, 0, 0, tc.width, tc.height);  
    }  
    if (step === 3) tx.drawImage(hatCanvas, 0, 0);  
      
    var data = tc.toDataURL('image/jpeg', 0.85);  
    if (step === 1) photo1 = data;  
    if (step === 2) photo2 = data;  
    if (step === 3) photo3 = data;  
}  
  
// ==================== 第二步：圣诞树 ====================  
function goToStep2() {  
    hint.textContent = ''; hint.classList.remove('show');  
    fogCanvas.style.transition = 'opacity 1.5s';  
    fogCanvas.style.opacity = '0';  
      
    setTimeout(function() {  
        fogCanvas.style.display = 'none';  
        bgm.muted = false; bgm.volume = 1;  
        initThreeJS();  
        threeContainer.style.display = 'block';  
        animateSnow();  
        setTimeout(formTree, 3000);  
        setTimeout(transformToAura, 6000);  
        setTimeout(function() {  
            hint.textContent = '十指交叉，许个愿吧 🙏';  
            hint.classList.add('show');  
            initHands();  
            // 10秒超时自动截图  
            step2TimeoutId = setTimeout(function() {  
                if (currentStep === 2) {  
                    takePhoto(2);  
                    setTimeout(goToStep3, 500);  
                }  
            }, 10000);  
        }, 7000);  
    }, 1500);  
}  
  
function initThreeJS() {  
    var w = window.innerWidth, h = window.innerHeight;  
    scene = new THREE.Scene();  
    camera3d = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);  
    camera3d.position.z = 5;  
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });  
    renderer.setSize(w, h);  
    renderer.setClearColor(0x000000, 0);  
    threeContainer.appendChild(renderer.domElement);  
      
    var count = 2000;  
    var geo = new THREE.BufferGeometry();  
    var pos = new Float32Array(count * 3);  
    var col = new Float32Array(count * 3);  
      
    for (var i = 0; i < count; i++) {  
        var sx = (Math.random() - 0.5) * 12;  
        var sy = (Math.random() - 0.5) * 12;  
        var sz = (Math.random() - 0.5) * 6;  
        snowPositions.push(sx, sy, sz);  
          
        var ty = Math.random() * 4 - 2;  
        var tr = (2 - ty) * 0.5 * Math.random();  
        var ta = Math.random() * Math.PI * 2;  
        treePositions.push(Math.cos(ta) * tr, ty, Math.sin(ta) * tr * 0.5);  
          
        var aa = Math.random() * Math.PI * 2;  
        var ar = 2.5 + Math.random() * 2;  
        auraPositions.push(Math.cos(aa) * ar, (Math.random() - 0.5) * 4, Math.sin(aa) * ar * 0.3 - 1);  
          
        pos[i * 3] = sx; pos[i * 3 + 1] = sy; pos[i * 3 + 2] = sz;  
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1;  
    }  
      
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));  
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));  
    var mat = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });  
    particles = new THREE.Points(geo, mat);  
    scene.add(particles);  
    createStar();  
}  
  
function createStar() {  
    var geo = new THREE.BufferGeometry();  
    var pos = new Float32Array(50 * 3);  
    var col = new Float32Array(50 * 3);  
    for (var i = 0; i < 50; i++) {  
        var a = (i / 50) * Math.PI * 2;  
        var r = (i % 2 === 0) ? 0.3 : 0.15;  
        pos[i * 3] = Math.cos(a) * r;  
        pos[i * 3 + 1] = 2.2 + Math.sin(a) * r;  
        pos[i * 3 + 2] = 0;  
        col[i * 3] = 1; col[i * 3 + 1] = 0.85; col[i * 3 + 2] = 0;  
    }  
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));  
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));  
    var mat = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });  
    star = new THREE.Points(geo, mat);  
    scene.add(star);  
}  
  
function animateSnow() {  
    if (!particles || !isSnowing) return;  
    var p = particles.geometry.attributes.position.array;  
    for (var i = 0; i < p.length; i += 3) {  
        p[i + 1] -= 0.03;  
        p[i] += (Math.random() - 0.5) * 0.02;  
        if (p[i + 1] < -6) { p[i + 1] = 6; p[i] = (Math.random() - 0.5) * 12; }  
    }  
    particles.geometry.attributes.position.needsUpdate = true;  
    renderer.render(scene, camera3d);  
    requestAnimationFrame(animateSnow);  
}  
  
function formTree() {  
    isSnowing = false;  
    var p = particles.geometry.attributes.position.array;  
    var c = particles.geometry.attributes.color.array;  
    var start = Date.now();  
      
    function anim() {  
        var t = Math.min((Date.now() - start) / 2000, 1);  
        var e = 1 - Math.pow(1 - t, 3);  
        for (var i = 0; i < p.length / 3; i++) {  
            var idx = i * 3;  
            p[idx] = snowPositions[idx] + (treePositions[idx] - snowPositions[idx]) * e;  
            p[idx + 1] = snowPositions[idx + 1] + (treePositions[idx + 1] - snowPositions[idx + 1]) * e;  
            p[idx + 2] = snowPositions[idx + 2] + (treePositions[idx + 2] - snowPositions[idx + 2]) * e;  
            var cc = (i % 10) / 10;  
            if (cc < 0.7) { c[idx] = 1 - e * 0.8; c[idx + 1] = 1 - e * 0.3; c[idx + 2] = 1 - e * 0.8; }  
            else if (cc < 0.85) { c[idx] = 1; c[idx + 1] = 1 - e * 0.16; c[idx + 2] = 1 - e; }  
            else { c[idx] = 1; c[idx + 1] = 1 - e * 0.8; c[idx + 2] = 1 - e * 0.8; }  
        }  
        particles.geometry.attributes.position.needsUpdate = true;  
        particles.geometry.attributes.color.needsUpdate = true;  
        particles.rotation.y += 0.01;  
        if (star) star.rotation.y = particles.rotation.y;  
        renderer.render(scene, camera3d);  
        if (t < 1) requestAnimationFrame(anim);  
        else { isTreeFormed = true; showStar(); animateTree(); }  
    }  
    anim();  
}  
  
function showStar() {  
    if (!star) return;  
    var o = 0;  
    function f() { o += 0.05; star.material.opacity = Math.min(o, 1); if (o < 1) requestAnimationFrame(f); }  
    f();  
}  
  
function animateTree() {  
    if (!particles || isAuraMode) return;  
    particles.rotation.y += 0.005;  
    if (star) star.rotation.y = particles.rotation.y;  
    renderer.render(scene, camera3d);  
    requestAnimationFrame(animateTree);  
}  
  
function transformToAura() {  
    isAuraMode = true;  
    if (star) star.visible = false;  
    var p = particles.geometry.attributes.position.array;  
    var sp = [];  
    for (var i = 0; i < p.length; i++) sp.push(p[i]);  
    var start = Date.now();  
      
    function anim() {  
        var t = Math.min((Date.now() - start) / 2000, 1);  
        var e = 1 - Math.pow(1 - t, 3);  
        for (var i = 0; i < p.length / 3; i++) {  
            var idx = i * 3;  
            p[idx] = sp[idx] + (auraPositions[idx] - sp[idx]) * e;  
            p[idx + 1] = sp[idx + 1] + (auraPositions[idx + 1] - sp[idx + 1]) * e;  
            p[idx + 2] = sp[idx + 2] + (auraPositions[idx + 2] - sp[idx + 2]) * e;  
        }  
        particles.material.size = 0.1 + e * 0.15;  
        particles.material.opacity = 0.9 - e * 0.4;  
        particles.geometry.attributes.position.needsUpdate = true;  
        renderer.render(scene, camera3d);  
        if (t < 1) requestAnimationFrame(anim);  
        else animateAura();  
    }  
    anim();  
}  
  
function animateAura() {  
    if (!particles || !isAuraMode) return;  
    auraTime += 0.02;  
    var p = particles.geometry.attributes.position.array;  
    var c = particles.geometry.attributes.color.array;  
    for (var i = 0; i < p.length / 3; i++) {  
        var idx = i * 3;  
        var b = Math.sin(auraTime * 2 + i * 0.1) * 0.5 + 0.5;  
        p[idx + 1] = auraPositions[idx + 1] + Math.sin(auraTime + i * 0.05) * 0.1;  
        var cp = i % 3;  
        if (cp === 0) { c[idx] = 1; c[idx + 1] = 0.7 + b * 0.3; c[idx + 2] = b * 0.3; }  
        else if (cp === 1) { c[idx] = 0.2 + b * 0.2; c[idx + 1] = 0.6 + b * 0.4; c[idx + 2] = 0.2 + b * 0.2; }  
        else { c[idx] = 0.8 + b * 0.2; c[idx + 1] = 0.2 + b * 0.2; c[idx + 2] = 0.2 + b * 0.1; }  
    }  
    particles.rotation.y += 0.003;  
    particles.material.size = 0.2 + Math.sin(auraTime) * 0.05;  
    particles.geometry.attributes.position.needsUpdate = true;  
    particles.geometry.attributes.color.needsUpdate = true;  
    renderer.render(scene, camera3d);  
    requestAnimationFrame(animateAura);  
}  
  
// ==================== 手势检测：十指交叉 ====================  
function initHands() {  
    hands = new Hands({ locateFile: function(f) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + f; } });  
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });  
    hands.onResults(onHandsResults);  
    detectHands();  
}  
  
function detectHands() {  
    if (currentStep !== 2) return;  
    if (video.readyState >= 2) hands.send({ image: video });  
    requestAnimationFrame(detectHands);  
}  
  
function onHandsResults(results) {  
    if (currentStep !== 2) return;  
    if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {  
        var h1 = results.multiHandLandmarks[0][0]; // 手腕  
        var h2 = results.multiHandLandmarks[1][0];  
        var dist = Math.sqrt(Math.pow(h1.x - h2.x, 2) + Math.pow(h1.y - h2.y, 2));  
          
        if (dist < 0.2) {  
            if (!handsClasped) { handsClasped = true; handsClaspedStart = Date.now(); }  
            else if (Date.now() - handsClaspedStart > 1000) {  
                clearTimeout(step2TimeoutId);  
                takePhoto(2);  
                handsClasped = false;  
                setTimeout(goToStep3, 500);  
            }  
        } else { handsClasped = false; }  
    } else { handsClasped = false; }  
}  
  
// ==================== 第三步：圣诞帽 ====================  
function goToStep3() {  
    currentStep = 3;  
    hint.textContent = '看镜头，准备戴圣诞帽 🎅';  
    hint.classList.add('show');  
    hatCanvas.style.display = 'block';  
    initFaceMesh();  
}  
  
function initFaceMesh() {  
    faceMesh = new FaceMesh({ locateFile: function(f) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + f; } });  
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });  
    faceMesh.onResults(onFaceResults);  
    detectFace();  
    setTimeout(function() {  
        hint.textContent = '保持微笑 ✨';  
        setTimeout(function() { startCountdown(4); }, 1000);  
    }, 3000);  
}  
  
function detectFace() {  
    if (currentStep !== 3) return;  
    if (video.readyState >= 2) faceMesh.send({ image: video });  
    requestAnimationFrame(detectFace);  
}  
  
function onFaceResults(results) {  
    hatCtx.clearRect(0, 0, hatCanvas.width, hatCanvas.height);  
    if (video.readyState >= 2) {  
        cameraCtx.save();  
        cameraCtx.translate(cameraCanvas.width, 0);  
        cameraCtx.scale(-1, 1);  
        cameraCtx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);  
        cameraCtx.restore();  
    }  
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0 && hatImg.complete) {  
        var lm = results.multiFaceLandmarks[0];  
        var fh = lm[10], lt = lm[234], rt = lm[454];  
        var hx = (1 - fh.x) * hatCanvas.width;  
        var hy = fh.y * hatCanvas.height;  
        var fw = Math.abs(rt.x - lt.x) * hatCanvas.width;  
        var hw = fw * 2.2;  
        var hh = hw * (hatImg.naturalHeight / hatImg.naturalWidth);  
        var dx = (1 - rt.x) - (1 - lt.x);  
        var dy = rt.y - lt.y;  
        var angle = Math.atan2(dy, dx);  
        hatCtx.save();  
        hatCtx.translate(hx, hy - hh * 0.3);  
        hatCtx.rotate(angle);  
        hatCtx.drawImage(hatImg, -hw / 2, -hh / 2, hw, hh);  
        hatCtx.restore();  
    }  
}  
  
// ==================== 倒计时 ====================  
function startCountdown(next) {  
    var c = 3;  
    function show() {  
        if (c > 0) {  
            countdown.textContent = c;  
            countdown.classList.add('show');  
            setTimeout(function() {  
                countdown.classList.remove('show');  
                c--;  
                setTimeout(show, 300);  
            }, 700);  
        } else {  
            countdown.textContent = '📸';  
            countdown.classList.add('show');  
            takePhoto(3);  
            setTimeout(function() {  
                countdown.classList.remove('show');  
                goToStep4();  
            }, 1000);  
        }  
    }  
    show();  
}  
  
// ==================== 第四步：展示照片 ====================  
function goToStep4() {  
    currentStep = 4;  
    hint.classList.remove('show');  
    hatCanvas.style.display = 'none';  
    threeContainer.style.display = 'none';  
    finalDisplay.innerHTML =   
        '<div class="final-title">🎄 Merry Christmas 🎄</div>' +  
        '<div class="photo-container">' +  
            '<div class="polaroid"><img src="' + (photo1 || '') + '"></div>' +  
            '<div class="polaroid"><img src="' + (photo2 || '') + '"></div>' +  
            '<div class="polaroid"><img src="' + (photo3 || '') + '"></div>' +  
        '</div>';  
    finalDisplay.classList.add('show');  
}  
  
// ==================== 事件监听 ====================  
function getPos(e) {  
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };  
    return { x: e.clientX, y: e.clientY };  
}  
  
fogCanvas.addEventListener('mousedown', function(e) { if (currentStep !== 1) return; isDrawing = true; var p = getPos(e); lastX = p.x; lastY = p.y; });  
fogCanvas.addEventListener('mousemove', function(e) { if (!isDrawing || currentStep !== 1) return; var p = getPos(e); clearFog(p.x, p.y); });  
fogCanvas.addEventListener('mouseup', function() { isDrawing = false; });  
fogCanvas.addEventListener('mouseleave', function() { isDrawing = false; });  
fogCanvas.addEventListener('touchstart', function(e) { if (currentStep !== 1) return; e.preventDefault(); isTouchDevice = true; isDrawing = true; var p = getPos(e); lastX = p.x; lastY = p.y; }, { passive: false });  
fogCanvas.addEventListener('touchmove', function(e) { if (!isDrawing || currentStep !== 1) return; e.preventDefault(); var p = getPos(e); clearFog(p.x, p.y); }, { passive: false });  
fogCanvas.addEventListener('touchend', function() { isDrawing = false; });  
  
startBtn.addEventListener('click', function() {  
    startBtn.textContent = '启动中...';  
    bgm.muted = true; bgm.volume = 0;  
    bgm.play().catch(function() {});  
    resizeCanvas();  
    startCamera().then(function(ok) {  
        if (!ok) return;  
        drawCamera();  
        initFog();  
        startOverlay.classList.add('hidden');  
        hint.textContent = '用手指擦去雾气 ❄️';  
        hint.classList.add('show');  
        currentStep = 1;  
    });  
});  
  
window.addEventListener('resize', function() {  
    resizeCanvas();  
    if (currentStep === 1) initFog();  
    if (renderer) {  
        renderer.setSize(window.innerWidth, window.innerHeight);  
        camera3d.aspect = window.innerWidth / window.innerHeight;  
        camera3d.updateProjectionMatrix();  
    }  
});  
