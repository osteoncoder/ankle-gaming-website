/* ============ PRELOADER ============ */
function hidePreloader(){
  const fill=document.getElementById('preBarFill');
  const pre=document.getElementById('preloader');
  if(fill) fill.style.width='100%';
  if(pre) pre.classList.add('done');
}
window.addEventListener('load',()=>setTimeout(hidePreloader,700));
/* fail-safe: never trap the visitor behind the overlay on a slow phone */
setTimeout(hidePreloader,3500);

/* ============ INPUT CAPABILITY ============ */
const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

/* ============ CUSTOM CURSOR ============ */
const cursor=document.getElementById('cursor'), dot=document.getElementById('cursorDot');
let mx=0,my=0,cx=0,cy=0;
window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';});
function animCursor(){cx+=(mx-cx)*0.15;cy+=(my-cy)*0.15;cursor.style.left=cx+'px';cursor.style.top=cy+'px';requestAnimationFrame(animCursor);}
animCursor();
if(finePointer){
  document.querySelectorAll('a,button,.tilt-card,input,textarea').forEach(el=>{
    el.addEventListener('mouseenter',()=>cursor.classList.add('hover'));
    el.addEventListener('mouseleave',()=>cursor.classList.remove('hover'));
  });
}

/* ============ MAGNETIC BUTTONS ============ */
if(finePointer){
  document.querySelectorAll('.magnetic').forEach(btn=>{
    btn.addEventListener('mousemove',e=>{
      const r=btn.getBoundingClientRect();
      const x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2;
      btn.style.transform=`translate(${x*0.25}px,${y*0.4}px)`;
    });
    btn.addEventListener('mouseleave',()=>btn.style.transform='translate(0,0)');
  });
}

/* ============ TILT CARDS ============ */
if(finePointer){
  document.querySelectorAll('.tilt-card').forEach(card=>{
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect();
      const x=e.clientX-r.left, y=e.clientY-r.top;
      const rotX=((y/r.height)-0.5)*-14, rotY=((x/r.width)-0.5)*14;
      card.style.transform=`perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px)`;
      card.style.setProperty('--mx',x+'px'); card.style.setProperty('--my',y+'px');
    });
    card.addEventListener('mouseleave',()=>card.style.transform='perspective(700px) rotateX(0) rotateY(0) translateY(0)');
  });
}

/* ============ NAVBAR SCROLL ============ */
const header=document.getElementById('header');
const progress=document.getElementById('progress');
const scrollTopBtn=document.getElementById('scrollTop');
window.addEventListener('scroll',()=>{
  header.classList.toggle('scrolled',window.scrollY>40);
  const h=document.documentElement;
  const pct=(h.scrollTop)/(h.scrollHeight-h.clientHeight)*100;
  progress.style.width=pct+'%';
  scrollTopBtn.classList.toggle('show',window.scrollY>500);
});
scrollTopBtn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

/* ============ MOBILE MENU ============ */
const burger=document.getElementById('burger'),
      navLinks=document.getElementById('navLinks'),
      navBackdrop=document.getElementById('navBackdrop'),
      navClose=document.getElementById('navClose');

function setMenu(open){
  navLinks.classList.toggle('open',open);
  burger.classList.toggle('open',open);
  if(navBackdrop) navBackdrop.classList.toggle('show',open);
  /* lock the page behind the drawer so nothing drifts */
  document.body.classList.toggle('menu-open',open);
  burger.setAttribute('aria-expanded',open?'true':'false');
  burger.setAttribute('aria-label',open?'Close menu':'Open menu');
  if(open && navClose) navClose.focus({preventScroll:true});
}
function closeMenu(){ setMenu(false); }

burger.addEventListener('click',()=>setMenu(!navLinks.classList.contains('open')));
if(navClose) navClose.addEventListener('click',closeMenu);
if(navBackdrop) navBackdrop.addEventListener('click',closeMenu);
document.querySelectorAll('.navlink').forEach(l=>l.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeMenu(); });
window.addEventListener('resize',()=>{ if(window.innerWidth>900) closeMenu(); });
/* never leave the page scroll-locked after a bfcache restore / orientation flip */
window.addEventListener('pageshow',closeMenu);
window.addEventListener('orientationchange',()=>setTimeout(closeMenu,150));

