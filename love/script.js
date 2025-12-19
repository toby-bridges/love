// ==================== 全局变量 ====================  
const video = document.getElementById('video');  
const cameraCanvas = document.getElementById('camera-canvas');  
const cameraCtx = cameraCanvas.getContext('2d');  
const fogCanvas = document.getElementById('fog-canvas');  
const fogCtx = fogCanvas.getContext('2d');  
const startOverlay = document.getElementById('start-overlay');  
const startBtn = document.getElementById('start-btn');  
const hint = document.getElementById('hint');  
const flash = document.getElementById('flash');  
const bgm = document.getElementById('bgm');  
  
// 存储三张截图  
let photo1 = null;  
let photo2 = null;  
let photo3 = null;  
  
// 当前步骤  
let currentStep = 0;  
  
// 擦除相关  
let isDrawing = false;  
let fogImageData = null;  
let totalPixels = 0;  
let clearedPixels = 0;  
let lastX = 0;  
let lastY = 0;  
  
// ==================== 初始化画布尺寸 ====================  
function resizeCanvas() {  
    const w = window.innerWidth;  
    const h = window.innerHeight;  
    cameraCanvas.width = w;  
    cameraCanvas.height = h;  
    fogCanvas.width = w;  
    fogCanvas.height = h;  
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
        alert('无法访问摄像头，请确保授予权限！\n错误：' + e.message);  
        return false;  
    }  
}  
  
// ==================== 绘制摄像头画面 ====================  
function drawCamera() {  
    if (video.readyState >= 2) {  
        // 镜像绘制  
        cameraCtx.save();  
        cameraCtx.translate(cameraCanvas.width, 0);  
        cameraCtx.scale(-1, 1);  
          
        // 计算填充尺寸（保持比例铺满）  
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
    requestAnimationFrame(drawCamera);  
}  
  
// ==================== 初始化雾气 ====================  
function initFog() {  
    // 填充白色雾气  
    fogCtx.fillStyle = 'rgba(255, 255, 255, 0.92)';  
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);  
      
    // 添加噪点纹理  
    for (let i = 0; i < 30000; i++) {  
        const x = Math.random() * fogCanvas.width;  
        const y = Math.random() * fogCanvas.height;  
        const gray = 200 + Math.random() * 55;  
        fogCtx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, ${Math.random() * 0.3})`;  
        fogCtx.fillRect(x, y, 2, 2);  
    }  
      
    // 保存雾气图像数据  
    fogImageData = fogCtx.getImageData(0, 0, fogCanvas.width, fogCanvas.height);  
    totalPixels = fogCanvas.width * fogCanvas.height;  
    clearedPixels = 0;  
}  
  
// ==================== 擦除雾气 ====================  
function clearFog(x, y) {  
    const radius = 40;  
      
    // 使用 destination-out 实现擦除  
    fogCtx.globalCompositeOperation = 'destination-out';  
      
    // 画一条从上次位置到当前位置的线（让擦除更连贯）  
    fogCtx.beginPath();  
    fogCtx.lineWidth = radius * 2;  
    fogCtx.lineCap = 'round';  
    fogCtx.lineJoin = 'round';  
    fogCtx.moveTo(lastX || x, lastY || y);  
    fogCtx.lineTo(x, y);  
    fogCtx.stroke();  
      
    // 恢复默认合成模式  
    fogCtx.globalCompositeOperation = 'source-over';  
      
    lastX = x;  
    lastY = y;  
      
    // 更新擦除进度  
    clearedPixels += radius * 2;  
    const progress = Math.min((clearedPixels / totalPixels) * 100, 100);  
      
    // 当擦除达到 8% 时触发下一步（因为计算方式是估算，8%体验上差不多是擦了一小块区域）  
    if (progress >= 8 && currentStep === 1) {  
        currentStep = 2;  
        takePhoto(1);  
        setTimeout(goToStep2, 500);  
    }  
}  
  
// ==================== 截图功能 ====================  
function takePhoto(step) {  
    // 闪光效果  
    flash.classList.add('active');  
    setTimeout(() => flash.classList.remove('active'), 150);  
      
    // 创建临时画布合并图层  
    const tempCanvas = document.createElement('canvas');  
    tempCanvas.width = cameraCanvas.width;  
    tempCanvas.height = cameraCanvas.height;  
    const tempCtx = tempCanvas.getContext('2d');  
      
    // 画摄像头  
    tempCtx.drawImage(cameraCanvas, 0, 0);  
      
    // 如果是第一步，也画上雾气  
    if (step === 1) {  
        tempCtx.drawImage(fogCanvas, 0, 0);  
    }  
      
    // 保存  
    const data = tempCanvas.toDataURL('image/jpeg', 0.8);  
    if (step === 1) photo1 = data;  
    if (step === 2) photo2 = data;  
    if (step === 3) photo3 = data;  
      
    console.log(`📸 第${step}张照片已保存`);  
}  
  
// ==================== 进入第二步 ====================  
function goToStep2() {  
    // 隐藏提示  
    hint.style.display = 'none';  
      
    // 雾气淡出  
    fogCanvas.style.transition = 'opacity 1.5s ease-out';  
    fogCanvas.style.opacity = '0';  
      
    setTimeout(() => {  
        fogCanvas.style.display = 'none';  
          
        // 显示成功信息（临时，后面会替换成圣诞树）  
        alert('🎉 第一步完成！\n\n✅ 雾气已擦除\n✅ 第一张照片已保存\n\n接下来我们将添加圣诞树效果！');  
    }, 1500);  
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
      
    resizeCanvas();  
      
    const success = await startCamera();  
    if (!success) return;  
      
    // 开始绘制摄像头  
    drawCamera();  
      
    // 初始化雾气  
    initFog();  
      
    // 隐藏开始按钮  
    startOverlay.classList.add('hidden');  
      
    // 显示提示  
    hint.style.display = 'block';  
      
    // 设置当前步骤  
    currentStep = 1;  
});  
  
// ==================== 窗口大小变化 ====================  
window.addEventListener('resize', () => {  
    resizeCanvas();  
    if (currentStep === 1) {  
        initFog();  
    }  
});  
