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
        this.load.image('torchAsset', 'sprite/torch.png');
        this.load.spritesheet('torchAnimated', 'sprite/Torch Animated.png', { frameWidth: 64, frameHeight: 64 });
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
        
        this.timeRemaining = 60; // 1:00 in seconds
    this.isTimerRunning = true;

    // Create Timer HUD Overlay (Stone Frame & Buttons)
    this.createTimerHUD();

    // Loop timer every second
    this.gameTimerEvent = this.time.addEvent({
        delay: 1000,
        callback: this.tickTimer,
        callbackScope: this,
        loop: true
    });
        // --- 0. CAMERA FADE IN & CLEANUP ---
        this.cameras.main.fadeIn(800, 0, 0, 0);
        this.sound.stopAll(); // Clear any leftover audio from MenuScene

        // Pause Button
        let pauseButton = this.add.text(
            1100,
            50,
            "||",
            {
                fontSize: "30px",
                color: "#ff0000",
                backgroundColor: "#333333",
                padding: { x: 15, y: 10 }
            }
        ).setScrollFactor(0).setDepth(200);

        pauseButton.setInteractive();
        pauseButton.on("pointerdown", () => {
            this.scene.pause();
            this.scene.launch("PauseScene");
        });

        this.interactables = this.physics.add.staticGroup();

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
        this.add.text(100, 45, "📚 THE LIBRARY", { ...titleStyle, fill: "#88ccff" }).setDepth(10);
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
            { x: 120, y: 590 },
            { x: 248, y: 590 }
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
        // --- 5. TOP-RIGHT ROOM: TORCH ROOM ---
