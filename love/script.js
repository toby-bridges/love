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
  
// 截图存储  
var photo1 = null;  
var photo2 = null;  
var photo3 = null;  
  
// 当前步骤  
var currentStep = 0;  
  
// 擦除相关  
var isDrawing = false;  
var totalPixels = 0;  
var clearedPixels = 0;  
var lastX = 0;  
var lastY = 0;  
  
// Three.js 相关  
var scene, camera3d, renderer, particles, star;  
var treePositions = [];  
var snowPositions = [];  
var currentPositions = [];  
var isSnowing = true;  
var isTreeFormed = false;  
  
// FaceMesh 相关  
var faceMesh = null;  
  
// ==================== 初始化画布尺寸 ====================  
function resizeCanvas() {  
    var w = window.innerWidth;  
    var h = window.innerHeight;  
    cameraCanvas.width = w;  
    cameraCanvas.height = h;  
    fogCanvas.width = w;  
    fogCanvas.height = h;  
    hatCanvas.width = w;  
    hatCanvas.height = h;  
}  
  
// ==================== 启动摄像头 ====================  
function startCamera() {  
    return navigator.mediaDevices.getUserMedia({  
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },  
        audio: false  
    }).then(function(stream) {  
        video.srcObject = stream;  
        return video.play();  
    }).then(function() {  
        return true;  
    }).catch(function(e) {  
        alert('无法访问摄像头: ' + e.message);  
        return false;  
    });  
}  
  
// ==================== 绘制摄像头画面 ====================  
function drawCamera() {  
    if (video.readyState >= 2) {  
        cameraCtx.save();  
        cameraCtx.translate(cameraCanvas.width, 0);  
        cameraCtx.scale(-1, 1);  
        cameraCtx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);  
        cameraCtx.restore();  
    }  
    if (currentStep !== 3) {  
        requestAnimationFrame(drawCamera);  
    }  
}  
  
// ==================== 初始化雾气 ====================  
function initFog() {  
    fogCtx.fillStyle = 'rgba(255, 255, 255, 0.92)';  
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);  
      
    for (var i = 0; i < 30000; i++) {  
        var x = Math.random() * fogCanvas.width;  
        var y = Math.random() * fogCanvas.height;  
        var gray = 200 + Math.random() * 55;  
        fogCtx.fillStyle = 'rgba(' + gray + ',' + gray + ',' + gray + ',' + (Math.random() * 0.3) + ')';  
        fogCtx.fillRect(x, y, 2, 2);  
    }  
      
    totalPixels = fogCanvas.width * fogCanvas.height;  
    clearedPixels = 0;  
}  
  
// ==================== 擦除雾气 ====================  
function clearFog(x, y) {  
    var radius = 40;  
      
    fogCtx.globalCompositeOperation = 'destination-out';  
    fogCtx.beginPath();  
    fogCtx.lineWidth = radius * 2;  
    fogCtx.lineCap = 'round';  
    fogCtx.moveTo(lastX || x, lastY || y);  
    fogCtx.lineTo(x, y);  
    fogCtx.stroke();  
    fogCtx.globalCompositeOperation = 'source-over';  
      
    lastX = x;  
    lastY = y;  
    clearedPixels += radius * 2;  
      
    var progress = Math.min((clearedPixels / totalPixels) * 100, 100);  
      
    if (progress >= 8 && currentStep === 1) {  
        currentStep = 2;  
        takePhoto(1);  
        setTimeout(goToStep2, 500);  
    }  
}  
  
// ==================== 截图功能 ====================  
function takePhoto(step) {  
    flash.classList.add('active');  
    setTimeout(function() { flash.classList.remove('active'); }, 150);  
      
    var tempCanvas = document.createElement('canvas');  
    tempCanvas.width = cameraCanvas.width;  
    tempCanvas.height = cameraCanvas.height;  
    var tempCtx = tempCanvas.getContext('2d');  
      
    tempCtx.drawImage(cameraCanvas, 0, 0);  
      
    if (step === 1) {  
        tempCtx.drawImage(fogCanvas, 0, 0);  
    }  
    if (step === 2 && renderer) {  
        tempCtx.drawImage(renderer.domElement, 0, 0);  
    }  
    if (step === 3) {  
        tempCtx.drawImage(hatCanvas, 0, 0);  
    }  
      
    var data = tempCanvas.toDataURL('image/jpeg', 0.8);  
    if (step === 1) photo1 = data;  
    if (step === 2) photo2 = data;  
    if (step === 3) photo3 = data;  
      
    console.log('📸 第' + step + '张照片已保存');  
}  
  
