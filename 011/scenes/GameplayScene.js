let cursors, keyW, keyA, keyS, keyD, keyE, keyB;
let player;
const speed = 200;
let lastFacing = 'down';

let bgmSound, runSound;

const SCALE = { book: 0.14, statue: 0.09, torch: 0.13, messi: 0.22, chest: 0.14, door: 1 };

let currentMission = 1;
let hasKey = false;
let penaltyUntil = 0;

// --- ระบบหัวใจและเวลาจำกัด ---
const MAX_HEARTS = 2;
let hearts = MAX_HEARTS;
let heartsText;
const TIME_LIMIT_MS = 60000; // 1 นาที
let timeRemainingMs = TIME_LIMIT_MS;
let timerText;
let timerEvent;

let interactPrompt, messageBox, messageText, messageTimer = null;
let interactables = [];

const GATE_DEFS = [
    { key: 'gate1', x: 300, y: 340, w: 80, h: 30, requiredMission: 2 },
    { key: 'gate2', x: 1038, y: 340, w: 80, h: 30, requiredMission: 2 },
    { key: 'gate3', x: 300, y: 520, w: 80, h: 30, requiredMission: 3 },
    { key: 'gate4', x: 1038, y: 520, w: 80, h: 30, requiredMission: 4 }
];
let gates = [], gatesGroup;
let gateBumpMessageAt = 0;

let debugGraphics;
let debugVisible = false;

let missionStatusText;
const MISSION_STATUS_LABELS = {
    1: 'ภารกิจปัจจุบัน: Mission 1 — หาหนังสือที่ถูกต้อง',
    2: 'ภารกิจปัจจุบัน: Mission 2 — หมุนรูปปั้นให้ถูกทิศ',
    3: 'ภารกิจปัจจุบัน: Mission 3 — จุดคบเพลิงให้ถูกลำดับ',
    4: 'ภารกิจปัจจุบัน: Mission 4 — คุยกับเมสซี่',
    5: 'ภารกิจปัจจุบัน: Mission 5 — เลือกกล่องสมบัติ',
    6: 'ภารกิจปัจจุบัน: ไปที่ประตูทางออก'
};

let books = [];
let hasFootballScroll = false;
const bookTexts = [
    'World Cup History - จุดเริ่มต้นแห่งความยิ่งใหญ่',
    'Greatest Players - ตำนานแห่งเกมลูกหนัง',
    'Memorable Matches - ค่ำคืนแห่งการพลิกกลับที่น่าจดจำ',
    'World Cup Stadiums - สนามที่ความฝันเป็นจริง',
    'Beyond the Dream - ชัยชนะสูงสุด'
];
let correctBookIndex = 4; // ถูกสุ่มใหม่ทุกครั้งใน init()

let statues = [];
let statueDirections = [0, 0, 0, 0];
const statueTarget = [0, 1, 2, 3];
const dirLabel = ['N', 'E', 'S', 'W'];
let statuesSolved = false;

let torches = [];
let torchLit = [false, false, false, false];
let torchSequence = [];
const correctTorchOrder = [1, 3, 4, 2];
let torchSolved = false;

let messiNPC;
let messiDialogueActive = false;
let messiDialogueIndex = 0;
let messiDialogueComplete = false;
const messiLines = [
    'Welcome, champion. You\'ve proven your skills through the rooms.',
    'One final test remains. Three World Cup chests stand before you.',
    'Careful, only one chest holds the key! Choose wisely. Good luck.'
];

let chests = [];
let correctChestIndex = 1; // ถูกสุ่มใหม่ทุกครั้งใน init()
let chestOpened = false;

let door;
let doorOpened = false;
let gameWon = false;

// =========================================================
// 2. คลาส Scene หลัก
// =========================================================
export default class GameplayScene extends Phaser.Scene {
    constructor() {
        super("GameplayScene");
    }

