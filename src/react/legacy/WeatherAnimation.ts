/** This file contains the popup weather animation implementation. */
type Particle =
  | { type: "ray"; angle: number; length: number; speed: number; opacity: number; pulse: number }
  | { type: "sparkle"; x: number; y: number; size: number; opacity: number; targetOpacity: number; speed: number; phase: number }
  | { type: "cloud"; x: number; y: number; w: number; h: number; speed: number; opacity: number }
  | { type: "drop"; x: number; y: number; len: number; speed: number; opacity: number; wind: number }
  | { type: "snow"; x: number; y: number; size: number; speed: number; wind: number; wobble: number; wobbleSpd: number; opacity: number; rot: number; rotSpd: number }
  | { type: "fog"; x: number; y: number; w: number; h: number; speed: number; opacity: number };

/** This class paints animated weather effects into a canvas. */
export class WeatherAnimation {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private currentGroup: string | null = null;
  private isDay = true;
  private lightningTimer = 0;
  private lightningOpacity = 0;
  private width = 0;
  private height = 0;

  /** This constructor binds the animation instance to a canvas. */
  public constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is required.");
    this.canvas = canvas;
    this.ctx = context;
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  /** This method starts a new animation profile for the requested weather group. */
  public setWeather(group: string, isDay = true): void {
    this.currentGroup = group;
    this.isDay = isDay;
    this.particles = [];
    this.lightningTimer = 0;
    this.lightningOpacity = 0;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.initParticles();
    this.animate();
  }

  /** This method stops the animation and clears the canvas. */
  public stop(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener("resize", this.resize);
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /** This method resizes the canvas to match its container. */
  private resize = (): void => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  };

  /** This method initializes particles for the active weather type. */
  private initParticles(): void {
    if (this.currentGroup === "clear") this.initSun();
    else if (this.currentGroup === "cloudy") this.initClouds();
    else if (this.currentGroup === "rain" || this.currentGroup === "drizzle" || this.currentGroup === "thunderstorm") this.initRain();
    else if (this.currentGroup === "snow") this.initSnow();
    else if (this.currentGroup === "fog") this.initFog();
  }

  /** This method seeds sun particles. */
  private initSun(): void {
    for (let index = 0; index < 30; index += 1) {
      this.particles.push({ type: "ray", angle: ((Math.PI * 2) / 30) * index, length: 30 + Math.random() * 60, speed: 0.002 + Math.random() * 0.003, opacity: 0.1 + Math.random() * 0.2, pulse: Math.random() * Math.PI * 2 });
    }
    for (let index = 0; index < 15; index += 1) {
      this.particles.push({ type: "sparkle", x: Math.random() * this.width, y: Math.random() * this.height, size: 1 + Math.random() * 2, opacity: 0, targetOpacity: 0.3 + Math.random() * 0.4, speed: 0.01 + Math.random() * 0.02, phase: Math.random() * Math.PI * 2 });
    }
  }

  /** This method seeds cloud particles. */
  private initClouds(): void {
    for (let index = 0; index < 8; index += 1) {
      this.particles.push({ type: "cloud", x: Math.random() * this.width * 1.5 - this.width * 0.25, y: 20 + Math.random() * (this.height * 0.5), w: 80 + Math.random() * 120, h: 30 + Math.random() * 40, speed: 0.15 + Math.random() * 0.3, opacity: 0.06 + Math.random() * 0.1 });
    }
  }

  /** This method seeds rain particles. */
  private initRain(): void {
    const count = this.currentGroup === "drizzle" ? 40 : 80;
    for (let index = 0; index < count; index += 1) {
      this.particles.push({ type: "drop", x: Math.random() * this.width, y: Math.random() * this.height, len: this.currentGroup === "drizzle" ? 8 + Math.random() * 8 : 12 + Math.random() * 18, speed: this.currentGroup === "drizzle" ? 3 + Math.random() * 3 : 6 + Math.random() * 8, opacity: 0.15 + Math.random() * 0.25, wind: 1.5 + Math.random() });
    }
  }

  /** This method seeds snow particles. */
  private initSnow(): void {
    for (let index = 0; index < 60; index += 1) {
      this.particles.push({ type: "snow", x: Math.random() * this.width, y: Math.random() * this.height, size: 2 + Math.random() * 4, speed: 0.5 + Math.random() * 1.5, wind: Math.random() * 0.5 - 0.25, wobble: Math.random() * Math.PI * 2, wobbleSpd: 0.02 + Math.random() * 0.03, opacity: 0.3 + Math.random() * 0.5, rot: Math.random() * Math.PI * 2, rotSpd: (Math.random() - 0.5) * 0.02 });
    }
  }

