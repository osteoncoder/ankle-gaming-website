/* ============================================================
   AnkleGaming Private Limited — site behaviour
   ============================================================

   SITE CONFIG — the only place keys/endpoints live.
   - web3formsKey: free public form key from https://web3forms.com
     (a PUBLIC form key, safe in client code — not a private secret).
   - assistantEndpoint: OPTIONAL. URL of YOUR server endpoint that accepts
     POST { "message": "..." } and returns { "reply": "..." }. Keep your AI
     provider's private API key on that server, NEVER in this file.
     While empty, the assistant answers instantly from the on-site
     knowledge base below and hands off to WhatsApp for anything else.
============================================================ */
const SITE_CONFIG = {
  web3formsKey: '',
  assistantEndpoint: ''
};

const WHATSAPP_URL = 'https://wa.me/919599734137?text=Hi%20AnkleGaming%2C%20I%27d%20like%20to%20discuss%20a%20project.';
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

/* ============ FOOTER YEAR (never goes stale) ============ */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ============ PRELOADER ============ */
function hidePreloader() {
  const fill = document.getElementById('preBarFill');
  const pre = document.getElementById('preloader');
  if (fill) fill.style.width = '100%';
  if (pre) pre.classList.add('done');
}
window.addEventListener('load', () => setTimeout(hidePreloader, 450));
/* fail-safe: never trap the visitor behind the overlay on a slow phone */
setTimeout(hidePreloader, 2600);

/* ============ NAVBAR SCROLL + PROGRESS + BACK TO TOP ============ */
const header = document.getElementById('header');
const progress = document.getElementById('progress');
const scrollTopBtn = document.getElementById('scrollTop');
let scrollQueued = false;
function onScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    header.classList.toggle('scrolled', window.scrollY > 40);
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    progress.style.width = pct + '%';
    scrollTopBtn.classList.toggle('show', window.scrollY > 500);
    scrollQueued = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
});

/* ============ MOBILE MENU ============ */
const burger = document.getElementById('burger'),
      navLinks = document.getElementById('navLinks'),
      navBackdrop = document.getElementById('navBackdrop'),
      navClose = document.getElementById('navClose');

function setMenu(open) {
  navLinks.classList.toggle('open', open);
  burger.classList.toggle('open', open);
  if (navBackdrop) navBackdrop.classList.toggle('show', open);
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (open && navClose) navClose.focus({ preventScroll: true });
}
function closeMenu() { setMenu(false); }

burger.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
if (navClose) navClose.addEventListener('click', closeMenu);
if (navBackdrop) navBackdrop.addEventListener('click', closeMenu);
document.querySelectorAll('.navlink').forEach(l => l.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
window.addEventListener('resize', () => { if (window.innerWidth > 900) closeMenu(); });
window.addEventListener('pageshow', closeMenu);
window.addEventListener('orientationchange', () => setTimeout(closeMenu, 150));

/* ============ SCROLLSPY (active nav states) ============ */
const spyLinks = document.querySelectorAll('.navlink');
const spyMap = {};
spyLinks.forEach(l => { spyMap[l.getAttribute('href').slice(1)] = l; });
const spyObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      spyLinks.forEach(l => l.classList.remove('active'));
      const link = spyMap[e.target.id];
      if (link) link.classList.add('active');
    }
  });
}, { rootMargin: '-38% 0px -55% 0px' });
['expertise', 'services', 'industries', 'work', 'about', 'contact'].forEach(id => {
  const s = document.getElementById(id);
  if (s) spyObserver.observe(s);
});

/* ============ SCROLL REVEAL ============ */
const revealEls = document.querySelectorAll('.reveal');
if (!('IntersectionObserver' in window)) {
  revealEls.forEach(el => el.classList.add('in'));
} else {
  const io = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('in'), Math.min(i * 60, 240));
        io.unobserve(e.target);
      }
    });
  }, { threshold: .12 });
  revealEls.forEach(el => io.observe(el));
}