    // ฟังก์ชันนี้จะทำงานทุกครั้งที่เริ่ม Scene ใหม่ (เคลียร์ค่าเก่า)
    init() {
        currentMission = 1;
        hasKey = false;
        penaltyUntil = 0;
        interactables = [];
        books = [];
        statues = [];
        torches = [];
        chests = [];
        hasFootballScroll = false;
        statueDirections = [0, 0, 0, 0];
        statuesSolved = false;
        torchLit = [false, false, false, false];
        torchSequence = [];
        torchSolved = false;
        messiDialogueActive = false;
        messiDialogueIndex = 0;
        messiDialogueComplete = false;
        chestOpened = false;
        doorOpened = false;
        gameWon = false;

        // สุ่มคำตอบใหม่ทุกรอบ (โอกาสเท่ากันทุกตัวเลือก)
        correctBookIndex = Phaser.Math.Between(0, bookTexts.length - 1);
        correctChestIndex = Phaser.Math.Between(0, 2);

        hearts = MAX_HEARTS;
        timeRemainingMs = TIME_LIMIT_MS;

        if (messageTimer) messageTimer.remove();
        if (timerEvent) timerEvent.remove();
    }

    preload() {
        this.load.tilemapTiledJSON('stadium_map', 'sprites/Map_new.tmj'); 
        this.load.image('tiles','sprites/Map.png');
        this.load.spritesheet('player', 'sprites/GhostSheet_Character.png', { frameWidth: 32, frameHeight: 32 });
        this.load.image('book1', 'sprites/book1.png');
        this.load.image('book2', 'sprites/book2.png');
        this.load.image('book3', 'sprites/book3.png');
        this.load.image('book4', 'sprites/book4.png');
        this.load.image('book5', 'sprites/book5.png');
        this.load.image('jude_statue', 'sprites/jude bellingham_Statue.png');
        this.load.image('fire1', 'sprites/fire1.png');
        this.load.image('fire2', 'sprites/fire2.png');
        this.load.image('fire3', 'sprites/fire3.png');
        this.load.image('messi_npc', 'sprites/messi NPC.png');
        this.load.image('box1', 'sprites/box1.png');
        this.load.image('box2', 'sprites/box2.png');
        this.load.image('box3', 'sprites/box3.png');
        this.load.image('door1', 'sprites/door1.png');
        this.load.image('door2', 'sprites/door2.png');
        this.load.image('wc_key', 'sprites/key.png');

        this.load.audio('bgm', 'sound/เสียงเพลงประกอบเกม.mp3');
        this.load.audio('sfx_run', 'sound/เสียงวิ่ง.mp3');
        this.load.audio('sfx_book', 'sound/เสียงเปิดหนังสือ.mp3');
        this.load.audio('sfx_statue', 'sound/เสียงขยับรูปปั้น_ใช้แค่วินาทีที่3-4.mp3');
        this.load.audio('sfx_fire', 'sound/เสียงจุดไฟ.mp3');
        this.load.audio('sfx_click_npc', 'sound/เสียงตอนคลิ๊กคำใบ้และคุยกับNPC.mp3');
        this.load.audio('sfx_gate_open', 'sound/เสียงเปิดประตูห้องตอนทำการกิจแต่ละห้องเสร็จ.mp3');
        this.load.audio('sfx_mission_complete', 'sound/เสียงเมื่อทำการกิจแต่ละห้องสำเร็จ.mp3');
        this.load.audio('sfx_chest', 'sound/เสียงเปิดกล่องสมบัติ.mp3');
        this.load.audio('sfx_exit_door', 'sound/เสียงประตูเปิดทางออก.mp3');
        this.load.audio('sfx_win', 'sound/เสียงชนะ.mp3');
    }

