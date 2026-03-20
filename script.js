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
let scrollOffset = 0; // 全域的畫面偏移量

// 簡單的 AABB 碰撞檢測函數
function rectIntersect(r1, r2) {
    return !(r2.x >= r1.x + r1.width || 
             r2.x + r2.width <= r1.x || 
             r2.y >= r1.y + r1.height || 
             r2.y + r2.height <= r1.y);
}

class Player {
    constructor() {
        this.x = 50;
        this.y = 100;
        this.width = 30;
        this.height = 40; 
        this.speed = 4; // 稍微調慢，讓控制更精準
        this.gravity = 0.6;
        this.jumpStrength = 13;
        this.velocity = { x: 0, y: 0 };
        this.isGrounded = false;
        this.invincibilityTimer = 0;
    }

    draw() {
        let drawX = this.x - scrollOffset;
        
        ctx.save();
        // 無敵狀態閃爍效果
        if (this.invincibilityTimer > 0) {
            if (Math.floor(Date.now() / 50) % 2 === 0) {
                ctx.globalAlpha = 0.5; // 半透明閃爍
            }
        }

        // 如果圖片載入完成了，就畫出圖片
        if (playerImage.complete && playerImage.naturalWidth !== 0) {
            ctx.drawImage(playerImage, drawX, this.y, this.width, this.height);
        } else {
            // 尚未載入完成時，先畫紅色方塊作為預設
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(drawX, this.y, this.width, this.height);
        }
        ctx.restore();
    }
}

class Platform {
    constructor({ x, y, width, height, type = 'ground' }) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'ground', 'block', 'qblock', 'pipe'
        this.isHit = false; // 問號磚是否被敲過
    }

    draw() {
        let drawX = this.x - scrollOffset;

        if (this.type === 'pipe') {
            ctx.fillStyle = '#105010'; 
            ctx.fillRect(drawX - 2, this.y, this.width + 4, this.height);
            ctx.fillStyle = '#00A800'; 
            ctx.fillRect(drawX, this.y, this.width, this.height);
            ctx.fillStyle = '#105010';
            ctx.fillRect(drawX - 8, this.y, this.width + 16, 20);
            ctx.fillStyle = '#00A800';
            ctx.fillRect(drawX - 6, this.y + 2, this.width + 12, 16);
        } else if (this.type === 'ground') {
            ctx.fillStyle = '#C84C0C'; 
            ctx.fillRect(drawX, this.y, this.width, this.height);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(drawX, this.y, this.width, this.height);
            ctx.beginPath();
            ctx.moveTo(drawX, this.y + 10);
            ctx.lineTo(drawX + this.width, this.y + 10);
            ctx.stroke();
        } else if (this.type === 'block') {
            ctx.fillStyle = '#C84C0C';
            ctx.fillRect(drawX, this.y, this.width, this.height);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(drawX, this.y, this.width, this.height);
            ctx.beginPath();
            ctx.moveTo(drawX, this.y + this.height/2);
            ctx.lineTo(drawX + this.width, this.y + this.height/2);
            ctx.moveTo(drawX + this.width/2, this.y);
            ctx.lineTo(drawX + this.width/2, this.y + this.height);
            ctx.stroke();
        } else if (this.type === 'qblock') {
            if (this.isHit) {
                // 被敲過後變成灰色
                ctx.fillStyle = '#A0A0A0';
                ctx.fillRect(drawX, this.y, this.width, this.height);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(drawX, this.y, this.width, this.height);
            } else {
                ctx.fillStyle = '#F8B800'; 
                ctx.fillRect(drawX, this.y, this.width, this.height);
                ctx.fillStyle = 'black';
                ctx.font = 'bold 20px 微軟正黑體';
                ctx.textAlign = 'center';
                ctx.fillText('?', drawX + this.width/2, this.y + 26);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.strokeRect(drawX, this.y, this.width, this.height);
            }
        }
    }
}

