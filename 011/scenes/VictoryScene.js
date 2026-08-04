export default class VictoryScene extends Phaser.Scene {
    constructor() {
        super("VictoryScene");
    }

    create() {
        // 1. ซ่อน UI ของ GameplayScene เพื่อไม่ให้โชว์ซ้อนด้านล่าง
        const gameplayScene = this.scene.get('GameplayScene');
        if (gameplayScene) {
            gameplayScene.children.list.forEach(child => {
                if (child.scrollFactorX === 0) { // ซ่อนพวก Text UI ที่ล็อกจอไว้
                    child.setVisible(false);
                }
            });
        }

        // 2. พื้นหลังสีดำโปร่งแสง ล็อกติดหน้าจอ (ScrollFactor 0)
        this.add.rectangle(0, 0, 1480, 900, 0x000000, 0.85)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(1000);

        // 3. สร้าง Texture พลุกระดาษ
        if (!this.textures.exists('confetti_particle')) {
            const confettiGfx = this.make.graphics({ x: 0, y: 0, add: false });
            confettiGfx.fillStyle(0xffffff, 1);
            confettiGfx.fillRect(0, 0, 8, 8);
            confettiGfx.generateTexture('confetti_particle', 8, 8);
            confettiGfx.destroy();
        }

        // 4. เอฟเฟกต์พลุกระดาษ (ล็อกติดจอ)
        const confettiColors = [0xffe066, 0xff4d4d, 0x4dff88, 0x4da6ff, 0xff4dff, 0xffffff];
        this.add.particles(0, 0, 'confetti_particle', {
            x: { min: 0, max: 1480 }, y: -20, lifespan: 4000,
            speedY: { min: 120, max: 260 }, speedX: { min: -70, max: 70 },
            scale: { start: 1, end: 0.4 }, rotate: { start: 0, end: 360 },
            gravityY: 140, quantity: 4, frequency: 30, tint: confettiColors
        }).setScrollFactor(0).setDepth(1001);

        // 5. ข้อความชนะ (ล็อกติดจอ)
        let title = this.add.text(740, 350, '🏆 WORLD CUP CHAMPION! 🏆\nคุณหนีออกจากดันเจี้ยนสำเร็จ!', {
            fontSize: '45px', fontFamily: 'Arial', fontStyle: 'bold',
            color: '#ffe066', align: 'center', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setScale(0.1).setScrollFactor(0).setDepth(1002);

        // อนิเมชันเด้งข้อความ
        this.tweens.add({
            targets: title, scale: 1, duration: 800, ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({ targets: title, scale: 1.05, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            }
        });

        // 6. ปุ่ม Play Again (ล็อกติดจอ)
        let restartBtn = this.add.text(740, 520, '🔄 PLAY AGAIN', {
            fontSize: '30px', fontFamily: 'Arial', color: '#1a472a',
            backgroundColor: '#ffe066', padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(1002);

        restartBtn.on('pointerover', () => restartBtn.setBackgroundColor('#ffffff'));
        restartBtn.on('pointerout', () => restartBtn.setBackgroundColor('#ffe066'));
        restartBtn.on('pointerdown', () => {
            this.scene.stop("GameplayScene");
            this.scene.start("GameplayScene");
        });

        // 7. ปุ่ม Main Menu (ล็อกติดจอ)
        let menuBtn = this.add.text(740, 610, '🏠 MAIN MENU', {
            fontSize: '24px', fontFamily: 'Arial', color: '#ffffff',
            backgroundColor: '#4a3220', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(1002);

        menuBtn.on('pointerover', () => menuBtn.setBackgroundColor('#6b4a32'));
        menuBtn.on('pointerout', () => menuBtn.setBackgroundColor('#4a3220'));
        menuBtn.on('pointerdown', () => {
            this.scene.stop("GameplayScene");
            this.scene.start("MenuScene");
        });
    }
}