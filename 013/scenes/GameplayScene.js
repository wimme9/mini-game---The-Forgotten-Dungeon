export default class GameplayScene extends Phaser.Scene {
    constructor() {
        super("GameplayScene");
    }

    preload() {
        this.load.spritesheet('character', 'sprite/character.png', { frameWidth: 32, frameHeight: 32 });
        this.load.image('bookAsset', 'sprite/book.png'); 
        this.load.image('dragonAsset', 'sprite/dragon.png'); 
        this.load.image('npcAsset', 'sprite/npc.png'); 
        this.load.image('torchAsset', 'sprite/Torch.png'); 
        this.load.spritesheet('torchAnimated', 'sprite/Torch Animated.png', { frameWidth: 64, frameHeight: 64 }); 
        this.load.image('chestStatic', 'sprite/Wooden Chest 2 - frame  00.png'); 
        this.load.spritesheet('chestAnimated', 'sprite/Wooden Chest 2 - Spritesheet.png', { frameWidth: 48, frameHeight: 32 }); 
        this.load.tilemapTiledJSON('dungeonMap', 'Dungeon_TilesMap.json');
        this.load.image('dungeonTiles', 'DampDungeonsRPGMakerMZ/DampDungeonsRPGMakerMZ/Tilesets/Dungeon_FloorsWallsA5.png'); 
    }

    create() {
        // 🎬 อนิเมชันเปิดหน้าจอเกมหลัก
        this.cameras.main.fadeIn(500, 0, 0, 0);

        if (this.textures.exists('character')) this.textures.get('character').setFilter(Phaser.Textures.FilterMode.NEAREST);
        if (this.textures.exists('dungeonTiles')) this.textures.get('dungeonTiles').setFilter(Phaser.Textures.FilterMode.NEAREST);

        this.player = null; this.cursors = null; this.wasd = null; this.uiText = null;
        this.interactables = null; this.activeDialogueInstance = null;
        this.victoryTriggered = false; this.defeatTriggered = false;
        this.timeLeft = 60;

        this.gameState = {
            hasSpell: false, hasLighter: false, torchSequence: [], correctTorchOrder: [], 
            correctStatueAngles: [], statueAngles: [0, 0, 0, 0], correctBookIndex: 0, 
            gatesOpened: { torchRoomAccess: false, endHallwayAccess: false }, chestOpened: false
        };

        this.colors = ['สีแดง', 'สีน้ำเงิน', 'สีเขียว', 'สีน้ำตาล'];
        this.hexColors = [0xff0000, 0x0000ff, 0x00ff00, 0x8b4513];
        this.possibleAngles = [0, 45, 90, 135, 180, 225, 270, 315];
        this.interactables = this.physics.add.staticGroup();

        // Map setup
        this.map = this.make.tilemap({ key: 'dungeonMap' });
        this.tilesetName = (this.map.tilesets && this.map.tilesets.length > 0) ? this.map.tilesets[0].name : 'Dungeon_FloorsWallsA5';
        this.tileset = this.map.addTilesetImage(this.tilesetName, 'dungeonTiles');

        if (this.tileset) {
            this.floorLayer = this.map.createLayer('Floor Layer', this.tileset, 0, 0);
            this.wallLayer = this.map.createLayer('Wall Layer', this.tileset, 0, 0);
            if (this.floorLayer) this.floorLayer.setDepth(-10);
            if (this.wallLayer) { this.wallLayer.setDepth(-5); this.wallLayer.setCollisionByExclusion([-1]); }
        }

        // Puzzle Randomization
        this.gameState.correctBookIndex = Phaser.Math.Between(0, 4);
        this.gameState.correctTorchOrder = Phaser.Utils.Array.Shuffle([1, 2, 3, 4]);

        this.angleClues = [];
        for (let i = 0; i < 4; i++) {
            const randAngle = this.possibleAngles[Phaser.Math.Between(0, this.possibleAngles.length - 1)];
            this.gameState.correctStatueAngles.push(randAngle);
            this.gameState.statueAngles[i] = (randAngle + 90) % 360;
            this.angleClues.push(`${this.colors[i]} = ${randAngle}°`);
        }

        let clueIndex = 0;
        this.bookClues = [];
        for (let i = 0; i < 5; i++) {
            if (i === this.gameState.correctBookIndex) {
                this.bookClues.push("✨ เจอคัมภีร์คาถามนตร์โบราณแล้ว! ✨");
            } else {
                this.bookClues.push(`📜 เศษคำใบ้ปริศนา: "${this.angleClues[clueIndex]}"`);
                clueIndex++;
            }
        }

        // Books
        for (let i = 0; i < 5; i++) {
            const posX = 130 + (i * 70), posY = 100;
            this.add.circle(posX, posY, 16, 0x5d4037).setStrokeStyle(2, 0xd7ccc8);
            this.add.sprite(posX, posY, 'bookAsset').setScale(0.04);
            const hitZone = this.add.rectangle(posX, posY, 40, 40, 0x000, 0).setInteractive();
            this.interactables.add(hitZone);
            this.add.text(posX, posY + 22, `${i + 1}`, { font: "bold 12px Arial", fill: "#d7ccc8" }).setOrigin(0.5);
            hitZone.setData('type', 'book').setData('id', i).setData('clue', this.bookClues[i]);
        }

        // Statues
        for (let i = 0; i < 4; i++) {
            const posX = 150 + (i * 80), posY = 520; 
            const dragon = this.add.sprite(posX, posY, 'dragonAsset').setTint(this.hexColors[i]).setScale(0.04);
            const dragonHitZone = this.add.rectangle(posX, posY, 48, 56, 0x000, 0).setInteractive();
            this.interactables.add(dragonHitZone);
            dragonHitZone.setData('type', 'statue').setData('id', i).setData('art', dragon);
            const label = this.add.text(posX, posY - 25, `${this.gameState.statueAngles[i]}°`, { font: "12px monospace", fill: "#ffffff" }).setOrigin(0.5);
            dragonHitZone.setData('labelText', label);
        }

        // Torches
        this.anims.create({ key: 'burn', frames: this.anims.generateFrameNumbers('torchAnimated', { start: 0, end: 7 }), frameRate: 12, repeat: -1 });
        for (let i = 0; i < 4; i++) {
            const posX = 750 + (i * 90), posY = 130;
            this.add.sprite(posX, posY, 'torchAsset');
            const fire = this.add.sprite(posX, posY - 17, 'torchAnimated').setVisible(false).setScale(0.7);
            const hitArea = this.add.rectangle(posX, posY, 48, 56, 0x000, 0).setInteractive();
            const light = this.add.circle(posX, posY - 17, 50, 0xffaa00, 0.15).setVisible(false);
            this.interactables.add(hitArea);
            hitArea.setData('type', 'torch').setData('id', i + 1).setData('fire', fire).setData('light', light);
            this.add.text(posX, posY + 24, `${i+1}`, { font: "12px monospace", fill: "#90a4ae" }).setOrigin(0.5);
        }

        // NPC & Chest
        this.npc = this.add.sprite(820, 520, 'npcAsset').setScale(0.06); 
        const npcHitZone = this.add.rectangle(820, 520, 48, 56, 0x000, 0).setInteractive();
        this.interactables.add(npcHitZone);
        npcHitZone.setData('type', 'npc');

        this.chest = this.add.sprite(980, 520, 'chestStatic');
        const chestHitZone = this.add.rectangle(980, 520, 48, 48, 0x000, 0).setInteractive();
        this.interactables.add(chestHitZone);
        chestHitZone.setData('type', 'chest').setData('art', this.chest);

        this.anims.create({ key: 'chestOpen', frames: this.anims.generateFrameNumbers('chestAnimated', { start: 0, end: 4 }), frameRate: 8, repeat: 0 });

        // Player
        this.player = this.physics.add.sprite(160, 120, 'character', 0).setScale(1.2).setCollideWorldBounds(true);
        if (this.wallLayer) this.physics.add.collider(this.player, this.wallLayer);

        // UI & Timer
        this.add.rectangle(640, 675, 1200, 40, 0x000000, 0.7);
        this.uiText = this.add.text(40, 665, "ภารกิจ: เดินไปที่ชั้นหนังสือ แล้วกด [SPACEBAR] เพื่ออ่านคำใบ้", { font: "15px Arial", fill: "#ffffff" });
        this.timerText = this.add.text(40, 30, `เวลาที่เหลือ: ${this.timeLeft} วินาที`, { font: "bold 20px Arial", fill: "#ffcc00", backgroundColor: "#000000", padding: { x: 10, y: 5 } });

        this.timerEvent = this.time.addEvent({ delay: 1000, callback: this.updateTimer, callbackScope: this, loop: true });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('character', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
        this.anims.create({ key: 'walk', frames: this.anims.generateFrameNumbers('character', { start: 24, end: 31 }), frameRate: 10, repeat: -1 });
        this.player.play('idle');

        // Pause Button
        const pauseBtnContainer = this.add.container(1200, 45);
        const pauseBtnBg = this.add.graphics();
        const drawPauseBtnShape = (graphics, borderHex, fillHex) => {
            graphics.clear(); graphics.fillStyle(borderHex, 1); graphics.fillRoundedRect(-28, -23, 56, 46, 10);
            graphics.fillStyle(fillHex, 1); graphics.fillRoundedRect(-25, -20, 50, 40, 8);
        };
        drawPauseBtnShape(pauseBtnBg, 0x9d4edd, 0x5a189a);
        const pauseBtnIcon = this.add.text(0, -1, "||", { font: "bold 20px Arial", fill: "#ffffff" }).setOrigin(0.5);
        pauseBtnContainer.add([pauseBtnBg, pauseBtnIcon]);

        pauseBtnContainer.setInteractive(new Phaser.Geom.Rectangle(-25, -20, 50, 40), Phaser.Geom.Rectangle.Contains);
        pauseBtnContainer.on("pointerover", () => {
            this.playSFX('click'); drawPauseBtnShape(pauseBtnBg, 0xffd700, 0x7b2cbf);
            pauseBtnIcon.setStyle({ fill: "#ffd700" });
            this.tweens.add({ targets: pauseBtnContainer, scaleX: 1.1, scaleY: 1.1, duration: 100 });
        });
        pauseBtnContainer.on("pointerout", () => {
            drawPauseBtnShape(pauseBtnBg, 0x9d4edd, 0x5a189a); pauseBtnIcon.setStyle({ fill: "#ffffff" });
            this.tweens.add({ targets: pauseBtnContainer, scaleX: 1.0, scaleY: 1.0, duration: 100 });
        });
        pauseBtnContainer.on("pointerdown", () => {
            this.playSFX('click'); this.scene.pause(); this.scene.launch("PauseScene");
        });
    }

    playSFX(type) {
        try {
            const ctx = this.sound.context; if (!ctx) return;
            const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            if (type === 'click') {
                osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
                gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05); osc.start(now); osc.stop(now + 0.05);
            } else if (type === 'book') {
                osc.type = 'triangle'; osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(659.25, now + 0.08); osc.frequency.setValueAtTime(783.99, now + 0.16);
                gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3);
            } else if (type === 'rotate') {
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(300, now + 0.08);
                gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08); osc.start(now); osc.stop(now + 0.08);
            } else if (type === 'ignite') {
                osc.type = 'square'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
                gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12); osc.start(now); osc.stop(now + 0.12);
            } else if (type === 'wrong') {
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(180, now); osc.frequency.linearRampToValueAtTime(60, now + 0.25);
                gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25); osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'chest') {
                osc.type = 'sine'; osc.frequency.setValueAtTime(987.77, now); osc.frequency.setValueAtTime(1318.51, now + 0.1);
                gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4); osc.start(now); osc.stop(now + 0.4);
            }
        } catch (e) {}
    }

    updateTimer() {
        if (this.victoryTriggered || this.defeatTriggered) return;
        this.timeLeft--;
        this.timerText.setText(`เวลาที่เหลือ: ${this.timeLeft} วินาที`);
        if (this.timeLeft <= 10) this.timerText.setColor("#ff0000");
        if (this.timeLeft <= 0) this.triggerDefeat();
    }

    triggerDefeat() {
        this.defeatTriggered = true;
        this.timerEvent.remove();
        this.player.setVelocity(0);
        this.playSFX('wrong');
        this.scene.pause();
        this.scene.launch("DefeatScene");
    }

    update() {
        if (this.victoryTriggered || this.defeatTriggered || this.activeDialogueInstance) {
            this.player.setVelocity(0); this.player.play('idle', true); return;
        }

        const speed = 180;
        this.player.setVelocity(0); let moving = false;

        if (this.cursors.left.isDown || this.wasd.left.isDown) { this.player.setVelocityX(-speed); this.player.setFlipX(true); moving = true; }
        else if (this.cursors.right.isDown || this.wasd.right.isDown) { this.player.setVelocityX(speed); this.player.setFlipX(false); moving = true; }

        if (this.cursors.up.isDown || this.wasd.up.isDown) { this.player.setVelocityY(-speed); moving = true; }
        else if (this.cursors.down.isDown || this.wasd.down.isDown) { this.player.setVelocityY(speed); moving = true; }

        if (moving) this.player.play('walk', true); else this.player.play('idle', true);

        this.physics.overlap(this.player, this.interactables, (p, obj) => {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) this.handleInteraction(obj);
        });
    }

    handleInteraction(obj) {
        const type = obj.getData('type');

        if (type === 'book') {
            const isCorrect = (obj.getData('id') === this.gameState.correctBookIndex);
            if (isCorrect && !this.gameState.hasSpell) {
                this.gameState.hasSpell = true; this.playSFX('book');
                this.uiText.setText("✨ เรียนรู้คาถาสำเร็จ! คุณสามารถกดหมุนรูปปั้นมังกรด้านล่างได้แล้ว");
                const particles = this.add.particles(0, 0, 'bookAsset', { speed: 120, scale: { start: 0.02, end: 0 }, blendMode: 'ADD', lifespan: 800, tint: 0x00aaff });
                particles.startFollow(this.player); this.time.delayedCall(1000, () => particles.destroy());
            } else { this.playSFX('click'); this.uiText.setText(obj.getData('clue')); }
        }

        if (type === 'statue') {
            if (!this.gameState.hasSpell) { this.playSFX('wrong'); this.uiText.setText("🔒 รูปปั้นมังกรถูกผนึกไว้! คุณต้องหาคัมภีร์คาถามนตร์ก่อน"); return; }
            if (this.gameState.hasLighter) return;

            const id = obj.getData('id');
            this.gameState.statueAngles[id] = (this.gameState.statueAngles[id] + 45) % 360;
            obj.getData('labelText').setText(`${this.gameState.statueAngles[id]}°`);
            this.playSFX('rotate');

            if (this.gameState.statueAngles.every((angle, idx) => angle === this.gameState.correctStatueAngles[idx])) {
                this.gameState.hasLighter = true; this.playSFX('book');
                this.uiText.setText("⚡ สำเร็จ! ได้รับ [ไฟแช็ก]! มุ่งหน้าไปห้องจุดคบเพลิงได้เลย");
            }
        }

        if (type === 'torch') {
            if (!this.gameState.hasLighter) { this.playSFX('wrong'); this.uiText.setText("❌ ต้องใช้ไฟแช็กก่อน!"); return; }
            const id = obj.getData('id');
            if (this.gameState.torchSequence.includes(id)) return;

            this.gameState.torchSequence.push(id);
            obj.getData('fire').setVisible(true).play('burn');
            obj.getData('light').setVisible(true);
            this.playSFX('ignite');

            const step = this.gameState.torchSequence.length - 1;
            if (this.gameState.torchSequence[step] !== this.gameState.correctTorchOrder[step]) {
                this.playSFX('wrong'); this.uiText.setText("💨 ลำดับผิด! ไฟดับลงทั้งหมด โปรดเริ่มใหม่");
                this.gameState.torchSequence = [];
                this.children.list.forEach(child => {
                    if (child.getData && child.getData('type') === 'torch') {
                        child.getData('fire').setVisible(false).stop(); child.getData('light').setVisible(false);
                    }
                });
            } else if (this.gameState.torchSequence.length === 4) {
                this.playSFX('book'); this.uiText.setText("🔥 จุดคบเพลิงถูกต้องทั้งหมดแล้ว ลองไปคุยกับยาม (NPC) ดูสิ");
            }
        }

        if (type === 'npc') { this.playSFX('click'); this.triggerDialogueTree(); }

        if (type === 'chest') {
            if (this.gameState.torchSequence.length < 4) { this.playSFX('wrong'); this.uiText.setText("🔒 ต้องจุดคบเพลิงให้ถูกต้องก่อน"); return; }
            if (this.gameState.chestOpened) return;

            this.gameState.chestOpened = true;
            const chestArt = obj.getData('art'); chestArt.setTexture('chestAnimated'); chestArt.play('chestOpen');
            this.playSFX('chest');
            this.uiText.setText("💰 ประตูมิติเปิดแล้ว! จงมุ่งหน้าเข้าสู่ประตูมิติ!");

            const alert = this.add.text(640, 250, "+5000 GOLD", { font: "bold 40px Arial", fill: "#ffd700", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5);
            this.tweens.add({ targets: alert, y: 180, alpha: 0, duration: 2000, onComplete: () => alert.destroy() });

            this.openEndHallway();
        }
    }

    triggerDialogueTree() {
        if (this.activeDialogueInstance) return;
        let dialogues = [];
        if (this.gameState.torchSequence.length < 4) {
            dialogues = [
                { text: "ยามเฝ้าประตู: 'สวัสดีนักเดินทาง'", options: [{ text: "สวัสดีครับ/ค่ะ", next: 1 }, { text: "ขอตัวก่อน", next: -1 }] },
                { text: "ยามเฝ้าประตู: 'ข้าช่วยบอกคำใบ้จุดคบเพลิงได้นะ'", options: [{ text: "ช่วยบอกข้าหน่อยสิ", next: 2 }] },
                { text: `ยามเฝ้าประตู: 'ลำดับคือ: [ ${this.gameState.correctTorchOrder.join(' - ')} ]'`, options: [{ text: "ขอบคุณมาก!", next: -1 }] }
            ];
        } else {
            dialogues = [{ text: "ยามเฝ้าประตู: 'ขุมทรัพย์เป็นของท่านแล้ว โชคดี!'", options: [{ text: "[จบบทสนทนา]", next: -1 }] }];
        }
        this.renderDialogueWindow(dialogues, 0);
    }

    renderDialogueWindow(tree, index) {
        if (index === -1) { if (this.activeDialogueInstance) this.activeDialogueInstance.destroy(); this.activeDialogueInstance = null; return; }
        if (this.activeDialogueInstance) this.activeDialogueInstance.destroy();

        const node = tree[index];
        const box = this.add.container(390, 450); this.activeDialogueInstance = box;
        const bg = this.add.rectangle(0, 0, 500, 160, 0x000000, 0.85).setOrigin(0).setStrokeStyle(2, 0xffffff);
        const mainTxt = this.add.text(20, 20, node.text, { font: "15px Arial", fill: "#fff", wordWrap: { width: 460 } });
        box.add([bg, mainTxt]);

        node.options.forEach((opt, i) => {
            const optText = this.add.text(30, 80 + (i * 30), `> ${opt.text}`, { font: "14px Arial", fill: "#00ff66" }).setInteractive();
            box.add(optText);
            optText.on('pointerdown', () => { this.playSFX('click'); this.renderDialogueWindow(tree, opt.next); });
        });
    }

    // ประตูมิติทางออกจบด่าน
    openEndHallway() {
        const portalX = 1220, portalY = 520;
        const portalBase = this.add.circle(portalX, portalY, 40, 0x00ffff, 0.3);
        const portalRing = this.add.circle(portalX, portalY, 45).setStrokeStyle(3, 0x00ffff);

        this.tweens.add({ targets: [portalBase, portalRing], scaleX: 1.2, scaleY: 1.2, alpha: 0.8, duration: 1000, yoyo: true, repeat: -1 });
        this.add.particles(portalX, portalY, 'bookAsset', { speed: { min: 20, max: 50 }, scale: { start: 0.03, end: 0 }, blendMode: 'ADD', lifespan: 1200, frequency: 100, tint: [0x00ffff, 0x7b2cbf, 0xffd700] });

        const exitText = this.add.text(portalX, portalY - 60, "🌀 ประตูมิติเปิดแล้ว!\n[ เดินเข้าไปเพื่อจบด่าน ]", { font: "bold 14px Arial", fill: "#00ffff", align: "center", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5);
        this.tweens.add({ targets: exitText, y: portalY - 68, duration: 800, yoyo: true, repeat: -1 });

        const portalZone = this.add.zone(portalX, portalY, 60, 60);
        this.physics.add.existing(portalZone, true);

        this.physics.add.overlap(this.player, portalZone, () => {
            if (!this.victoryTriggered && !this.defeatTriggered) {
                this.victoryTriggered = true; this.timerEvent.remove(); this.player.setVelocity(0);
                this.playSFX('book');

                // 🎬 วาร์ปตัวละคร + Fade Out เปลี่ยนเข้า VictoryScene
                this.tweens.add({
                    targets: this.player, scaleX: 0, scaleY: 0, angle: 360, duration: 600,
                    onComplete: () => {
                        this.cameras.main.fade(800, 255, 255, 255, false, (cam, progress) => {
                            if (progress === 1) { this.scene.pause(); this.scene.launch("VictoryScene"); }
                        });
                    }
                });
            }
        });
    }
}