/* ============ COUNTERS ============ */
const counters = document.querySelectorAll('.counter');
const counterIO = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target, target = +el.dataset.target;
      if (prefersReduced) { el.textContent = target; counterIO.unobserve(el); return; }
      let cur = 0;
      const step = Math.max(target / 55, 1);
      const t = setInterval(() => {
        cur += step;
        if (cur >= target) { cur = target; clearInterval(t); }
        el.textContent = Math.floor(cur);
      }, 24);
      counterIO.unobserve(el);
    }
  });
}, { threshold: .5 });
counters.forEach(c => counterIO.observe(c));

/* ============ CARD SPOTLIGHT (pointer-tracked, no movement) ============ */
if (finePointer) {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
  /* hero visual parallax — subtle, desktop only */
  const heroVisual = document.querySelector('.hero-visual');
  const heroSection = document.querySelector('.hero');
  if (heroVisual && heroSection && !prefersReduced) {
    heroSection.addEventListener('mousemove', e => {
      const r = heroSection.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - .5;
      const dy = (e.clientY - r.top) / r.height - .5;
      heroVisual.querySelectorAll('[data-depth]').forEach(el => {
        const d = +el.dataset.depth;
        el.style.translate = `${dx * d}px ${dy * d}px`;
      });
    });
    heroSection.addEventListener('mouseleave', () => {
      heroVisual.querySelectorAll('[data-depth]').forEach(el => { el.style.translate = '0px 0px'; });
    });
  }
}

/* ============ SERVICE ENQUIRE (pre-fill contact form) ============ */
const serviceSelect = document.getElementById('cfService');
const messageField = document.getElementById('cfMessage');
document.querySelectorAll('[data-enquire]').forEach(link => {
  link.addEventListener('click', () => {
    const service = link.getAttribute('data-enquire');
    if (serviceSelect && service) {
      [...serviceSelect.options].forEach(o => { if (o.text === service) serviceSelect.value = o.value || o.text; });
      serviceSelect.value = service;
    }
    if (messageField && !messageField.value.trim()) {
      messageField.placeholder = `Tell us about your ${service.replace(/ Development$/, '').toLowerCase()} project...`;
    }
  });
});

/* ============ PORTFOLIO FILTERING ============ */
const filterBtns = document.querySelectorAll('.filter-btn');
const caseCards = document.querySelectorAll('#workGrid .case-card');
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    const f = btn.dataset.filter;
    caseCards.forEach(card => {
      const show = f === 'all' || card.dataset.cat === f;
      card.classList.toggle('filtered-out', !show);
      if (show) card.classList.add('in');
    });
  });
});

/* ============ CASE STUDY MODAL ============ */
/* Capability showcases — honest descriptions of what we build in each
   category. No invented clients, metrics or results. */
