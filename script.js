const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 載入玩家圖片
const playerImage = new Image();
playerImage.src = 'player.png';

const keys = {
    right: false,
    left: false,
    up: false
};

// 遊戲狀態：'playing', 'gameover', 'win'
let gameState = 'playing'; 

class Player {
    constructor() {
        this.position = { x: 50, y: 100 };
        this.velocity = { x: 0, y: 0 };
        this.width = 30;
        this.height = 40; // 稍微調高，讓人物看起來比例比較自然
        this.speed = 6;
        this.gravity = 0.6;
        this.jumpStrength = 13;
        this.isGrounded = false;
    }

    draw() {
        // 如果圖片載入完成了，就畫出圖片
        if (playerImage.complete && playerImage.naturalWidth !== 0) {
            ctx.drawImage(playerImage, this.position.x, this.position.y, this.width, this.height);
        } else {
            // 尚未載入完成時，先畫紅色方塊作為預設
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        }
    }

    update() {
        this.draw();
        this.position.y += this.velocity.y;
        this.position.x += this.velocity.x;

        // 如果在畫布內，加上重力
        if (this.position.y + this.height + this.velocity.y <= canvas.height) {
            this.velocity.y += this.gravity;
            this.isGrounded = false;
        }
    }
}

class Platform {
    constructor({ x, y, width, height, type = 'ground' }) {
        this.position = { x, y };
        this.width = width;
        this.height = height;
        this.type = type; // 'ground', 'block', 'qblock', 'pipe'
    }

    draw() {
        if (this.type === 'pipe') {
            // 水管身體
            ctx.fillStyle = '#105010'; // 邊框綠
            ctx.fillRect(this.position.x - 2, this.position.y, this.width + 4, this.height);
            ctx.fillStyle = '#00A800'; // 內部綠
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
            
            // 水管開口
            ctx.fillStyle = '#105010';
            ctx.fillRect(this.position.x - 8, this.position.y, this.width + 16, 20);
            ctx.fillStyle = '#00A800';
            ctx.fillRect(this.position.x - 6, this.position.y + 2, this.width + 12, 16);
        } else if (this.type === 'ground') {
            // 地板紅磚土色
            ctx.fillStyle = '#C84C0C'; 
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
            // 地板紋路裝飾
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y + 10);
            ctx.lineTo(this.position.x + this.width, this.position.y + 10);
            ctx.stroke();
        } else if (this.type === 'block') {
            // 碎磚塊
            ctx.fillStyle = '#C84C0C';
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
            // 畫個叉代表碎磚
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y + this.height/2);
            ctx.lineTo(this.position.x + this.width, this.position.y + this.height/2);
            ctx.moveTo(this.position.x + this.width/2, this.position.y);
            ctx.lineTo(this.position.x + this.width/2, this.position.y + this.height);
            ctx.stroke();
        } else if (this.type === 'qblock') {
            // 問號磚塊
            ctx.fillStyle = '#F8B800'; 
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
            ctx.fillStyle = 'black';
            ctx.font = 'bold 20px 微軟正黑體';
            ctx.textAlign = 'center';
            ctx.fillText('?', this.position.x + this.width/2, this.position.y + 26);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
        }
    }
}

class Goomba {
    constructor({ x, y }) {
        this.position = { x, y };
        this.velocity = { x: -1.5, y: 0 };
        this.width = 30;
        this.height = 30;
        this.isDead = false;
        this.disappearTimer = 30; // 死亡後過多久消失
    }

    draw() {
        if (this.disappearTimer <= 0) return;

        if (this.isDead) {
            // 被踩扁
            ctx.fillStyle = '#9C4A00';
            ctx.fillRect(this.position.x, this.position.y + 20, this.width, this.height - 20);
        } else {
            // 正常怪物
            ctx.fillStyle = '#9C4A00';
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
            
            // 眼睛
            ctx.fillStyle = 'white';
            ctx.fillRect(this.position.x + 5, this.position.y + 5, 8, 10);
            ctx.fillRect(this.position.x + 17, this.position.y + 5, 8, 10);
            ctx.fillStyle = 'black';
            ctx.fillRect(this.position.x + 8, this.position.y + 8, 4, 4);
            ctx.fillRect(this.position.x + 20, this.position.y + 8, 4, 4);
        }
    }