class Star {
    constructor({ x, y }) {
        this.x = x;
        this.y = y;
        this.velocity = { x: 3, y: -8 }; // 剛出現時往上並往右彈跳
        this.width = 25; // 加大觸碰判定
        this.height = 25;
        this.isCollected = false;
        // 定義顯示用的圖形大小，稍微小一點點避免錯覺
        this.drawWidth = 20;
        this.drawHeight = 20;
    }

    draw() {
        if (this.isCollected) return;
        let drawX = this.x - scrollOffset;

        ctx.fillStyle = '#FFFF00'; 
        ctx.beginPath();
        let cx = drawX + this.drawWidth/2 + (this.width - this.drawWidth)/2;
        let cy = this.y + this.drawHeight/2 + (this.height - this.drawHeight)/2;
        let outerRadius = 12;
        let innerRadius = 5;
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18+i*72)/180*Math.PI)*outerRadius+cx, -Math.sin((18+i*72)/180*Math.PI)*outerRadius+cy);
            ctx.lineTo(Math.cos((54+i*72)/180*Math.PI)*innerRadius+cx, -Math.sin((54+i*72)/180*Math.PI)*innerRadius+cy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    update() {
        if (this.isCollected) return;
        this.draw();

        // X軸移動與碰撞
        this.x += this.velocity.x;
        platforms.forEach(p => {
            if (rectIntersect(this, p)) {
                if (this.velocity.x > 0) {
                    this.x = p.x - this.width;
                    this.velocity.x *= -1;
                } else if (this.velocity.x < 0) {
                    this.x = p.x + p.width;
                    this.velocity.x *= -1;
                }
            }
        });

        // Y軸移動與碰撞
        this.velocity.y += 0.5; // 星星重力
        this.y += this.velocity.y;
        platforms.forEach(p => {
            if (rectIntersect(this, p)) {
                if (this.velocity.y > 0) { // 往下掉碰到地板
                    this.y = p.y - this.height;
                    this.velocity.y = -7; // 彈起
                } else if (this.velocity.y < 0) { // 往上撞到天花板
                    this.y = p.y + p.height;
                    this.velocity.y = 0;
                }
            }
        });
    }
}

class Goomba {
    constructor({ x, y }) {
        this.x = x;
        this.y = y;
        this.velocity = { x: -1.5, y: 0 };
        this.width = 30;
        this.height = 30;
        this.isDead = false;
        this.disappearTimer = 30; 
    }

    draw() {
        if (this.disappearTimer <= 0) return;
        let drawX = this.x - scrollOffset;

        if (this.isDead) {
            ctx.fillStyle = '#9C4A00';
            ctx.fillRect(drawX, this.y + 20, this.width, this.height - 20);
        } else {
            ctx.fillStyle = '#9C4A00';
            ctx.fillRect(drawX, this.y, this.width, this.height);
            
            // 眼睛
            ctx.fillStyle = 'white';
            ctx.fillRect(drawX + 5, this.y + 5, 8, 10);
            ctx.fillRect(drawX + 17, this.y + 5, 8, 10);
            ctx.fillStyle = 'black';
            ctx.fillRect(drawX + 8, this.y + 8, 4, 4);
            ctx.fillRect(drawX + 20, this.y + 8, 4, 4);
        }
    }

    update() {
        if (this.isDead) {
            this.disappearTimer--;
            this.draw();
            return;
        }

        this.draw();
        
        // 怪物 X 軸移動與碰撞
        this.x += this.velocity.x;
        platforms.forEach(p => {
            if (rectIntersect(this, p)) {
                if (this.velocity.x > 0) {
                    this.x = p.x - this.width;
                    this.velocity.x *= -1;
                } else if (this.velocity.x < 0) {
                    this.x = p.x + p.width;
                    this.velocity.x *= -1;
                }
            }
        });

        // 怪物沿邊緣折返 (偵測前方是否有地板)
        // 這個進階邏輯先簡化：只有撞牆會折返
        // 怪物 Y 軸移動與重力
        this.velocity.y += 0.6;
        this.y += this.velocity.y;
        platforms.forEach(p => {
            if (rectIntersect(this, p)) {
                if (this.velocity.y > 0) {
                    this.y = p.y - this.height;
                    this.velocity.y = 0;
                    
                    // 邊緣偵測折返 (簡易)
                    if (this.x <= p.x) this.velocity.x = Math.abs(this.velocity.x); // 向右
                    if (this.x + this.width >= p.x + p.width) this.velocity.x = -Math.abs(this.velocity.x); // 向左
                }
            }
        });
    }
}