const CASE_STUDIES = {
  team: {
    tag: 'Our Team', title: 'Leadership & Vision',
    lead: 'AnkleGaming Private Limited is a New Delhi-based, remote-first product studio. 45+ specialists across engineering, design and product have delivered 190+ projects over 8+ years.',
    list: ['Senior engineers across mobile, web, AI and cloud', 'Transparent sprints with regular demos and reviews', 'Rated 4.8 on Google and 4.9 on Justdial by clients', 'Long-term maintenance and scaling support after launch'],
    tags: ['Strategy', 'Product', 'Growth'], service: ''
  },
  mobile: {
    tag: 'Mobile Apps', title: 'Android & iOS Applications',
    lead: 'Custom mobile applications built for performance and scalability — from first wireframe to store release and beyond.',
    list: ['Native Kotlin (Android) and Swift (iOS) development', 'Cross-platform builds with Flutter & React Native', 'Play Store & App Store submission handled end to end', 'Push notifications, payments and analytics integration'],
    tags: ['Flutter', 'React Native', 'Kotlin', 'Swift'], service: 'Cross Platform Development'
  },
  web: {
    tag: 'Web & SaaS', title: 'Websites, Portals & SaaS Platforms',
    lead: 'Professional websites, customer portals and scalable subscription platforms with dashboards and billing baked in.',
    list: ['Fast, SEO-ready marketing websites (React / Next.js)', 'Multi-tenant SaaS with subscriptions and billing', 'Admin dashboards with role-based access', 'Cloud hosting on AWS / Azure with CI-friendly workflows'],
    tags: ['React', 'Next.js', 'Node.js', 'SaaS'], service: 'SaaS Development'
  },
  games: {
    tag: 'Game Development', title: 'Mobile & Web Games',
    lead: 'Engaging mobile and web games with smooth graphics, balanced gameplay loops and monetisation designed in from day one.',
    list: ['2D & 3D games built in Unity', 'WebGL builds that run instantly in the browser', 'Gameplay balancing, levels and in-game economies', 'Ads & in-app purchase integration'],
    tags: ['Unity', 'WebGL', '2D / 3D'], service: 'Game Development'
  },
  ecommerce: {
    tag: 'E-commerce', title: 'E-commerce & CMS Platforms',
    lead: 'Online stores and content platforms built for growth, search visibility and effortless day-to-day management.',
    list: ['WooCommerce & custom storefront development', 'Secure payment gateway integration', 'Product, order and inventory management', 'SEO-structured content your team can edit'],
    tags: ['WordPress', 'WooCommerce', 'CMS', 'Payments'], service: 'WordPress Development'
  },
  design: {
    tag: 'Design & Branding', title: 'UI / UX & Brand Design',
    lead: 'Interfaces and brand systems designed for clarity and conversion — research first, pixels second.',
    list: ['UX research, wireframes and user flows', 'Interactive Figma prototypes for stakeholder approval', 'Reusable design systems that scale with your team', 'Brand identity: logo, typography and guidelines'],
    tags: ['Figma', 'UI / UX', 'Branding'], service: 'UI / UX Design'
  },
  culture: {
    tag: 'Our Culture', title: 'Life at AnkleGaming',
    lead: 'A remote-first team of 45+ specialists based in New Delhi — celebrating milestones, new beginnings and shipping great products together.',
    list: ['Festive celebrations and team milestones at our New Delhi office', 'Remote-first culture serving clients globally', 'Senior engineers, designers and product specialists under one roof', 'Rated 4.8 on Google and 4.9 on Justdial by clients'],
    tags: ['Team', 'Culture', 'New Delhi'], service: ''
  },
  award: {
    tag: 'Recognition', title: 'Awards & Recognition',
    lead: 'AnkleGaming Private Limited was recognised by Clutch as a Best Application Development Company.',
    list: ['Clutch — Best Application Development Company', '190+ projects delivered over 8+ years', '4.8 rating on Google · 4.9 rating on Justdial'],
    tags: ['Clutch', 'Award', 'Leadership'], service: ''
  }
};

const caseModal = document.getElementById('caseModal');
const caseBackdrop = document.getElementById('caseBackdrop');
const caseClose = document.getElementById('caseClose');
const caseBack = document.getElementById('caseModalBack');
const caseCta = document.getElementById('caseModalCta');
let lastCaseTrigger = null;

function openCase(key, trigger) {
  const data = CASE_STUDIES[key];
  if (!data) return;
  lastCaseTrigger = trigger || null;
  document.getElementById('caseModalTag').textContent = data.tag;
  document.getElementById('caseModalTitle').textContent = data.title;
  document.getElementById('caseModalLead').textContent = data.lead;
  document.getElementById('caseModalList').innerHTML = data.list.map(i => `<li>${i}</li>`).join('');
  document.getElementById('caseModalTags').innerHTML = data.tags.map(t => `<span>${t}</span>`).join('');
  if (data.service) caseCta.setAttribute('data-enquire', data.service);
  else caseCta.removeAttribute('data-enquire');
  caseModal.hidden = false;
  caseBackdrop.hidden = false;
  document.body.classList.add('modal-open');
  caseClose.focus({ preventScroll: true });
}
function closeCase() {
  caseModal.hidden = true;
  caseBackdrop.hidden = true;
  document.body.classList.remove('modal-open');
  if (lastCaseTrigger) lastCaseTrigger.focus({ preventScroll: true });
}
document.querySelectorAll('.case-open').forEach(btn => {
  btn.addEventListener('click', () => openCase(btn.dataset.case, btn));
});
caseClose.addEventListener('click', closeCase);
caseBack.addEventListener('click', closeCase);
caseBackdrop.addEventListener('click', closeCase);
caseCta.addEventListener('click', () => {
  const service = caseCta.getAttribute('data-enquire');
  closeCase();
  if (service && serviceSelect) serviceSelect.value = service;
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !caseModal.hidden) closeCase();
});

