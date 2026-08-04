import MenuScene from "./MenuScene.js";
export default class GameplayScene extends Phaser.Scene {
    constructor() {
        super("GameplayScene");
    }

    init() {
        // Class instance variables
        this.player = null;
        this.cursors = null;
        this.wasd = null;
        this.uiText = null;
        this.interactables = null;
        this.activeDialogueInstance = null;
        this.victoryTriggered = false;

        // --- ระบบจับเวลา ---
        this.timeLimit = 90; // เปลี่ยนเป็น 90 วินาที (1:30)
        this.timerText = null;
        this.timerEvent = null;

        // Sound instances
        this.sfxSfxBgMusic = null;
        this.sfxNpcSpeak = null;
        this.sfxStatueMove = null;
        this.sfxTorchWhoosh = null;
        this.sfxTorchCrack = null;
        this.sfxPageFlip = null;
        this.sfxSuccessMission = null;
        this.sfxSpellLearned = null;
        this.sfxSuccessChime = null;
        this.sfxOpenChest = null;

        // Game State
        this.gameState = {
            hasSpell: false,
            hasLighter: false,
            torchSequence: [],
            correctTorchOrder: [],
            correctStatueAngles: [],
            statueAngles: [0, 0, 0, 0],
            correctBookIndex: 0,
            gatesOpened: { torchRoomAccess: false, endHallwayAccess: false },
            chestOpened: false
        };

        this.colors = ['Red', 'Blue', 'Green', 'Brown'];
        this.hexColors = [0xff0000, 0x0000ff, 0x00ff00, 0x8b4513];
        this.possibleAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    }

    preload() {
        // --- SPRITES & ANIMS ---
        this.load.spritesheet('character', 'sprite/character.png', { frameWidth: 32, frameHeight: 32 });
        this.load.image('bookAsset', 'sprite/book.png');
        this.load.image('dragonAsset', 'sprite/dragon.png');
        this.load.image('npcAsset', 'sprite/npc.png');
        this.load.image('TorchAsset', 'sprite/torch.png');
        this.load.spritesheet('TorchAnimated', 'sprite/Torch Animated.png', { frameWidth: 64, frameHeight: 64 });
        this.load.image('chestStatic', 'sprite/Wooden Chest 2 - frame  00.png');
        this.load.spritesheet('chestAnimated', 'sprite/Wooden Chest 2 - Spritesheet.png', { frameWidth: 48, frameHeight: 32 });

        // --- MAP & TILESET ---
        this.load.tilemapTiledJSON('dungeonMap', 'assets/dungeonv4.json');
        this.load.image('dungeonTiles', 'tileset/Dungeon_FloorsWallsA5.png');

        // --- SOUND EFFECTS ---
        this.load.audio('npcSpeak', 'sound/blue-archive-respond-chat.mp3');
        this.load.audio('statueMove', 'sound/concrete-tap-gtag.mp3');
        this.load.audio('bgMusic', 'sound/deuslower-dark-fantasy-ambient-dungeon-synth-music-281592.mp3');
        this.load.audio('torchWhoosh', 'sound/fire-whoosh.mp3');
        this.load.audio('torchCrack', 'sound/fogo-lighter.mp3');
        this.load.audio('pageFlip', 'sound/page-flip-sound-effect.mp3');
        this.load.audio('successMission', 'sound/pokemon-black-and-white-ost-disc-3-mission-success.mp3');
        this.load.audio('spellLearned', 'sound/spell-learned.mp3');
        this.load.audio('successChime', 'sound/success-chime.mp3');
        this.load.audio('openChest', 'sound/zelda-chest.mp3');
    }

