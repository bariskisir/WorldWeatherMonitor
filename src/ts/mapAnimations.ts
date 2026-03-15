interface MapParticle {
  type: string;
  x: number;
  y: number;
  [key: string]: any;
}

class MapWeatherOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: MapParticle[];
  private animationId: number | null;
  private activeEffects: any[];
  private width: number;
  private height: number;
  private currentGroup: string | null;
  private lightningTimer: number;
  private lightningOpacity: number;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.particles = [];
    this.animationId = null;
    this.activeEffects = [];
    this.width = 0;
    this.height = 0;
    this.currentGroup = null;
    this.lightningTimer = 0;
    this.lightningOpacity = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize(): void {
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;
    this.canvas.style.width = window.innerWidth + "px";
    this.canvas.style.height = window.innerHeight + "px";
    this.ctx.setTransform(
      window.devicePixelRatio,
      0,
      0,
      window.devicePixelRatio,
      0,
      0
    );
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  setGlobalWeather(weatherGroup: string): void {
    this.particles = [];
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.currentGroup = weatherGroup;
    this._initParticles();
    this._animate();
  }

  stop(): void {
    this.clearAll();
  }

  updateWeather(state: string): void {
    if (state === "clear") {
      this.clearAll();
    } else {
      this.setGlobalWeather(state);
    }
  }

  clearAll(): void {
    this.particles = [];
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private _initParticles(): void {
    const g = this.currentGroup;
    if (g === "rain" || g === "drizzle") this._initRain();
    else if (g === "snow") this._initSnow();
    else if (g === "thunderstorm") this._initThunder();
    else if (g === "clear") this._initClear();
  }

  private _initRain(): void {
    for (let i = 0; i < 120; i++)
      this.particles.push({
        type: "rain",
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        len: 15 + Math.random() * 25,
        speed: 8 + Math.random() * 10,
        opacity: 0.08 + Math.random() * 0.12,
        wind: 2 + Math.random() * 2,
      });
  }

  private _initSnow(): void {
    for (let i = 0; i < 80; i++)
      this.particles.push({
        type: "snow",
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 2 + Math.random() * 4,
        speed: 0.5 + Math.random() * 1.5,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpd: 0.01 + Math.random() * 0.02,
        opacity: 0.15 + Math.random() * 0.3,
      });
  }

  private _initThunder(): void {
    this._initRain();
    this.lightningTimer = 0;
    this.lightningOpacity = 0;
  }

  private _initClear(): void {
    for (let i = 0; i < 20; i++)
      this.particles.push({
        type: "sparkle",
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.015,
        opacity: 0,
      });
  }

  private _animate(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.particles.forEach((p) => {
      if (p.type === "rain") this._drawRaindrop(p);
      else if (p.type === "snow") this._drawSnowflake(p);
      else if (p.type === "sparkle") this._drawSparkle(p);
    });

    if (this.currentGroup === "thunderstorm") {
      this.lightningTimer = (this.lightningTimer || 0) + 16;
      if (this.lightningTimer > 4000 + Math.random() * 6000) {
        this.lightningOpacity = 0.3;
        this.lightningTimer = 0;
      }
      if (this.lightningOpacity > 0) {
        ctx.fillStyle = `rgba(200,210,255,${this.lightningOpacity})`;
        ctx.fillRect(0, 0, this.width, this.height);
        this.lightningOpacity -= 0.02;
      }
    }

    this.animationId = requestAnimationFrame(() => this._animate());
  }

  private _drawRaindrop(p: MapParticle): void {
    p.x += p.wind;
    p.y += p.speed;
    if (p.y > this.height) {
      p.y = -p.len;
      p.x = Math.random() * this.width;
    }
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
    this.ctx.lineTo(p.x + p.wind * 0.3, p.y + p.len);
    this.ctx.strokeStyle = `rgba(100,160,255,${p.opacity})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private _drawSnowflake(p: MapParticle): void {
    p.wobble += p.wobbleSpd;
    p.x += Math.sin(p.wobble) * 0.6;
    p.y += p.speed;
    if (p.y > this.height + 10) {
      p.y = -10;
      p.x = Math.random() * this.width;
    }
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
    this.ctx.fill();
  }

  private _drawSparkle(p: MapParticle): void {
    p.phase += p.speed;
    const o = 0.15 * (Math.sin(p.phase) * 0.5 + 0.5);
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(251,191,36,${o})`;
    this.ctx.fill();
  }
}

export { MapWeatherOverlay };