/* ============ TESTIMONIAL SLIDER ============ */
const slides = document.querySelectorAll('.testi-slide');
const dots = document.querySelectorAll('.testi-dots button');
let active = 0;
function showSlide(i) {
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  slides[i].classList.add('active');
  dots[i].classList.add('active');
  active = i;
}
dots.forEach(d => d.addEventListener('click', () => showSlide(+d.dataset.i)));
let sliderTimer = null;
function startSlider() {
  if (prefersReduced || slides.length < 2 || sliderTimer) return;
  sliderTimer = setInterval(() => showSlide((active + 1) % slides.length), 5000);
}
function stopSlider() { clearInterval(sliderTimer); sliderTimer = null; }
startSlider();
document.addEventListener('visibilitychange', () => { document.hidden ? stopSlider() : startSlider(); });
const testiWrap = document.querySelector('.testi-wrap');
if (testiWrap) {
  testiWrap.addEventListener('mouseenter', stopSlider);
  testiWrap.addEventListener('mouseleave', startSlider);
  testiWrap.addEventListener('focusin', stopSlider);
  testiWrap.addEventListener('focusout', startSlider);
}

/* ============ FAQ ACCORDION ============ */
document.querySelectorAll('.faq-item').forEach(item => {
  const btn = item.querySelector('.faq-q');
  btn.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(o => {
      o.classList.remove('open');
      o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

/* ============ FORM HELPERS ============ */
function setMsg(el, text, state) {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-msg' + (state ? ' ' + state : '');
  el.style.display = text ? 'block' : 'none';
}
const emailOK = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/* ============ CONTACT FORM: real validation + real submission ============
   Nothing is faked. If no Web3Forms access key is configured we tell the
   user plainly instead of showing a false "Thanks" message. */
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const msg = document.getElementById('formMsg');

  const showError = (field, text) => {
    const wrap = field.closest('.field');
    const slot = wrap && wrap.querySelector('.field-error');
    if (wrap) wrap.classList.add('invalid');
    if (slot) slot.textContent = text;
  };
  const clearError = field => {
    const wrap = field.closest('.field');
    const slot = wrap && wrap.querySelector('.field-error');
    if (wrap) wrap.classList.remove('invalid');
    if (slot) slot.textContent = '';
  };

  const validators = {
    cfName:    v => v.trim().length >= 2 ? '' : 'Please enter your name.',
    cfEmail:   v => emailOK(v) ? '' : 'Please enter a valid email address.',
    cfPhone:   v => (v.trim() === '' || /^[+0-9][0-9\s-]{7,15}$/.test(v.trim())) ? '' : 'Please enter a valid phone number.',
    cfMessage: v => v.trim().length >= 10 ? '' : 'Please tell us a little about your project (at least 10 characters).'
  };

  Object.keys(validators).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => {
      const err = validators[id](el.value);
      err ? showError(el, err) : clearError(el);
    });
    el.addEventListener('input', () => {
      if (el.closest('.field').classList.contains('invalid')) clearError(el);
    });
  });

  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    /* honeypot: silently drop bot submissions */
    const hp = this.querySelector('[name="botcheck"]');
    if (hp && hp.checked) return;

    let firstBad = null;
    Object.keys(validators).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const err = validators[id](el.value);
      if (err) { showError(el, err); if (!firstBad) firstBad = el; }
      else clearError(el);
    });

    if (firstBad) {
      firstBad.focus({ preventScroll: true });
      setMsg(msg, 'Please fix the highlighted fields and try again.', 'error');
      return;
    }

    const key = (SITE_CONFIG.web3formsKey || '').trim();
    if (!key) {
      setMsg(msg, 'Our form is being connected right now — your message would not reach us yet. Please email info@anklegaming.com or WhatsApp +91 95997 34137 and we will respond within 24 hours.', 'error');
      return;
    }

    const btn = document.getElementById('cfSubmit');
    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    setMsg(msg, 'Sending your message...', 'pending');

    try {
      const payload = new FormData(this);
      payload.append('access_key', key);
      payload.append('subject', 'New project enquiry — anklegaming website');
      payload.append('from_name', 'AnkleGaming Website');
      payload.delete('botcheck');
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: payload
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMsg(msg, 'Thanks! Your message has been sent. We\'ll get back to you within 24 hours.');
        this.reset();
        Object.keys(validators).forEach(id => { const el = document.getElementById(id); if (el) clearError(el); });
      } else {
        throw new Error(data.message || 'Submission failed');
      }
    } catch (err) {
      setMsg(msg, 'Sorry, something went wrong while sending. Please try WhatsApp or email info@anklegaming.com.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = label; }
    }
  });
}