    create() {
        const scene = this; 
        
        // --- ส่วนสร้างแผนที่ ---
        const map = this.make.tilemap({ key: 'stadium_map' });
        const tileset = map.addTilesetImage('Map', 'tiles');

        map.createLayer('Floor Layer', tileset, 0, 0);
        const wallsLayer = map.createLayer('Wall Layer', tileset, 0, 0);
        wallsLayer.setCollisionByExclusion([-1]);

        this.physics.world.setBounds(0, 0, 1480, 900);

        this.sound.stopAll();
        bgmSound = playSoundSafely(this, 'bgm', { loop: true, volume: 0.35 });

        // ให้ PauseScene เรียกใช้เพื่อหยุด/เล่นเสียงต่อได้จากภายนอก
        this.pauseAudio = () => {
            if (bgmSound && bgmSound.isPlaying) bgmSound.pause();
            if (runSound && runSound.isPlaying) runSound.pause();
        };
        this.resumeAudio = () => {
            if (bgmSound && bgmSound.isPaused) bgmSound.resume();
            if (runSound && runSound.isPaused) runSound.resume();
        };

        // --- ระบบประตูใสและโซนภารกิจ ---
        gatesGroup = this.physics.add.staticGroup();
        gates = GATE_DEFS.map(def => {
            const rect = scene.add.rectangle(def.x, def.y, def.w, def.h, 0x000000, 0.001);
            scene.physics.add.existing(rect, true);
            gatesGroup.add(rect);
            return { key: def.key, rect, requiredMission: def.requiredMission };
        });

        // --- ผู้เล่น ---
        player = this.physics.add.sprite(260, 220, 'player', 0).setScale(2).setDepth(10);
        player.setCollideWorldBounds(true);
        player.body.setSize(18, 24);
        player.body.setOffset(7, 6);
        
        this.physics.add.collider(player, wallsLayer);
        this.physics.add.collider(player, gatesGroup, (p, g) => onGateBump(this, p, g)); 

        updateGates(); 

        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
        this.anims.create({ key: 'walk', frames: this.anims.generateFrameNumbers('player', { start: 24, end: 27 }), frameRate: 8, repeat: -1 });

        // --- คีย์บอร์ดและกล้อง ---
        cursors = this.input.keyboard.createCursorKeys();
        keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        keyB = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

        this.cameras.main.setBounds(0, 0, 1480, 900);
        this.cameras.main.startFollow(player, true, 0.09, 0.09);

        // --- UI ของเกม ---
        // ซูมแก้ไขเฉพาะส่วนสร้างปุ่ม Pause ใน create() ของ GameplayScene.js
let pauseButton = this.add.text(1480, 50, "⏸ PAUSE", {
    fontSize: "22px", 
    fontFamily: "Arial", 
    fontStyle: "bold",
    color: "#ffffff", 
    backgroundColor: "#1a472a",
    padding: { x: 16, y: 10 }
})
.setOrigin(1, 0)
.setScrollFactor(0) // ล็อกให้อยู่บนหน้าจอเสมอแม้กล้องจะขยับ
.setDepth(100);

pauseButton.setInteractive({ useHandCursor: true });
pauseButton.on("pointerover", () => pauseButton.setBackgroundColor("#2e8b57"));
pauseButton.on("pointerout", () => pauseButton.setBackgroundColor("#1a472a"));
pauseButton.on("pointerdown", () => {
    this.pauseAudio();
    this.scene.pause();
    this.scene.launch("PauseScene");
});

        interactPrompt = this.add.text(0, 0, 'กด E', {
            fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
            backgroundColor: '#000000', padding: { x: 6, y: 4 }
        }).setOrigin(0.5).setDepth(30).setVisible(false);

        messageBox = this.add.rectangle(690, 630, 1040, 90, 0x000000, 0.8)
            .setStrokeStyle(2, 0xffe066).setDepth(40).setVisible(false);
        messageText = this.add.text(690, 630, '', {
            fontSize: '19px', fontFamily: 'Arial', color: '#ffffff',
            align: 'center', wordWrap: { width: 980 }
        }).setOrigin(0.5).setDepth(41).setVisible(false);

        messageBox.setScrollFactor(0);
        messageText.setScrollFactor(0);

        missionStatusText = this.add.text(20, 850, '', {
            fontSize: '16px', fontFamily: 'Arial', color: '#ffe066',
            backgroundColor: '#000000cc', padding: { x: 8, y: 4 }
        }).setDepth(50).setScrollFactor(0);
        updateMissionStatusText();

        // --- UI หัวใจ (จำกัด 2 ดวง สำหรับภารกิจกล่องสมบัติ) ---
        heartsText = this.add.text(20, 20, '', {
            fontSize: '28px', fontFamily: 'Arial'
        }).setDepth(50).setScrollFactor(0);
        updateHeartsText();

        // --- UI นับเวลาถอยหลัง 1 นาที ---
        timerText = this.add.text(740, 20, '', {
            fontSize: '26px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffe066',
            backgroundColor: '#000000aa', padding: { x: 14, y: 6 }
        }).setOrigin(0.5, 0).setDepth(50).setScrollFactor(0);
        updateTimerText();

        timerEvent = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (gameWon) return;
                timeRemainingMs -= 1000;
                updateTimerText();
                if (timeRemainingMs <= 0) {
                    loseGame(this, 'time');
                }
            }
        });

        debugGraphics = this.add.graphics().setDepth(200).setVisible(false);

        // --- สร้างไอเทมต่างๆ ในฉาก ---
        setupBooks(scene);
        setupStatues(scene);
        setupTorches(scene);
        setupMessi(scene);
        setupChests(scene);
        setupDoor(scene);
    }

    update(time, delta) {
        if (gameWon) return;
        handleMovement(time, this); 
        handleInteractionCheck(this);

        if (Phaser.Input.Keyboard.JustDown(keyB)) {
            debugVisible = !debugVisible;
            debugGraphics.setVisible(debugVisible);
            if (debugVisible) drawDebugOverlay();
        }
    }
}


