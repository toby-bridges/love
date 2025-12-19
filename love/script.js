// ==================== 全局变量 ====================  
const video = document.getElementById('video');  
const cameraCanvas = document.getElementById('camera-canvas');  
const cameraCtx = cameraCanvas.getContext('2d');  
const fogCanvas = document.getElementById('fog-canvas');  
const fogCtx = fogCanvas.getContext('2d');  
const threeContainer = document.getElementById('three-container');  
const hatCanvas = document.getElementById('hat-canvas');  
const hatCtx = hatCanvas.getContext('2d');  
const hatImg = document.getElementById('hat-img');  
const startOverlay = document.getElementById('start-overlay');  
const startBtn = document.getElementById('start-btn');  
const hint = document.getElementById('hint');  
const countdown = document.getElementById('countdown');  
const flash = document.getElementById('flash');  
const bgm = document.getElementById('bgm');  
const finalDisplay = document.getElementById('final-display');  
  
// 截图存储  
let photo1 = null;  
let photo2 = null;  
let photo3 = null;  
  
// 当前步骤  
let currentStep = 0;  
  
// 擦除相关  
let isDrawing = false;  
let totalPixels = 0;  
let clearedPixels = 0;  
let lastX = 0;  
let lastY = 0;  
  
// Three.js 相关  
let scene, camera3d, renderer, particles, star;  
let treePositions = [];  
let snowPositions = [];  
let isTreeFormed = false;  
let isTreeMoved = false;  
  
// FaceMesh 相关  
let faceMesh = null;  
let faceDetected = false;  
  
// ==================== 初始化画布尺寸 ====================  
function resizeCanvas() {  
    const w = window.innerWidth;  
    const h = window.innerHeight;  
    cameraCanvas.width = w;  
    cameraCanvas.height = h;  
    fogCanvas.width = w;  
    fogCanvas.height = h;  
    hatCanvas.width = w;  
    hatCanvas.height = h;  
}  
  
// ==================== 启动摄像头 ====================  
async function startCamera() {  
    try {  
        const stream = await navigator.mediaDevices.getUserMedia({  
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },  
            audio: false  
        });  
        video.srcObject = stream;  
        await video.play();  
        return true;  
    } catch (e) {  
        alert('无法访问摄像头: ' + e.message);  
        return false;  
    }  
}  
  
