export default class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
    }

    create() {
        // พื้นหลังสีเขียวสนามฟุตบอล
        this.add.rectangle(0, 0, 1480, 900, 0x1a472a).setOrigin(0, 0);

        // เส้นสนาม (ตกแต่ง)
        this.add.circle(740, 450, 150, 0x1a472a).setStrokeStyle(5, 0xffffff, 0.5);
        this.add.line(0, 0, 740, 0, 740, 900, 0xffffff, 0.5).setOrigin(0, 0);
        this.add.rectangle(740, 450, 1100, 760).setStrokeStyle(2, 0xffffff, 0.12);

        // ธงมุมสนามตกแต่ง 4 มุม
        this.drawCornerFlag(70, 90);
        this.drawCornerFlag(1410, 90);
        this.drawCornerFlag(70, 810);
        this.drawCornerFlag(1410, 810);

        // ชื่อเกม
        this.add.text(740, 170, '⚽ WORLD CUP DUNGEON ⚽', {
            fontSize: '62px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffe066',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 5, fill: true }
        }).setOrigin(0.5);

        this.add.text(740, 235, 'หนีออกจากสเตเดียมลับให้สำเร็จ', {
            fontSize: '28px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0.5);

        // คำอธิบายการเล่น
        this.add.text(740, 300, 'ออกผจญภัยผ่านภารกิจธีมฟุตบอลโลก', {
            fontSize: '24px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffe066'
        }).setOrigin(0.5);

        this.add.text(740, 335, '"ไขปริศนา เก็บรางวัล และพิสูจน์ว่าคุณคือแชมป์ตัวจริง!"', {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'italic'
        }).setOrigin(0.5);

        // ถ้วยรางวัลตกแต่งกลางจอ
        this.add.text(740, 440, '🏆', { fontSize: '100px' }).setOrigin(0.5).setAlpha(0.9);

        // ปุ่ม Start Game
        let startBtn = this.add.text(740, 610, '⚽ KICK OFF (เริ่มเกม)', {
            fontSize: '35px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#1a472a',
            backgroundColor: '#ffe066',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // เอฟเฟกต์ตอนชี้ปุ่ม
        startBtn.on('pointerover', () => startBtn.setBackgroundColor('#ffffff'));
        startBtn.on('pointerout', () => startBtn.setBackgroundColor('#ffe066'));
        startBtn.on('pointerdown', () => {
            this.scene.start("GameplayScene");
        });

        // คำแนะนำการควบคุมและกฎกติกา
        this.add.text(740, 690, 'กด WASD หรือลูกศรเพื่อเดิน, กด E เพื่อโต้ตอบ', {
            fontSize: '18px', fontFamily: 'Arial', color: '#dddddd'
        }).setOrigin(0.5);

        this.add.text(740, 720, '⏱ มีเวลาจำกัด 1 นาที และหัวใจ 2 ดวงในภารกิจกล่องสมบัติ', {
            fontSize: '16px', fontFamily: 'Arial', color: '#ff9d9d'
        }).setOrigin(0.5);
    }

    // วาดธงมุมสนามเล็กๆ ไว้ตกแต่ง 4 มุมของหน้าเมนู
    drawCornerFlag(x, y) {
        this.add.rectangle(x, y, 4, 44, 0xffffff, 0.6).setOrigin(0.5, 1);
        const flag = this.add.graphics();
        flag.fillStyle(0xffe066, 0.85);
        flag.beginPath();
        flag.moveTo(x, y - 44);
        flag.lineTo(x + 22, y - 36);
        flag.lineTo(x, y - 28);
        flag.closePath();
        flag.fillPath();
    }
}