// ==================== 进入第二步：圣诞树 ====================  
function goToStep2() {  
    hint.textContent = '';  
    hint.classList.remove('show');  
      
    fogCanvas.style.transition = 'opacity 1.5s';  
    fogCanvas.style.opacity = '0';  
      
    setTimeout(function() {  
        fogCanvas.style.display = 'none';  
          
        // 播放音乐  
        bgm.muted = false;  
        bgm.volume = 1;  
          
        // 初始化3D场景  
        initThreeJS();  
        threeContainer.style.display = 'block';  
          
        // 开始雪花飘落动画  
        animateSnow();  
          
        // 3秒后开始汇聚成树  
        setTimeout(function() {  
            formTree();  
        }, 3000);  
          
        // 5秒后移动树到角落  
        setTimeout(function() {  
            moveTreeToCorner();  
        }, 5500);  
          
        // 6秒后显示许愿提示  
        setTimeout(function() {  
            hint.textContent = '🙏 闭上眼睛，许个愿吧';  
            hint.classList.add('show');  
        }, 6000);  
          
        // 8秒后开始倒计时  
        setTimeout(function() {  
            startCountdown(3);  
        }, 8000);  
          
    }, 1500);  
}  
  
// ==================== Three.js 初始化 ====================  
function initThreeJS() {  
    var width = window.innerWidth;  
    var height = window.innerHeight;  
      
    scene = new THREE.Scene();  
      
    camera3d = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);  
    camera3d.position.z = 5;  
      
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });  
    renderer.setSize(width, height);  
    renderer.setClearColor(0x000000, 0);  
    threeContainer.appendChild(renderer.domElement);  
      
    // 创建粒子  
    var particleCount = 2500;  
    var geometry = new THREE.BufferGeometry();  
    var positions = new Float32Array(particleCount * 3);  
    var colors = new Float32Array(particleCount * 3);  
      
    for (var i = 0; i < particleCount; i++) {  
        // 雪花初始位置（满屏随机分布）  
        var snowX = (Math.random() - 0.5) * 12;  
        var snowY = (Math.random() - 0.5) * 12;  
        var snowZ = (Math.random() - 0.5) * 6;  
        snowPositions.push(snowX, snowY, snowZ);  
          
        // 圣诞树形状目标位置  
        var y = Math.random() * 4 - 2;  
        var radius = (2 - y) * 0.5 * Math.random();  
        var angle = Math.random() * Math.PI * 2;  
        var treeX = Math.cos(angle) * radius;  
        var treeZ = Math.sin(angle) * radius * 0.5;  
        treePositions.push(treeX, y, treeZ);  
          
        // 当前位置 = 雪花位置  
        currentPositions.push(snowX, snowY, snowZ);  
        positions[i * 3] = snowX;  
        positions[i * 3 + 1] = snowY;  
        positions[i * 3 + 2] = snowZ;  
          
        // 雪花颜色：白色  
        colors[i * 3] = 1;  
        colors[i * 3 + 1] = 1;  
        colors[i * 3 + 2] = 1;  
    }  
      
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));  
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));  
      
    var material = new THREE.PointsMaterial({  
        size: 0.1,  
        vertexColors: true,  
        transparent: true,  
        opacity: 0.9,  
        blending: THREE.AdditiveBlending  
    });  
      
    particles = new THREE.Points(geometry, material);  
    scene.add(particles);  
      
    // 创建星星  
    createStar();  
}  
  