class Spike {
    constructor({ x, y }) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
    }

    draw() {
        let drawX = this.x - scrollOffset;

        ctx.fillStyle = '#E8E8E8'; 
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        for(let i=0; i<3; i++) {
            let startX = drawX + (i * 10);
            ctx.moveTo(startX + 5, this.y);
            ctx.lineTo(startX, this.y + this.height);
            ctx.lineTo(startX + 10, this.y + this.height);
        }
        ctx.fill();
        ctx.stroke();
    }
}

class Decoration {
    constructor({ x, y, width, height, color = 'rgba(255, 255, 255, 0.8)' }) {
        this.x = x; // 這裡的 x 也是絕對座標
        this.y = y;
        this.width = width || 0;
        this.height = height || 0;
        this.color = color;
    }

    draw() {
        // 雲的視差滾動效果：它滾動的速度是背景的一半
        let drawX = this.x - (scrollOffset * 0.3);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(drawX, this.y, 15, 0, Math.PI * 2);
        ctx.arc(drawX + 20, this.y - 10, 20, 0, Math.PI * 2);
        ctx.arc(drawX + 40, this.y, 15, 0, Math.PI * 2);
        ctx.arc(drawX + 20, this.y + 5, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 全域陣列
let player;
let platforms = [];
let decorations = [];
let goombas = [];
let spikes = [];
let stars = [];

function init() {
    gameState = 'playing';
    scrollOffset = 0;
    player = new Player();
    stars = []; // 重置星星
    
    // 建立地圖
    platforms = [
        // 地板 (有坑洞)
        new Platform({ x: -100, y: 380, width: 800, height: 20, type: 'ground' }), 
        new Platform({ x: 850, y: 380, width: 600, height: 20, type: 'ground' }),
        new Platform({ x: 1600, y: 380, width: 2000, height: 20, type: 'ground' }),
        
        // 浮空磚塊
        new Platform({ x: 300, y: 250, width: 40, height: 40, type: 'qblock' }), // 產出無敵星星
        new Platform({ x: 450, y: 250, width: 40, height: 40, type: 'block' }),
        new Platform({ x: 490, y: 250, width: 40, height: 40, type: 'qblock' }),
        new Platform({ x: 530, y: 250, width: 40, height: 40, type: 'block' }),
        new Platform({ x: 570, y: 250, width: 40, height: 40, type: 'qblock' }),
        
        // 高處磚塊
        new Platform({ x: 530, y: 130, width: 40, height: 40, type: 'qblock' }),
        
        // 階梯區 (現在實體化了，從旁邊撞不會穿過去)
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
        new Decoration({ x: 1800, y: 120 }),
        new Decoration({ x: 2200, y: 90 })
    ];
}

function animate() {
    requestAnimationFrame(animate);
    
    // 背景
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
        return;
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

    // 更新無敵時間
    if (player.invincibilityTimer > 0) {
        player.invincibilityTimer--;
    }

    // 處理主角橫向移動與碰撞
    if (keys.right) {
        player.velocity.x = player.speed;
    } else if (keys.left) {
        player.velocity.x = -player.speed;
    } else {
        player.velocity.x = 0;
    }

    // X 軸移動
    player.x += player.velocity.x;
    
    // 限制主角不要超出世界左側
    if (player.x < 0) player.x = 0;

    // X 軸平台完全物理碰撞
    platforms.forEach(platform => {
        if (rectIntersect(player, platform)) {
            if (player.velocity.x > 0) { // 向右移動撞到牆壁左側
                player.x = platform.x - player.width;
            } else if (player.velocity.x < 0) { // 向左移動撞到牆壁右側
                player.x = platform.x + platform.width;
            }
        }
    });

    // Y 軸移動與重力
    player.velocity.y += player.gravity;
    player.y += player.velocity.y;
    player.isGrounded = false;

    // Y 軸平台完全物理碰撞
    platforms.forEach(platform => {
        if (rectIntersect(player, platform)) {
            if (player.velocity.y > 0) { // 往下掉落在平台上
                player.y = platform.y - player.height;
                player.velocity.y = 0;
                player.isGrounded = true;
            } else if (player.velocity.y < 0) { // 往上撞到天花板（磚塊底部）
                player.y = platform.y + platform.height;
                player.velocity.y = 0; // 撞擊後開始往下掉

                // 如果是問號磚塊且還沒被撞過
                if (platform.type === 'qblock' && !platform.isHit) {
                    platform.isHit = true;
                    // 生成一顆無敵星星在上面
                    stars.push(new Star({ x: platform.x + (platform.width/2) - 10, y: platform.y - 30 }));
                }
            }
        }
    });

    // 處理卷軸相機偏移量 (scrollOffset)
    // 當玩家 X 座標超過 400，鏡頭跟著往右
    if (player.x > scrollOffset + 400) {
        scrollOffset = player.x - 400;
    }
    // 處理鏡頭往左 (也可鎖死不能往左，看遊戲設計，這裡開放往左捲動)
    if (player.x < scrollOffset + 100 && scrollOffset > 0) {
        scrollOffset = player.x - 100;
        if (scrollOffset < 0) scrollOffset = 0;
    }

    // ======= 繪製項目 =======
    decorations.forEach(dec => dec.draw());
    spikes.forEach(spike => spike.draw());
    platforms.forEach(platform => platform.draw());

    // 星星邏輯與碰撞
    stars.forEach(star => {
        star.update();
        if (!star.isCollected && rectIntersect(player, star)) {
            star.isCollected = true;
            player.invincibilityTimer = 600; // 賦予無敵狀態 600幀 (大約10秒)
        }
    });

    // 怪物碰撞偵測與邏輯
    goombas.forEach(goomba => {
        goomba.update();

        // 如果怪物沒死，也還沒消失，且碰到玩家
        if (!goomba.isDead && goomba.disappearTimer > 0) {
            if (rectIntersect(player, goomba)) {
                
                // 若玩家是無敵狀態，碰到就直接殺死怪物！
                if (player.invincibilityTimer > 0) {
                    goomba.isDead = true;
                } 
                // 否則，判斷玩家是否從高處踩下去
                else if (player.velocity.y > 0 && player.y + player.height - player.velocity.y <= goomba.y + 10) {
                    goomba.isDead = true;
                    player.velocity.y = -10; // 踩死後彈起來
                } 
                // 其他方向碰到怪物，玩家死亡
                else {
                    gameState = 'gameover';
                }
            }
        }
    });

    // 畫出玩家
    player.draw();

    // 陷阱碰撞偵測 (需要扣除無敵狀態)
    if (player.invincibilityTimer === 0) {
        spikes.forEach(spike => {
            // 這個碰撞稍微寬容一點，只判斷腳底板
            let spikeHitbox = { x: spike.x + 5, y: spike.y + 10, width: spike.width - 10, height: spike.height };
            if (rectIntersect(player, spikeHitbox)) {
                gameState = 'gameover';
            }
        });
    }

    // 勝利條件
    if (player.x > 3200) { // 改用絕對位置判斷通關
        gameState = 'win';
    }
    
    // 掉出畫面下方深淵
    if (player.y > canvas.height) {
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
