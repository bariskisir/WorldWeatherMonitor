class WeatherAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.animationId = null;
    this.currentGroup = null;
    this.isDay = true;
    this.lightningTimer = 0;
    this.lightningOpacity = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;
  }
  setWeather(group, isDay = true) {
    this.currentGroup = group;
    this.isDay = isDay;
    this.particles = [];
    this.lightningTimer = 0;
    this.lightningOpacity = 0;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.initParticles();
    this.animate();
  }
  initParticles() {
    const g = this.currentGroup;
    if (g === "clear") this._initSun();
    else if (g === "cloudy") this._initClouds();
    else if (g === "rain" || g === "drizzle" || g === "thunderstorm")
      this._initRain();
    else if (g === "snow") this._initSnow();
    else if (g === "fog") this._initFog();
  }
  _initSun() {
    for (let i = 0; i < 30; i++)
      this.particles.push({
        type: "ray",
        angle: ((Math.PI * 2) / 30) * i,
        length: 30 + Math.random() * 60,
        speed: 0.002 + Math.random() * 0.003,
        opacity: 0.1 + Math.random() * 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
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
      });
  }
  _initClouds() {
    for (let i = 0; i < 8; i++)
      this.particles.push({
        type: "cloud",
        x: Math.random() * this.width * 1.5 - this.width * 0.25,
        y: 20 + Math.random() * (this.height * 0.5),
        w: 80 + Math.random() * 120,
        h: 30 + Math.random() * 40,
        speed: 0.15 + Math.random() * 0.3,
        opacity: 0.06 + Math.random() * 0.1,
      });
  }
  _initRain() {
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
      });
  }
  _initSnow() {
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
      });
  }
  _initFog() {
    for (let i = 0; i < 10; i++)
      this.particles.push({
        type: "fog",
        x: Math.random() * this.width * 1.5 - this.width * 0.25,
        y: Math.random() * this.height,
        w: 200 + Math.random() * 300,
        h: 40 + Math.random() * 60,
        speed: 0.2 + Math.random() * 0.3,
        opacity: 0.04 + Math.random() * 0.06,
      });
  }
  animate() {
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
  _drawBg() {
    const ctx = this.ctx;
    const gr = ctx.createLinearGradient(0, 0, 0, this.height);
    if (this.isDay) {
      const colors = {
        clear: ["rgba(56,189,248,0.15)", "rgba(251,146,60,0.08)"],
        cloudy: ["rgba(100,116,139,0.12)", "rgba(71,85,105,0.08)"],
        rain: ["rgba(30,58,95,0.2)", "rgba(15,23,42,0.15)"],
        drizzle: ["rgba(30,58,95,0.15)", "rgba(15,23,42,0.1)"],
        snow: ["rgba(165,180,210,0.12)", "rgba(120,140,175,0.08)"],
        thunderstorm: ["rgba(20,30,60,0.25)", "rgba(30,20,50,0.2)"],
        fog: ["rgba(130,150,170,0.1)", "rgba(100,116,139,0.08)"],
      };
      const c = colors[this.currentGroup] || colors.clear;
      gr.addColorStop(0, c[0]);
      gr.addColorStop(1, c[1]);
    } else {
      gr.addColorStop(0, "rgba(15,23,42,0.2)");
      gr.addColorStop(1, "rgba(30,41,59,0.15)");
    }
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, this.width, this.height);
  }
  _drawSun() {
    const ctx = this.ctx,
      t = performance.now() * 0.001;
    const cx = this.width * 0.85,
      cy = this.height * 0.2;
    if (this.isDay) {
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
      const p = 0.12 + Math.sin(t * 1.5) * 0.05;
      g.addColorStop(0, `rgba(251,191,36,${p})`);
      g.addColorStop(0.5, `rgba(251,146,60,${p * 0.4})`);
      g.addColorStop(1, "rgba(251,146,60,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    this.particles.forEach((p) => {
      if (p.type === "ray" && this.isDay) {
        p.pulse += p.speed;
        const ps = Math.sin(p.pulse) * 0.5 + 0.5;
        const l = p.length * (0.5 + ps * 0.5);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(p.angle + t * 0.1) * l,
          cy + Math.sin(p.angle + t * 0.1) * l,
        );
        ctx.strokeStyle = `rgba(251,191,36,${p.opacity * ps})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (p.type === "sparkle") {
        p.phase += p.speed;
        p.opacity = p.targetOpacity * (Math.sin(p.phase) * 0.5 + 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = this.isDay
          ? `rgba(251,191,36,${p.opacity})`
          : `rgba(148,163,184,${p.opacity})`;
        ctx.fill();
      }
    });
  }
  _drawClouds() {
    const ctx = this.ctx;
    this.particles.forEach((p) => {
      p.x += p.speed;
      if (p.x > this.width + p.w) p.x = -p.w;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.w * 0.5, p.h * 0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(
        p.x - p.w * 0.25,
        p.y + 5,
        p.w * 0.3,
        p.h * 0.3,
        0,
        0,
        Math.PI * 2,
      );
      ctx.ellipse(
        p.x + p.w * 0.25,
        p.y + 5,
        p.w * 0.35,
        p.h * 0.3,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(200,210,230,${p.opacity})`;
      ctx.fill();
    });
  }
  _drawRain() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(10,14,23,0.15)";
    ctx.fillRect(0, 0, this.width, this.height);
    this.particles.forEach((p) => {
      p.x += p.wind;
      p.y += p.speed;
      if (p.y > this.height) {
        p.y = -p.len;
        p.x = Math.random() * this.width;
      }
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.wind * 0.5, p.y + p.len);
      ctx.strokeStyle = `rgba(120,180,255,${p.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
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
  _drawBolt() {
    const ctx = this.ctx;
    let x = this.width * 0.3 + Math.random() * this.width * 0.4,
      y = 0;
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
  _drawSnow() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(200,220,255,0.03)";
    ctx.fillRect(0, 0, this.width, this.height);
    this.particles.forEach((p) => {
      p.wobble += p.wobbleSpd;
      p.x += Math.sin(p.wobble) * 0.8 + p.wind;
      p.y += p.speed;
      p.rot += p.rotSpd;
      if (p.y > this.height + 10) {
        p.y = -10;
        p.x = Math.random() * this.width;
      }
      if (p.x > this.width + 10) p.x = -10;
      if (p.x < -10) p.x = this.width + 10;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    });
  }
  _drawFog() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(180,200,220,0.04)";
    ctx.fillRect(0, 0, this.width, this.height);
    this.particles.forEach((p) => {
      p.x += p.speed;
      if (p.x > this.width + p.w * 0.5) p.x = -p.w;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.w * 0.5);
      g.addColorStop(0, `rgba(180,200,220,${p.opacity})`);
      g.addColorStop(1, "rgba(180,200,220,0)");
      ctx.fillStyle = g;
      ctx.fillRect(p.x - p.w * 0.5, p.y - p.h * 0.5, p.w, p.h);
    });
  }
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
export { WeatherAnimation };