// ==================== 创建星星 ====================  
function createStar() {  
    var starGeometry = new THREE.BufferGeometry();  
    var starCount = 50;  
    var starPositions = new Float32Array(starCount * 3);  
    var starColors = new Float32Array(starCount * 3);  
      
    for (var i = 0; i < starCount; i++) {  
        var angle = (i / starCount) * Math.PI * 2;  
        var isOuter = i % 2 === 0;  
        var r = isOuter ? 0.3 : 0.15;  
          
        starPositions[i * 3] = Math.cos(angle) * r;  
        starPositions[i * 3 + 1] = 2.2 + Math.sin(angle) * r;  
        starPositions[i * 3 + 2] = 0;  
          
        starColors[i * 3] = 1;  
        starColors[i * 3 + 1] = 0.85;  
        starColors[i * 3 + 2] = 0;  
    }  
      
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));  
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));  
      
    var starMaterial = new THREE.PointsMaterial({  
        size: 0.2,  
        vertexColors: true,  
        transparent: true,  
        opacity: 0,  
        blending: THREE.AdditiveBlending  
    });  
      
    star = new THREE.Points(starGeometry, starMaterial);  
    scene.add(star);  
}  
  
// ==================== 雪花飘落动画 ====================  
function animateSnow() {  
    if (!particles || !isSnowing) return;  
      
    var positions = particles.geometry.attributes.position.array;  
      
    for (var i = 0; i < positions.length; i += 3) {  
        // 向下飘落  
        positions[i + 1] -= 0.03;  
        // 左右摇摆  
        positions[i] += (Math.random() - 0.5) * 0.02;  
          
        // 循环到顶部  
        if (positions[i + 1] < -6) {  
            positions[i + 1] = 6;  
            positions[i] = (Math.random() - 0.5) * 12;  
        }  
    }  
      
    particles.geometry.attributes.position.needsUpdate = true;  
    renderer.render(scene, camera3d);  
      
    requestAnimationFrame(animateSnow);  
}  
  
// ==================== 汇聚成圣诞树 ====================  
function formTree() {  
    isSnowing = false;  
      
    var positions = particles.geometry.attributes.position.array;  
    var colors = particles.geometry.attributes.color.array;  
    var duration = 2000;  
    var startTime = Date.now();  
      
    function animate() {  
        var elapsed = Date.now() - startTime;  
        var progress = Math.min(elapsed / duration, 1);  
        var ease = 1 - Math.pow(1 - progress, 3);  
          
        for (var i = 0; i < positions.length / 3; i++) {  
            var idx = i * 3;  
              
            // 位置渐变  
            positions[idx] = snowPositions[idx] + (treePositions[idx] - snowPositions[idx]) * ease;  
            positions[idx + 1] = snowPositions[idx + 1] + (treePositions[idx + 1] - snowPositions[idx + 1]) * ease;  
            positions[idx + 2] = snowPositions[idx + 2] + (treePositions[idx + 2] - snowPositions[idx + 2]) * ease;  
              
            // 颜色渐变（白色 → 圣诞色）  
            var colorChoice = (i % 10) / 10;  
            if (colorChoice < 0.7) {  
                // 绿色  
                colors[idx] = 1 - ease * 0.8;  
                colors[idx + 1] = 1 - ease * 0.3;  
                colors[idx + 2] = 1 - ease * 0.8;  
            } else if (colorChoice < 0.85) {  
                // 金色  
                colors[idx] = 1;  
                colors[idx + 1] = 1 - ease * 0.16;  
                colors[idx + 2] = 1 - ease;  
            } else {  
                // 红色  
                colors[idx] = 1;  
                colors[idx + 1] = 1 - ease * 0.8;  
                colors[idx + 2] = 1 - ease * 0.8;  
            }  
        }  
          
        particles.geometry.attributes.position.needsUpdate = true;  
        particles.geometry.attributes.color.needsUpdate = true;  
        particles.rotation.y += 0.01;  
        if (star) star.rotation.y = particles.rotation.y;  
          
        renderer.render(scene, camera3d);  
          
        if (progress < 1) {  
            requestAnimationFrame(animate);  
        } else {  
            isTreeFormed = true;  
            showStar();  
            animateTreeRotation();  
        }  
    }  
      
    animate();  
}  
  
// ==================== 显示星星 ====================  
function showStar() {  
    if (!star) return;  
    var opacity = 0;  
    function fadeIn() {  
        opacity += 0.05;  
        star.material.opacity = Math.min(opacity, 1);  
        if (opacity < 1) requestAnimationFrame(fadeIn);  
    }  
    fadeIn();  
}  
  
