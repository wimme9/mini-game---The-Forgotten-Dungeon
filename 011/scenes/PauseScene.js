export default class PauseScene extends Phaser.Scene {
    constructor() {
        super("PauseScene");
    }

    create() {
        // พื้นหลังโปร่งแสงสีดำ
        this.add.rectangle(0, 0, 1480, 900, 0x000000, 0.7).setOrigin(0, 0);

        // กล่องเมนู
        const box = this.add.rectangle(740, 450, 500, 350, 0x1a472a, 0.95);
        box.setStrokeStyle(4, 0xffe066);

        // ลายเส้นสนามจางๆ ตกแต่งด้านหลังกล่อง (ธีมฟุตบอลโลก)
        this.add.circle(740, 450, 150, 0xffffff, 0.05);

        this.add.text(740, 350, "⏸ MATCH PAUSED ⚽", {
            fontSize: "44px", fontFamily: "Arial", fontStyle: "bold", color: "#ffe066",
            stroke: "#000000", strokeThickness: 4
        }).setOrigin(0.5);

        // ปุ่ม RESUME
        let resumeButton = this.add.text(740, 470, "▶ RESUME MATCH", {
            fontSize: "28px", fontFamily: "Arial", color: "#ffffff",
            backgroundColor: "#2e8b57", padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        resumeButton.on("pointerover", () => resumeButton.setBackgroundColor("#3cb371"));
        resumeButton.on("pointerout", () => resumeButton.setBackgroundColor("#2e8b57"));
        resumeButton.on("pointerdown", () => {
            this.scene.stop();
            const gameplay = this.scene.get("GameplayScene");
            if (gameplay && gameplay.resumeAudio) gameplay.resumeAudio();
            this.scene.resume("GameplayScene");
        });

        // ปุ่มออกไปหน้าเมนู
        let quitButton = this.add.text(740, 550, "🏠 QUIT TO MENU", {
            fontSize: "24px", fontFamily: "Arial", color: "#ffffff",
            backgroundColor: "#8b0000", padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        quitButton.on("pointerover", () => quitButton.setBackgroundColor("#ff0000"));
        quitButton.on("pointerout", () => quitButton.setBackgroundColor("#8b0000"));
        quitButton.on("pointerdown", () => {
            this.sound.stopAll();
            this.scene.stop("GameplayScene");
            this.scene.start("MenuScene");
        });
    }
}