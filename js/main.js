/**
 * ChiroElite Pro – Main JS
 * Handles: License Validation, Setup Wizard, Navigation, Scroll Animations, Modal, Dynamic Content
 */

/* =============================================
   LICENSE VALIDATION
   ============================================= */
(function(){
  const LICENSE_API = 'https://client.wellspringweb.com/.netlify/functions/lookup-license';
  const ACTIVATE_API = 'https://client.wellspringweb.com/.netlify/functions/activate-license';
  const LICENSE_KEY = 'chiroelite_html_license';
  const PRODUCT_CODE = 'chiroelite_html';

  const stored = JSON.parse(localStorage.getItem(LICENSE_KEY) || 'null');
  const overlay = document.getElementById('licenseOverlay');

  if (stored && stored.status === 'active') {
    if (overlay) overlay.style.display = 'none';
    return;
  }

  // Show license overlay, hide setup wizard
  if (overlay) overlay.style.display = 'flex';
  const setupOv = document.getElementById('setupOverlay');
  if (setupOv) setupOv.style.display = 'none';

  // Auto-format key input
  const keyInput = document.getElementById('licenseKey');
  if (keyInput) {
    keyInput.addEventListener('input', function(e) {
      const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15);
      if (raw.startsWith('WSW')) {
        const body = raw.slice(3);
        const chunks = body.match(/.{1,4}/g) || [];
        e.target.value = 'WSW' + (chunks.length ? '-' + chunks.join('-') : '');
      } else {
        e.target.value = raw;
      }
    });
    keyInput.addEventListener('paste', function(e) {
      setTimeout(() => {
        const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15);
        if (raw.startsWith('WSW')) {
          const body = raw.slice(3);
          const chunks = body.match(/.{1,4}/g) || [];
          e.target.value = 'WSW' + (chunks.length ? '-' + chunks.join('-') : '');
        }
      }, 0);
    });
  }

  const btn = document.getElementById('licenseActivateBtn');
  const errEl = document.getElementById('licenseError');

  if (btn) btn.addEventListener('click', async function() {
    const email = (document.getElementById('licenseEmail').value || '').trim().toLowerCase();
    const key = (document.getElementById('licenseKey').value || '').trim().toUpperCase();

    if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

    if (!email || !key) {
      if (errEl) { errEl.textContent = 'Please enter your email and license key.'; errEl.style.display = 'block'; }
      return;
    }
    if (!/^WSW-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(key)) {
      if (errEl) { errEl.textContent = 'Invalid key format. Expected: WSW-XXXX-XXXX-XXXX'; errEl.style.display = 'block'; }
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Activating...';

    try {
      // Activate (domain lock)
      const domain = window.location.hostname.replace(/^www\./, '') || 'localhost';
      if (domain && domain !== 'localhost') {
        await fetch(ACTIVATE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, key, domain }),
        });
      }

      // Verify
      const res = await fetch(LICENSE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, key }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        if (errEl) { errEl.textContent = data.error || 'Invalid license.'; errEl.style.display = 'block'; }
        btn.disabled = false; btn.textContent = 'Activate Template';
        return;
      }
      if (data.status !== 'active') {
        if (errEl) { errEl.textContent = 'License is not active.'; errEl.style.display = 'block'; }
        btn.disabled = false; btn.textContent = 'Activate Template';
        return;
      }

      // Success
      localStorage.setItem(LICENSE_KEY, JSON.stringify({ status: 'active', key, email, product: data.product }));
      if (overlay) { overlay.style.opacity = '0'; setTimeout(() => overlay.style.display = 'none', 400); }

      // Show setup wizard if first run
      const siteData = JSON.parse(localStorage.getItem('chiroelite_site_data') || 'null');
      if (!siteData) {
        const sw = document.getElementById('setupOverlay');
        if (sw) sw.style.display = 'flex';
      }

    } catch(e) {
      if (errEl) { errEl.textContent = 'Connection error. Check your internet and try again.'; errEl.style.display = 'block'; }
      btn.disabled = false; btn.textContent = 'Activate Template';
    }
  });
})();

