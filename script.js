// Smooth interactions, constellation background, and button wiring

// Utils
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
// Prefer PCB background over constellation
window.__USE_PCB = true;

// External link buttons
$$('.action-button[data-url]').forEach(btn => {
	btn.addEventListener('click', () => {
		const url = btn.getAttribute('data-url');
		const newtab = btn.getAttribute('data-newtab') === 'true';
		if (!url) return;
		if (newtab) {
			window.open(url, '_blank', 'noopener');
		} else {
			location.href = url;
		}
	});
});

// Contacts collapsible
const contactToggle = $('#contacts-toggle');
const contactsPanel = $('#contacts-panel');
if (contactToggle && contactsPanel) {
	contactToggle.addEventListener('click', () => {
		const isOpen = contactToggle.getAttribute('aria-expanded') === 'true';
		contactToggle.setAttribute('aria-expanded', String(!isOpen));
		contactsPanel.classList.toggle('open', !isOpen);
	});
}

// Clicking a contact dials the number
$$('.contact-button').forEach(btn => {
	btn.addEventListener('click', e => {
		e.stopPropagation();
		const tel = btn.getAttribute('data-tel');
		if (tel) {
			window.location.href = `tel:${tel}`;
		}
	});
});

// Footer year
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Constellation animated background
(function initConstellation() {
	const canvas = document.getElementById('constellation');
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	if (window.__USE_PCB) { return; }
	let width, height, dpr, particles;

	const config = {
		maxParticles: 120,
		linkDistance: 140,
		baseSpeed: 0.3,
		mouseRadius: 140
	};

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		width = canvas.clientWidth = window.innerWidth;
		height = canvas.clientHeight = window.innerHeight;
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function createParticles() {
		const count = Math.min(config.maxParticles, Math.floor((width * height) / 15000));
		particles = new Array(count).fill(0).map(() => ({
			x: Math.random() * width,
			y: Math.random() * height,
			vx: (Math.random() - 0.5) * config.baseSpeed,
			vy: (Math.random() - 0.5) * config.baseSpeed,
			size: Math.random() * 1.8 + 0.2
		}));
	}

	const mouse = { x: -9999, y: -9999 };
	window.addEventListener('mousemove', e => {
		mouse.x = e.clientX;
		mouse.y = e.clientY;
	});
	window.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });

	function step() {
		ctx.clearRect(0, 0, width, height);
		ctx.lineWidth = 1;
		for (let i = 0; i < particles.length; i++) {
			const p = particles[i];
			p.x += p.vx;
			p.y += p.vy;
			if (p.x < -50) p.x = width + 50; else if (p.x > width + 50) p.x = -50;
			if (p.y < -50) p.y = height + 50; else if (p.y > height + 50) p.y = -50;

			// Draw particle
			ctx.beginPath();
			ctx.fillStyle = 'rgba(0,229,255,0.8)';
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();

			// Connect lines
			for (let j = i + 1; j < particles.length; j++) {
				const q = particles[j];
				const dx = p.x - q.x;
				const dy = p.y - q.y;
				const dist2 = dx * dx + dy * dy;
				const maxD = config.linkDistance;
				if (dist2 < maxD * maxD) {
					const opacity = 1 - Math.sqrt(dist2) / maxD;
					const hueBlend = 200 + opacity * 80; // cyan→violet
					ctx.strokeStyle = `hsla(${hueBlend}, 100%, 65%, ${opacity * 0.45})`;
					ctx.beginPath();
					ctx.moveTo(p.x, p.y);
					ctx.lineTo(q.x, q.y);
					ctx.stroke();
				}
			}
		}

		// Mouse gravity effect
		if (mouse.x > 0) {
			for (let i = 0; i < particles.length; i++) {
				const p = particles[i];
				const dx = mouse.x - p.x;
				const dy = mouse.y - p.y;
				const d2 = dx * dx + dy * dy;
				const r = config.mouseRadius * config.mouseRadius;
				if (d2 < r && d2 > 0.1) {
					const f = 0.015; // attraction strength
					p.vx += (dx / Math.sqrt(d2)) * f;
					p.vy += (dy / Math.sqrt(d2)) * f;
				}
			}
		}

		requestAnimationFrame(step);
	}

	resize();
	createParticles();
	window.addEventListener('resize', () => { resize(); createParticles(); });
	requestAnimationFrame(step);
})();