    update() {
        if (this.isDead) {
            this.disappearTimer--;
            this.draw();
            return;
        }

        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // 簡單重力
        if (this.position.y + this.height + this.velocity.y <= canvas.height) {
            this.velocity.y += 0.6;
        }

        // 怪物簡單的平台碰撞 (只防止掉落並在邊緣折返)
        let onPlatform = false;
        platforms.forEach(platform => {
            if (this.position.y + this.height <= platform.position.y &&
                this.position.y + this.height + this.velocity.y >= platform.position.y &&
                this.position.x + this.width >= platform.position.x &&
                this.position.x <= platform.position.x + platform.width) {
                
                this.velocity.y = 0;
                this.position.y = platform.position.y - this.height;
                onPlatform = true;
                
                // 碰到邊界折返
                if (this.position.x <= platform.position.x || this.position.x + this.width >= platform.position.x + platform.width) {
                    this.velocity.x *= -1; 
                }
            } else if (
                // 撞到障礙物側面折返
                this.position.x < platform.position.x + platform.width &&
                this.position.x + this.width > platform.position.x &&
                this.position.y < platform.position.y + platform.height &&
                this.position.y + this.height > platform.position.y
            ) {
                 this.velocity.x *= -1;
                 this.position.x += this.velocity.x * 2;
            }
        });
    }
}

class Spike {
    constructor({ x, y }) {
        this.position = { x, y };
        this.width = 30;
        this.height = 30;
    }

    draw() {
        ctx.fillStyle = '#E8E8E8'; // 銀白色尖刺
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        // 畫三個小尖刺
        for(let i=0; i<3; i++) {
            let startX = this.position.x + (i * 10);
            ctx.moveTo(startX + 5, this.position.y);
            ctx.lineTo(startX, this.position.y + this.height);
            ctx.lineTo(startX + 10, this.position.y + this.height);
        }
        ctx.fill();
        ctx.stroke();
    }
}

class Decoration {
    constructor({ x, y, width, height, color = 'rgba(255, 255, 255, 0.8)' }) {
        this.position = { x, y };
        this.width = width;
        this.height = height;
        this.color = color;
    }