(function(){
  'use strict';

  /* =============================================
     SITE DATA — Default values (overridden by setup)
     ============================================= */
  const DEFAULTS = {
    practiceName:    'SpineCare Chiropractic',
    doctorName:      'Dr. Sarah Mitchell',
    tagline:         'Live Without Limits',
    heroHeadline:    'Restore Your Health,<br><strong>Reclaim Your Life</strong>',
    heroSub:         'Expert chiropractic care tailored to your body. From acute pain relief to long-term wellness, we\'re your partner in living pain-free.',
    phone:           '(555) 123-4567',
    email:           'info@spinecare.com',
    address:         '123 Wellness Blvd, Suite 200',
    city:            'Springfield, IL 62701',
    hours:           'Mon–Fri 8am–6pm  |  Sat 9am–2pm',
    yearsExp:        '15+',
    patientsHelped:  '8,000+',
    satisfaction:    '98%',
    brandColor:      '#C8963E',
    logoInitials:    'SC',
    appointmentUrl:  '#appointment',
  };

  const KEY = 'chiroelite_site_data';

  function getData()    { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch(e){ return null; } }
  function saveData(d)  { localStorage.setItem(KEY, JSON.stringify(d)); }
  function clearData()  { localStorage.removeItem(KEY); }

  /* =============================================
     SETUP WIZARD
     ============================================= */
  const setupOverlay = document.getElementById('setupOverlay');
  const siteData     = getData();

  if (!siteData) {
    showSetup();
  } else {
    applyData(siteData);
    hideSetup();
  }

  function showSetup(){
    if(!setupOverlay) return;
    setupOverlay.style.display = 'flex';
    initWizard();
  }

  function hideSetup(){
    if(!setupOverlay) return;
    setupOverlay.style.display = 'none';
  }

  function initWizard(){
    let currentStep = 1;
    const totalSteps = 4;

    const steps      = document.querySelectorAll('.setup-step');
    const indicators = document.querySelectorAll('.setup-step-indicator');
    const nextBtn    = document.getElementById('setupNext');
    const backBtn    = document.getElementById('setupBack');
    const stepCount  = document.getElementById('stepCount');

    function goTo(n){
      steps.forEach(s => s.classList.remove('active'));
      indicators.forEach((ind, i) => {
        ind.classList.remove('active','done');
        if(i < n-1) ind.classList.add('done');
        if(i === n-1) ind.classList.add('active');
      });
      const target = document.querySelector(`.setup-step[data-step="${n}"]`);
      if(target) target.classList.add('active');
      backBtn.style.visibility = n === 1 ? 'hidden' : 'visible';
      nextBtn.textContent = n === totalSteps ? 'Launch My Site →' : 'Next →';
      stepCount.textContent = `Step ${n} of ${totalSteps}`;
      currentStep = n;
    }

    nextBtn.addEventListener('click', function(){
      if(currentStep < totalSteps){
        goTo(currentStep + 1);
      } else {
        finishSetup();
      }
    });

    backBtn.addEventListener('click', function(){
      if(currentStep > 1) goTo(currentStep - 1);
    });

    // Color swatches
    document.querySelectorAll('.swatch').forEach(sw => {
      sw.addEventListener('click', function(){
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
        this.classList.add('selected');
        const colorInput = document.getElementById('brandColor');
        if(colorInput) colorInput.value = this.dataset.color;
        document.documentElement.style.setProperty('--gold', this.dataset.color);
      });
    });

    const customColor = document.getElementById('customColorPicker');
    if(customColor){
      customColor.addEventListener('input', function(){
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
        document.documentElement.style.setProperty('--gold', this.value);
        const colorInput = document.getElementById('brandColor');
        if(colorInput) colorInput.value = this.value;
      });
    }

    goTo(1);
  }

  function finishSetup(){
    const data = {
      practiceName:    v('setupPracticeName')    || DEFAULTS.practiceName,
      doctorName:      v('setupDoctorName')      || DEFAULTS.doctorName,
      tagline:         v('setupTagline')         || DEFAULTS.tagline,
      phone:           v('setupPhone')           || DEFAULTS.phone,
      email:           v('setupEmail')           || DEFAULTS.email,
      address:         v('setupAddress')         || DEFAULTS.address,
      city:            v('setupCity')            || DEFAULTS.city,
      hours:           v('setupHours')           || DEFAULTS.hours,
      yearsExp:        v('setupYearsExp')        || DEFAULTS.yearsExp,
      patientsHelped:  v('setupPatients')        || DEFAULTS.patientsHelped,
      brandColor:      v('brandColor')           || DEFAULTS.brandColor,
      logoInitials:    v('setupInitials')        || DEFAULTS.logoInitials,
    };
    data.heroHeadline  = `Restore Your Health,<br><strong>${data.tagline}</strong>`;
    data.heroSub       = `Expert chiropractic care from ${data.practiceName}. From acute pain relief to long-term wellness — your partner in living pain-free.`;
    data.satisfaction  = '98%';

    saveData(data);
    applyData(data);

    const overlay = document.getElementById('setupOverlay');
    if(overlay){
      overlay.classList.add('removing');
      setTimeout(() => { overlay.style.display = 'none'; }, 800);
    }
  }

  function v(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; }

  /* =============================================
     APPLY DATA TO DOM
     ============================================= */
  function applyData(d){
    const data = Object.assign({}, DEFAULTS, d);

    // CSS variable
    document.documentElement.style.setProperty('--gold', data.brandColor || DEFAULTS.brandColor);
    document.documentElement.style.setProperty('--gold-light', lightenHex(data.brandColor || DEFAULTS.brandColor, 20));
    document.documentElement.style.setProperty('--gold-pale', lightenHex(data.brandColor || DEFAULTS.brandColor, 60));
    document.documentElement.style.setProperty('--gold-dark', darkenHex(data.brandColor || DEFAULTS.brandColor, 20));

    // Text replacements via data attributes
    fill('data-field="practiceName"',    data.practiceName);
    fill('data-field="doctorName"',      data.doctorName);
    fill('data-field="phone"',           data.phone);
    fill('data-field="email"',           data.email);
    fill('data-field="address"',         data.address);
    fill('data-field="city"',            data.city);
    fill('data-field="hours"',           data.hours);
    fill('data-field="yearsExp"',        data.yearsExp);
    fill('data-field="patientsHelped"',  data.patientsHelped);
    fill('data-field="satisfaction"',    data.satisfaction);
    fill('data-field="logoInitials"',    data.logoInitials);
    fill('data-field="tagline"',         data.tagline);

    // Hero headline (HTML)
    document.querySelectorAll('[data-html="heroHeadline"]').forEach(el => { el.innerHTML = data.heroHeadline; });
    document.querySelectorAll('[data-html="heroSub"]').forEach(el => { el.innerHTML = data.heroSub; });

    // Page title
    document.title = data.practiceName + ' — Chiropractic Care';

    // Phone links
    document.querySelectorAll('a[data-field="phone"]').forEach(el => {
      el.textContent = data.phone;
      el.href = 'tel:' + data.phone.replace(/\D/g,'');
    });

    // Logo image
    const navLogo = document.querySelector('.site-logo img');
    const logoIcon = document.querySelector('.logo-icon');
    const logoText = document.querySelector('.logo-text');
    if (data.logoUrl) {
      if (navLogo) { navLogo.src = data.logoUrl; navLogo.style.display = 'inline-block'; }
      else {
        const logoLink = document.querySelector('.site-logo');
        if (logoLink) {
          const img = document.createElement('img');
          img.src = data.logoUrl; img.alt = data.practiceName;
          img.style.cssText = 'max-height:48px;max-width:200px;width:auto;object-fit:contain;';
          logoLink.insertBefore(img, logoLink.firstChild);
        }
      }
      if (logoIcon) logoIcon.style.display = 'none';
      if (logoText) logoText.style.display = data.showNameWithLogo ? '' : 'none';
    }

    // Hero background image
    if (data.heroImageUrl) {
      const hero = document.querySelector('.hero');
      if (hero) {
        hero.style.backgroundImage = `linear-gradient(rgba(24,20,16,0.75), rgba(24,20,16,0.85)), url(${data.heroImageUrl})`;
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';
      }
    }

    // SEO
    if (data.pageTitle) document.title = data.pageTitle;
    if (data.metaDescription) {
      let meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', data.metaDescription);
    }

    // Settings button visible
    const settingsBtn = document.getElementById('resetSetup');
    if(settingsBtn) settingsBtn.style.display = 'flex';
  }

  function fill(selector, value){
    document.querySelectorAll(`[${selector}]`).forEach(el => { el.textContent = value; });
  }

  // Color utilities
  function lightenHex(hex, pct){
    return adjustHex(hex, pct);
  }
  function darkenHex(hex, pct){
    return adjustHex(hex, -pct);
  }
  function adjustHex(hex, pct){
    try {
      hex = hex.replace('#','');
      if(hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
      let r = parseInt(hex.slice(0,2),16);
      let g = parseInt(hex.slice(2,4),16);
      let b = parseInt(hex.slice(4,6),16);
      r = Math.min(255, Math.max(0, r + Math.round(255*pct/100)));
      g = Math.min(255, Math.max(0, g + Math.round(255*pct/100)));
      b = Math.min(255, Math.max(0, b + Math.round(255*pct/100)));
      return '#'+ [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
    } catch(e){ return hex; }
  }

  /* =============================================
     RESET SETUP (settings gear)
     ============================================= */
  const resetBtn = document.getElementById('resetSetup');
  if(resetBtn){
    resetBtn.addEventListener('click', function(){
      if(confirm('Re-run the setup wizard? Your current settings will be overwritten.')){
        clearData();
        location.reload();
      }
    });
  }

  /* =============================================
     ADMIN PANEL
     ============================================= */
  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.admin-tab').forEach(t => { t.classList.remove('active'); t.style.background = 'transparent'; t.style.color = '#aaa'; });
      this.classList.add('active'); this.style.background = 'var(--gold)'; this.style.color = '#fff';
      document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
      const target = document.querySelector(`.admin-panel[data-panel="${this.dataset.tab}"]`);
      if (target) target.style.display = 'block';
    });
  });

  // Populate admin fields from current data
  function populateAdmin() {
    const d = getData() || DEFAULTS;
    const fields = ['practiceName','doctorName','tagline','phone','email','address','city','hours','yearsExp','patientsHelped','logoInitials','brandColor','heroHeadline','heroSub','appointmentUrl','logoUrl','heroImageUrl','pageTitle','metaDescription'];
    fields.forEach(key => {
      const el = document.getElementById('admin-' + key);
      if (el) el.value = d[key] || '';
    });
    const nameToggle = document.getElementById('admin-showNameWithLogo');
    if (nameToggle) nameToggle.checked = !!d.showNameWithLogo;
  }

  // Open admin — replace the gear reset button behavior
  const adminBtn = document.getElementById('resetSetup');
  if (adminBtn) {
    // Remove old click handler by replacing element
    const newBtn = adminBtn.cloneNode(true);
    adminBtn.parentNode.replaceChild(newBtn, adminBtn);
    newBtn.addEventListener('click', function(e) {
      e.preventDefault();
      populateAdmin();
      document.getElementById('adminOverlay').style.display = 'block';
    });
  }

  // Save admin
  const saveBtn = document.getElementById('adminSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      const current = getData() || {};
      const updated = {
        ...DEFAULTS,
        ...current,
        practiceName:    document.getElementById('admin-practiceName').value.trim()    || current.practiceName    || DEFAULTS.practiceName,
        doctorName:      document.getElementById('admin-doctorName').value.trim()      || current.doctorName      || DEFAULTS.doctorName,
        tagline:         document.getElementById('admin-tagline').value.trim()         || current.tagline         || DEFAULTS.tagline,
        phone:           document.getElementById('admin-phone').value.trim()           || current.phone           || DEFAULTS.phone,
        email:           document.getElementById('admin-email').value.trim()           || current.email           || DEFAULTS.email,
        address:         document.getElementById('admin-address').value.trim()         || current.address         || DEFAULTS.address,
        city:            document.getElementById('admin-city').value.trim()            || current.city            || DEFAULTS.city,
        hours:           document.getElementById('admin-hours').value.trim()           || current.hours           || DEFAULTS.hours,
        yearsExp:        document.getElementById('admin-yearsExp').value.trim()        || current.yearsExp        || DEFAULTS.yearsExp,
        patientsHelped:  document.getElementById('admin-patientsHelped').value.trim()  || current.patientsHelped  || DEFAULTS.patientsHelped,
        logoInitials:    document.getElementById('admin-logoInitials').value.trim()    || current.logoInitials    || DEFAULTS.logoInitials,
        brandColor:      document.getElementById('admin-brandColor').value             || current.brandColor      || DEFAULTS.brandColor,
        heroHeadline:    document.getElementById('admin-heroHeadline').value.trim()    || current.heroHeadline    || DEFAULTS.heroHeadline,
        heroSub:         document.getElementById('admin-heroSub').value.trim()         || current.heroSub         || DEFAULTS.heroSub,
        appointmentUrl:  document.getElementById('admin-appointmentUrl').value.trim()  || current.appointmentUrl  || DEFAULTS.appointmentUrl,
        logoUrl:         document.getElementById('admin-logoUrl').value.trim()         || '',
        heroImageUrl:    document.getElementById('admin-heroImageUrl').value.trim()    || '',
        showNameWithLogo: document.getElementById('admin-showNameWithLogo').checked,
        pageTitle:       document.getElementById('admin-pageTitle').value.trim()       || '',
        metaDescription: document.getElementById('admin-metaDescription').value.trim() || '',
      };

      saveData(updated);
      applyData(updated);

      this.textContent = '\u2713 Saved!';
      this.style.background = '#2d6b42';
      setTimeout(() => {
        this.textContent = 'Save & Apply';
        this.style.background = '';
      }, 2000);
    });
  }

  /* =============================================
     NAVIGATION — scroll behavior + mobile
     ============================================= */
  const header      = document.querySelector('.site-header');
  const navToggle   = document.querySelector('.nav-toggle');
  const mobileMenu  = document.querySelector('.mobile-menu');

  if(header){
    const heroEl = document.querySelector('.hero');
    if(!heroEl && header) header.classList.add('page-header');

    window.addEventListener('scroll', function(){
      if(window.scrollY > 60){
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive:true });
  }

  if(navToggle && mobileMenu){
    navToggle.addEventListener('click', function(){
      mobileMenu.classList.toggle('open');
      const spans = navToggle.querySelectorAll('span');
      if(mobileMenu.classList.contains('open')){
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity   = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity   = '';
        spans[2].style.transform = '';
      }
    });
    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        navToggle.querySelectorAll('span').forEach(s => { s.style.transform=''; s.style.opacity=''; });
      });
    });
  }

  // Active nav link
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if(href === currentPage || (currentPage === '' && href === 'index.html')){
      a.classList.add('active');
    }
  });

  /* =============================================
     APPOINTMENT MODAL
     ============================================= */
  const modal        = document.getElementById('appointmentModal');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose   = document.querySelectorAll('[data-close-modal]');
  const modalTriggers = document.querySelectorAll('[data-open-modal="appointment"]');

  function openModal(){
    if(!modalOverlay) return;
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    if(!modalOverlay) return;
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  modalTriggers.forEach(btn => btn.addEventListener('click', openModal));
  modalClose.forEach(btn => btn.addEventListener('click', closeModal));
  if(modalOverlay){
    modalOverlay.addEventListener('click', function(e){
      if(e.target === modalOverlay) closeModal();
    });
  }

  /* =============================================
     SCROLL REVEAL ANIMATIONS
     ============================================= */
  if('IntersectionObserver' in window){
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else {
    // Fallback: show all
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

  /* =============================================
     APPOINTMENT FORM SUBMISSION (demo)
     ============================================= */
  const apptForm = document.getElementById('appointmentForm');
  if(apptForm){
    apptForm.addEventListener('submit', function(e){
      e.preventDefault();
      const btn = apptForm.querySelector('[type=submit]');
      btn.textContent = 'Sending...';
      btn.disabled = true;
      setTimeout(function(){
        apptForm.innerHTML = `
          <div style="text-align:center;padding:40px 0;">
            <div style="font-size:3rem;margin-bottom:16px;">✓</div>
            <h3 style="color:var(--gold);margin-bottom:8px;">Request Received!</h3>
            <p style="color:var(--text-muted);">We'll contact you within 1 business day to confirm your appointment.</p>
          </div>`;
        setTimeout(closeModal, 3000);
      }, 1200);
    });
  }

  /* =============================================
     CONTACT FORM SUBMISSION (demo)
     ============================================= */
  const contactForm = document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      const btn = contactForm.querySelector('[type=submit]');
      const orig = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      setTimeout(function(){
        btn.textContent = '✓ Message Sent!';
        btn.style.background = '#2E7D32';
        setTimeout(function(){
          contactForm.reset();
          btn.textContent = orig;
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }, 1200);
    });
  }

  /* =============================================
     SMOOTH ANCHOR SCROLL
     ============================================= */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e){
      const id = this.getAttribute('href').slice(1);
      if(!id) return;
      const target = document.getElementById(id);
      if(target){
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 82;
        window.scrollTo({ top: target.offsetTop - offset, behavior:'smooth' });
      }
    });
  });

  /* =============================================
     INIT: Pre-fill setup form if data exists
     ============================================= */
  if(getData()){
    const d = getData();
    const prefills = {
      'setupPracticeName': d.practiceName,
      'setupDoctorName':   d.doctorName,
      'setupTagline':      d.tagline,
      'setupPhone':        d.phone,
      'setupEmail':        d.email,
      'setupAddress':      d.address,
      'setupCity':         d.city,
      'setupHours':        d.hours,
    };
    Object.entries(prefills).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if(el && val) el.value = val;
    });
  }

})();