    create() {
        // ปุ่ม Pause
        let pauseButton = this.add.text(
            1100,
            50,
            "||",
            {
                fontSize:"30px",
                color:"#ff0000",
                backgroundColor:"#333333",
                padding:{
                    x:15,
                    y:10
                }
            }
        );

        pauseButton.setInteractive();

        pauseButton.on(
            "pointerdown",
            ()=>{
                console.log("Pause");
                this.scene.pause();
                this.scene.launch("PauseScene");
            }
        );
        this.interactables = this.physics.add.staticGroup();

        // --- UI แสดงเวลา (เรียกใช้ formatTime) ---
        this.timerText = this.add.text(
            this.scale.width / 2, 
            50, 
            `TIME: ${this.formatTime(this.timeLimit)}`, 
            { 
                fontSize: "36px", 
                fontFamily: "Arial Black", 
                fill: "#ff0000", 
                stroke: "#ffffff", 
                strokeThickness: 4 
            }
        ).setOrigin(0.5).setDepth(200);

        // สร้าง Timer หมุนทุกๆ 1 วินาที (1000 ms)
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.onTimerTick,
            callbackScope: this,
            loop: true
        });

        // --- AUDIO INITIALIZATION ---
        this.sfxSfxBgMusic = this.sound.add('bgMusic', { volume: 0.25, loop: true });
        this.sfxSfxBgMusic.play();

        this.sfxNpcSpeak = this.sound.add('npcSpeak', { volume: 0.6 });
        this.sfxStatueMove = this.sound.add('statueMove', { volume: 0.7 });
        this.sfxTorchWhoosh = this.sound.add('torchWhoosh', { volume: 0.6 });
        this.sfxTorchCrack = this.sound.add('torchCrack', { volume: 0.4, loop: true });
        this.sfxPageFlip = this.sound.add('pageFlip', { volume: 0.6 });
        this.sfxSuccessMission = this.sound.add('successMission', { volume: 0.7 });
        this.sfxSpellLearned = this.sound.add('spellLearned', { volume: 0.7 });
        this.sfxSuccessChime = this.sound.add('successChime', { volume: 0.7 });
        this.sfxOpenChest = this.sound.add('openChest', { volume: 0.7 });

        // --- 1. RENDER TILED MAP & LAYERS ---
        const map = this.make.tilemap({ key: 'dungeonMap' });
        const tilesetName = (map.tilesets && map.tilesets.length > 0) ? map.tilesets[0].name : 'dungeon';
        const tileset = map.addTilesetImage(tilesetName, 'dungeonTiles');

        if (tileset) {
            const voidLayer = map.createLayer('void', tileset, 0, 0);
            const floorLayer = map.createLayer('Floor Layers', tileset, 0, 0);
            const wallLayer = map.createLayer('Wall Layers', tileset, 0, 0);
            const wall2Layer = map.createLayer('Wall 2 Layers', tileset, 0, 0);

            if (voidLayer) voidLayer.setDepth(-15);
            if (floorLayer) floorLayer.setDepth(-10);
            if (wallLayer) {
                wallLayer.setDepth(-5);
                wallLayer.setCollisionByExclusion([-1]);
            }
            if (wall2Layer) {
                wall2Layer.setDepth(-5);
                wall2Layer.setCollisionByExclusion([-1]);
            }
        }

        // --- 2. RANDOMIZE PUZZLE SOLUTIONS ---
        this.gameState.correctBookIndex = Phaser.Math.Between(0, 4);

        let torchPool = [1, 2, 3, 4];
        this.gameState.correctTorchOrder = Phaser.Utils.Array.Shuffle(torchPool);

        let angleClues = [];
        for (let i = 0; i < 4; i++) {
            let randAngle = this.possibleAngles[Phaser.Math.Between(0, this.possibleAngles.length - 1)];
            this.gameState.correctStatueAngles.push(randAngle);
            this.gameState.statueAngles[i] = (randAngle + 90) % 360;
            angleClues.push(`${this.colors[i]} = ${randAngle}°`);
        }

        let clueIndex = 0;
        const bookClues = [];
        for (let i = 0; i < 5; i++) {
            if (i === this.gameState.correctBookIndex) {
                bookClues.push("✨ This book contains the ancient Magic Spell scroll! ✨");
            } else {
                bookClues.push(`📜 Clue Fragment: "${angleClues[clueIndex]}"`);
                clueIndex++;
            }
        }

        const titleStyle = { font: "bold 15px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 4 };

        // --- 3. TOP-LEFT ROOM: THE LIBRARY ---
        this.add.text(90, 35, "📚 THE LIBRARY", { ...titleStyle, fill: "#88ccff" }).setDepth(10);
        for (let i = 0; i < 5; i++) {
            let posX = 120 + (i * 90);
            let posY = 150;
            this.add.circle(posX, posY, 18, 0x5d4037).setStrokeStyle(2, 0xd7ccc8);
            this.add.sprite(posX, posY, 'bookAsset').setScale(0.04);

            let hitZone = this.add.rectangle(posX, posY, 48, 48, 0x000, 0).setInteractive();
            this.interactables.add(hitZone);

            this.add.text(posX, posY + 24, `${i + 1}`, { font: "bold 12px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5);
            hitZone.setData('type', 'book').setData('id', i).setData('clue', bookClues[i]);
        }

        // --- 4. BOTTOM-LEFT ROOM: DRAGON CHAMBER ---
        const pedestalPositions = [
            { x: 120, y: 460 },
            { x: 248, y: 460 },
            { x: 120, y: 604 },
            { x: 248, y: 604 }
        ];

        this.add.text(90, 380, "🗿 DRAGON CHAMBER", { ...titleStyle, fill: "#ffcc88" }).setDepth(10);
        for (let i = 0; i < 4; i++) {
            let posX = pedestalPositions[i].x;
            let posY = pedestalPositions[i].y;
            let dragon = this.add.sprite(posX, posY, 'dragonAsset').setTint(this.hexColors[i]).setScale(0.045);

            let dragonHitZone = this.add.rectangle(posX, posY, 50, 60, 0x000, 0).setInteractive();
            this.interactables.add(dragonHitZone);
            dragonHitZone.setData('type', 'statue').setData('id', i).setData('art', dragon);

            let label = this.add.text(posX, posY - 28, `${this.gameState.statueAngles[i]}°`, { font: "bold 13px monospace", fill: "#000000", stroke: "#ffffff", strokeThickness: 3 }).setOrigin(0.5).setDepth(5);
            dragonHitZone.setData('labelText', label);
        }

        // --- 5. TOP-RIGHT ROOM: TORCH ROOM ---
        this.add.text(810, 35, "🔥 TORCH ROOM", { ...titleStyle, fill: "#ff8888" }).setDepth(10);
        if (!this.anims.exists('burn')) {
            this.anims.create({
                key: 'burn',
                frames: this.anims.generateFrameNumbers('torchAnimated', { start: 0, end: 7 }),
                frameRate: 12,
                repeat: -1
            });
        }

        for (let i = 0; i < 4; i++) {
            let posX = 800 + (i * 120);
            let posY = 150;
            this.add.sprite(posX, posY, 'torchAsset');
            let fire = this.add.sprite(posX, posY - 17, 'torchAnimated').setVisible(false).setScale(0.7);
            let hitArea = this.add.rectangle(posX, posY, 50, 60, 0x000, 0).setInteractive();
            let light = this.add.circle(posX, posY - 17, 50, 0xffaa00, 0.15).setVisible(false);

            this.interactables.add(hitArea);
            hitArea.setData('type', 'torch').setData('id', i + 1).setData('fire', fire).setData('light', light);
            this.add.text(posX, posY + 24, `${i + 1}`, { font: "bold 12px monospace", fill: "#ffffff", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5);
        }

        // --- 6. BOTTOM-RIGHT ROOM: TREASURE & NPC ---
        this.add.text(810, 380, "👑 TREASURE ROOM", { ...titleStyle, fill: "#88ff88" }).setDepth(10);

        this.add.sprite(1000, 520, 'npcAsset').setScale(0.06);
        let npcHitZone = this.add.rectangle(1000, 520, 50, 60, 0x000, 0).setInteractive();
        this.interactables.add(npcHitZone);
        npcHitZone.setData('type', 'npc');

        let chest = this.add.sprite(1120, 520, 'chestStatic');
        let chestHitZone = this.add.rectangle(1120, 520, 50, 50, 0x000, 0).setInteractive();
        this.interactables.add(chestHitZone);
        chestHitZone.setData('type', 'chest').setData('art', chest);

        if (!this.anims.exists('chestOpen')) {
            this.anims.create({
                key: 'chestOpen',
                frames: this.anims.generateFrameNumbers('chestAnimated', { start: 0, end: 4 }),
                frameRate: 8,
                repeat: 0
            });
        }

        // --- 7. PLAYER SPAWN & MAP COLLIDERS ---
        this.player = this.physics.add.sprite(100, 150, 'character', 0).setScale(1.2).setCollideWorldBounds(true);

        let wallLayer = map.getLayer('Wall Layers') ? map.getLayer('Wall Layers').tilemapLayer : null;
        let wall2Layer = map.getLayer('Wall 2 Layers') ? map.getLayer('Wall 2 Layers').tilemapLayer : null;

        if (wallLayer) this.physics.add.collider(this.player, wallLayer);
        if (wall2Layer) this.physics.add.collider(this.player, wall2Layer);

        // --- 8. UI TEXT & CONTROLS ---
        this.add.rectangle(640, 685, 1200, 40, 0x000000, 0.75).setDepth(100);
        this.uiText = this.add.text(40, 675, "Objective: Walk up to a book and press SPACEBAR to inspect it.", { font: "15px Arial", fill: "#ffffff" }).setDepth(101);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D
        });

        if (!this.anims.exists('idle')) {
            this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('character', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
        }
        if (!this.anims.exists('walk')) {
            this.anims.create({ key: 'walk', frames: this.anims.generateFrameNumbers('character', { start: 24, end: 31 }), frameRate: 10, repeat: -1 });
        }
        this.player.play('idle');
    }

    // --- ฟังก์ชันอัปเดตเวลา (อัปเดตการแสดงผลให้เป็น นาที:วินาที) ---
    onTimerTick() {
        if (this.victoryTriggered) return; // ถ้าชนะแล้วให้หยุดนับเวลา

        this.timeLimit--;
        this.timerText.setText(`TIME: ${this.formatTime(this.timeLimit)}`);

        if (this.timeLimit <= 0) {
            this.triggerGameOver();
        }
    }

    // --- ฟังก์ชันเมื่อเวลาหมด (Game Over) ---
    triggerGameOver() {
        // หยุดการนับเวลา
        if (this.timerEvent) {
            this.timerEvent.remove();
        }

        // ปิดเสียงทั้งหมด
        if (this.sfxSfxBgMusic) this.sfxSfxBgMusic.stop();
        if (this.sfxTorchCrack) this.sfxTorchCrack.stop();
        
        // หยุดตัวละคร
        this.player.setVelocity(0);
        this.player.play('idle', true);

        // เปลี่ยน Scene ไปหน้า Menulose
        this.scene.start("Menulose");
        this.scene.stop("GameplayScene");
    }

    handleInteraction(obj) {
        const type = obj.getData('type');

        if (type === 'book') {
            this.sfxPageFlip.play();

            let isCorrect = (obj.getData('id') === this.gameState.correctBookIndex);
            let textClue = obj.getData('clue');

            if (isCorrect && !this.gameState.hasSpell) {
                this.gameState.hasSpell = true;
                this.sfxSpellLearned.play();

                this.uiText.setText("✨ Magic spell learned! Rotate the Dragon Statues in the bottom-left chamber.");

                let particles = this.add.particles(0, 0, 'bookAsset', {
                    speed: 120,
                    scale: { start: 0.02, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 800,
                    tint: 0x00aaff
                });
                particles.startFollow(this.player);
                this.time.delayedCall(1000, () => particles.destroy());
            } else {
                this.uiText.setText(textClue);
            }
        }

        if (type === 'statue') {
            if (!this.gameState.hasSpell) {
                this.uiText.setText("🔒 The dragons are completely static. You need a magic spell!");
                return;
            }
            if (this.gameState.hasLighter) return;

            this.sfxStatueMove.play();

            let id = obj.getData('id');
            this.gameState.statueAngles[id] = (this.gameState.statueAngles[id] + 45) % 360;
            obj.getData('labelText').setText(`${this.gameState.statueAngles[id]}°`);

            if (this.gameState.statueAngles.every((angle, idx) => angle === this.gameState.correctStatueAngles[idx])) {
                this.gameState.hasLighter = true;
                this.gameState.gatesOpened.torchRoomAccess = true;
                this.sfxSuccessChime.play();

                this.uiText.setText("⚡ Success! Dragons aligned. Obtained the LIGHTER! Proceed to the Torch Room (top right).");
            }
        }

        if (type === 'torch') {
            if (!this.gameState.hasLighter) {
                this.uiText.setText("❌ You cannot ignite these torches. You need the Lighter!");
                return;
            }

            let id = obj.getData('id');
            let fireSprite = obj.getData('fire');
            let lightSprite = obj.getData('light');

            if (this.gameState.torchSequence.includes(id)) return;

            this.sfxTorchWhoosh.play();
            if (!this.sfxTorchCrack.isPlaying) this.sfxTorchCrack.play();

            this.gameState.torchSequence.push(id);
            fireSprite.setVisible(true).play('burn');
            lightSprite.setVisible(true);

            let step = this.gameState.torchSequence.length - 1;
            if (this.gameState.torchSequence[step] !== this.gameState.correctTorchOrder[step]) {
                this.uiText.setText("💨 Wrong order! The flames fizzle out. Start over!");
                this.gameState.torchSequence = [];

                this.sfxTorchCrack.stop();

                this.children.list.forEach(child => {
                    if (child.getData && child.getData('type') === 'torch') {
                        child.getData('fire').setVisible(false).stop();
                        child.getData('light').setVisible(false);
                    }
                });
            } else if (this.gameState.torchSequence.length === 4) {
                this.sfxSuccessChime.play();
                this.uiText.setText("🔥 Fantastic! All torches burning. Speak to the NPC in the Treasure Room.");
            }
        }

        if (type === 'npc') {
            this.sfxNpcSpeak.play();
            this.triggerDialogueTree();
        }

        if (type === 'chest') {
            if (this.gameState.torchSequence.length < 4) {
                this.uiText.setText("The treasure chest is locked down tight by protective spells.");
                return;
            }
            if (this.gameState.chestOpened) return;

            this.gameState.chestOpened = true;
            this.sfxOpenChest.play();

            let chestArt = obj.getData('art');
            chestArt.setTexture('chestAnimated');
            chestArt.play('chestOpen');

            this.uiText.setText("💰 Opened! Found legendary relic contents. Head right through the wall opening to complete the level!");

            let alert = this.add.text(640, 250, "+5000 GOLD", { font: "bold 40px Arial", fill: "#ffd700", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setDepth(200);
            this.tweens.add({ targets: alert, y: 180, alpha: 0, duration: 2000, onComplete: () => alert.destroy() });

            this.gameState.gatesOpened.endHallwayAccess = true;
            this.openEndHallway();
        }
    }

    triggerDialogueTree() {
        if (this.activeDialogueInstance) return;

        let dialogues = [];
        if (this.gameState.torchSequence.length < 4) {
            dialogues = [
                { text: "NPC: 'Hello there.'", options: [{ text: "Hello", next: 2 }, { text: "Goodbye", next: -1 }] },
                { text: "NPC: 'Hello adventurer, nice to see you here.'", options: [{ text: "What are you doing here?", next: 3 }] },
                { text: "NPC: 'I am guarding this ancient space.'", options: [{ text: "I'm trying to figure out the torch puzzle.", next: 4 }, { text: "Just passing by.", next: -1 }] },
                { text: "NPC: 'I can help you with that.'", options: [{ text: "Really? That would be nice.", next: 5 }, { text: "No, thanks.", next: -1 }] },
                { text: `NPC: 'The order of torches is: [ ${this.gameState.correctTorchOrder.join(' - ')} ]'`, options: [{ text: "Thanks!", next: -1 }] }
            ];
        } else {
            dialogues = [
                { text: "NPC: 'Great job adventurer, the treasure is yours!'", options: [{ text: "Thanks again, good luck now.", next: 1 }] },
                { text: "NPC: 'See you around!'", options: [{ text: "[Leave Conversation]", next: -1 }] }
            ];
        }

        this.renderDialogueWindow(dialogues, 0);
    }

    renderDialogueWindow(tree, index) {
        if (index === -1) {
            if (this.activeDialogueInstance) this.activeDialogueInstance.destroy();
            this.activeDialogueInstance = null;
            return;
        }

        if (this.activeDialogueInstance) this.activeDialogueInstance.destroy();

        const node = tree[index];
        const box = this.add.container(390, 480).setDepth(300);
        this.activeDialogueInstance = box;

        let bg = this.add.rectangle(0, 0, 500, 160, 0x000000, 0.85).setOrigin(0).setStrokeStyle(2, 0xffffff);
        let mainTxt = this.add.text(20, 20, node.text, { font: "15px Arial", fill: "#fff", wordWrap: { width: 460 } });
        box.add([bg, mainTxt]);

        node.options.forEach((opt, i) => {
            let optText = this.add.text(30, 80 + (i * 30), `> ${opt.text}`, { font: "14px Arial", fill: "#00ff66" }).setInteractive();
            box.add(optText);
            optText.on('pointerdown', () => {
                this.sfxNpcSpeak.play();
                this.renderDialogueWindow(tree, opt.next);
            });
        });
    }

    openEndHallway() {
        let wallBreaker = this.add.rectangle(1255, 512, 30, 80, 0x00ff00, 0);
        this.physics.add.existing(wallBreaker, true);

        this.physics.add.overlap(this.player, wallBreaker, () => {
            if (!this.victoryTriggered) {
                this.victoryTriggered = true;
                this.triggerVictoryScene();
            }
        });
    }

    triggerVictoryScene() {
        // หยุดระบบเวลาเมื่อชนะ
        if (this.timerEvent) this.timerEvent.remove();

        this.player.setVelocity(0);
        this.physics.world.colliders.destroy();

        if (this.sfxSfxBgMusic) this.sfxSfxBgMusic.stop();
        if (this.sfxTorchCrack) this.sfxTorchCrack.stop();
        this.sfxSuccessMission.play();

        // เปลี่ยน Scene ไปหน้า Menuwin ทันที
        this.scene.start("Menuwin");
        this.scene.stop("GameplayScene");
    }

    update() {
        if (this.victoryTriggered || this.activeDialogueInstance) {
            this.player.setVelocity(0);
            this.player.play('idle', true);
            return;
        }

        this.children.list.forEach(child => {
            if (child.getData && child.getData('type') === 'torch' && child.getData('light').visible) {
                child.getData('light').setAlpha(Phaser.Math.FloatBetween(0.12, 0.25));
            }
        });

        const speed = 180;
        this.player.setVelocity(0);
        let moving = false;

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            this.player.setVelocityX(-speed); this.player.setFlipX(true); moving = true;
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            this.player.setVelocityX(speed); this.player.setFlipX(false); moving = true;
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            this.player.setVelocityY(-speed); moving = true;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            this.player.setVelocityY(speed); moving = true;
        }

        if (moving) {
            this.player.play('walk', true);
        } else {
            this.player.play('idle', true);
        }

        this.physics.overlap(this.player, this.interactables, (p, obj) => {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
                this.handleInteraction(obj);
            }
        });
    }

    // --- ฟังก์ชันแปลงเวลาจากวินาทีให้เป็นรูปแบบ นาที:วินาที ---
    formatTime(seconds) {
        let minutes = Math.floor(seconds / 60);
        let remainingSeconds = seconds % 60;
        
        let paddedMinutes = minutes.toString().padStart(2, '0');
        let paddedSeconds = remainingSeconds.toString().padStart(2, '0');
        
        return `${paddedMinutes}:${paddedSeconds}`;
    }
}