    draw() {
        // 畫簡單的雲朵
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 15, 0, Math.PI * 2);
        ctx.arc(this.position.x + 20, this.position.y - 10, 20, 0, Math.PI * 2);
        ctx.arc(this.position.x + 40, this.position.y, 15, 0, Math.PI * 2);
        ctx.arc(this.position.x + 20, this.position.y + 5, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 全域變數
let player;
let platforms = [];
let decorations = [];
let goombas = [];
let spikes = [];
let scrollOffset = 0;

function init() {
    gameState = 'playing';
    player = new Player();
    
    // 建立地圖
    platforms = [
        // 地板 (有坑洞)
        new Platform({ x: -100, y: 380, width: 800, height: 20, type: 'ground' }), 
        new Platform({ x: 850, y: 380, width: 600, height: 20, type: 'ground' }),
        new Platform({ x: 1600, y: 380, width: 2000, height: 20, type: 'ground' }),
        
        // 浮空磚塊
        new Platform({ x: 300, y: 250, width: 40, height: 40, type: 'qblock' }),
        new Platform({ x: 450, y: 250, width: 40, height: 40, type: 'block' }),
        new Platform({ x: 490, y: 250, width: 40, height: 40, type: 'qblock' }),
        new Platform({ x: 530, y: 250, width: 40, height: 40, type: 'block' }),
        new Platform({ x: 570, y: 250, width: 40, height: 40, type: 'qblock' }),
        
        // 高處磚塊
        new Platform({ x: 530, y: 130, width: 40, height: 40, type: 'qblock' }),
        
        // 階梯區
        new Platform({ x: 1000, y: 340, width: 40, height: 40, type: 'block' }),
        new Platform({ x: 1040, y: 300, width: 40, height: 80, type: 'block' }),
        new Platform({ x: 1080, y: 260, width: 40, height: 120, type: 'block' }),
        
        // 水管
        new Platform({ x: 700, y: 300, width: 50, height: 80, type: 'pipe' }),
        new Platform({ x: 1250, y: 280, width: 50, height: 100, type: 'pipe' }),
        new Platform({ x: 1800, y: 260, width: 50, height: 120, type: 'pipe' }),
        new Platform({ x: 2300, y: 320, width: 50, height: 60, type: 'pipe' })
    ];

    goombas = [
        new Goomba({ x: 600, y: 350 }),
        new Goomba({ x: 950, y: 350 }),
        new Goomba({ x: 1400, y: 350 }),
        new Goomba({ x: 1900, y: 350 }),
        new Goomba({ x: 2000, y: 350 })
    ];

    spikes = [
        new Spike({ x: 1450, y: 350 }),
        new Spike({ x: 2100, y: 350 }),
        new Spike({ x: 2130, y: 350 })
    ];

    decorations = [
        new Decoration({ x: 100, y: 80 }),
        new Decoration({ x: 350, y: 120 }),
        new Decoration({ x: 700, y: 60 }),
        new Decoration({ x: 1000, y: 100 }),
        new Decoration({ x: 1400, y: 80 }),
        new Decoration({ x: 1800, y: 120 })
    ];

    scrollOffset = 0;
}

function animate() {
    requestAnimationFrame(animate);
    
    // 背景：超級瑪利歐藍天色
    ctx.fillStyle = '#5C94FC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 遊戲結束畫面
    if (gameState === 'gameover') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 50px 微軟正黑體';
        ctx.textAlign = 'center';
        ctx.fillText('遊戲結束', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = 'white';
        ctx.font = '20px 微軟正黑體';
        ctx.fillText('按 Enter 鍵重新開始', canvas.width/2, canvas.height/2 + 30);
        return; // 停止更新邏輯
    }
    
    // 勝利畫面
    if (gameState === 'win') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 50px 微軟正黑體';
        ctx.textAlign = 'center';
        ctx.fillText('恭喜過關！', canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = 'white';
        ctx.font = '20px 微軟正黑體';
        ctx.fillText('按 Enter 鍵重新開始', canvas.width/2, canvas.height/2 + 30);
        return;
    }

    // 畫背景裝飾
    decorations.forEach(dec => dec.draw());

    // 畫陷阱
    spikes.forEach(spike => spike.draw());

    // 畫平台
    platforms.forEach(platform => {
        platform.draw();
    });

    // 畫怪物
    goombas.forEach(goomba => {
        goomba.update();
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
            let moveSpeed = player.speed;
            scrollOffset += moveSpeed;
            platforms.forEach(platform => platform.position.x -= moveSpeed);
            decorations.forEach(dec => dec.position.x -= moveSpeed * 0.3); // 視差效果
            goombas.forEach(goomba => goomba.position.x -= moveSpeed);
            spikes.forEach(spike => spike.position.x -= moveSpeed);
        } else if (keys.left && scrollOffset > 0) {
            let moveSpeed = player.speed;
            scrollOffset -= moveSpeed;
            platforms.forEach(platform => platform.position.x += moveSpeed);
            decorations.forEach(dec => dec.position.x += moveSpeed * 0.3);
            goombas.forEach(goomba => goomba.position.x += moveSpeed);
            spikes.forEach(spike => spike.position.x += moveSpeed);
        }
    }

    // 平台碰撞偵測
    platforms.forEach(platform => {
        // 由上往下踩到平台
        if (player.position.y + player.height <= platform.position.y &&
            player.position.y + player.height + player.velocity.y >= platform.position.y &&
            player.position.x + player.width > platform.position.x && // 修改這裡為 > 而非 >= 避免卡牆
            player.position.x < platform.position.x + platform.width) {
            
            player.velocity.y = 0;
            player.position.y = platform.position.y - player.height;
            player.isGrounded = true;
        }
        // 側邊撞牆
        else if (
            player.position.x + player.width + player.velocity.x >= platform.position.x &&
            player.position.x + player.velocity.x <= platform.position.x + platform.width &&
            player.position.y + player.height > platform.position.y &&
            player.position.y < platform.position.y + platform.height
        ) {
            // 阻擋橫向移動
            player.velocity.x = 0;
        }
    });

    // 怪物碰撞偵測
    goombas.forEach(goomba => {
        if (!goomba.isDead && goomba.disappearTimer > 0) {
            // AABB 方盒碰撞偵測
            if (player.position.x < goomba.position.x + goomba.width &&
                player.position.x + player.width > goomba.position.x &&
                player.position.y < goomba.position.y + goomba.height &&
                player.position.y + player.height > goomba.position.y) {
                
                // 判斷是否為從高處往下踩
                if (player.velocity.y > 0 && player.position.y + player.height - player.velocity.y <= goomba.position.y + 10) {
                    // 踩死怪物
                    goomba.isDead = true;
                    player.velocity.y = -10; // 踩死後彈跳
                } else {
                    // 碰到怪物側面或底部，玩家死亡
                    gameState = 'gameover';
                }
            }
        }
    });

    // 陷阱碰撞偵測
    spikes.forEach(spike => {
        // 稍微縮小碰撞判定區域，比較不會因為邊緣判定太嚴格死掉
        if (player.position.x + 5 < spike.position.x + spike.width - 5 &&
            player.position.x + player.width - 5 > spike.position.x + 5 &&
            player.position.y + player.height > spike.position.y + 10) {
            
            gameState = 'gameover';
        }
    });

    // 勝利條件 (到達一定距離，因為新增了更多地圖長度，把距離拉長)
    if (scrollOffset > 3000) {
        gameState = 'win';
    }
    
    // 死亡條件 (掉出畫面下方深淵)
    if (player.position.y > canvas.height) {
        gameState = 'gameover';
    }
}

// 初始化並開始遊戲迴圈
init();
animate();

// 鍵盤按下事件
window.addEventListener('keydown', (e) => {
    // 遊戲結束或過關狀態下，按 Enter 重新開始
    if ((e.code === 'Enter' || e.code === 'Space') && (gameState === 'gameover' || gameState === 'win')) {
        init();
        return;
    }

    if (gameState !== 'playing') return;

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