/* ============ NEWSLETTER (same verified form backend) ============ */
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  const nlMsg = document.getElementById('nlMsg');
  newsletterForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const input = document.getElementById('nlEmail');
    if (!emailOK(input.value)) {
      setMsg(nlMsg, 'Please enter a valid email address.', 'error');
      input.focus({ preventScroll: true });
      return;
    }
    const key = (SITE_CONFIG.web3formsKey || '').trim();
    if (!key) {
      setMsg(nlMsg, 'Subscriptions are not connected yet — please email info@anklegaming.com instead.', 'error');
      return;
    }
    const btn = this.querySelector('button[type="submit"]');
    const label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Joining...'; }
    setMsg(nlMsg, 'Subscribing...', 'pending');
    try {
      const payload = new FormData();
      payload.append('access_key', key);
      payload.append('subject', 'Newsletter subscription — anklegaming website');
      payload.append('email', input.value.trim());
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Accept': 'application/json' }, body: payload
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMsg(nlMsg, 'Subscribed — welcome aboard!');
        this.reset();
      } else throw new Error(data.message || 'Subscription failed');
    } catch (err) {
      setMsg(nlMsg, 'Something went wrong. Please try again or email us.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
  });
}

/* ============ ASSISTANT ("Ask Ankle") ============
   Instant answers from the on-site knowledge base. If SITE_CONFIG
   .assistantEndpoint points to your server, questions are sent there
   (POST {message} → {reply}) so private AI keys stay server-side. */
const assistantEl = document.getElementById('assistant');
const assistantFab = document.getElementById('assistantFab');
const assistantPanel = document.getElementById('assistantPanel');
const assistantClose = document.getElementById('assistantClose');
const assistantBody = document.getElementById('assistantBody');
const assistantForm = document.getElementById('assistantForm');
const assistantInput = document.getElementById('assistantInput');
let assistantGreeted = false;

