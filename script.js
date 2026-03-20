const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const keys = {
    right: false,
    left: false,
    up: false
};

class Player {
    constructor() {
        this.position = { x: 50, y: 100 };
        this.velocity = { x: 0, y: 0 };
        this.width = 30;
        this.height = 30;
        this.speed = 6;
        this.gravity = 0.6;
        this.jumpStrength = 13;
        this.isGrounded = false;
    }

    draw() {
        // 畫出玩家 (紅色方塊代表瑪利歐)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    }

    update() {
        this.draw();
        this.position.y += this.velocity.y;
        this.position.x += this.velocity.x;

        // 如果在畫布內，加上重力
        if (this.position.y + this.height + this.velocity.y <= canvas.height) {
            this.velocity.y += this.gravity;
            this.isGrounded = false;
        } else {
            // 掉到畫布底部 (摔死)，重置遊戲會由外面的邏輯處理
        }
    }
}

class Platform {
    constructor({ x, y, width, height, color = '#8B4513' }) {
        this.position = { x, y };
        this.width = width;
        this.height = height;
        this.color = color;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    }
}

class Decoration {
    constructor({ x, y, width, height, color = '#ffffff' }) {
        this.position = { x, y };
        this.width = width;
        this.height = height;
        this.color = color;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    }
}

let player = new Player();
let platforms = [];
let decorations = [];
let scrollOffset = 0;

function init() {
    player = new Player();
    platforms = [
        // 地板 (加長)
        new Platform({ x: -100, y: 380, width: 4000, height: 20, color: '#228B22' }), 
        
        // 平台
        new Platform({ x: 300, y: 300, width: 100, height: 20 }),
        new Platform({ x: 500, y: 220, width: 100, height: 20 }),
        new Platform({ x: 800, y: 250, width: 150, height: 20 }),
        new Platform({ x: 1100, y: 180, width: 100, height: 20 }),
        new Platform({ x: 1400, y: 100, width: 80, height: 20 }),
        new Platform({ x: 1600, y: 200, width: 150, height: 20 }),

        // 障礙物/水管 (紅色)
        new Platform({ x: 650, y: 330, width: 40, height: 50, color: '#DC143C' }),
        new Platform({ x: 1250, y: 310, width: 40, height: 70, color: '#DC143C' }),
    ];

    decorations = [
        // 雲朵 (簡單方塊表示)
        new Decoration({ x: 100, y: 50, width: 80, height: 30, color: 'rgba(255, 255, 255, 0.7)' }),
        new Decoration({ x: 350, y: 80, width: 100, height: 40, color: 'rgba(255, 255, 255, 0.7)' }),
        new Decoration({ x: 700, y: 40, width: 70, height: 25, color: 'rgba(255, 255, 255, 0.7)' }),
        new Decoration({ x: 1000, y: 70, width: 90, height: 35, color: 'rgba(255, 255, 255, 0.7)' }),
    ];

    scrollOffset = 0;
}

function animate() {
    requestAnimationFrame(animate);
    // 清除畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 畫背景裝飾
    decorations.forEach(dec => dec.draw());

    // 畫平台
    platforms.forEach(platform => {
        platform.draw();
    });

    // 更新並畫出玩家
    player.update();

    // 處理橫向卷軸與移動邏輯
    if (keys.right && player.position.x < 400) {
        player.velocity.x = player.speed;
    } else if ((keys.left && player.position.x > 100) || (keys.left && scrollOffset === 0 && player.position.x > 0)) {
        player.velocity.x = -player.speed;
    } else {
        player.velocity.x = 0;
        
        // 卷軸移動
        if (keys.right) {
            scrollOffset += player.speed;
            platforms.forEach(platform => platform.position.x -= player.speed);
            decorations.forEach(dec => dec.position.x -= player.speed * 0.5); // 視差效果
        } else if (keys.left && scrollOffset > 0) {
            scrollOffset -= player.speed;
            platforms.forEach(platform => platform.position.x += player.speed);
            decorations.forEach(dec => dec.position.x += player.speed * 0.5);
        }
    }

    // 平台碰撞偵測 (只偵測向下掉落碰到平台上方)
    platforms.forEach(platform => {
        if (player.position.y + player.height <= platform.position.y &&
            player.position.y + player.height + player.velocity.y >= platform.position.y &&
            player.position.x + player.width >= platform.position.x &&
            player.position.x <= platform.position.x + platform.width) {
            
            player.velocity.y = 0;
            player.position.y = platform.position.y - player.height;
            player.isGrounded = true;
        }
    });

    // 勝利條件 (到達一定距離)
    if (scrollOffset > 2500) {
        ctx.fillStyle = 'black';
        ctx.font = 'bold 40px 微軟正黑體';
        ctx.textAlign = 'center';
        ctx.fillText('你贏了！', canvas.width/2, canvas.height/2);
    }
    
    // 死亡條件 (掉出畫面下方)
    if (player.position.y > canvas.height) {
        init(); // 重新開始
    }
}

// 初始化並開始遊戲迴圈
init();
animate();

// 鍵盤按下事件
window.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
            keys.left = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.right = true;
            break;
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
            if (player.isGrounded) {
                player.velocity.y -= player.jumpStrength;
                player.isGrounded = false;
            }
            break;
    }
});

// 鍵盤放開事件
window.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.right = false;
            break;
    }
});
