const video = document.getElementById('webcam');  
const canvas = document.getElementById('output-canvas');  
const ctx = canvas.getContext('2d');  
const startBtn = document.getElementById('start-btn');  
const startScreen = document.getElementById('start-screen');  
const audio = document.getElementById('bgm');  
  
let isRunning = false;  
  
// 调整画布尺寸  
function resize() {  
    canvas.width = window.innerWidth;  
    canvas.height = window.innerHeight;  
}  
window.addEventListener('resize', resize);  
resize();  
  
// 启动摄像头  
async function setupCamera() {  
    try {  
        const stream = await navigator.mediaDevices.getUserMedia({  
            video: {  
                facingMode: "user",  
                width: { ideal: 1280 },  
                height: { ideal: 720 }  
            },  
            audio: false  
        });  
        video.srcObject = stream;  
        return new Promise((resolve) => {  
            video.onloadedmetadata = () => {  
                video.play();  
                resolve();  
            };  
        });  
    } catch (e) {  
        alert("请允许摄像头权限，否则无法看到魔法！");  
        console.error(e);  
    }  
}  
  
// 渲染循环  
function render() {  
    if (!isRunning) return;  
  
    // 1. 绘制视频 (镜像翻转)  
    ctx.save();  
    ctx.translate(canvas.width, 0);  
    ctx.scale(-1, 1);  
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);  
    ctx.restore();  
  
    // 2. 绘制一层雾气 (半透明白层)  
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";   
    ctx.fillRect(0, 0, canvas.width, canvas.height);  
  
    requestAnimationFrame(render);  
}  
  
// 点击开始  
startBtn.addEventListener('click', async () => {  
    startBtn.innerText = "启动中...";  
    try {  
        // 尝试播放音乐  
        await audio.play();   
        console.log("音乐播放成功");  
    } catch (err) {  
        console.log("音乐自动播放被拦截，需要用户交互");  
    }  
  
    await setupCamera();  
      
    startScreen.style.display = 'none'; // 隐藏开始界面  
    isRunning = true;  
    render();  
});  