/* ============ SCROLL REVEAL ============ */
const revealEls=document.querySelectorAll('.reveal');
if(!('IntersectionObserver' in window)){
  revealEls.forEach(el=>el.classList.add('in'));
}
const io=new IntersectionObserver((entries)=>{
  entries.forEach((e,i)=>{ if(e.isIntersecting){ setTimeout(()=>e.target.classList.add('in'),i*60); io.unobserve(e.target);} });
},{threshold:.15});
revealEls.forEach(el=>io.observe(el));

/* ============ COUNTERS ============ */
const counters=document.querySelectorAll('.counter');
const counterIO=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      const el=entry.target, target=+el.dataset.target; let cur=0;
      const step=Math.max(target/60,1);
      const t=setInterval(()=>{ cur+=step; if(cur>=target){cur=target;clearInterval(t);} el.textContent=Math.floor(cur); },25);
      counterIO.unobserve(el);
    }
  });
},{threshold:.5});
counters.forEach(c=>counterIO.observe(c));

/* ============ TESTIMONIAL SLIDER ============ */
const slides=document.querySelectorAll('.testi-slide');
const dots=document.querySelectorAll('.testi-dots button');
let active=0;
function showSlide(i){
  slides.forEach(s=>s.classList.remove('active'));
  dots.forEach(d=>d.classList.remove('active'));
  slides[i].classList.add('active'); dots[i].classList.add('active'); active=i;
}
dots.forEach(d=>d.addEventListener('click',()=>showSlide(+d.dataset.i)));
setInterval(()=>showSlide((active+1)%slides.length),5000);

/* ============ CONTACT FORM ============ */
const contactForm=document.getElementById('contactForm');
if(contactForm){
  contactForm.addEventListener('submit',function(e){
    e.preventDefault();
    const msg=document.getElementById('formMsg');
    if(msg){
      msg.style.display='block';
      /* reveal the message without scrolling the tapped button away */
      const y=window.scrollY;
      msg.scrollIntoView({block:'nearest',behavior:'smooth'});
      window.scrollTo({top:y,behavior:'instant'});
    }
    this.reset();
  });
}

/* ============ PARTICLE NETWORK CANVAS ============ */
const canvas=document.getElementById('bg-canvas');
const ctx=canvas.getContext('2d');
let w,h,particles=[];
const colors=['#00ff9d','#8b5cf6','#3b82f6'];
function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight;}
resize(); window.addEventListener('resize',resize);
const mouse={x:null,y:null,r:140};
window.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;});

function initParticles(){
  particles=[];
  const density = w<720 ? 30000 : 16000;
  const count=Math.floor((w*h)/density);
  for(let i=0;i<count;i++){
    particles.push({
      x:Math.random()*w, y:Math.random()*h,
      vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4,
      r:Math.random()*1.8+0.6, c:colors[Math.floor(Math.random()*colors.length)]
    });
  }
}
initParticles(); window.addEventListener('resize',initParticles);

function draw(){
  ctx.clearRect(0,0,w,h);
  for(let i=0;i<particles.length;i++){
    const p=particles[i];
    p.x+=p.vx; p.y+=p.vy;
    if(p.x<0||p.x>w)p.vx*=-1;
    if(p.y<0||p.y>h)p.vy*=-1;
    if(mouse.x){
      const dx=p.x-mouse.x, dy=p.y-mouse.y, dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<mouse.r){ p.x+=dx/dist*1.2; p.y+=dy/dist*1.2; }
    }
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=p.c; ctx.fill();
    for(let j=i+1;j<particles.length;j++){
      const q=particles[j], dx=p.x-q.x, dy=p.y-q.y, dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<120){
        ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
        ctx.strokeStyle=`rgba(0,255,157,${1-dist/120})`; ctx.lineWidth=0.6; ctx.stroke();
      }
    }
  }
  requestAnimationFrame(draw);
}
draw();

/* ============ GSAP HERO ENTRANCE ============ */
if(window.gsap){
  gsap.from('.hero h1',{y:40,opacity:0,duration:1,delay:.3,ease:'power3.out'});
  gsap.from('.hero p',{y:30,opacity:0,duration:1,delay:.5,ease:'power3.out'});
  gsap.from('.hero-cta',{y:30,opacity:0,duration:1,delay:.7,ease:'power3.out'});
}