const KB = [
  { keys: ['service', 'offer', 'what do you do', 'expertise', 'build'],
    reply: 'We build Android & iOS apps, cross-platform apps (Flutter / React Native), websites & web applications, AI / ML solutions, SaaS platforms, custom software, WordPress & CRM/CMS platforms, UI/UX design and games. See the <a href="#services">Services section</a> for detail on all 12 offerings.' },
  { keys: ['price', 'cost', 'quote', 'budget', 'estimate', 'charge'],
    reply: 'Project cost depends on scope, features and platforms, so we never quote blind. Share your requirements in the <a href="#contact">enquiry form</a> (there is an optional budget range) and our team will review and respond within 24 hours.' },
  { keys: ['start', 'begin', 'process', 'how do we', 'kickoff', 'hire'],
    reply: 'Starting is simple: send a <a href="#contact">project enquiry</a>, WhatsApp us, or email info@anklegaming.com. We respond within 24 hours, schedule a discovery call, then design → sprint development → QA → launch, with demos at every sprint.' },
  { keys: ['contact', 'email', 'phone', 'call', 'whatsapp', 'reach'],
    reply: 'You can reach us at <a href="mailto:info@anklegaming.com">info@anklegaming.com</a>, by phone on <a href="tel:+919599734137">+91 95997 34137</a>, or instantly on <a href="' + WHATSAPP_URL + '" target="_blank" rel="noopener">WhatsApp</a>. We reply within 24 hours.' },
  { keys: ['where', 'location', 'located', 'address', 'country', 'city', 'remote'],
    reply: 'Our office is at WZ 77, Ram Garh Colony, Basai Dara Pur, Bali Nagar, New Delhi, Delhi 110015, India. We are remote-first and serve clients globally.' },
  { keys: ['technolog', 'stack', 'react', 'flutter', 'framework', 'language', 'tools'],
    reply: 'Our core stack: React & Next.js (web), Flutter, React Native, Swift & Kotlin (mobile), Node.js & Python (backend), AWS, Azure, Firebase & MongoDB (cloud/data), TensorFlow & Unity (AI/games), and Figma for design. Full detail is in the <a href="#stack">Technology Stack</a> section.' },
  { keys: ['time', 'long', 'duration', 'timeline', 'deadline', 'delivery'],
    reply: 'Timelines depend on scope — a focused MVP and an enterprise platform are very different builds. Share your requirements via the <a href="#contact">enquiry form</a> and we will propose a roadmap with sprint milestones after a discovery call.' },
  { keys: ['support', 'maintenance', 'after launch', 'post'],
    reply: 'Yes — long-term support is a core commitment. We provide post-launch maintenance and scaling support whenever you need it. Choose "Support & Maintenance" as the enquiry type in the <a href="#contact">contact form</a>.' },
  { keys: ['industr', 'sector', 'healthcare', 'fintech', 'domain'],
    reply: 'We serve Healthcare, Gaming, Real Estate, E-commerce, Restaurant, Fintech, Education, Travel, Automobile, Logistics, Entertainment and Social Networking. See the <a href="#industries">Industries section</a> for what we build in each.' },
  { keys: ['portfolio', 'work', 'case stud', 'project', 'clients', 'brands', 'experience'],
    reply: 'We have delivered 190+ projects over 8+ years, working with brands including Hitachi, Godrej, Bikanervala, Libas, Winzo and Meesho. Browse capability case studies in the <a href="#work">Work section</a> — detailed client studies are shared on request.' },
  { keys: ['team', 'developers', 'how many', 'company', 'about'],
    reply: 'AnkleGaming Private Limited is a full-stack product studio with 45+ expert developers and 8+ years of experience, rated 4.8 on Google and 4.9 on Justdial. More in the <a href="#about">About section</a>.' },
  { keys: ['career', 'job', 'hiring', 'vacancy', 'intern'],
    reply: 'We do not publish openings on this page. Please email your profile to <a href="mailto:info@anklegaming.com?subject=Career%20Enquiry">info@anklegaming.com</a> with the subject "Career Enquiry" and the team will respond if there is a fit.' },
  { keys: ['ai', 'chatbot', 'machine learning', 'ml', 'automation', 'artificial'],
    reply: 'Our AI / ML offering covers chatbots, Generative AI features, workflow automation and ML models integrated into your products (TensorFlow and modern LLM APIs). Pick "AI / ML Development" in the <a href="#contact">enquiry form</a> to discuss your use case.' },
  { keys: ['game', 'gaming', 'unity'],
    reply: 'Game development is in our DNA — 2D/3D mobile and WebGL games built in Unity, with gameplay balancing and monetisation included. See the Games filter in our <a href="#work">Work section</a>.' }
];

function addMsg(text, who) {
  const div = document.createElement('div');
  div.className = 'msg msg--' + who;
  div.innerHTML = text;
  assistantBody.appendChild(div);
  assistantBody.scrollTop = assistantBody.scrollHeight;
  return div;
}
function kbAnswer(q) {
  const s = ' ' + q.toLowerCase() + ' ';
  for (const item of KB) {
    if (item.keys.some(k => s.includes(k))) return item.reply;
  }
  if (/\b(hi|hello|hey|namaste)\b/.test(s)) {
    return 'Hello! I can answer questions about our services, technologies, process, pricing approach and how to reach the team. What would you like to know?';
  }
  return 'I want to give you an accurate answer rather than guess. You can ask me about our services, technologies, industries, process or contact details — or reach the team directly on <a href="' + WHATSAPP_URL + '" target="_blank" rel="noopener">WhatsApp</a> / <a href="mailto:info@anklegaming.com">email</a> for anything project-specific.';
}
async function assistantReply(q) {
  const typing = addMsg('<i></i><i></i><i></i>', 'bot typing');
  typing.classList.add('msg--typing');
  try {
    if (SITE_CONFIG.assistantEndpoint) {
      const res = await fetch(SITE_CONFIG.assistantEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ message: q })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) { typing.remove(); addMsg(String(data.reply), 'bot'); return; }
      /* server unavailable → fall back to local knowledge base */
    }
    await new Promise(r => setTimeout(r, prefersReduced ? 60 : 650));
    typing.remove();
    addMsg(kbAnswer(q), 'bot');
  } catch (err) {
    typing.remove();
    addMsg(kbAnswer(q), 'bot');
  }
}
function setAssistant(open) {
  /* set the attribute explicitly (not just the property) so it can never
     be left in a stale state by older cached CSS */
  if (open) assistantPanel.removeAttribute('hidden');
  else assistantPanel.setAttribute('hidden', '');
  assistantFab.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    if (!assistantGreeted) {
      assistantGreeted = true;
      addMsg('Hi, I\'m <strong>Ask Ankle</strong> — I answer instantly from this website\'s content. Ask me about services, pricing approach, technologies or how to start a project.', 'bot');
    }
    setTimeout(() => assistantInput.focus({ preventScroll: true }), 60);
  }
}
function closeAssistant(returnFocus) {
  setAssistant(false);
  if (returnFocus) assistantFab.focus({ preventScroll: true });
}
assistantFab.addEventListener('click', () => setAssistant(assistantPanel.hasAttribute('hidden')));
/* CLOSE ✕ — use pointerdown+click so it fires even if a stray overlay,
   focus loss or scroll handler would swallow the click. */