// ==================== 移动树到右上角 ====================  
function moveTreeToCorner() {  
    if (!particles) return;  
      
    var duration = 1000;  
    var startTime = Date.now();  
    var startX = 0, startY = 0;  
    var targetX = 2.5, targetY = 1.5;  
      
    function animate() {  
        var elapsed = Date.now() - startTime;  
        var progress = Math.min(elapsed / duration, 1);  
        var ease = 1 - Math.pow(1 - progress, 3);  
          
        particles.position.x = startX + (targetX - startX) * ease;  
        particles.position.y = startY + (targetY - startY) * ease;  
        particles.scale.setScalar(1 - ease * 0.6);  
          
        if (star) {  
            star.position.x = particles.position.x;  
            star.position.y = particles.position.y;  
            star.scale.setScalar(1 - ease * 0.6);  
        }  
          
        if (progress < 1) requestAnimationFrame(animate);  
    }  
      
    animate();  
}  
  
// ==================== 圣诞树旋转 ====================  
function animateTreeRotation() {  
    if (!particles) return;  
    particles.rotation.y += 0.005;  
    if (star) star.rotation.y = particles.rotation.y;  
    renderer.render(scene, camera3d);  
    requestAnimationFrame(animateTreeRotation);  
}  
  
// ==================== 倒计时 ====================  
function startCountdown(nextStep) {  
    var count = 3;  
      
    function showCount() {  
        if (count > 0) {  
            countdown.textContent = count;  
            countdown.classList.add('show');  
            setTimeout(function() {  
                countdown.classList.remove('show');  
                count--;  
                setTimeout(showCount, 300);  
            }, 700);  
        } else {  
            countdown.textContent = '📸';  
            countdown.classList.add('show');  
            takePhoto(nextStep === 3 ? 2 : 3);  
            setTimeout(function() {  
                countdown.classList.remove('show');  
                if (nextStep === 3) goToStep3();  
                else if (nextStep === 4) goToStep4();  
            }, 1000);  
        }  
    }  
      
    showCount();  
}  
  
// ==================== 第三步：戴帽子 ====================  
function goToStep3() {  
    currentStep = 3;  
    hint.textContent = '🎅 看镜头，准备戴圣诞帽！';  
    hint.classList.add('show');  
    hatCanvas.style.display = 'block';  
    initFaceMesh();  
}  
  
// ==================== 初始化 FaceMesh ====================  
function initFaceMesh() {  
    faceMesh = new FaceMesh({  
        locateFile: function(file) {  
            return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + file;  
        }  
    });  
      
    faceMesh.setOptions({  
        maxNumFaces: 1,  
        refineLandmarks: true,  
        minDetectionConfidence: 0.5,  
        minTrackingConfidence: 0.5  
    });  
      
    faceMesh.onResults(onFaceResults);  
    detectFace();  
      
    setTimeout(function() {  
        hint.textContent = '✨ 保持微笑！';  
        setTimeout(function() {  
            startCountdown(4);  
        }, 1000);  
    }, 4000);  
}  
  
// ==================== 人脸检测循环 ====================  
function detectFace() {  
    if (currentStep !== 3) return;  
    if (video.readyState >= 2) {  
        faceMesh.send({ image: video });  
    }  
    requestAnimationFrame(detectFace);  
}  
  
