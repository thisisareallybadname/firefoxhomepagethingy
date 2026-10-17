import type { Widget } from "../types";
import { RAIN_FPS, RAIN_MAX_DROPS, RAIN_SLANT } from "../config";

const FRAME_MS = 1000 / RAIN_FPS;
const PIXELS_PER_DROP = 12000;
const NEAR_CHANCE = 0.35;

interface Drop {
  x: number;
  y: number;
  length: number;
  speed: number; // pixels per second
  near: boolean;
}

export class Rain implements Widget {
  name = "rain";
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private drops: Drop[] = [];
  private active = false; // main asked for it to run
  private saver = false;
  private looping = false;
  private frameId = 0;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    window.addEventListener("resize", () => {
      if (this.looping) this.resize();
    });
  }

  start(): void {
    this.active = true;
    if (!this.saver) this.run();
  }

  stop(): void {
    this.active = false;
    this.halt();
  }

  setSaver(on: boolean): void {
    this.saver = on;
    if (on) this.halt();
    else if (this.active) this.run();
  }

  private run(): void {
    if (this.looping || !this.ctx) return;
    this.looping = true;
    this.resize();
    this.frameId = requestAnimationFrame((t) => this.loop(t));
  }

  private halt(): void {
    this.looping = false;
    cancelAnimationFrame(this.frameId);
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // match the window and pick a drop count for its size
  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    const count = Math.min(RAIN_MAX_DROPS, Math.round((this.canvas.width * this.canvas.height) / PIXELS_PER_DROP));
    this.drops = Array.from({ length: count }, () => this.makeDrop(true));
  }

  private makeDrop(randomHeight: boolean): Drop {
    const near = Math.random() < NEAR_CHANCE;
    const length = near ? 28 + Math.random() * 10 : 14 + Math.random() * 14;
    return {
      x: this.randomX(),
      y: randomHeight ? Math.random() * this.canvas.height : -length,
      length,
      speed: near ? 700 + Math.random() * 300 : 400 + Math.random() * 200,
      near,
    };
  }

  // start left of the screen too so slanted drops still cover the corner
  private randomX(): number {
    const overhang = this.canvas.height * RAIN_SLANT;
    return Math.random() * (this.canvas.width + overhang) - overhang;
  }

  private loop(time: number): void {
    if (!this.looping) return;
    this.frameId = requestAnimationFrame((t) => this.loop(t));
    const elapsed = time - this.lastTime;
    if (elapsed < FRAME_MS) return;
    this.lastTime = time;
    this.step(Math.min(elapsed, 100) / 1000);
    this.draw();
  }

  private step(seconds: number): void {
    for (const drop of this.drops) {
      const fall = drop.speed * seconds;
      drop.y += fall;
      drop.x += fall * RAIN_SLANT;
      if (drop.y > this.canvas.height) {
        drop.y = -drop.length;
        drop.x = this.randomX();
      }
    }
  }

  // far drops first then near ones, one stroke per layer keeps it cheap
  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const near of [false, true]) {
      ctx.strokeStyle = near ? "rgba(185, 205, 245, 0.3)" : "rgba(150, 175, 225, 0.16)";
      ctx.lineWidth = near ? 1.2 : 1;
      ctx.beginPath();
      for (const drop of this.drops) {
        if (drop.near !== near) continue;
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.length * RAIN_SLANT, drop.y + drop.length);
      }
      ctx.stroke();
    }
  }
}