const closeAssistantNow = e => {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  closeAssistant(true);
};
assistantClose.addEventListener('click', closeAssistantNow);
assistantClose.addEventListener('pointerup', closeAssistantNow);
/* click anywhere outside the panel (but not on the FAB) also closes it */
document.addEventListener('pointerdown', e => {
  if (assistantPanel.hasAttribute('hidden')) return;
  if (e.target.closest('#assistantPanel') || e.target.closest('#assistantFab')) return;
  setAssistant(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !assistantPanel.hasAttribute('hidden')) closeAssistant(true);
});
assistantForm.addEventListener('submit', e => {
  e.preventDefault();
  const q = assistantInput.value.trim();
  if (!q) return;
  assistantInput.value = '';
  addMsg(q.replace(/</g, '&lt;'), 'user');
  assistantReply(q);
});
document.getElementById('assistantChips').addEventListener('click', e => {
  const btn = e.target.closest('[data-q]');
  if (!btn) return;
  const q = btn.getAttribute('data-q');
  addMsg(q, 'user');
  assistantReply(q);
});
/* close assistant when a link inside it navigates */
assistantBody.addEventListener('click', e => {
  if (e.target.closest('a[href^="#"]')) setAssistant(false);
});

/* ============ BACKGROUND PARTICLE NETWORK ============ */
const canvas = document.getElementById('bg-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  const colors = ['#2e7cf6', '#38bdf8', '#818cf8'];
  const mouse = { x: null, y: null, r: 140 };
  let canvasVisible = true, tabVisible = !document.hidden;

  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  resize();

  function initParticles() {
    particles = [];
    const density = w < 720 ? 30000 : 17000;
    const count = Math.min(Math.floor((w * h) / density), 110);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.7 + .6, c: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }
  initParticles();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); initParticles(); }, 200);
  });
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

  /* pause when tab hidden or hero area scrolled past — saves CPU/battery */
  document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; });
  const heroEl = document.querySelector('.hero');
  if (heroEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => { canvasVisible = e.isIntersecting; }), { threshold: 0 }).observe(heroEl);
  }

  function draw() {
    if (!prefersReduced) requestAnimationFrame(draw);
    if (!tabVisible || !canvasVisible) return;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      if (mouse.x) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.r && dist > 0) { p.x += dx / dist * 1.1; p.y += dy / dist * 1.1; }
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.c; ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j], dx = p.x - q.x, dy = p.y - q.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 14400) {
          const dist = Math.sqrt(distSq);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(56,150,248,${(1 - dist / 120) * .7})`; ctx.lineWidth = .6; ctx.stroke();
        }
      }
    }
  }
  if (prefersReduced) {
    /* draw one static frame, never animate */
    canvasVisible = true; tabVisible = true;
    const raf = requestAnimationFrame(() => { draw(); cancelAnimationFrame(raf); });
  } else {
    draw();
  }
}