// =========================================================
// 3. ฟังก์ชัน Helper ทั้งหมด
// =========================================================

function playSoundSafely(scene, key, config = {}) {
    try {
        if (scene && scene.sound && scene.cache.audio.exists(key)) {
            return scene.sound.play(key, config);
        }
    } catch (e) {
        console.warn('Audio play warning:', key, e);
    }
    return null;
}

function handleMovement(time, scene) {
    let vx = 0; let vy = 0;
    const currentSpeed = (time < penaltyUntil) ? speed * 0.35 : speed;
    const movementLocked = messiDialogueActive;

    if (!movementLocked) {
        if (cursors.left.isDown || keyA.isDown) { vx = -currentSpeed; lastFacing = 'left'; }
        else if (cursors.right.isDown || keyD.isDown) { vx = currentSpeed; lastFacing = 'right'; }

        if (cursors.up.isDown || keyW.isDown) { vy = -currentSpeed; lastFacing = 'up'; }
        else if (cursors.down.isDown || keyS.isDown) { vy = currentSpeed; lastFacing = 'down'; }
    }

    if (vx !== 0 && vy !== 0) { const norm = Math.SQRT1_2; vx *= norm; vy *= norm; }
    player.setVelocity(vx, vy);

    if (vx < 0) player.flipX = true; else if (vx > 0) player.flipX = false;
    
    if (vx !== 0 || vy !== 0) {
        player.anims.play('walk', true);
        if (!runSound) {
            try {
                runSound = scene.sound.add('sfx_run', { loop: true, volume: 0.5 });
            } catch(e) {}
        }
        if (runSound && !runSound.isPlaying) runSound.play();
    } else {
        player.anims.play('idle', true);
        if (runSound && runSound.isPlaying) runSound.stop();
    }
}

function handleInteractionCheck(scene) {
    if (messiDialogueActive) {
        interactPrompt.setVisible(false);
        if (Phaser.Input.Keyboard.JustDown(keyE)) advanceMessiDialogue(scene);
        return;
    }

    let nearest = null; let nearestDist = Infinity;
    interactables.forEach(obj => {
        if (obj.done) return;
        const d = Phaser.Math.Distance.Between(player.x, player.y, obj.sprite.x, obj.sprite.y);
        if (d < obj.range && d < nearestDist) { nearest = obj; nearestDist = d; }
    });

    if (nearest) {
        interactPrompt.setVisible(true);
        interactPrompt.setPosition(nearest.sprite.x, nearest.sprite.y - nearest.promptOffsetY);
        interactPrompt.setText(nearest.promptText || 'กด E');
        if (Phaser.Input.Keyboard.JustDown(keyE)) nearest.onInteract();
    } else {
        interactPrompt.setVisible(false);
    }
}

