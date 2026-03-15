interface BaseParticle {
  type: string;
}

interface RayParticle extends BaseParticle {
  type: "ray";
  angle: number;
  length: number;
  speed: number;
  opacity: number;
  pulse: number;
}

interface SparkleParticle extends BaseParticle {
  type: "sparkle";
  x: number;
  y: number;
  size: number;
  opacity: number;
  targetOpacity: number;
  speed: number;
  phase: number;
}

interface CloudParticle extends BaseParticle {
  type: "cloud";
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  opacity: number;
}

interface DropParticle extends BaseParticle {
  type: "drop";
  x: number;
  y: number;
  len: number;
  speed: number;
  opacity: number;
  wind: number;
}

interface SnowParticle extends BaseParticle {
  type: "snow";
  x: number;
  y: number;
  size: number;
  speed: number;
  wind: number;
  wobble: number;
  wobbleSpd: number;
  opacity: number;
  rot: number;
  rotSpd: number;
}

interface FogParticle extends BaseParticle {
  type: "fog";
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  opacity: number;
}

type Particle = RayParticle | SparkleParticle | CloudParticle | DropParticle | SnowParticle | FogParticle;

class WeatherAnimation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[];
  private animationId: number | null;
  private currentGroup: string | null;
  private isDay: boolean;
  private lightningTimer: number;
  private lightningOpacity: number;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.particles = [];
    this.animationId = null;
    this.currentGroup = null;
    this.isDay = true;
    this.lightningTimer = 0;
    this.lightningOpacity = 0;
    this.width = 0;
    this.height = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize(): void {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;
  }

  setWeather(group: string, isDay: boolean = true): void {
    this.currentGroup = group;
    this.isDay = isDay;
    this.particles = [];
    this.lightningTimer = 0;
    this.lightningOpacity = 0;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.initParticles();
    this.animate();
  }

  private initParticles(): void {
    const g = this.currentGroup;
    if (g === "clear") this._initSun();
    else if (g === "cloudy") this._initClouds();
    else if (g === "rain" || g === "drizzle" || g === "thunderstorm")
      this._initRain();
    else if (g === "snow") this._initSnow();
    else if (g === "fog") this._initFog();
  }

  private _initSun(): void {
    for (let i = 0; i < 30; i++)
      this.particles.push({
        type: "ray",
        angle: ((Math.PI * 2) / 30) * i,
        length: 30 + Math.random() * 60,
        speed: 0.002 + Math.random() * 0.003,
        opacity: 0.1 + Math.random() * 0.2,
        pulse: Math.random() * Math.PI * 2,
      } as RayParticle);
    for (let i = 0; i < 15; i++)
      this.particles.push({
        type: "sparkle",
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2,
        opacity: 0,
        targetOpacity: 0.3 + Math.random() * 0.4,
        speed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
      } as SparkleParticle);
  }

  private _initClouds(): void {
    for (let i = 0; i < 8; i++)
      this.particles.push({
        type: "cloud",
        x: Math.random() * this.width * 1.5 - this.width * 0.25,
        y: 20 + Math.random() * (this.height * 0.5),
        w: 80 + Math.random() * 120,
        h: 30 + Math.random() * 40,
        speed: 0.15 + Math.random() * 0.3,
        opacity: 0.06 + Math.random() * 0.1,
      } as CloudParticle);
  }

  private _initRain(): void {
    const n = this.currentGroup === "drizzle" ? 40 : 80;
    for (let i = 0; i < n; i++)
      this.particles.push({
        type: "drop",
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        len:
          this.currentGroup === "drizzle"
            ? 8 + Math.random() * 8
            : 12 + Math.random() * 18,
        speed:
          this.currentGroup === "drizzle"
            ? 3 + Math.random() * 3
            : 6 + Math.random() * 8,
        opacity: 0.15 + Math.random() * 0.25,
        wind: 1.5 + Math.random(),
      } as DropParticle);
  }

  private _initSnow(): void {
    for (let i = 0; i < 60; i++)
      this.particles.push({
        type: "snow",
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 2 + Math.random() * 4,
        speed: 0.5 + Math.random() * 1.5,
        wind: Math.random() * 0.5 - 0.25,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpd: 0.02 + Math.random() * 0.03,
        opacity: 0.3 + Math.random() * 0.5,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.02,
      } as SnowParticle);
  }

  private _initFog(): void {
    for (let i = 0; i < 10; i++)
      this.particles.push({
        type: "fog",
        x: Math.random() * this.width * 1.5 - this.width * 0.25,
        y: Math.random() * this.height,
        w: 200 + Math.random() * 300,
        h: 40 + Math.random() * 60,
        speed: 0.2 + Math.random() * 0.3,
        opacity: 0.04 + Math.random() * 0.06,
      } as FogParticle);
  }

  private animate(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this._drawBg();
    const g = this.currentGroup;
    if (g === "clear") this._drawSun();
    else if (g === "cloudy") this._drawClouds();
    else if (g === "rain" || g === "drizzle" || g === "thunderstorm")
      this._drawRain();
    else if (g === "snow") this._drawSnow();
    else if (g === "fog") this._drawFog();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private _drawBg(): void {
    const ctx = this.ctx;
    const gr = ctx.createLinearGradient(0, 0, 0, this.height);
    if (this.isDay) {
      const colors: { [key: string]: string[] } = {
        clear: ["rgba(56,189,248,0.15)", "rgba(251,146,60,0.08)"],
        cloudy: ["rgba(100,116,139,0.12)", "rgba(71,85,105,0.08)"],
        rain: ["rgba(30,58,95,0.2)", "rgba(15,23,42,0.15)"],
        drizzle: ["rgba(30,58,95,0.15)", "rgba(15,23,42,0.1)"],
        snow: ["rgba(165,180,210,0.12)", "rgba(120,140,175,0.08)"],
        thunderstorm: ["rgba(20,30,60,0.25)", "rgba(30,20,50,0.2)"],
        fog: ["rgba(130,150,170,0.1)", "rgba(100,116,139,0.08)"],
      };
      const c = colors[this.currentGroup || "clear"] || colors.clear;
      gr.addColorStop(0, c[0]);
      gr.addColorStop(1, c[1]);
    } else {
      gr.addColorStop(0, "rgba(15,23,42,0.2)");
      gr.addColorStop(1, "rgba(30,41,59,0.15)");
    }
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private _drawSun(): void {
    const ctx = this.ctx;
    const t = performance.now() * 0.001;
    const cx = this.width * 0.85;
    const cy = this.height * 0.2;
    const coreSize = 25;

    if (this.isDay) {
      const g = ctx.createRadialGradient(
        cx,
        cy,
        coreSize * 0.2,
        cx,
        cy,
        coreSize * 4
      );
      const pulse = Math.sin(t * 1.5) * 0.05;
      const baseOpacity = 0.4 + pulse;

      g.addColorStop(0, `rgba(255, 255, 255, ${baseOpacity * 0.9})`);
      g.addColorStop(0.1, `rgba(255, 243, 100, ${baseOpacity})`);
      g.addColorStop(0.3, `rgba(251, 191, 36, ${baseOpacity * 0.7})`);
      g.addColorStop(0.6, `rgba(251, 146, 60, ${baseOpacity * 0.3})`);
      g.addColorStop(1, "rgba(251, 146, 60, 0)");

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.beginPath();
      ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(0.6, "#fff364");
      coreGrad.addColorStop(1, "#fbbf24");
      ctx.fillStyle = coreGrad;
      ctx.fill();
    }

    this.particles.forEach((p) => {
      if (p.type === "ray" && this.isDay) {
        const ray = p as RayParticle;
        ray.pulse += ray.speed;
        const ps = Math.sin(ray.pulse) * 0.5 + 0.5;
        const l = ray.length * (0.6 + ps * 0.4);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ray.angle + t * 0.08);

        const rayGrad = ctx.createLinearGradient(0, 0, l, 0);
        rayGrad.addColorStop(0, `rgba(255, 243, 100, ${ray.opacity * ps * 0.8})`);
        rayGrad.addColorStop(0.5, `rgba(251, 191, 36, ${ray.opacity * ps * 0.4})`);
        rayGrad.addColorStop(1, "rgba(251, 146, 60, 0)");

        ctx.beginPath();
        ctx.moveTo(coreSize * 0.8 || 20, 0);
        ctx.lineTo(l, 0);
        ctx.strokeStyle = rayGrad;
        ctx.lineWidth = 2 * (0.5 + ps * 0.5);
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      } else if (p.type === "sparkle") {
        const sparkle = p as SparkleParticle;
        sparkle.phase += sparkle.speed;
        sparkle.opacity = sparkle.targetOpacity * (Math.sin(sparkle.phase) * 0.5 + 0.5);
        ctx.beginPath();
        ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
        ctx.fillStyle = this.isDay
          ? `rgba(255, 243, 100, ${sparkle.opacity})`
          : `rgba(148, 163, 184, ${sparkle.opacity * 0.6})`;
        ctx.fill();
      }
    });
  }

  private _drawClouds(): void {
    const ctx = this.ctx;
    this.particles.forEach((p) => {
      if (p.type === "cloud") {
        const cloud = p as CloudParticle;
        cloud.x += cloud.speed;
        if (cloud.x > this.width + cloud.w) cloud.x = -cloud.w;
        ctx.beginPath();
        ctx.ellipse(cloud.x, cloud.y, cloud.w * 0.5, cloud.h * 0.4, 0, 0, Math.PI * 2);
        ctx.ellipse(
          cloud.x - cloud.w * 0.25,
          cloud.y + 5,
          cloud.w * 0.3,
          cloud.h * 0.3,
          0,
          0,
          Math.PI * 2
        );
        ctx.ellipse(
          cloud.x + cloud.w * 0.25,
          cloud.y + 5,
          cloud.w * 0.35,
          cloud.h * 0.3,
          0,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(200,210,230,${cloud.opacity})`;
        ctx.fill();
      }
    });
  }

  private _drawRain(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(10,14,23,0.15)";
    ctx.fillRect(0, 0, this.width, this.height);
    this.particles.forEach((p) => {
      if (p.type === "drop") {
        const drop = p as DropParticle;
        drop.x += drop.wind;
        drop.y += drop.speed;
        if (drop.y > this.height) {
          drop.y = -drop.len;
          drop.x = Math.random() * this.width;
        }
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.wind * 0.5, drop.y + drop.len);
        ctx.strokeStyle = `rgba(120,180,255,${drop.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    if (this.currentGroup === "thunderstorm") {
      this.lightningTimer += 16;
      if (this.lightningTimer > 3000 + Math.random() * 5000) {
        this.lightningOpacity = 0.6 + Math.random() * 0.3;
        this.lightningTimer = 0;
        this._drawBolt();
      }
      if (this.lightningOpacity > 0) {
        ctx.fillStyle = `rgba(200,210,255,${this.lightningOpacity})`;
        ctx.fillRect(0, 0, this.width, this.height);
        this.lightningOpacity -= 0.04;
      }
    }
  }

  private _drawBolt(): void {
    const ctx = this.ctx;
    let x = this.width * 0.3 + Math.random() * this.width * 0.4;
    let y = 0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y < this.height * 0.7) {
      x += (Math.random() - 0.5) * 30;
      y += 10 + Math.random() * 20;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(200,200,255,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  private _drawSnow(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(200,220,255,0.03)";
    ctx.fillRect(0, 0, this.width, this.height);
    this.particles.forEach((p) => {
      if (p.type === "snow") {
        const snow = p as SnowParticle;
        snow.wobble += snow.wobbleSpd;
        snow.x += Math.sin(snow.wobble) * 0.8 + snow.wind;
        snow.y += snow.speed;
        snow.rot += snow.rotSpd;
        if (snow.y > this.height + 10) {
          snow.y = -10;
          snow.x = Math.random() * this.width;
        }
        if (snow.x > this.width + 10) snow.x = -10;
        if (snow.x < -10) snow.x = this.width + 10;
        ctx.save();
        ctx.translate(snow.x, snow.y);
        ctx.rotate(snow.rot);
        ctx.globalAlpha = snow.opacity;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * snow.size, Math.sin(a) * snow.size);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    });
  }

  private _drawFog(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(180,200,220,0.04)";
    ctx.fillRect(0, 0, this.width, this.height);
    this.particles.forEach((p) => {
      if (p.type === "fog") {
        const fog = p as FogParticle;
        fog.x += fog.speed;
        if (fog.x > this.width + fog.w * 0.5) fog.x = -fog.w;
        const g = ctx.createRadialGradient(
          fog.x,
          fog.y,
          0,
          fog.x,
          fog.y,
          fog.w * 0.5
        );
        g.addColorStop(0, `rgba(180,200,220,${fog.opacity})`);
        g.addColorStop(1, "rgba(180,200,220,0)");
        ctx.fillStyle = g;
        ctx.fillRect(fog.x - fog.w * 0.5, fog.y - fog.h * 0.5, fog.w, fog.h);
      }
    });
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

export { WeatherAnimation };