  /** This method seeds fog particles. */
  private initFog(): void {
    for (let index = 0; index < 10; index += 1) {
      this.particles.push({ type: "fog", x: Math.random() * this.width * 1.5 - this.width * 0.25, y: Math.random() * this.height, w: 200 + Math.random() * 300, h: 40 + Math.random() * 60, speed: 0.2 + Math.random() * 0.3, opacity: 0.04 + Math.random() * 0.06 });
    }
  }

  /** This method drives the animation loop. */
  private animate(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    if (this.currentGroup === "clear") this.drawSun();
    else if (this.currentGroup === "cloudy") this.drawClouds();
    else if (this.currentGroup === "rain" || this.currentGroup === "drizzle" || this.currentGroup === "thunderstorm") this.drawRain();
    else if (this.currentGroup === "snow") this.drawSnow();
    else if (this.currentGroup === "fog") this.drawFog();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /** This method paints the base gradient behind the effect particles. */
  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    if (this.isDay) {
      const colors: Record<string, [string, string]> = { clear: ["rgba(56,189,248,0.15)", "rgba(251,146,60,0.08)"], cloudy: ["rgba(100,116,139,0.12)", "rgba(71,85,105,0.08)"], rain: ["rgba(30,58,95,0.2)", "rgba(15,23,42,0.15)"], drizzle: ["rgba(30,58,95,0.15)", "rgba(15,23,42,0.1)"], snow: ["rgba(165,180,210,0.12)", "rgba(120,140,175,0.08)"], thunderstorm: ["rgba(20,30,60,0.25)", "rgba(30,20,50,0.2)"], fog: ["rgba(130,150,170,0.1)", "rgba(100,116,139,0.08)"] };
      const [top, bottom] = colors[this.currentGroup ?? "clear"] ?? colors.clear;
      gradient.addColorStop(0, top);
      gradient.addColorStop(1, bottom);
    } else {
      gradient.addColorStop(0, "rgba(15,23,42,0.2)");
      gradient.addColorStop(1, "rgba(30,41,59,0.15)");
    }
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /** This method paints the sunny animation state. */
  private drawSun(): void {
    const time = performance.now() * 0.001;
    const centerX = this.width * 0.85;
    const centerY = this.height * 0.2;
    const coreSize = 25;
    if (this.isDay) {
      const glow = this.ctx.createRadialGradient(centerX, centerY, coreSize * 0.2, centerX, centerY, coreSize * 4);
      const pulse = Math.sin(time * 1.5) * 0.05;
      const baseOpacity = 0.4 + pulse;
      glow.addColorStop(0, `rgba(255, 255, 255, ${baseOpacity * 0.9})`);
      glow.addColorStop(0.1, `rgba(255, 243, 100, ${baseOpacity})`);
      glow.addColorStop(0.3, `rgba(251, 191, 36, ${baseOpacity * 0.7})`);
      glow.addColorStop(0.6, `rgba(251, 146, 60, ${baseOpacity * 0.3})`);
      glow.addColorStop(1, "rgba(251, 146, 60, 0)");
      this.ctx.fillStyle = glow;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2);
      const coreGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
      coreGradient.addColorStop(0, "#ffffff");
      coreGradient.addColorStop(0.6, "#fff364");
      coreGradient.addColorStop(1, "#fbbf24");
      this.ctx.fillStyle = coreGradient;
      this.ctx.fill();
    }
    for (const particle of this.particles) {
      if (particle.type === "ray" && this.isDay) {
        particle.pulse += particle.speed;
        const strength = Math.sin(particle.pulse) * 0.5 + 0.5;
        const length = particle.length * (0.6 + strength * 0.4);
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(particle.angle + time * 0.08);
        const gradient = this.ctx.createLinearGradient(0, 0, length, 0);
        gradient.addColorStop(0, `rgba(255, 243, 100, ${particle.opacity * strength * 0.8})`);
        gradient.addColorStop(0.5, `rgba(251, 191, 36, ${particle.opacity * strength * 0.4})`);
        gradient.addColorStop(1, "rgba(251, 146, 60, 0)");
        this.ctx.beginPath();
        this.ctx.moveTo(coreSize * 0.8, 0);
        this.ctx.lineTo(length, 0);
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2 * (0.5 + strength * 0.5);
        this.ctx.lineCap = "round";
        this.ctx.stroke();
        this.ctx.restore();
      } else if (particle.type === "sparkle") {
        particle.phase += particle.speed;
        particle.opacity = particle.targetOpacity * (Math.sin(particle.phase) * 0.5 + 0.5);
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fillStyle = this.isDay ? `rgba(255, 243, 100, ${particle.opacity})` : `rgba(148, 163, 184, ${particle.opacity * 0.6})`;
        this.ctx.fill();
      }
    }
  }