// ==================== 人脸结果处理 ====================  
function onFaceResults(results) {  
    hatCtx.clearRect(0, 0, hatCanvas.width, hatCanvas.height);  
      
    // 绘制摄像头  
    if (video.readyState >= 2) {  
        cameraCtx.save();  
        cameraCtx.translate(cameraCanvas.width, 0);  
        cameraCtx.scale(-1, 1);  
        cameraCtx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);  
        cameraCtx.restore();  
    }  
      
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {  
        var landmarks = results.multiFaceLandmarks[0];  
        var forehead = landmarks[10];  
        var leftTemple = landmarks[234];  
        var rightTemple = landmarks[454];  
          
        var hatX = (1 - forehead.x) * hatCanvas.width;  
        var hatY = forehead.y * hatCanvas.height;  
        var faceWidth = Math.abs(rightTemple.x - leftTemple.x) * hatCanvas.width;  
        var hatWidth = faceWidth * 2.2;  
        var hatHeight = hatWidth * (hatImg.naturalHeight / hatImg.naturalWidth);  
          
        var deltaX = (1 - rightTemple.x) - (1 - leftTemple.x);  
        var deltaY = rightTemple.y - leftTemple.y;  
        var angle = Math.atan2(deltaY, deltaX);  
          
        hatCtx.save();  
        hatCtx.translate(hatX, hatY - hatHeight * 0.3);  
        hatCtx.rotate(angle);  
        hatCtx.drawImage(hatImg, -hatWidth / 2, -hatHeight / 2, hatWidth, hatHeight);  
        hatCtx.restore();  
    }  
}  
  
// ==================== 第四步：展示照片 ====================  
function goToStep4() {  
    currentStep = 4;  
    hint.classList.remove('show');  
    hatCanvas.style.display = 'none';  
    threeContainer.style.display = 'none';  
    showFinalPhotos();  
}  
  
function showFinalPhotos() {  
    finalDisplay.innerHTML =   
        '<div class="final-title">🎄 Merry Christmas 🎄</div>' +  
        '<div class="photo-container">' +  
            '<div class="polaroid"><img src="' + (photo1 || '') + '"></div>' +  
            '<div class="polaroid"><img src="' + (photo2 || '') + '"></div>' +  
            '<div class="polaroid"><img src="' + (photo3 || '') + '"></div>' +  
        '</div>';  
    finalDisplay.classList.add('show');  
}  
  
// ==================== 触摸/鼠标事件 ====================  
function getPosition(e) {  
    if (e.touches && e.touches.length > 0) {  
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };  
    }  
    return { x: e.clientX, y: e.clientY };  
}  
  
fogCanvas.addEventListener('mousedown', function(e) {  
    if (currentStep !== 1) return;  
    isDrawing = true;  
    var pos = getPosition(e);  
    lastX = pos.x;  
    lastY = pos.y;  
});  
  
fogCanvas.addEventListener('mousemove', function(e) {  
    if (!isDrawing || currentStep !== 1) return;  
    var pos = getPosition(e);  
    clearFog(pos.x, pos.y);  
});  
  
fogCanvas.addEventListener('mouseup', function() { isDrawing = false; });  
fogCanvas.addEventListener('mouseleave', function() { isDrawing = false; });  
  
fogCanvas.addEventListener('touchstart', function(e) {  
    if (currentStep !== 1) return;  
    e.preventDefault();  
    isDrawing = true;  
    var pos = getPosition(e);  
    lastX = pos.x;  
    lastY = pos.y;  
}, { passive: false });  
  
fogCanvas.addEventListener('touchmove', function(e) {  
    if (!isDrawing || currentStep !== 1) return;  
    e.preventDefault();  
    var pos = getPosition(e);  
    clearFog(pos.x, pos.y);  
}, { passive: false });  
  
fogCanvas.addEventListener('touchend', function() { isDrawing = false; });  
  
// ==================== 开始按钮 ====================  
startBtn.addEventListener('click', function() {  
    startBtn.textContent = '启动中...';  
      
    // iOS 音频预热  
    bgm.muted = true;  
    bgm.volume = 0;  
    bgm.play().catch(function() {});  
      
    resizeCanvas();  
      
    startCamera().then(function(success) {  
        if (!success) return;  
          
        drawCamera();  
        initFog();  
          
        startOverlay.classList.add('hidden');  
        hint.textContent = '用手指擦去雾气 ❄️';  
        hint.classList.add('show');  
        currentStep = 1;  
    });  
});  
  
// ==================== 窗口大小变化 ====================  
window.addEventListener('resize', function() {  
    resizeCanvas();  
    if (currentStep === 1) initFog();  
    if (renderer) {  
        renderer.setSize(window.innerWidth, window.innerHeight);  
        camera3d.aspect = window.innerWidth / window.innerHeight;  
        camera3d.updateProjectionMatrix();  
    }  
});  
