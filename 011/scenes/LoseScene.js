export default class LoseScene extends Phaser.Scene {
    constructor() {
        super("LoseScene");
    }

    // รับสาเหตุที่แพ้มาจาก GameplayScene: 'time' หรือ 'hearts'
    init(data) {
        this.reason = (data && data.reason) || 'time';
    }

    // เล่นเสียงคลิกปุ่ม (โหลดไว้แล้วจาก GameplayScene ที่ยังทำงานอยู่เบื้องหลัง)
    playClick() {
        try { this.sound.play('sfx_click_npc'); } catch (e) {}
    }

    create() {
        // 1. ซ่อน UI ของ GameplayScene ที่ล็อกจอไว้ ไม่ให้โชว์ซ้อนด้านล่าง
        const gameplayScene = this.scene.get('GameplayScene');
        if (gameplayScene) {
            gameplayScene.children.list.forEach(child => {
                if (child.scrollFactorX === 0) {
                    child.setVisible(false);
                }
            });
        }

        // 2. พื้นหลังแดงเข้มโปร่งแสง ล็อกติดหน้าจอ
        this.add.rectangle(0, 0, 1480, 900, 0x2b0000, 0.92)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(1000);

        // 3. เส้นสนามจางๆ ตกแต่งธีมฟุตบอลโลก (แดงหม่น)
        const ring = this.add.graphics().setScrollFactor(0).setDepth(1000);
        ring.lineStyle(4, 0xff4d4d, 0.25);
        ring.strokeCircle(740, 450, 230);
        ring.lineStyle(2, 0xffffff, 0.1);
        ring.strokeRect(240, 100, 1000, 700);

        // 4. หัวข้อแพ้
        this.add.text(740, 300, '❌ GAME OVER ❌', {
            fontSize: '56px', fontFamily: 'Arial', fontStyle: 'bold',
            color: '#ff4d4d', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

        // 5. ข้อความสาเหตุ ขึ้นอยู่กับว่าแพ้เพราะอะไร
        const reasonText = this.reason === 'hearts'
            ? '💔 คุณเลือกกล่องสมบัติผิดครบ 2 ครั้ง\nหัวใจหมดแล้ว...'
            : '⏰ หมดเวลาแล้ว!\nคุณออกจากสเตเดียมไม่ทันเวลา';

        this.add.text(740, 400, reasonText, {
            fontSize: '26px', fontFamily: 'Arial', color: '#ffffff', align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

        this.add.text(740, 470, 'อย่ายอมแพ้ แชมป์ตัวจริงไม่หยุดง่ายๆ!', {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffe066'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

        // 6. ปุ่ม ลองใหม่
        let retryBtn = this.add.text(740, 560, '🔄 ลองใหม่อีกครั้ง', {
            fontSize: '30px', fontFamily: 'Arial', color: '#2b0000',
            backgroundColor: '#ffe066', padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(1002);

        retryBtn.on('pointerover', () => retryBtn.setBackgroundColor('#ffffff'));
        retryBtn.on('pointerout', () => retryBtn.setBackgroundColor('#ffe066'));
        retryBtn.on('pointerdown', () => {
            this.playClick();
            this.scene.stop("GameplayScene");
            this.scene.start("GameplayScene");
        });

        // 7. ปุ่ม กลับหน้าหลัก
        let menuBtn = this.add.text(740, 640, '🏠 กลับหน้าหลัก', {
            fontSize: '24px', fontFamily: 'Arial', color: '#ffffff',
            backgroundColor: '#4a3220', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(1002);

        menuBtn.on('pointerover', () => menuBtn.setBackgroundColor('#6b4a32'));
        menuBtn.on('pointerout', () => menuBtn.setBackgroundColor('#4a3220'));
        menuBtn.on('pointerdown', () => {
            this.playClick();
            this.time.delayedCall(150, () => {
                this.sound.stopAll();
                this.scene.stop("GameplayScene");
                this.scene.start("MenuScene");
            });
        });
    }
}