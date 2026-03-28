/** This file renders the optional global map overlay canvas used by the reference UI. */
type RainParticle = {
  type: "rain";
  x: number;
  y: number;
  len: number;
  speed: number;
  opacity: number;
  wind: number;
};

type SnowParticle = {
  type: "snow";
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  wobble: number;
  wobbleSpd: number;
};

type SparkleParticle = {
  type: "sparkle";
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  opacity: number;
};

type MapParticle = RainParticle | SnowParticle | SparkleParticle;

/** This class manages the full-screen canvas weather overlay above the map. */
export class MapWeatherOverlay {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: MapParticle[] = [];
  private animationId: number | null = null;
  private width = 0;
  private height = 0;
  private currentGroup: string | null = null;
  private lightningTimer = 0;
  private lightningOpacity = 0;

  /** This constructor attaches the overlay to an existing canvas element. */
  public constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is required.");
    }

    this.canvas = canvas;
    this.ctx = context;
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  /** This method updates the active global overlay state. */
  public updateWeather(group: string): void {
    if (group === "clear") {
      this.clearAll();
      return;
    }

    this.currentGroup = group;
    this.particles = [];

    if (group === "rain" || group === "drizzle") {
      this.initRain();
    } else if (group === "snow") {
      this.initSnow();
    } else if (group === "thunderstorm") {
      this.initRain();
      this.lightningTimer = 0;
      this.lightningOpacity = 0;
    } else {
      this.initClear();
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.animate();
  }

  /** This method stops the animation and clears the overlay. */
  public stop(): void {
    this.clearAll();
    window.removeEventListener("resize", this.resize);
  }

  /** This method resizes the canvas to match the viewport. */
  private resize = (): void => {
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  };

  /** This method clears every active particle and frame. */
  private clearAll(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.particles = [];
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /** This method seeds rain particles. */
  private initRain(): void {
    for (let index = 0; index < 120; index += 1) {
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
  }

  /** This method seeds snow particles. */
  private initSnow(): void {
    for (let index = 0; index < 80; index += 1) {
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
  }

  /** This method seeds clear-state sparkle particles. */
  private initClear(): void {
    for (let index = 0; index < 20; index += 1) {
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
  }

  /** This method advances the overlay animation. */
  private animate(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const particle of this.particles) {
      switch (particle.type) {
        case "rain":
          this.drawRaindrop(particle);
          break;
        case "snow":
          this.drawSnowflake(particle);
          break;
        case "sparkle":
          this.drawSparkle(particle);
          break;
      }
    }

    if (this.currentGroup === "thunderstorm") {
      this.lightningTimer += 16;

      if (this.lightningTimer > 4000 + Math.random() * 6000) {
        this.lightningOpacity = 0.3;
        this.lightningTimer = 0;
      }

      if (this.lightningOpacity > 0) {
        this.ctx.fillStyle = `rgba(200,210,255,${this.lightningOpacity})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.lightningOpacity -= 0.02;
      }
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /** This method paints a single rain streak. */
  private drawRaindrop(particle: RainParticle): void {
    particle.x += particle.wind;
    particle.y += particle.speed;

    if (particle.y > this.height) {
      particle.y = -particle.len;
      particle.x = Math.random() * this.width;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(particle.x, particle.y);
    this.ctx.lineTo(particle.x + particle.wind * 0.3, particle.y + particle.len);
    this.ctx.strokeStyle = `rgba(100,160,255,${particle.opacity})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  /** This method paints a single snow particle. */
  private drawSnowflake(particle: SnowParticle): void {
    particle.wobble += particle.wobbleSpd;
    particle.x += Math.sin(particle.wobble) * 0.6;
    particle.y += particle.speed;

    if (particle.y > this.height + 10) {
      particle.y = -10;
      particle.x = Math.random() * this.width;
    }

    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255,255,255,${particle.opacity})`;
    this.ctx.fill();
  }

  /** This method paints a single sparkle particle. */
  private drawSparkle(particle: SparkleParticle): void {
    particle.phase += particle.speed;
    const opacity = 0.15 * (Math.sin(particle.phase) * 0.5 + 0.5);
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(251,191,36,${opacity})`;
    this.ctx.fill();
  }
}