this.add.text(810, 45, "🔥 TORCH ROOM", { ...titleStyle, fill: "#ff8888" }).setDepth(10);

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

    // Static torch base (35x30 image)
    let base = this.add.sprite(posX, posY, 'torchAsset');
    
    // Animated fire layer overlay (positioned above the torch base)
    let fire = this.add.sprite(posX, posY - 17, 'torchAnimated').setVisible(false).setScale(0.7);
    let hitArea = this.add.rectangle(posX, posY, 50, 60, 0x000, 0).setInteractive();
    let light = this.add.circle(posX, posY - 17, 50, 0xffaa00, 0.15).setVisible(false);

    this.interactables.add(hitArea);
    hitArea.setData('type', 'torch').setData('id', i + 1).setData('fire', fire).setData('light', light);
    this.add.text(posX, posY + 24, `${i + 1}`, { font: "bold 12px monospace", fill: "#ffffff", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5);
}

        // --- 6. BOTTOM-RIGHT ROOM: TREASURE & NPC ---
        this.add.text(810, 350, "👑 TREASURE ROOM", { ...titleStyle, fill: "#88ff88" }).setDepth(10);

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
        this.player.setVelocity(0);
        this.physics.world.colliders.destroy();

        if (this.sfxSfxBgMusic) this.sfxSfxBgMusic.stop();
        if (this.sfxTorchCrack) this.sfxTorchCrack.stop();
        this.sfxSuccessMission.play();

        let view = this.add.container(0, 720).setDepth(500);
        let cover = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.95).setOrigin(0);
        let vicText = this.add.text(640, 250, "LEVEL PASSED", { font: "bold 52px Arial", fill: "#00ff66" }).setOrigin(0.5);
        view.add([cover, vicText]);

        let btnReset = this.add.text(520, 400, "[ Play Again ]", { font: "22px Arial", fill: "#ffffff" }).setInteractive();
        let btnNext = this.add.text(720, 400, "[ Progress Next ]", { font: "22px Arial", fill: "#ffffff" }).setInteractive();
        view.add([btnReset, btnNext]);

        this.tweens.add({
            targets: view,
            y: 0,
            duration: 1500,
            ease: 'Power2'
        });

        btnReset.on('pointerdown', () => {
            this.victoryTriggered = false;
            this.scene.restart();
        });

        btnNext.on('pointerdown', () => {
            let devNotice = this.add.text(640, 500, "Oops, looks like the level is under development. Stay tuned!", { font: "18px Arial", fill: "#ffaa00" }).setOrigin(0.5);
            this.tweens.add({ targets: devNotice, alpha: 0, delay: 3000, duration: 1000, onComplete: () => devNotice.destroy() });
        });
    }

    update() {

        if (this.isHintActive) {
        if (this.gameTimerEvent) this.gameTimerEvent.paused = true;
        if (this.player && this.player.body) this.player.body.setVelocity(0, 0);
        return;
    } else if (this.gameTimerEvent && this.gameTimerEvent.paused) {
        this.gameTimerEvent.paused = false;
    }

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

// --- TIMER HUD CREATION ---
    createTimerHUD() {
        // Container fixed at Top-Center (640, 50)
        this.timerContainer = this.add.container(640, 50).setDepth(90);

        // Stone Base Panel Frame (180x80)
        let frameGraphics = this.add.graphics();
        this.drawTimerFrame(frameGraphics, 180, 80);

        // Timer Text (Displays 01:00)
        this.timerText = this.add.text(0, -15, this.formatTime(this.timeRemaining), {
            fontFamily: "FirlestFont",
            fontSize: "32px",
            fill: "#ffe066",
            stroke: "#3a0007",
            strokeThickness: 5,
            shadow: { offsetX: 0, offsetY: 0, color: "#ff8800", blur: 10, fill: true }
        }).setOrigin(0.5);

        // -5 SECONDS BUTTON
        let btnMinus = this.createAdjustButton(-45, 20, 60, 28, "-5", () => {
            this.adjustTime(-5);
        });

        // +5 SECONDS BUTTON
        let btnPlus = this.createAdjustButton(45, 20, 60, 28, "+5", () => {
            this.adjustTime(+5);
        });

        this.timerContainer.add([frameGraphics, this.timerText, btnMinus, btnPlus]);
    }

    // --- TICK TIMER EVERY SECOND ---
    tickTimer() {
        if (this.isHintActive || !this.isTimerRunning) return;

        this.timeRemaining--;

        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.timerText.setText("00:00");
            this.triggerDefeat();
        } else {
            this.timerText.setText(this.formatTime(this.timeRemaining));

            // Warning flash text color when under 10 seconds
            if (this.timeRemaining <= 10) {
                this.timerText.setFill('#ff3333');
            } else {
                this.timerText.setFill('#ffe066');
            }
        }
    }

    // --- TIME ADJUSTMENT (-5 / +5) ---
    adjustTime(seconds) {
        if (!this.isTimerRunning) return;

        if (this.clickSfx) this.clickSfx.play();

        this.timeRemaining += seconds;

        // Prevent negative timer values
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.timerText.setText("00:00");
            this.triggerDefeat();
        } else {
            this.timerText.setText(this.formatTime(this.timeRemaining));
        }

        // Quick pop bounce animation on text when adjusted
        this.tweens.add({
            targets: this.timerText,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 100,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }

    // --- TRIGGER DEFEAT SCENE ---
    triggerDefeat() {
        if (!this.isTimerRunning) return;
        this.isTimerRunning = false;

        if (this.gameTimerEvent) this.gameTimerEvent.remove();
        this.sound.stopAll();

        // Switch to Defeat Scene
        this.scene.start("DefeatScene");
    }

    // --- TIME FORMATTER (MM:SS) ---
    formatTime(seconds) {
        let mins = Math.floor(seconds / 60);
        let secs = seconds % 60;
        let mm = mins < 10 ? `0${mins}` : `${mins}`;
        let ss = secs < 10 ? `0${secs}` : `${secs}`;
        return `${mm}:${ss}`;
    }

    // --- DRAWING HELPERS FOR TIMER FRAME & BUTTONS ---
    drawTimerFrame(graphics, width, height) {
        graphics.clear();
        let halfW = width / 2;
        let halfH = height / 2;

        graphics.fillStyle(0x0a0a0a, 0.85);
        graphics.fillRoundedRect(-halfW - 3, -halfH - 3, width + 6, height + 6, 12);

        graphics.fillGradientStyle(0x2d2b2b, 0x2d2b2b, 0x181717, 0x181717, 0.95);
        graphics.fillRoundedRect(-halfW, -halfH, width, height, 10);

        graphics.lineStyle(3, 0x6e6868, 0.8);
        graphics.strokeRoundedRect(-halfW + 2, -halfH + 2, width - 4, height - 4, 8);

        graphics.lineStyle(2, 0xffaa00, 0.9);
        graphics.strokeRoundedRect(-halfW + 5, -halfH + 5, width - 10, height - 10, 6);
    }

    createAdjustButton(x, y, width, height, labelText, onClick) {
        let container = this.add.container(x, y);

        let btnBg = this.add.graphics();
        this.drawTimerButton(btnBg, width, height, 0x3d3a3a, 0x1f1d1d, 0x888888);

        let text = this.add.text(0, 0, labelText, {
            fontFamily: "FirlestFont",
            fontSize: "16px",
            fill: "#e0e0e0",
            stroke: "#000000",
            strokeThickness: 3
        }).setOrigin(0.5);

        container.add([btnBg, text]);

        let hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });
        container.add(hitArea);

        hitArea.on('pointerover', () => {
            this.drawTimerButton(btnBg, width, height, 0x5a5555, 0x2e2a2a, 0x00ffff);
            text.setFill('#00ffff');
            this.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 100 });
        });

        hitArea.on('pointerout', () => {
            this.drawTimerButton(btnBg, width, height, 0x3d3a3a, 0x1f1d1d, 0x888888);
            text.setFill('#e0e0e0');
            this.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 100 });
        });

        hitArea.on('pointerdown', onClick);

        return container;
    }

    drawTimerButton(graphics, width, height, colorTop, colorBottom, borderColor) {
        graphics.clear();
        let halfW = width / 2;
        let halfH = height / 2;

        graphics.fillStyle(0x0d0d0d, 0.8);
        graphics.fillRoundedRect(-halfW - 1, -halfH - 1, width + 2, height + 2, 6);

        graphics.fillGradientStyle(colorTop, colorTop, colorBottom, colorBottom, 1);
        graphics.fillRoundedRect(-halfW, -halfH, width, height, 5);

        graphics.lineStyle(1.5, borderColor, 0.9);
        graphics.strokeRoundedRect(-halfW + 1, -halfH + 1, width - 2, height - 2, 4);
    }
}