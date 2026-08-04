import { Theme } from "./Theme.js";

export default class GameplayScene extends Phaser.Scene {
    constructor() {
        super("GameplayScene");

        // ================= ผูก this ให้ event handler ล่วงหน้า =================
        // ต้องสร้าง reference ที่ "คงที่" ตัวเดียวสำหรับแต่ละ handler
        // (bind ใน constructor ครั้งเดียว ไม่ใช่สร้างฟังก์ชันใหม่ทุกครั้งใน create())
        // เพื่อให้ removeEventListener ใน shutdown() ถอดตัวเดิมออกได้ถูกต้อง
        // ถ้าใช้ arrow function inline แบบเดิม ทุกครั้งที่ create() รันใหม่
        // (เช่น restart scene) จะได้ function reference ใหม่เสมอ ทำให้
        // removeEventListener หาตัวเดิมไม่เจอ -> listener สะสมไปเรื่อยๆ
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onCanvasClick = this.onCanvasClick.bind(this);
        this.onPostRender = this.onPostRender.bind(this);
    }

    // ================= PRELOAD: โหลดรูปภาพ/เสียงทั้งหมด =================
    preload() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        // ----- TILESET (พื้น/กำแพง) -----
        this.TILE_SIZE = 16; // ต้องตรงกับ tile width/height ใน atlas_floor-16x16.tsx

        this.floorTileset = new Image();
        this.floorTileset.src = "assets/sprite/floor_1.png";

        this.wallTilesetTopBottom = new Image();
        this.wallTilesetTopBottom.src = "assets/sprite/wall_top_right.png";

        this.wallTilesetSide = new Image();
        this.wallTilesetSide.src = "assets/sprite/wall_outer_mid_left.png";

        // ----- รูปภาพของแต่ละมิชชัน -----
        this.bookImg = new Image();
        this.bookImg.src = "assets/sprite/book.png";

        this.statueImg = new Image();
        this.statueImg.src = "assets/sprite/T.png";

        this.torchImg = new Image();
        this.torchImg.src = "assets/sprite/Pixel_Bild__torch.png";

        this.npcImg = new Image();
        this.npcImg.src = "assets/sprite/npc.png";

        this.chestImg = new Image();
        this.chestImg.src = "assets/sprite/box.png";

        this.playerImg = new Image();
        this.playerImg.src = "assets/sprite/Character.png";

        // ----- เสียงเอฟเฟกต์ในเกม -----
        this.stageClearSound = new Audio("assets/sound/s.mp3");
        this.stageClearSound.volume = 0.8;

        this.bookSound = new Audio("assets/sound/book.mp3");
        this.stoneSound = new Audio("assets/sound/stone.mp3");
        this.fireSound = new Audio("assets/sound/fire.mp3");
        this.chestSound = new Audio("assets/sound/chest.mp3");
        [this.bookSound, this.stoneSound, this.fireSound, this.chestSound].forEach(s => s.volume = 0.8);