  /** This method paints moving cloud shapes. */
  private drawClouds(): void {
    for (const particle of this.particles) {
      if (particle.type !== "cloud") continue;
      particle.x += particle.speed;
      if (particle.x > this.width + particle.w) particle.x = -particle.w;
      this.ctx.beginPath();
      this.ctx.ellipse(particle.x, particle.y, particle.w * 0.5, particle.h * 0.4, 0, 0, Math.PI * 2);
      this.ctx.ellipse(particle.x - particle.w * 0.25, particle.y + 5, particle.w * 0.3, particle.h * 0.3, 0, 0, Math.PI * 2);
      this.ctx.ellipse(particle.x + particle.w * 0.25, particle.y + 5, particle.w * 0.35, particle.h * 0.3, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(200,210,230,${particle.opacity})`;
      this.ctx.fill();
    }
  }

  /** This method paints rain and thunder effects. */
  private drawRain(): void {
    this.ctx.fillStyle = "rgba(10,14,23,0.15)";
    this.ctx.fillRect(0, 0, this.width, this.height);
    for (const particle of this.particles) {
      if (particle.type !== "drop") continue;
      particle.x += particle.wind;
      particle.y += particle.speed;
      if (particle.y > this.height) {
        particle.y = -particle.len;
        particle.x = Math.random() * this.width;
      }
      this.ctx.beginPath();
      this.ctx.moveTo(particle.x, particle.y);
      this.ctx.lineTo(particle.x + particle.wind * 0.5, particle.y + particle.len);
      this.ctx.strokeStyle = `rgba(120,180,255,${particle.opacity})`;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }
    if (this.currentGroup === "thunderstorm") {
      this.lightningTimer += 16;
      if (this.lightningTimer > 3000 + Math.random() * 5000) {
        this.lightningOpacity = 0.6 + Math.random() * 0.3;
        this.lightningTimer = 0;
      }
      if (this.lightningOpacity > 0) {
        this.ctx.fillStyle = `rgba(200,210,255,${this.lightningOpacity})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.lightningOpacity -= 0.04;
      }
    }
  }

  /** This method paints snowflakes. */
  private drawSnow(): void {
    this.ctx.fillStyle = "rgba(200,220,255,0.03)";
    this.ctx.fillRect(0, 0, this.width, this.height);
    for (const particle of this.particles) {
      if (particle.type !== "snow") continue;
      particle.wobble += particle.wobbleSpd;
      particle.x += Math.sin(particle.wobble) * 0.8 + particle.wind;
      particle.y += particle.speed;
      particle.rot += particle.rotSpd;
      if (particle.y > this.height + 10) {
        particle.y = -10;
        particle.x = Math.random() * this.width;
      }
      if (particle.x > this.width + 10) particle.x = -10;
      if (particle.x < -10) particle.x = this.width + 10;
      this.ctx.save();
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate(particle.rot);
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 1;
      for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI / 3) * index;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(Math.cos(angle) * particle.size, Math.sin(angle) * particle.size);
        this.ctx.stroke();
      }
      this.ctx.globalAlpha = 1;
      this.ctx.restore();
    }
  }

  /** This method paints drifting fog layers. */
  private drawFog(): void {
    this.ctx.fillStyle = "rgba(180,200,220,0.04)";
    this.ctx.fillRect(0, 0, this.width, this.height);
    for (const particle of this.particles) {
      if (particle.type !== "fog") continue;
      particle.x += particle.speed;
      if (particle.x > this.width + particle.w * 0.5) particle.x = -particle.w;
      const gradient = this.ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.w * 0.5);
      gradient.addColorStop(0, `rgba(180,200,220,${particle.opacity})`);
      gradient.addColorStop(1, "rgba(180,200,220,0)");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(particle.x - particle.w * 0.5, particle.y - particle.h * 0.5, particle.w, particle.h);
    }
  }
}