// PCB-style animated background (runs when __USE_PCB is true)
(function initPCB() {
	if (!window.__USE_PCB) return;
	const canvas = document.getElementById('constellation');
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	let width, height, dpr;

	const traces = [];
	const grid = { step: 72 };
	const colors = {
		base: 'rgba(0, 180, 220, 0.12)',
		glow: '#00e5ff',
		node: 'rgba(124, 77, 255, 0.5)'
	};

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		width = canvas.clientWidth = window.innerWidth;
		height = canvas.clientHeight = window.innerHeight;
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		buildTraces();
	}

	function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

	function buildTraces() {
		traces.length = 0;
		const cols = Math.ceil(width / grid.step);
		const rows = Math.ceil(height / grid.step);
		const count = Math.min(60, Math.floor((cols * rows) / 4));
		
		// Ensure uniform distribution across the entire canvas
		for (let i = 0; i < count; i++) {
			const sx = rand(0, cols - 1) * grid.step;
			const sy = rand(0, rows - 1) * grid.step;
			const ex = rand(0, cols - 1) * grid.step;
			const ey = rand(0, rows - 1) * grid.step;
			const mid = Math.random() < 0.5 ? { x: sx, y: ey } : { x: ex, y: sy };
			const points = [ { x: sx, y: sy }, mid, { x: ex, y: ey } ];
			const phase = Math.random() * 1000;
			const speed = 10 + Math.random() * 15; // px per second (slow)
			traces.push({ points, phase, speed });
		}
	}

	function drawPath(points, widthPx, strokeStyle) {
		ctx.lineWidth = widthPx;
		ctx.strokeStyle = strokeStyle;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
		ctx.stroke();
	}

	function pathLength(points) {
		let len = 0;
		for (let i = 1; i < points.length; i++) {
			const dx = points[i].x - points[i-1].x;
			const dy = points[i].y - points[i-1].y;
			len += Math.hypot(dx, dy);
		}
		return len;
	}

	function drawNodes() {
		ctx.fillStyle = colors.node;
		for (let y = 0; y < height; y += grid.step) {
			for (let x = 0; x < width; x += grid.step) {
				if ((x / grid.step + y / grid.step) % 6 === 0) {
					ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
				}
			}
		}
	}

	let last = 0;
	function step(ts) {
		if (!last) last = ts;
		last = ts;

		ctx.clearRect(0, 0, width, height);

		// Faint grid
		ctx.strokeStyle = 'rgba(255,255,255,0.035)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let x = 0; x <= width; x += grid.step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
		for (let y = 0; y <= height; y += grid.step) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
		ctx.stroke();

		// Base traces
		for (const t of traces) drawPath(t.points, 2, colors.base);

		// Moving pulses
		ctx.shadowColor = colors.glow; ctx.shadowBlur = 12;
		for (const t of traces) {
			const total = pathLength(t.points);
			const travel = ((performance.now() + t.phase) / 1000) * t.speed;
			const offset = travel % total;
			ctx.setLineDash([40, Math.max(0.0001, total)]);
			ctx.lineDashOffset = -offset;
			drawPath(t.points, 3, 'rgba(0,229,255,0.7)');
		}
		ctx.setLineDash([]); ctx.shadowBlur = 0;

		drawNodes();
		requestAnimationFrame(step);
	}

	resize();
	window.addEventListener('resize', resize);
	requestAnimationFrame(step);
})();