        // ----- เสียงตอนแพ้ / ชนะ -----
        this.winSound = new Audio("assets/sound/win.mp3");
        this.loseSound = new Audio("assets/sound/lose.mp3");
        this.winSound.volume = 0.9;
        this.loseSound.volume = 0.9;
    }

    // ================= CREATE: ตั้งค่าเริ่มต้น + Event Listener =================
    create() {
        // ----- ปุ่ม Pause (หยุดเกมชั่วคราว) -----
        // หมายเหตุ: เดิมสร้างด้วย this.add.text() ซึ่งเป็น Phaser GameObject
        // แต่ scene นี้เรียก ctx.clearRect() ล้างทั้ง canvas ทุกเฟรมใน draw()
        // (ผูกกับ POST_RENDER) แล้ววาดใหม่เฉพาะสิ่งที่วาดด้วย ctx เท่านั้น
        // ปุ่มที่เป็น Phaser GameObject เลยโดนล้างทิ้งทุกเฟรมและไม่เคยเห็น
        // แก้โดยเก็บเป็นข้อมูลตำแหน่ง แล้วไปวาดเองด้วย ctx ใน drawUI() แทน
        // และตรวจจับคลิกร่วมกับ handleClick() เหมือนวัตถุอื่นๆ ในเกม
        this.pauseButton = { x: 950, y: 30, w: 48, h: 34 };

        // --- โค้ดเดิมที่เหลือต่อจากนี้ ---
        this.FLOOR_TILE = { col: 0, row: 0 };
        // ... (โค้ดอื่นๆ เหมือนเดิม)
        // ----- ค่า config การวาดไทล์ -----
        this.FLOOR_TILE = { col: 0, row: 0 };
        this.WALL_TILE = { col: 0, row: 0 };
        this.WALL_FLIP = {
            top: { flipX: false, flipY: true },
            bottom: { flipX: false, flipY: false },
            left: { flipX: false, flipY: false },
            right: { flipX: false, flipY: false }
        };

        // ================= ห้อง (พื้นหลัง) =================
        this.rooms = [
            { x: 40, y: 40, w: 240, h: 180, quest: "เควส: ค้นหาคัมภีร์เวทมนตร์ที่ถูกต้อง" },
            { x: 360, y: 40, w: 280, h: 180, quest: "เควส: หมุนรูปปั้นให้หันถูกทิศ (ดูป้ายเหนือรูปปั้น)" },
            { x: 360, y: 340, w: 280, h: 180, quest: "เควส: จุดคบเพลิงเรียงลำดับจาก 1-4" },
            { x: 720, y: 340, w: 240, h: 180, quest: "เควส: เลือกเปิดหีบกุญแจ (ระวังกับดัก)" }
        ];

        // ================= ทางเดิน (พื้นหลัง) =================
        this.corridors = [
            { x: 280, y: 110, w: 80, h: 40 },
            { x: 480, y: 220, w: 40, h: 120 },
            { x: 640, y: 410, w: 80, h: 40 }
        ];

        // ================= ประตูล็อกของแต่ละห้อง =================
        this.door1 = { x: 295, y: 100, w: 20, h: 60, locked: true };
        this.door2 = { x: 470, y: 265, w: 60, h: 30, locked: true };
        this.door3 = { x: 645, y: 400, w: 20, h: 60, locked: true };

        // ================= MISSION 1 =================
        this.books = [
            { x: 90, y: 80, title: "คัมภีร์เงา", message: "เปิดออกมา... หน้ากระดาษว่างเปล่า ราวกับตัวอักษรหนีหายไปเมื่อมีคนจ้องมอง", correct: false },
            { x: 160, y: 80, title: "บันทึกนักเล่นแร่แปรธาตุ", message: "สูตรแปลงตะกั่วเป็นทองคำ... แต่หน้าสุดท้ายดูเหมือนจะถูกฉีกหายไป", correct: false },
            { x: 230, y: 80, title: "คัมภีร์ต้องคำสาป", message: "ทันทีที่แตะปกหนังสือ แสงสีทองพวยพุ่งออกมา! ม้วนกระดาษเรืองแสงลอยขึ้นจากหน้ากระดาษ...", correct: true },
            { x: 90, y: 190, title: "ตำนานเทพเจ้าโบราณ", message: "เล่าเรื่องเทพผู้หลับใหลอยู่ใต้ภูเขาไฟมาเนิ่นนาน รอวันที่จะตื่นขึ้นอีกครั้ง", correct: false },
            { x: 230, y: 190, title: "สมุดบันทึกบรรณารักษ์", message: "รายชื่อผู้ยืมหนังสือ... ชื่อคนสุดท้ายที่ยืมถูกขีดฆ่าจนอ่านไม่ออก", correct: false }
        ];
        this.bookSize = 32;
        this.hasMagicScroll = false;
        this.activeMessage = null;

        // ================= MISSION 2 =================
        this.statues = [
            { x: 410, y: 80, angle: 180, targetAngle: 0, name: "รูปปั้นผู้พิทักษ์ทิศเหนือ" },
            { x: 590, y: 80, angle: 0, targetAngle: 90, name: "รูปปั้นผู้พิทักษ์ทิศตะวันออก" },
            { x: 410, y: 180, angle: 90, targetAngle: 180, name: "รูปปั้นผู้พิทักษ์ทิศใต้" },
            { x: 590, y: 180, angle: 270, targetAngle: 270, name: "รูปปั้นผู้พิทักษ์ทิศตะวันตก" }
        ];
        this.statueSize = 40;
        this.statuesSolved = false;

        // ================= MISSION 3 =================
        this.torches = [
            { id: 0, x: 400, y: 380, isOn: false, name: "คบเพลิงอันที่ 1" },
            { id: 1, x: 460, y: 380, isOn: false, name: "คบเพลิงอันที่ 2" },
            { id: 2, x: 520, y: 380, isOn: false, name: "คบเพลิงอันที่ 3" },
            { id: 3, x: 580, y: 380, isOn: false, name: "คบเพลิงอันที่ 4" }
        ];
        this.torchSize = 32;
        this.correctSequence = [0, 1, 2, 3];
        this.currentStep = 0;
        this.torchesSolved = false;

        // ================= MISSION 4 =================
        this.npc = { x: 760, y: 480, size: 100, name: "ผู้เฒ่าแห่งวิหาร" };
        this.npcDialogues = [
            "NPC: เจ้ามาถึงห้องสุดท้ายแล้วสินะ",
            "NPC: ข้าเฝ้าห้องนี้มานาน คอยดูแลหีบสมบัติทั้งสามใบ",
            "NPC: มีหีบใบเดียวที่มีกุญแจจริง ใบที่เหลือเป็นกับดัก",
            "NPC: เลือกให้ดีนะ ขอให้โชคดี"
        ];
        this.currentDialogueIndex = -1;
        this.npcTalked = false;

        // ================= MISSION 5 =================
        this.chests = [
            { id: 1, x: 760, y: 430, isOpened: false, isCorrect: false, name: "หีบด้านซ้าย" },
            { id: 2, x: 840, y: 430, isOpened: false, isCorrect: true, name: "หีบตรงกลาง" },
            { id: 3, x: 920, y: 430, isOpened: false, isCorrect: false, name: "หีบด้านขวา" }
        ];
        this.chestSize = 40;
        this.gameCleared = false;
        this.isTrapped = false;

        // ================= ระบบแพ้เกม (นับจำนวนครั้งที่กดผิด) =================
        // นับรวมทุกจุด: เลือกหนังสือผิดเล่ม, จุดคบเพลิงผิดลำดับ, เปิดหีบกับดัก
        // พลาดครบ maxMistakes ครั้ง -> ไปหน้า GameOverScene
        this.mistakes = 0;
        this.maxMistakes = 3;
        this.gameOverTriggered = false;

        // ================= ระยะโต้ตอบ =================
        this.interactRadius = 70;

        // ================= ตัวละคร =================
        this.player = {
            x: 160,
            y: 130, // เกิดตรงกลางห้อง 1
            width: 40,
            height: 60,
            speed: 5,
            direction: "front",
            frame: 0,
            frameTimer: 0
        };
        this.collisionSize = { w: 14, h: 14 };

        this.spriteWidth = 736 / 4;
        this.spriteHeight = 1102 / 4;
        this.animations = {
            front: [0, 1, 2, 3],
            back: [4, 5, 6, 7],
            left: [8, 9, 10, 11],
            right: [12, 13, 14, 15]
        };

        // ================= ปุ่มและการคลิก =================
        this.keys = { w: false, a: false, s: false, d: false };

        // ================= ผูก Event Listener (ครั้งเดียวต่อการเข้า scene) =================
        // สำคัญ: ใช้ named/bound method (this.onKeyDown ฯลฯ ที่ bind ไว้ใน constructor)
        // แทน arrow function inline แบบเดิม เพื่อให้ removeEventListener ใน shutdown()
        // ถอด listener ตัวเดิมออกได้จริง ไม่งั้นทุกครั้งที่ restart scene จะมี
        // listener ใหม่มาผูกซ้อนทับของเก่าเรื่อยๆ ทำให้กดปุ่มครั้งเดียวแต่ผลลัพธ์
        // เกิดขึ้นหลายครั้ง (input เพี้ยน)
        // ย้ายปุ่มควบคุมมาดักจับที่ window เพื่อป้องกันบัค Canvas ไม่ Focus
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        this.canvas.addEventListener("click", this.onCanvasClick);

        // สำคัญ: Phaser จะ clear canvas เป็นสีดำทุกเฟรมหลังจาก update() ทำงานเสร็จ
        // (เพราะ scene ไม่มี game object ของ Phaser เลย เราวาดเองผ่าน ctx ทั้งหมด)
        // เลยต้องย้ายการวาด (this.draw()) มาทำงาน "หลัง" Phaser render เสร็จแล้วแทน
        // โดยฟังอีเวนต์ postrender ของเกม ไม่งั้นภาพที่วาดจะโดนลบทิ้งทุกเฟรม จอเลยดำ
        // ใช้ this.onPostRender (bound reference เดิม) เพื่อให้ off() ตอน shutdown
        // ถอดตัวเดิมออกได้ถูกต้อง (ไม่งั้น draw() จะถูกเรียกซ้อนหลายรอบหลัง restart)
        this.game.events.on(Phaser.Core.Events.POST_RENDER, this.onPostRender);

        // ================= ถอด Listener ทั้งหมดตอนออกจาก/รีสตาร์ต scene =================
        // Phaser จะยิง SHUTDOWN ให้เองทั้งตอน scene.stop(), scene.restart(),
        // และก่อนที่ scene.start() ตัวใหม่จะเริ่ม create() ของ instance ถัดไป
        // ผูก listener นี้ไว้ด้วย this.shutdown (bound) เพื่อความชัดเจนและกันบัค this
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
        this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown, this);
    }

    // ================= ถอด Event Listener ทั้งหมด (เรียกตอน scene shutdown/destroy) =================
    shutdown() {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        if (this.canvas) {
            this.canvas.removeEventListener("click", this.onCanvasClick);
        }
        if (this.game && this.game.events) {
            this.game.events.off(Phaser.Core.Events.POST_RENDER, this.onPostRender);
        }
    }

    // ================= Handler: กดปุ่มคีย์บอร์ดลง =================
    onKeyDown(e) {
        let key = e.key.toLowerCase();
        if (key === "w" || key === "arrowup") this.keys.w = true;
        if (key === "a" || key === "arrowleft") this.keys.a = true;
        if (key === "s" || key === "arrowdown") this.keys.s = true;
        if (key === "d" || key === "arrowright") this.keys.d = true;
    }

    // ================= Handler: ปล่อยปุ่มคีย์บอร์ด =================
    onKeyUp(e) {
        let key = e.key.toLowerCase();
        if (key === "w" || key === "arrowup") this.keys.w = false;
        if (key === "a" || key === "arrowleft") this.keys.a = false;
        if (key === "s" || key === "arrowdown") this.keys.s = false;
        if (key === "d" || key === "arrowright") this.keys.d = false;
    }

    // ================= Handler: คลิกบน canvas (ส่งต่อให้ handleClick) =================
    onCanvasClick(e) {
        this.handleClick(e);
    }

    // ================= Handler: วาดฉากหลัง Phaser render เสร็จในแต่ละเฟรม =================
    onPostRender() {
        // สำคัญ: ถ้า scene นี้ถูก pause อยู่ (เช่นตอนเปิด PauseScene ทับ)
        // ต้อง "ไม่" วาดซ้ำ ไม่งั้นภาพจาก ctx จะไปทับฉาก PauseScene ทุกเฟรม
        // ทำให้ดูเหมือน PauseScene ไม่ขึ้นมาเลยทั้งที่จริงๆ มันเปิดอยู่
        if (this.scene.isActive()) {
            this.draw();
        }
    }

    // ================= จัดการคลิกเมาส์ (แยกจาก create เพื่อความอ่านง่าย) =================
    handleClick(e) {
        const canvas = this.canvas;

        if (this.gameOverTriggered) return;

        // --- คลิกปุ่ม Pause (เช็คก่อนเงื่อนไขอื่นเสมอ ให้กด pause ได้ทุกเมื่อ) ---
        {
            let rect = canvas.getBoundingClientRect();
            let scaleX = canvas.width / rect.width;
            let scaleY = canvas.height / rect.height;
            let clickX = (e.clientX - rect.left) * scaleX;
            let clickY = (e.clientY - rect.top) * scaleY;
            let pb = this.pauseButton;
            if (clickX >= pb.x - pb.w / 2 && clickX <= pb.x + pb.w / 2 &&
                clickY >= pb.y - pb.h / 2 && clickY <= pb.y + pb.h / 2) {
                this.scene.pause();
                this.scene.launch("PauseScene");
                return;
            }
        }

        if (this.currentDialogueIndex !== -1) {
            this.currentDialogueIndex++;
            if (this.currentDialogueIndex < this.npcDialogues.length) {
                this.activeMessage = this.npcDialogues[this.currentDialogueIndex];
            } else {
                this.currentDialogueIndex = -1;
                this.activeMessage = null;
                if (!this.npcTalked) {
                    this.npcTalked = true;
                    this.playStageClearSound();
                }
            }
            return;
        }

        if (this.activeMessage) {
            this.activeMessage = null;
            return;
        }

        let rect = canvas.getBoundingClientRect();
        let scaleX = canvas.width / rect.width;
        let scaleY = canvas.height / rect.height;
        let clickX = (e.clientX - rect.left) * scaleX;
        let clickY = (e.clientY - rect.top) * scaleY;

        // --- คลิกหนังสือ ---
        for (let i = 0; i < this.books.length; i++) {
            let b = this.books[i];
            if (clickX >= b.x - this.bookSize / 2 && clickX <= b.x + this.bookSize / 2 && clickY >= b.y - this.bookSize / 2 && clickY <= b.y + this.bookSize / 2) {
                if (!this.isNear(this.player.x, this.player.y, b.x, b.y)) {
                    this.activeMessage = "คุณอยู่ไกลเกินไป เข้าไปใกล้ๆ ก่อนสิ";
                    return;
                }
                this.activeMessage = b.message;
                this.playSfx(this.bookSound);
                if (b.correct && !this.hasMagicScroll) {
                    this.hasMagicScroll = true;
                    this.door1.locked = false;
                    this.playStageClearSound();
                } else if (!b.correct && !this.hasMagicScroll) {
                    this.registerMistake(`"${b.title}" ไม่ใช่คัมภีร์ที่ถูกต้อง!`);
                }
                return;
            }
        }

        // --- คลิกรูปปั้น ---
        for (let i = 0; i < this.statues.length; i++) {
            let s = this.statues[i];
            if (clickX >= s.x - this.statueSize / 2 && clickX <= s.x + this.statueSize / 2 && clickY >= s.y - this.statueSize / 2 && clickY <= s.y + this.statueSize / 2) {
                if (!this.isNear(this.player.x, this.player.y, s.x, s.y)) {
                    this.activeMessage = "คุณอยู่ไกลเกินไป เข้าไปใกล้ๆ ก่อนสิ";
                    return;
                }
                s.angle = (s.angle + 90) % 360;
                this.playSfx(this.stoneSound);
                let isCorrect = s.angle === s.targetAngle;
                let correctCount = this.statues.filter(st => st.angle === st.targetAngle).length;
                if (isCorrect) {
                    this.activeMessage = `✅ "${s.name}" หันถูกทิศแล้ว! (${correctCount}/4 ตัว)`;
                } else {
                    this.activeMessage = `หมุน "${s.name}" ไปทาง ${this.getDirectionName(s.angle)}... ดูป้ายสีเหลืองเหนือรูปปั้นเพื่อดูทิศที่ต้องการ (${correctCount}/4 ตัว)`;
                }
                this.checkStatuesPuzzle();
                return;
            }
        }

        // --- คลิกคบเพลิง ---
        for (let i = 0; i < this.torches.length; i++) {
            let t = this.torches[i];
            if (clickX >= t.x - this.torchSize / 2 && clickX <= t.x + this.torchSize / 2 && clickY >= t.y - this.torchSize / 2 && clickY <= t.y + this.torchSize / 2) {
                if (this.torchesSolved) return;
                if (!this.isNear(this.player.x, this.player.y, t.x, t.y)) {
                    this.activeMessage = "คุณอยู่ไกลเกินไป เข้าไปใกล้ๆ ก่อนสิ";
                    return;
                }
                if (t.id === this.correctSequence[this.currentStep]) {
                    t.isOn = true;
                    this.currentStep++;
                    this.activeMessage = `คุณจุดไฟที่ "${t.name}"... เปลวไฟลุกโชนขึ้น!`;
                    this.playSfx(this.fireSound);
                    if (this.currentStep === this.correctSequence.length) {
                        this.torchesSolved = true;
                        this.door3.locked = false;
                        this.activeMessage = "🔥 คบเพลิงจุดครบตามลำดับแล้ว! ประตูทางออกห้องคบเพลิงเปิดแล้ว!";
                        this.playStageClearSound();
                    }
                } else {
                    this.torches.forEach(torch => torch.isOn = false);
                    this.currentStep = 0;
                    this.door3.locked = true;
                    this.registerMistake("💥 จุดคบเพลิงผิดลำดับ! ไฟทุกดวงดับลง...");
                }
                return;
            }
        }

        // --- คลิก NPC ---
        const npc = this.npc;
        if (clickX >= npc.x - npc.size / 2 && clickX <= npc.x + npc.size / 2 && clickY >= npc.y - npc.size / 2 && clickY <= npc.y + npc.size / 2) {
            if (!this.isNear(this.player.x, this.player.y, npc.x, npc.y)) {
                this.activeMessage = "คุณอยู่ไกลเกินไป เข้าไปใกล้ๆ ก่อนสิ";
                return;
            }
            if (!this.npcTalked) {
                this.currentDialogueIndex = 0;
                this.activeMessage = this.npcDialogues[this.currentDialogueIndex];
            } else {
                this.activeMessage = "NPC: จงระวังหีบกับดักในห้องถัดไปให้ดีๆ ล่ะเจ้าหนู!";
            }
            return;
        }

        // --- คลิกหีบสมบัติ ---
        for (let i = 0; i < this.chests.length; i++) {
            let c = this.chests[i];
            if (clickX >= c.x - this.chestSize / 2 && clickX <= c.x + this.chestSize / 2 && clickY >= c.y - this.chestSize / 2 && clickY <= c.y + this.chestSize / 2) {
                if (c.isOpened || this.gameCleared) return;
                if (!this.isNear(this.player.x, this.player.y, c.x, c.y)) {
                    this.activeMessage = "คุณอยู่ไกลเกินไป เข้าไปใกล้ๆ ก่อนสิ";
                    return;
                }
                c.isOpened = true;
                this.playSfx(this.chestSound);
                if (c.isCorrect) {
                    this.gameCleared = true;
                    this.isTrapped = false;
                    this.player.speed = 5;
                    this.activeMessage = `🎉 ยินดีด้วย! คุณเปิด "${c.name}" และพบ "กุญแจทองคำโบราณ"! คุณเคลียร์วิหารแห่งนี้สำเร็จแล้ว!`;
                    this.playSfx(this.winSound);

                    // ================= เงื่อนไขชนะเกม =================
                    // เมื่อเปิดหีบถูกใบแล้ว รอ 2 วินาที (ให้ผู้เล่นอ่านข้อความ/ฟังเสียงจบก่อน)
                    // แล้วค่อยไปหน้า VictoryScene
                    this.time.delayedCall(2000, () => {
                        this.scene.start("VictoryScene");
                    });
                } else {
                    this.isTrapped = true;
                    this.player.speed = 1;
                    this.registerMistake(`💥 "${c.name}" เป็นกับดัก! หมอกพิษพุ่งออกมา!`);
                }
                return;
            }
        }
    }

    // ================= ฟังก์ชันเสียง =================
    playSfx(audio) {
        try {
            audio.currentTime = 0;
            audio.play().catch(() => {
                // เบราว์เซอร์บางตัวบล็อกการเล่นเสียงอัตโนมัติก่อนมี user interaction
            });
        } catch (err) {
            console.error("เล่นเสียงไม่ได้:", err);
        }
    }

    playStageClearSound() {
        this.playSfx(this.stageClearSound);
    }

    // ================= นับความพลาด / เช็คแพ้เกม =================
    registerMistake(reasonText) {
        if (this.gameOverTriggered || this.gameCleared) return;

        this.mistakes++;
        let remaining = this.maxMistakes - this.mistakes;

        if (this.mistakes >= this.maxMistakes) {
            this.gameOverTriggered = true;
            this.activeMessage = `💀 ${reasonText} (พลาดครบ ${this.maxMistakes}/${this.maxMistakes} ครั้งแล้ว!)`;
            this.playSfx(this.loseSound);
            // รอสักครู่ให้ผู้เล่นอ่านข้อความก่อนเด้งไปหน้า Game Over
            this.time.delayedCall(1500, () => {
                this.scene.start("GameOverScene");
            });
        } else {
            this.activeMessage = `${reasonText} (พลาดไปแล้ว ${this.mistakes}/${this.maxMistakes} ครั้ง เหลืออีก ${remaining} ครั้งจะแพ้!)`;
        }
    }

    // ================= ฟังก์ชันช่วยเหลือทั่วไป =================
    isNear(px, py, ox, oy, radius = this.interactRadius) {
        let dx = px - ox;
        let dy = py - oy;
        return (dx * dx + dy * dy) <= radius * radius;
    }

    getDirectionName(angle) {
        if (angle === 0) return "เหนือ (↑)";
        if (angle === 90) return "ตะวันออก (→)";
        if (angle === 180) return "ใต้ (↓)";
        if (angle === 270) return "ตะวันตก (←)";
        return angle + "°";
    }

    getArrowSymbol(angle) {
        if (angle === 0) return "↑";
        if (angle === 90) return "→";
        if (angle === 180) return "↓";
        if (angle === 270) return "←";
        return "?";
    }

    checkStatuesPuzzle() {
        let allCorrect = this.statues.every(s => s.angle === s.targetAngle);
        if (allCorrect) {
            if (!this.statuesSolved) {
                this.statuesSolved = true;
                this.door2.locked = false;
                this.activeMessage = "กลไกประตูดังลั่น... รูปปั้นทุกตัวหันถูกทิศแล้ว! ประตูทางลงเปิดออก!";
                this.playStageClearSound();
            }
        } else {
            this.statuesSolved = false;
            this.door2.locked = true;
        }
    }

    // ================= ระบบคำนวณการชน =================
    isWalkable(cx, cy, w, h) {
        let left = cx - w / 2;
        let right = cx + w / 2;
        let top = cy - h / 2;
        let bottom = cy + h / 2;

        if (left < 0 || right > this.canvas.width || top < 0 || bottom > this.canvas.height) return false;

        if (this.door1.locked && left < this.door1.x + this.door1.w && right > this.door1.x && top < this.door1.y + this.door1.h && bottom > this.door1.y) return false;
        if (this.door2.locked && left < this.door2.x + this.door2.w && right > this.door2.x && top < this.door2.y + this.door2.h && bottom > this.door2.y) return false;
        if (this.door3.locked && left < this.door3.x + this.door3.w && right > this.door3.x && top < this.door3.y + this.door3.h && bottom > this.door3.y) return false;

        for (let i = 0; i < this.rooms.length; i++) {
            let r = this.rooms[i];
            if (left >= r.x && right <= r.x + r.w && top >= r.y && bottom <= r.y + r.h) {
                return true;
            }
        }
        for (let i = 0; i < this.corridors.length; i++) {
            let c = this.corridors[i];
            if (left >= c.x && right <= c.x + c.w && top >= c.y && bottom <= c.y + c.h) {
                return true;
            }
        }
        let centerInRoom = this.rooms.some(r => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h);
        let centerInCorridor = this.corridors.some(c => cx >= c.x && cx <= c.x + c.w && cy >= c.y && cy <= c.y + c.h);

        return (centerInRoom || centerInCorridor);
    }

    // ================= เดิน =================
    updatePlayer() {
        if (this.activeMessage) return;

        const player = this.player;
        let newX = player.x;
        let newY = player.y;
        let moving = false;

        if (this.keys.w) { newY -= player.speed; player.direction = "back"; moving = true; }
        if (this.keys.s) { newY += player.speed; player.direction = "front"; moving = true; }
        if (this.keys.a) { newX -= player.speed; player.direction = "left"; moving = true; }
        if (this.keys.d) { newX += player.speed; player.direction = "right"; moving = true; }

        // แยกเช็ก X และ Y อิสระ เพื่อให้สามารถสไลด์ไปตามกำแพงได้ ไม่ติดขัด
        if (this.isWalkable(newX, player.y, this.collisionSize.w, this.collisionSize.h)) {
            player.x = newX;
        }
        if (this.isWalkable(player.x, newY, this.collisionSize.w, this.collisionSize.h)) {
            player.y = newY;
        }

        if (moving) {
            player.frameTimer++;
            if (player.frameTimer > 8) {
                player.frame++;
                if (player.frame >= 4) player.frame = 0;
                player.frameTimer = 0;
            }
        } else {
            player.frame = 0;
        }
    }

    // ================= วาดพื้นด้วย Tileset =================
    drawTiledFloor(area) {
        const ctx = this.ctx;
        const TILE_SIZE = this.TILE_SIZE;

        if (!this.floorTileset.complete || this.floorTileset.naturalWidth === 0) {
            ctx.fillStyle = "#22252a";
            ctx.fillRect(area.x, area.y, area.w, area.h);
            return;
        }

        const sx = this.FLOOR_TILE.col * TILE_SIZE;
        const sy = this.FLOOR_TILE.row * TILE_SIZE;

        const startX = Math.floor(area.x / TILE_SIZE) * TILE_SIZE;
        const startY = Math.floor(area.y / TILE_SIZE) * TILE_SIZE;

        ctx.save();
        ctx.beginPath();
        ctx.rect(area.x, area.y, area.w, area.h);
        ctx.clip();

        for (let ty = startY; ty < area.y + area.h; ty += TILE_SIZE) {
            for (let tx = startX; tx < area.x + area.w; tx += TILE_SIZE) {
                ctx.drawImage(this.floorTileset, sx, sy, TILE_SIZE, TILE_SIZE, tx, ty, TILE_SIZE, TILE_SIZE);
            }
        }
        ctx.restore();
    }

    // ================= วาดกำแพงล้อมรอบห้องด้วย Tileset =================
    drawWallBorder(area) {
        const ctx = this.ctx;
        const TILE_SIZE = this.TILE_SIZE;
        const topReady = this.wallTilesetTopBottom.complete && this.wallTilesetTopBottom.naturalWidth > 0;
        const sideReady = this.wallTilesetSide.complete && this.wallTilesetSide.naturalWidth > 0;

        if (!topReady && !sideReady) {
            ctx.strokeStyle = "#e07a5f";
            ctx.lineWidth = 4;
            ctx.strokeRect(area.x, area.y, area.w, area.h);
            return;
        }

        const sx = this.WALL_TILE.col * TILE_SIZE;
        const sy = this.WALL_TILE.row * TILE_SIZE;
        const half = TILE_SIZE / 2;

        const drawWallTile = (img, dx, dy, flip) => {
            const cx = dx + half;
            const cy = dy + half;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(flip.flipX ? -1 : 1, flip.flipY ? -1 : 1);
            ctx.drawImage(img, sx, sy, TILE_SIZE, TILE_SIZE, -half, -half, TILE_SIZE, TILE_SIZE);
            ctx.restore();
        };

        if (topReady) {
            for (let tx = area.x; tx < area.x + area.w; tx += TILE_SIZE) {
                drawWallTile(this.wallTilesetTopBottom, tx, area.y - half, this.WALL_FLIP.top);
                drawWallTile(this.wallTilesetTopBottom, tx, area.y + area.h - half, this.WALL_FLIP.bottom);
            }
        }
        if (sideReady) {
            for (let ty = area.y; ty < area.y + area.h; ty += TILE_SIZE) {
                drawWallTile(this.wallTilesetSide, area.x - half, ty, this.WALL_FLIP.left);
                drawWallTile(this.wallTilesetSide, area.x + area.w - half, ty, this.WALL_FLIP.right);
            }
        }
    }

    // ================= วาดองค์ประกอบต่าง ๆ =================
    drawBooks() {
        const ctx = this.ctx;
        this.books.forEach(b => {
            if (this.bookImg.complete && this.bookImg.naturalWidth > 0) {
                ctx.drawImage(this.bookImg, b.x - this.bookSize / 2, b.y - this.bookSize / 2, this.bookSize, this.bookSize);
            } else {
                ctx.fillStyle = "#8b5e3c"; ctx.fillRect(b.x - this.bookSize / 2, b.y - this.bookSize / 2, this.bookSize, this.bookSize);
            }
        });
    }

    drawStatues() {
        const ctx = this.ctx;
        this.statues.forEach(s => {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate((s.angle * Math.PI) / 180);
            if (this.statueImg.complete && this.statueImg.naturalWidth > 0) {
                ctx.drawImage(this.statueImg, -this.statueSize / 2, -this.statueSize / 2, this.statueSize, this.statueSize);
            } else {
                ctx.fillStyle = "#7f8c8d"; ctx.fillRect(-this.statueSize / 2, -this.statueSize / 2, this.statueSize, this.statueSize);
                ctx.fillStyle = "#f1c40f"; ctx.beginPath(); ctx.moveTo(0, -this.statueSize / 2 + 5);
                ctx.lineTo(-10, 0); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill();
            }
            ctx.restore();

            if (s.angle === s.targetAngle) {
                ctx.fillStyle = "#2ecc71";
                ctx.font = `bold 14px ${Theme.font.body}`;
                ctx.fillText("✔", s.x + this.statueSize / 2 - 4, s.y - this.statueSize / 2 + 4);
            }
        });
    }

    drawStatueHintNearPlayer() {
        const ctx = this.ctx;
        for (let i = 0; i < this.statues.length; i++) {
            let s = this.statues[i];
            if (s.angle === s.targetAngle) continue;
            if (this.isNear(this.player.x, this.player.y, s.x, s.y)) {
                ctx.textAlign = "center";
                ctx.font = `bold 22px ${Theme.font.body}`;
                ctx.fillStyle = "#f1c40f";
                ctx.fillText(this.getArrowSymbol(s.targetAngle), this.player.x + this.player.width / 2 + 20, this.player.y - 10);
                ctx.textAlign = "left";
                break;
            }
        }
    }

    drawTorches() {
        const ctx = this.ctx;
        this.torches.forEach(t => {
            if (this.torchImg.complete && this.torchImg.naturalWidth > 0) {
                ctx.save();
                if (!t.isOn) ctx.globalAlpha = 0.4;
                ctx.drawImage(this.torchImg, t.x - this.torchSize / 2, t.y - this.torchSize / 2, this.torchSize, this.torchSize);
                ctx.restore();
            } else {
                ctx.fillStyle = t.isOn ? "#f1c40f" : "#34495e"; ctx.fillRect(t.x - this.torchSize / 2, t.y - this.torchSize / 2, this.torchSize, this.torchSize);
            }
        });
    }

    drawNPC() {
        const ctx = this.ctx;
        const npc = this.npc;
        if (this.npcImg.complete && this.npcImg.naturalWidth > 0) {
            ctx.drawImage(this.npcImg, npc.x - npc.size / 2, npc.y - npc.size / 2, npc.size, npc.size);
        } else {
            ctx.fillStyle = "#9b59b6"; ctx.fillRect(npc.x - npc.size / 2, npc.y - npc.size / 2, npc.size, npc.size);
        }
    }

    drawChests() {
        const ctx = this.ctx;
        this.chests.forEach(c => {
            ctx.save();
            if (c.isOpened) ctx.globalAlpha = 0.5;
            if (this.chestImg.complete && this.chestImg.naturalWidth > 0) {
                ctx.drawImage(this.chestImg, c.x - this.chestSize / 2, c.y - this.chestSize / 2, this.chestSize, this.chestSize);
            } else {
                ctx.fillStyle = c.isOpened ? "#7f8c8d" : "#e67e22"; ctx.fillRect(c.x - this.chestSize / 2, c.y - this.chestSize / 2, this.chestSize, this.chestSize);
            }
            ctx.restore();
        });
    }

    drawDoors() {
        const ctx = this.ctx;
        ctx.lineWidth = 2; ctx.strokeStyle = "#000000";
        let allDoors = [this.door1, this.door2, this.door3];
        allDoors.forEach(d => {
            ctx.fillStyle = d.locked ? "#c0392b" : "#2ecc71";
            ctx.fillRect(d.x, d.y, d.w, d.h);
            ctx.strokeRect(d.x, d.y, d.w, d.h);
        });
    }

    drawMessageBox() {
        const ctx = this.ctx;
        if (!this.activeMessage) return;

        let boxW = 800; let boxH = 140;
        let boxX = (this.canvas.width - boxW) / 2;
        let boxY = this.canvas.height - boxH - 40;

        ctx.fillStyle = "rgba(26, 16, 10, 0.95)"; ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = Theme.color.gold; ctx.lineWidth = 3; ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = Theme.color.parchment; ctx.font = `20px ${Theme.font.body}`;
        this.wrapText(this.activeMessage, boxX + 30, boxY + 40, boxW - 60, 28);

        ctx.fillStyle = Theme.color.torch; ctx.font = `16px ${Theme.font.body}`;
        let tipText = (this.currentDialogueIndex !== -1) ? "(คลิกเพื่ออ่านประโยคถัดไป)" : "(คลิกที่ไหนก็ได้เพื่อปิดข้อความ)";
        ctx.fillText(tipText, boxX + 30, boxY + boxH - 20);
    }

    wrapText(text, x, y, maxWidth, lineHeight) {
        const ctx = this.ctx;
        let words = text.split(" ");
        let line = ""; let currentY = y;
        for (let i = 0; i < words.length; i++) {
            let testLine = line + words[i] + " ";
            let testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth && i > 0) {
                ctx.fillText(line, x, currentY);
                line = words[i] + " "; currentY += lineHeight;
            } else { line = testLine; }
        }
        ctx.fillText(line, x, currentY);
    }

    drawUI() {
        const ctx = this.ctx;

        // --- ปุ่ม Pause มุมขวาบน ---
        {
            let pb = this.pauseButton;
            ctx.fillStyle = "#1f140d";
            ctx.fillRect(pb.x - pb.w / 2, pb.y - pb.h / 2, pb.w, pb.h);
            ctx.strokeStyle = Theme.color.gold;
            ctx.lineWidth = 2;
            ctx.strokeRect(pb.x - pb.w / 2, pb.y - pb.h / 2, pb.w, pb.h);
            ctx.fillStyle = Theme.color.goldBright;
            ctx.font = `24px ${Theme.font.title}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("||", pb.x, pb.y + 1);
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
        }

        ctx.fillStyle = Theme.color.parchment; ctx.font = `13px ${Theme.font.body}`;
        ctx.fillStyle = this.hasMagicScroll ? Theme.color.goldBright : Theme.color.parchment;
        ctx.fillText("M1: " + (this.hasMagicScroll ? "✔️" : "🔒"), 20, 30);
        ctx.fillStyle = this.statuesSolved ? Theme.color.emerald : Theme.color.parchment;
        ctx.fillText("M2: " + (this.statuesSolved ? "✔️" : "🔒"), 90, 30);
        ctx.fillStyle = this.torchesSolved ? Theme.color.torch : Theme.color.parchment;
        ctx.fillText("M3: " + (this.torchesSolved ? "✔️" : "🔒"), 160, 30);
        ctx.fillStyle = this.npcTalked ? "#c48ce0" : Theme.color.parchment;
        ctx.fillText("M4 NPC: " + (this.npcTalked ? "✔️" : "🔒"), 230, 30);

        ctx.fillStyle = this.mistakes > 0 ? Theme.color.bloodBright : Theme.color.parchment;
        ctx.fillText(`❌ พลาด: ${this.mistakes}/${this.maxMistakes}`, 320, 30);

        if (this.gameCleared) {
            ctx.fillStyle = Theme.color.emerald; ctx.font = `bold 16px ${Theme.font.body}`;
            ctx.fillText("🎉 GAME CLEAR!! คุณได้กุญแจทองคำแล้ว!", 450, 30);
        } else if (this.isTrapped) {
            ctx.fillStyle = Theme.color.bloodBright; ctx.fillText("⚠️ ติดกับดัก! ตัวช้าลง (หาหีบใบใหม่)", 450, 30);
        } else {
            ctx.fillStyle = Theme.color.parchment; ctx.fillText("M5: ตามหาหีบกุญแจจริงในห้องขวาล่าง", 450, 30);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // ปูพื้นเฉพาะรูปทรงของห้อง + ทางเดินจริงๆ เท่านั้น
        this.corridors.forEach(c => this.drawTiledFloor(c));

        this.rooms.forEach(r => {
            this.drawTiledFloor(r);
            this.drawWallBorder(r);

            ctx.fillStyle = "rgba(232, 220, 192, 0.45)";
            ctx.font = `12px ${Theme.font.body}`;
            ctx.fillText(r.quest, r.x + 10, r.y + 20);
        });

        this.drawDoors();
        this.drawBooks();
        this.drawStatues();
        this.drawTorches();
        this.drawNPC();
        this.drawChests();

        const player = this.player;
        if (this.playerImg.complete && this.playerImg.naturalWidth > 0) {
            let frameIndex = this.animations[player.direction][player.frame];
            let frameX = frameIndex % 4; let frameY = Math.floor(frameIndex / 4);
            ctx.drawImage(this.playerImg, frameX * this.spriteWidth, frameY * this.spriteHeight, this.spriteWidth, this.spriteHeight, player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
        } else {
            ctx.fillStyle = "#e63946"; ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
        }

        this.drawStatueHintNearPlayer();

        this.drawUI();
        this.drawMessageBox();
    }

    // ================= UPDATE: เรียกทุกเฟรมโดย Phaser เอง (ก่อน render) =================
    // หมายเหตุ: ที่นี่อัปเดตแค่ logic การเดิน ส่วนการวาด (this.draw()) ย้ายไปทำใน
    // อีเวนต์ postrender แทน (ดูใน create()) เพราะ Phaser จะ clear canvas ทีหลัง update() เสมอ
    update() {
        try {
            this.updatePlayer();
        } catch (err) {
            const ctx = this.ctx;
            ctx.fillStyle = "#000"; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = "#f00"; ctx.font = "16px monospace";
            ctx.fillText("ERROR: " + err.message, 20, 40);
            console.error(err);
        }
    }
}