// ==================== 绘制摄像头画面 ====================  
function drawCamera() {  
    if (video.readyState >= 2) {  
        cameraCtx.save();  
        cameraCtx.translate(cameraCanvas.width, 0);  
        cameraCtx.scale(-1, 1);  
          
        const videoRatio = video.videoWidth / video.videoHeight;  
        const canvasRatio = cameraCanvas.width / cameraCanvas.height;  
        let drawWidth, drawHeight, offsetX, offsetY;  
          
        if (canvasRatio > videoRatio) {  
            drawWidth = cameraCanvas.width;  
            drawHeight = cameraCanvas.width / videoRatio;  
            offsetX = 0;  
            offsetY = (cameraCanvas.height - drawHeight) / 2;  
        } else {  
            drawHeight = cameraCanvas.height;  
            drawWidth = cameraCanvas.height * videoRatio;  
            offsetX = (cameraCanvas.width - drawWidth) / 2;  
            offsetY = 0;  
        }  
          
        cameraCtx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);  
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
      
    for (let i = 0; i < 30000; i++) {  
        const x = Math.random() * fogCanvas.width;  
        const y = Math.random() * fogCanvas.height;  
        const gray = 200 + Math.random() * 55;  
        fogCtx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, ${Math.random() * 0.3})`;  
        fogCtx.fillRect(x, y, 2, 2);  
    }  
      
    totalPixels = fogCanvas.width * fogCanvas.height;  
    clearedPixels = 0;  
}  
  
// ==================== 擦除雾气 ====================  
function clearFog(x, y) {  
    const radius = 40;  
      
    fogCtx.globalCompositeOperation = 'destination-out';  
    fogCtx.beginPath();  
    fogCtx.lineWidth = radius * 2;  
    fogCtx.lineCap = 'round';  
    fogCtx.lineJoin = 'round';  
    fogCtx.moveTo(lastX || x, lastY || y);  
    fogCtx.lineTo(x, y);  
    fogCtx.stroke();  
    fogCtx.globalCompositeOperation = 'source-over';  
      
    lastX = x;  
    lastY = y;  
      
    clearedPixels += radius * 2;  
    const progress = Math.min((clearedPixels / totalPixels) * 100, 100);  
      
    if (progress >= 8 && currentStep === 1) {  
        currentStep = 2;  
        takePhoto(1);  
        setTimeout(goToStep2, 500);  
    }  
}  
  
// ==================== 截图功能 ====================  
function takePhoto(step) {  
    flash.classList.add('active');  
    setTimeout(() => flash.classList.remove('active'), 150);  
      
    const tempCanvas = document.createElement('canvas');  
    tempCanvas.width = cameraCanvas.width;  
    tempCanvas.height = cameraCanvas.height;  
    const tempCtx = tempCanvas.getContext('2d');  
      
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
      
    const data = tempCanvas.toDataURL('image/jpeg', 0.8);  
    if (step === 1) photo1 = data;  
    if (step === 2) photo2 = data;  
    if (step === 3) photo3 = data;  
      
    console.log(`📸 第${step}张照片已保存`);  
}  
  
// ==================== 进入第二步：圣诞树 ====================  
function goToStep2() {  
    hint.textContent = '';  
    hint.classList.remove('show');  
      
    fogCanvas.style.transition = 'opacity 1.5s ease-out';  
    fogCanvas.style.opacity = '0';  
      
    setTimeout(() => {  
        fogCanvas.style.display = 'none';  
          
        bgm.muted = false;  
        bgm.volume = 1;  
          
        initThreeJS();  
        threeContainer.style.display = 'block';  
          
        animateSnow();  
          
        setTimeout(() => {  
            formTree();  
        }, 2000);  
          
        // 树形成后，显示提示并移动树到角落  
        setTimeout(() => {  
            hint.textContent = '🙏 闭上眼睛，许个愿吧';  
            hint.classList.add('show');  
            // 移动树到右上角  
            moveTreeToCorner();  
        }, 4000);  
          
        setTimeout(() => {  
            startCountdown(2);  
        }, 6000);  
          
    }, 1500);  
}  
  
// ==================== 移动树到右上角 ====================  
function moveTreeToCorner() {  
    if (!particles || isTreeMoved) return;  
    isTreeMoved = true;  
      
    const duration = 1000; // 1秒移动动画  
    const startTime = Date.now();  
      
    // 起始位置  
    const startX = particles.position.x;  
    const startY = particles.position.y;  
    const startScale = 1;  
      
    // 目标位置（右上角）  
    const targetX = 2.5;  
    const targetY = 1.8;  
    const targetScale = 0.4;  
      
    function animateMove() {  
        const elapsed = Date.now() - startTime;  
        const progress = Math.min(elapsed / duration, 1);  
          
        // 缓动  
        const easeProgress = 1 - Math.pow(1 - progress, 3);  
          
        // 移动位置  
        particles.position.x = startX + (targetX - startX) * easeProgress;  
        particles.position.y = startY + (targetY - startY) * easeProgress;  
          
        // 缩小  
        const scale = startScale + (targetScale - startScale) * easeProgress;  
        particles.scale.set(scale, scale, scale);  
          
        // 星星跟随  
        if (star) {  
            star.position.x = particles.position.x;  
            star.position.y = particles.position.y;  
            star.scale.set(scale, scale, scale);  
        }  
          
        if (progress < 1) {  
            requestAnimationFrame(animateMove);  
        }  
    }  
      
    animateMove();  
}  
  
// ==================== Three.js 初始化 ====================  
function initThreeJS() {  
    const width = window.innerWidth;  
    const height = window.innerHeight;  
      
    scene = new THREE.Scene();  
      
    camera3d = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);  
    camera3d.position.z = 5;  
      
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });  
    renderer.setSize(width, height);  
    renderer.setClearColor(0x000000, 0);  
    threeContainer.appendChild(renderer.domElement);  
      
    const particleCount = 2000;  
    const geometry = new THREE.BufferGeometry();  
    const positions = new Float32Array(particleCount * 3);  
    const colors = new Float32Array(particleCount * 3);  
      
    for (let i = 0; i < particleCount; i++) {  
        const snowX = (Math.random() - 0.5) * 10;  
        const snowY = (Math.random() - 0.5) * 10;  
        const snowZ = (Math.random() - 0.5) * 5;  
        snowPositions.push(snowX, snowY, snowZ);  
          
        const y = Math.random() * 4 - 2;  
        const radius = (2 - y) * 0.5 * Math.random();  
        const angle = Math.random() * Math.PI * 2;  
        const treeX = Math.cos(angle) * radius;  
        const treeZ = Math.sin(angle) * radius * 0.5;  
        treePositions.push(treeX, y, treeZ);  
          
        positions[i * 3] = snowX;  
        positions[i * 3 + 1] = snowY;  
        positions[i * 3 + 2] = snowZ;  
          
        const colorChoice = Math.random();  
        if (colorChoice < 0.7) {  
            colors[i * 3] = 0.1 + Math.random() * 0.2;  
            colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;  
            colors[i * 3 + 2] = 0.1 + Math.random() * 0.2;  
        } else if (colorChoice < 0.85) {  
            colors[i * 3] = 1;  
            colors[i * 3 + 1] = 0.84;  
            colors[i * 3 + 2] = 0;  
        } else {  
            colors[i * 3] = 1;  
            colors[i * 3 + 1] = 0.2;  
            colors[i * 3 + 2] = 0.2;  
        }  
    }  
      
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));  
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));  
      
    const material = new THREE.PointsMaterial({  
        size: 0.08,  
        vertexColors: true,  
        transparent: true,  
        opacity: 0.9,  
        blending: THREE.AdditiveBlending  
    });  
      
    particles = new THREE.Points(geometry, material);  
    scene.add(particles);  
      
    createStar();  
}  
  
// ==================== 创建顶部星星 ====================  
function createStar() {  
    const starGeometry = new THREE.BufferGeometry();  
    const starCount = 50;  
    const starPositions = new Float32Array(starCount * 3);  
    const starColors = new Float32Array(starCount * 3);  
      
    for (let i = 0; i < starCount; i++) {  
        const angle = (i / starCount) * Math.PI * 2;  
        const isOuter = i % 2 === 0;  
        const r = isOuter ? 0.3 : 0.15;  
          
        starPositions[i * 3] = Math.cos(angle) * r;  
        starPositions[i * 3 + 1] = 2.2 + Math.sin(angle) * r;  
        starPositions[i * 3 + 2] = 0;  
          
        starColors[i * 3] = 1;  
        starColors[i * 3 + 1] = 0.85;  
        starColors[i * 3 + 2] = 0;  
    }  
      
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));  
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));  
      
    const starMaterial = new THREE.PointsMaterial({  
        size: 0.15,  
        vertexColors: true,  
        transparent: true,  
        opacity: 0,  
        blending: THREE.AdditiveBlending  
    });  
      
    star = new THREE.Points(starGeometry, starMaterial);  
    scene.add(star);  
}  
  
// ==================== 显示星星 ====================  
function showStar() {  
    if (!star) return;  
      
    let opacity = 0;  
    function fadeIn() {  
        opacity += 0.05;  
        star.material.opacity = Math.min(opacity, 1);  
          
        if (opacity < 1) {  
            requestAnimationFrame(fadeIn);  
        }  
    }  
    fadeIn();  
}  
  
// ==================== 雪花飘落动画 ====================  
function animateSnow() {  
    if (!particles) return;  
      
    const positions = particles.geometry.attributes.position.array;  
      
    for (let i = 0; i < positions.length; i += 3) {  
        positions[i + 1] -= 0.02;  
        positions[i] += (Math.random() - 0.5) * 0.02;  
          
        if (positions[i + 1] < -5) {  
            positions[i + 1] = 5;  
        }  
    }  
      
    particles.geometry.attributes.position.needsUpdate = true;  
    particles.rotation.y += 0.002;  
      
    renderer.render(scene, camera3d);  
      
    if (!isTreeFormed) {  
        requestAnimationFrame(animateSnow);  
    }  
}  
  
// ==================== 汇聚成圣诞树 ====================  
function formTree() {  
    isTreeFormed = true;  
      
    const positions = particles.geometry.attributes.position.array;  
    const duration = 2000;  
    const startTime = Date.now();  
      
    function animateToTree() {  
        const elapsed = Date.now() - startTime;  
        const progress = Math.min(elapsed / duration, 1);  
          
        const easeProgress = 1 - Math.pow(1 - progress, 3);  
          
        for (let i = 0; i < positions.length / 3; i++) {  
            const idx = i * 3;  
            positions[idx] = snowPositions[idx] + (treePositions[idx] - snowPositions[idx]) * easeProgress;  
            positions[idx + 1] = snowPositions[idx + 1] + (treePositions[idx + 1] - snowPositions[idx + 1]) * easeProgress;  
            positions[idx + 2] = snowPositions[idx + 2] + (treePositions[idx + 2] - snowPositions[idx + 2]) * easeProgress;  
        }  
          
        particles.geometry.attributes.position.needsUpdate = true;  
        particles.rotation.y += 0.005;  
        if (star) star.rotation.y = particles.rotation.y;  
          
        renderer.render(scene, camera3d);  
          
        if (progress < 1) {  
            requestAnimationFrame(animateToTree);  
        } else {  
            showStar();  
            animateTreeRotation();  
        }  
    }  
      
    animateToTree();  
}  
  
// ==================== 圣诞树旋转动画 ====================  
function animateTreeRotation() {  
    if (!particles) return;  
    particles.rotation.y += 0.005;  
    if (star) star.rotation.y = particles.rotation.y;  
    renderer.render(scene, camera3d);  
    requestAnimationFrame(animateTreeRotation);  
}  
  
// ==================== 倒计时 ====================  
function startCountdown(nextStep) {  
    let count = 3;  
      
    function showCount() {  
        if (count > 0) {  
            countdown.textContent = count;  
            countdown.classList.add('show');  
              
            setTimeout(() => {  
                countdown.classList.remove('show');  
                count--;  
                setTimeout(showCount, 300);  
            }, 700);  
        } else {  
            countdown.textContent = '📸';  
            countdown.classList.add('show');  
              
            if (nextStep === 3) {  
                takePhoto(2);  
            } else if (nextStep === 4) {  
                takePhoto(3);  
            }  
              
            setTimeout(() => {  
                countdown.classList.remove('show');  
                if (nextStep === 3) {  
                    goToStep3();  
                } else if (nextStep === 4) {  
                    goToStep4();  
                }  
            }, 1000);  
        }  
    }  
      
    showCount();  
}  
  
// ==================== 进入第三步：戴帽子 ====================  
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
        locateFile: (file) => {  
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;  
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
      
    setTimeout(() => {  
        hint.textContent = '✨ 保持微笑！';  
        setTimeout(() => {  
            startCountdown(4);  
        }, 1000);  
    }, 4000);  
}  
  
// ==================== 人脸检测循环 ====================  
async function detectFace() {  
    if (currentStep !== 3) return;  
      
    if (video.readyState >= 2) {  
        await faceMesh.send({ image: video });  
    }  
      
    requestAnimationFrame(detectFace);  
}  
  
// ==================== 人脸检测结果处理 ====================  
function onFaceResults(results) {  
    hatCtx.clearRect(0, 0, hatCanvas.width, hatCanvas.height);  
      
    if (video.readyState >= 2) {  
        cameraCtx.save();  
        cameraCtx.translate(cameraCanvas.width, 0);  
        cameraCtx.scale(-1, 1);  
          
        const videoRatio = video.videoWidth / video.videoHeight;  
        const canvasRatio = cameraCanvas.width / cameraCanvas.height;  
        let drawWidth, drawHeight, offsetX, offsetY;  
          
        if (canvasRatio > videoRatio) {  
            drawWidth = cameraCanvas.width;  
            drawHeight = cameraCanvas.width / videoRatio;  
            offsetX = 0;  
            offsetY = (cameraCanvas.height - drawHeight) / 2;  
        } else {  
            drawHeight = cameraCanvas.height;  
            drawWidth = cameraCanvas.height * videoRatio;  
            offsetX = (cameraCanvas.width - drawWidth) / 2;  
            offsetY = 0;  
        }  
          
        cameraCtx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);  
        cameraCtx.restore();  
    }  
      
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {  
        faceDetected = true;  
        const landmarks = results.multiFaceLandmarks[0];  
          
        const forehead = landmarks[10];  
        const leftTemple = landmarks[234];  
        const rightTemple = landmarks[454];  
          
        const hatX = (1 - forehead.x) * hatCanvas.width;  
        const hatY = forehead.y * hatCanvas.height;  
          
        const faceWidth = Math.abs(rightTemple.x - leftTemple.x) * hatCanvas.width;  
        const hatWidth = faceWidth * 2.2;  
        const hatHeight = hatWidth * (hatImg.naturalHeight / hatImg.naturalWidth);  
          
        const deltaX = (1 - rightTemple.x) - (1 - leftTemple.x);  
        const deltaY = rightTemple.y - leftTemple.y;  
        const angle = Math.atan2(deltaY, deltaX);  
          
        hatCtx.save();  
        hatCtx.translate(hatX, hatY - hatHeight * 0.3);  
        hatCtx.rotate(angle);  
        hatCtx.drawImage(hatImg, -hatWidth / 2, -hatHeight / 2, hatWidth, hatHeight);  
        hatCtx.restore();  
    }  
}  
  
// ==================== 进入第四步：展示照片 ====================  
function goToStep4() {  
    currentStep = 4;  
      
    hint.classList.remove('show');  
      
    hatCanvas.style.display = 'none';  
    threeContainer.style.display = 'none';  
      
    showFinalPhotos();  
}  
  
// ==================== 展示最终照片 ====================  
function showFinalPhotos() {  
    finalDisplay.innerHTML = `  
        <div class="final-title">🎄 Merry Christmas 🎄</div>  
        <div class="photo-container">  
            <div class="polaroid">  
                <img src="${photo1 || ''}" alt="擦雾">  
            </div>  
            <div class="polaroid">  
                <img src="${photo2 || ''}" alt="许愿">  
            </div>  
            <div class="polaroid">  
                <img src="${photo3 || ''}" alt="圣诞帽">  
            </div>  
        </div>  
    `;  
      
    finalDisplay.classList.add('show');  
}  
  
// ==================== 触摸/鼠标事件 ====================  
function getPosition(e) {  
    if (e.touches && e.touches.length > 0) {  
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };  
    }  
    return { x: e.clientX, y: e.clientY };  
}  
  
fogCanvas.addEventListener('mousedown', (e) => {  
    if (currentStep !== 1) return;  
    isDrawing = true;  
    const pos = getPosition(e);  
    lastX = pos.x;  
    lastY = pos.y;  
});  
  
fogCanvas.addEventListener('mousemove', (e) => {  
    if (!isDrawing || currentStep !== 1) return;  
    const pos = getPosition(e);  
    clearFog(pos.x, pos.y);  
});  
  
fogCanvas.addEventListener('mouseup', () => { isDrawing = false; });  
fogCanvas.addEventListener('mouseleave', () => { isDrawing = false; });  
  
fogCanvas.addEventListener('touchstart', (e) => {  
    if (currentStep !== 1) return;  
    e.preventDefault();  
    isDrawing = true;  
    const pos = getPosition(e);  
    lastX = pos.x;  
    lastY = pos.y;  
}, { passive: false });  
  
fogCanvas.addEventListener('touchmove', (e) => {  
    if (!isDrawing || currentStep !== 1) return;  
    e.preventDefault();  
    const pos = getPosition(e);  
    clearFog(pos.x, pos.y);  
}, { passive: false });  
  
fogCanvas.addEventListener('touchend', () => { isDrawing = false; });  
  
// ==================== 开始按钮 ====================  
startBtn.addEventListener('click', async () => {  
    startBtn.textContent = '启动中...';  
      
    bgm.muted = true;  
    bgm.volume = 0;  
    try {  
        await bgm.play();  
    } catch (e) {  
        console.log('音频预热失败');  
    }  
      
    resizeCanvas();  
      
    const success = await startCamera();  
    if (!success) return;  
      
    drawCamera();  
    initFog();  
      
    startOverlay.classList.add('hidden');  
      
    hint.textContent = '用手指擦去雾气 ❄️';  
    hint.classList.add('show');  
      
    currentStep = 1;  
});  
  
// ==================== 窗口大小变化 ====================  
window.addEventListener('resize', () => {  
    resizeCanvas();  
    if (currentStep === 1) {  
        initFog();  
    }  
    if (renderer) {  
        renderer.setSize(window.innerWidth, window.innerHeight);  
        camera3d.aspect = window.innerWidth / window.innerHeight;  
        camera3d.updateProjectionMatrix();  
    }  
});  