function registerInteractable(sprite, range, promptOffsetY, onInteract, promptText) {
    interactables.push({ sprite, range, promptOffsetY, onInteract, promptText, done: false });
}

function showMessage(scene, text, durationMs) {
    messageText.setText(text);
    messageBox.setVisible(true);
    messageText.setVisible(true);
    if (messageTimer) messageTimer.remove();
    if (durationMs && durationMs > 0) {
        messageTimer = scene.time.delayedCall(durationMs, () => {
            hideMessage();
        });
    }
}

function hideMessage() { messageBox.setVisible(false); messageText.setVisible(false); }
function showLockedMessage(scene) { showMessage(scene, '🔒 ต้องทำภารกิจก่อนหน้าให้สำเร็จก่อนถึงจะผ่านมาตรงนี้ได้นะ!', 1600); }

function updateGates() {
    gates.forEach(g => {
        g.rect.body.enable = currentMission < g.requiredMission;
    });
}

function onGateBump(scene, playerObj, gateRect) {
    const now = performance.now();
    if (now - gateBumpMessageAt > 400) {
        gateBumpMessageAt = now;
        showLockedMessage(scene);
    }
}

function updateMissionStatusText() {
    if (!missionStatusText) return;
    missionStatusText.setText(MISSION_STATUS_LABELS[currentMission] || '');
}

function updateHeartsText() {
    if (!heartsText) return;
    const full = Math.max(hearts, 0);
    const empty = Math.max(MAX_HEARTS - full, 0);
    heartsText.setText('❤️'.repeat(full) + '🖤'.repeat(empty));
}

function updateTimerText() {
    if (!timerText) return;
    const totalSec = Math.max(0, Math.ceil(timeRemainingMs / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    timerText.setText('⏱ ' + m + ':' + s);
    timerText.setColor(totalSec <= 10 ? '#ff4d4d' : '#ffe066');
}

function drawDebugOverlay() {
    debugGraphics.clear();
    gates.forEach(g => {
        const locked = g.rect.body.enable;
        const color = locked ? 0xffe066 : 0x4caf50;
        debugGraphics.lineStyle(2, color, 1);
        debugGraphics.fillStyle(color, 0.35);
        const b = g.rect.getBounds();
        debugGraphics.fillRect(b.x, b.y, b.width, b.height);
        debugGraphics.strokeRect(b.x, b.y, b.width, b.height);
    });
}

function createHintSign(scene, x, y, hintText) {
    const glow = scene.add.circle(x, y, 17, 0xffe066, 0.25).setDepth(2);
    scene.add.circle(x, y, 14, 0x2b2b2b, 0.9).setStrokeStyle(2, 0xffe066).setDepth(3);
    scene.add.text(x, y, '?', {
        fontSize: '18px', fontFamily: 'Arial', color: '#ffe066', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(4);

    scene.tweens.add({ targets: glow, scale: 1.3, alpha: 0.05, duration: 900, yoyo: true, repeat: -1 });
    registerInteractable(glow, 45, 26, () => {
        playSoundSafely(scene, 'sfx_click_npc');
        showMessage(scene, hintText, 4000);
    }, 'กด E เพื่อดูคำใบ้');
}

function setupBooks(scene) {
    const bookX = [120, 200, 280, 360, 440];
    const bookY = 140;
    const bookKeys = ['book1', 'book2', 'book3', 'book4', 'book5'];
    bookKeys.forEach((key, i) => {
        const book = scene.add.image(bookX[i], bookY, key).setScale(SCALE.book).setDepth(2);
        books.push(book);
        registerInteractable(book, 55, 45, () => handleBookInteract(scene, i), 'กด E เพื่ออ่านหนังสือ');
    });
}

function handleBookInteract(scene, index) {
    playSoundSafely(scene, 'sfx_book');
    const bookSprite = books[index];
    scene.tweens.add({
        targets: bookSprite, scaleX: SCALE.book * 1.25, scaleY: SCALE.book * 1.25,
        duration: 200, ease: 'Back.easeOut', yoyo: true
    });

    if (currentMission !== 1) { showMessage(scene, bookTexts[index], 2500); return; }

    if (index === correctBookIndex) {
        hasFootballScroll = true;
        playSoundSafely(scene, 'sfx_mission_complete');
        playSoundSafely(scene, 'sfx_gate_open');
        showMessage(scene, bookTexts[index] + '\n\n✨ คุณได้รับ "FOOTBALL SCROLL"! ทางไปห้องที่ 2 เปิดแล้ว', 3200);
        currentMission = 2;
        updateGates(); updateMissionStatusText();
    } else { showMessage(scene, bookTexts[index] + '\n\n❌ ยังไม่ใช่เล่มที่ถูกต้อง ลองหาเล่มอื่นดูนะ!', 2200); }
}

function setupStatues(scene) {
    const statueX = [890, 980, 1070, 1160];
    const statueY = 170;
    for (let i = 0; i < 4; i++) {
        const statue = scene.add.image(statueX[i], statueY, 'jude_statue').setScale(SCALE.statue).setDepth(2);
        const dirText = scene.add.text(statueX[i], statueY + 55, dirLabel[statueDirections[i]], {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffe066', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3);
        statues.push({ sprite: statue, dirText: dirText, baseX: statueX[i] });
        registerInteractable(statue, 55, 50, () => handleStatueInteract(scene, i), 'กด E หมุนรูปปั้น 90°');
    }
    const statueHintText = 'คำใบ้: หมุนรูปปั้นทั้ง 4 ตัวให้หันทิศตามลำดับ\n' + statueTarget.map(d => dirLabel[d]).join('  →  ');
    createHintSign(scene, 1025, 270, statueHintText);
}

function handleStatueInteract(scene, index) {
    if (currentMission < 2) { showLockedMessage(scene); return; }
    if (currentMission > 2) { showMessage(scene, 'รูปปั้นเหล่านี้หยุดนิ่งแล้ว หลังจากไขปริศนาสำเร็จ', 1500); return; }

    try {
        const stSfx = scene.sound.add('sfx_statue');
        stSfx.play({ seek: 3 });
        scene.time.delayedCall(1000, () => { if (stSfx.isPlaying) stSfx.stop(); });
    } catch(e) {}

    statueDirections[index] = (statueDirections[index] + 1) % 4;
    statues[index].dirText.setText(dirLabel[statueDirections[index]]);

    const statueSprite = statues[index].sprite;
    const targetAngle = statueDirections[index] * 90;
    scene.tweens.add({ targets: statueSprite, angle: targetAngle, duration: 180, ease: 'Cubic.easeOut' });

    const baseX = statues[index].baseX;
    scene.tweens.add({
        targets: statueSprite, x: baseX + 3, duration: 45, yoyo: true, repeat: 2, ease: 'Sine.easeInOut',
        onComplete: () => { statueSprite.x = baseX; }
    });
    checkStatues(scene);
}

function checkStatues(scene) {
    const solved = statueDirections.every((dir, i) => dir === statueTarget[i]);
    if (solved) {
        statuesSolved = true;
        playSoundSafely(scene, 'sfx_mission_complete'); playSoundSafely(scene, 'sfx_gate_open');
        showMessage(scene, '🗿 รูปปั้นทั้งหมดหันถูกทิศแล้ว! ปริศนาสำเร็จ ทางไปห้องคบเพลิงเปิดแล้ว', 3000);
        currentMission = 3; updateGates(); updateMissionStatusText();
    }
}

function setupTorches(scene) {
    const torchX = [150, 250, 350, 450];
    const torchY = 640;
    for (let i = 0; i < 4; i++) {
        const torch = scene.add.image(torchX[i], torchY, 'fire1').setScale(SCALE.torch).setDepth(2);
        const numText = scene.add.text(torchX[i], torchY + 40, String(i + 1), {
            fontSize: '17px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3);
        torches.push({ sprite: torch, numText: numText, id: i + 1 });
        registerInteractable(torch, 50, 42, () => handleTorchInteract(scene, i), 'กด E เพื่อจุดไฟ');
    }
    const torchHintText = 'คำใบ้: จุดคบเพลิงตามลำดับหมายเลข\n' + correctTorchOrder.join('  →  ');
    createHintSign(scene, 300, 730, torchHintText);
}

function handleTorchInteract(scene, index) {
    if (currentMission < 3) { showLockedMessage(scene); return; }
    if (currentMission > 3 || torchSolved) { showMessage(scene, 'คบเพลิงเหล่านี้ถูกจุดถาวรแล้ว', 1500); return; }
    if (torchLit[index]) return;

    playSoundSafely(scene, 'sfx_fire');
    const torchId = torches[index].id;
    torchLit[index] = true;
    torches[index].sprite.setTexture('fire2');
    torchSequence.push(torchId);

    const stepIndex = torchSequence.length - 1;
    if (torchSequence[stepIndex] !== correctTorchOrder[stepIndex]) {
        showMessage(scene, '❌ ลำดับผิด! คบเพลิงดับหมด ลองใหม่อีกครั้ง (กด E ที่ป้าย "?" เพื่อดูคำใบ้)', 2200);
        resetTorches(); return;
    }

    if (torchSequence.length === correctTorchOrder.length) {
        torchSolved = true;
        playSoundSafely(scene, 'sfx_mission_complete'); playSoundSafely(scene, 'sfx_gate_open');
        showMessage(scene, '🔥 จุดคบเพลิงถูกลำดับครบแล้ว! ทางไปพบเมสซี่เปิดแล้ว', 3000);
        currentMission = 4; updateGates(); updateMissionStatusText();
    } else {
        showMessage(scene, '✅ ถูกต้อง! (' + torchSequence.length + '/' + correctTorchOrder.length + ')', 900);
    }
}

function resetTorches() {
    torchSequence = []; torchLit = [false, false, false, false];
    torches.forEach(t => t.sprite.setTexture('fire1'));
}

function setupMessi(scene) {
    messiNPC = scene.add.image(860, 650, 'messi_npc').setScale(SCALE.messi).setDepth(2);
    registerInteractable(messiNPC, 60, 55, () => startMessiDialogue(scene), 'กด E เพื่อคุยกับเมสซี่');
}

function startMessiDialogue(scene) {
    if (currentMission < 4) { showLockedMessage(scene); return; }
    if (messiDialogueComplete) { showMessage(scene, '"Go on, the chests are waiting for you."', 1800); return; }
    playSoundSafely(scene, 'sfx_click_npc');
    messiDialogueActive = true; messiDialogueIndex = 0;
    showMessage(scene, messiLines[messiDialogueIndex] + '\n\n(กด E เพื่ออ่านต่อ)', 0);
}

function advanceMessiDialogue(scene) {
    playSoundSafely(scene, 'sfx_click_npc');
    messiDialogueIndex++;
    if (messiDialogueIndex < messiLines.length) {
        showMessage(scene, messiLines[messiDialogueIndex] + '\n\n(กด E เพื่ออ่านต่อ)', 0);
    } else {
        messiDialogueActive = false; messiDialogueComplete = true; currentMission = 5;
        playSoundSafely(scene, 'sfx_mission_complete'); updateGates(); hideMessage();
        showMessage(scene, '✨ กล่องสมบัติทั้ง 3 ใบพร้อมให้เลือกแล้ว! เลือกได้เพียงครั้งเดียว ระวังให้ดี (ไม่มีคำใบ้ข้อนี้)', 2800);
        updateMissionStatusText();
    }
}

function setupChests(scene) {
    const chestX = [990, 1080, 1170]; const chestY = 660; const chestKeys = ['box1', 'box2', 'box3'];
    chestKeys.forEach((key, i) => {
        const chest = scene.add.image(chestX[i], chestY, key).setScale(SCALE.chest).setDepth(2);
        chests.push(chest);
        registerInteractable(chest, 50, 42, () => handleChestInteract(scene, i), 'กด E เพื่อเปิดกล่อง');
    });
}

function handleChestInteract(scene, index) {
    if (currentMission < 5) { showLockedMessage(scene); return; }
    if (chestOpened) { showMessage(scene, 'คุณได้กุญแจไปแล้ว ไปที่ประตูทางออกได้เลย', 1500); return; }

    playSoundSafely(scene, 'sfx_chest');
    if (index === correctChestIndex) {
        chestOpened = true; hasKey = true;
        playSoundSafely(scene, 'sfx_mission_complete');
        showMessage(scene, '🗝️ คุณพบ Golden World Cup Trophy Key! เดินเข้าซอกขวาไปเปิดประตูทางออกได้เลย', 3000);
        const keyIcon = scene.add.image(chests[index].x, chests[index].y - 50, 'wc_key').setScale(0.15).setDepth(6);
        scene.tweens.add({ targets: keyIcon, y: keyIcon.y - 30, alpha: 0, duration: 1200, delay: 800, onComplete: () => keyIcon.destroy() });
    } else {
        hearts--;
        updateHeartsText();
        triggerPenalty(scene);
        if (hearts <= 0) {
            scene.time.delayedCall(700, () => loseGame(scene, 'hearts'));
        }
    }
}

function triggerPenalty(scene) {
    showMessage(scene, '🟥 พลาด! กล่องนี้ไม่มีกุญแจ... เสียหัวใจไป 1 ดวง (เหลือ ' + Math.max(hearts, 0) + '/' + MAX_HEARTS + ')', 2000);
    penaltyUntil = performance.now() + 2000;
    scene.cameras.main.shake(300, 0.01); scene.cameras.main.flash(200, 200, 0, 0);
}

function setupDoor(scene) {
    door = scene.add.image(1395, 735, 'door1').setDisplaySize(62, 108).setDepth(2);
    registerInteractable(door, 70, 65, () => handleDoorInteract(scene), 'กด E เพื่อเปิดประตู');
}

function handleDoorInteract(scene) {
    if (doorOpened) return;
    if (!hasKey) { showMessage(scene, '🔒 ประตูถูกล็อกอยู่... ต้องมีกุญแจ World Cup ก่อนถึงจะเปิดได้', 2000); return; }
    playSoundSafely(scene, 'sfx_exit_door');
    doorOpened = true; door.setTexture('door2');
    showMessage(scene, '🚪 ประตูเปิดแล้ว! เส้นทางออกจากสเตเดียมปรากฏ...', 2000);
    currentMission = 6; updateMissionStatusText();
    scene.time.delayedCall(1500, () => winGame(scene));
}

// ปรับปรุงฟังก์ชันให้เฟดจอขาว แล้วเรียก VictoryScene
function winGame(scene) {
    gameWon = true; 
    player.setVelocity(0, 0); 
    if (runSound && runSound.isPlaying) runSound.stop();
    hideMessage(); 
    interactPrompt.setVisible(false);
    playSoundSafely(scene, 'sfx_win');

    scene.cameras.main.fade(1000, 255, 255, 255);
    scene.time.delayedCall(1000, () => {
        scene.scene.start('VictoryScene');
    });
}

// เรียกเมื่อแพ้ (หมดเวลา หรือ หัวใจหมด)
function loseGame(scene, reason) {
    if (gameWon) return; // กันไม่ให้ทริกเกอร์ซ้ำ (เช่น ชนะไปแล้วพอดี)
    gameWon = true;
    player.setVelocity(0, 0);
    if (runSound && runSound.isPlaying) runSound.stop();
    if (bgmSound && bgmSound.isPlaying) bgmSound.stop();
    if (timerEvent) timerEvent.remove();
    hideMessage();
    interactPrompt.setVisible(false);

    scene.cameras.main.shake(300, 0.012);
    scene.cameras.main.fade(1000, 0, 0, 0);
    scene.time.delayedCall(1000, () => {
        scene.scene.start('LoseScene', { reason });
    });
}