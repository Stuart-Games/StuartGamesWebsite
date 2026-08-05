(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.scroll-progress span');
  const menu = document.querySelector('[data-mobile-menu]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menuClose = document.querySelector('[data-menu-close]');
  const menuScrim = document.querySelector('[data-menu-scrim]');
  const menuBackground = [
    document.querySelector('main'),
    document.querySelector('footer'),
    document.querySelector('.mobile-play'),
    document.querySelector('.skip-link'),
    document.querySelector('.site-header .brand'),
    document.querySelector('.header-actions > .button')
  ].filter(Boolean);

  const setMenuOpen = (open, restoreFocus = true) => {
    if (!menu || !menuToggle) return;
    document.body.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    menu.setAttribute('aria-hidden', String(!open));
    menuBackground.forEach((element) => {
      if (open) {
        element.setAttribute('inert', '');
        element.setAttribute('aria-hidden', 'true');
      } else {
        element.removeAttribute('inert');
        element.removeAttribute('aria-hidden');
      }
    });
    menu.style.removeProperty('--drawer-drag');
    menu.classList.remove('is-dragging');

    if (open) {
      window.requestAnimationFrame(() => menuClose?.focus());
    } else if (restoreFocus) {
      menuToggle.focus();
    }
  };

  menuToggle?.addEventListener('click', () => {
    setMenuOpen(!document.body.classList.contains('menu-open'));
  });
  menuClose?.addEventListener('click', () => setMenuOpen(false));
  menuScrim?.addEventListener('click', () => setMenuOpen(false));
  document.querySelectorAll('[data-menu-link]').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false, false));
  });

  document.addEventListener('keydown', (event) => {
    if (!document.body.classList.contains('menu-open') || !menu) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenuOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...menu.querySelectorAll('a[href], button:not([disabled])')]
      .filter((element) => element.getBoundingClientRect().width > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && document.body.classList.contains('menu-open')) {
      setMenuOpen(false, false);
    }
  });

  let menuDragPointer = null;
  let menuDragStartX = 0;
  let menuDragStartY = 0;
  let menuDragDistance = 0;
  menu?.addEventListener('pointerdown', (event) => {
    if (event.target.closest('a, button')) return;
    menuDragPointer = event.pointerId;
    menuDragStartX = event.clientX;
    menuDragStartY = event.clientY;
    menuDragDistance = 0;
    menu.setPointerCapture?.(event.pointerId);
  });
  menu?.addEventListener('pointermove', (event) => {
    if (event.pointerId !== menuDragPointer) return;
    const deltaX = event.clientX - menuDragStartX;
    const deltaY = event.clientY - menuDragStartY;
    if (deltaX <= 0 || Math.abs(deltaY) > Math.abs(deltaX)) return;
    event.preventDefault();
    menuDragDistance = deltaX;
    menu.classList.add('is-dragging');
    menu.style.setProperty('--drawer-drag', `${Math.min(deltaX, menu.clientWidth)}px`);
  });
  const finishMenuDrag = (event) => {
    if (event.pointerId !== menuDragPointer) return;
    if (menuDragDistance > Math.min(90, menu.clientWidth * 0.22)) {
      setMenuOpen(false);
    } else {
      menu.classList.remove('is-dragging');
      menu.style.removeProperty('--drawer-drag');
    }
    if (menu.hasPointerCapture?.(event.pointerId)) menu.releasePointerCapture(event.pointerId);
    menuDragPointer = null;
    menuDragDistance = 0;
  };
  menu?.addEventListener('pointerup', finishMenuDrag);
  menu?.addEventListener('pointercancel', finishMenuDrag);

  const onScroll = () => {
    const top = window.scrollY;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    header?.classList.toggle('scrolled', top > 24);
    document.body.classList.toggle('show-mobile-play', top > Math.min(520, window.innerHeight * 0.75));
    if (progress) progress.style.width = `${available > 0 ? (top / available) * 100 : 0}%`;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const reveals = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach((item) => revealObserver.observe(item));
  }

  const heroGallery = document.querySelector('[data-hero-gallery]');
  const heroStage = document.querySelector('#screenshots');
  const heroSlides = [...document.querySelectorAll('.hero-slide')];
  const heroCaption = document.querySelector('[data-hero-caption]');
  const heroCount = document.querySelector('[data-hero-count]');
  const heroDots = document.querySelector('[data-hero-dots]');
  const heroAutoplay = document.querySelector('[data-hero-autoplay]');
  const heroAutoplayIcon = document.querySelector('[data-hero-autoplay-icon]');
  const heroCaptions = [
    'Car ferry rescue',
    'Night rescue operation',
    'Lifeboat evacuation',
    'Wreck on the seabed',
    'Dynamic destruction'
  ];
  let heroIndex = 0;
  let heroTimer = 0;
  let heroInView = true;
  let heroHoverPaused = false;
  let heroFocusPaused = false;
  let heroDragPaused = false;
  let heroUserPaused = reducedMotion;
  const heroDelay = 6000;

  if (heroDots) {
    heroSlides.forEach((_, index) => {
      const dot = document.createElement('span');
      dot.classList.toggle('is-active', index === 0);
      heroDots.append(dot);
    });
  }

  const heroIsPaused = () => heroUserPaused || heroHoverPaused || heroFocusPaused || heroDragPaused || !heroInView || document.hidden;

  const syncHeroAutoplayButton = () => {
    if (!heroAutoplay) return;
    heroAutoplay.setAttribute('aria-pressed', String(heroUserPaused));
    heroAutoplay.setAttribute('aria-label', heroUserPaused ? 'Resume automatic screenshot rotation' : 'Pause automatic screenshot rotation');
    if (heroAutoplayIcon) heroAutoplayIcon.textContent = heroUserPaused ? '▶' : 'Ⅱ';
  };

  const scheduleHeroRotation = () => {
    window.clearTimeout(heroTimer);
    heroStage?.classList.remove('is-autoplaying');
    if (heroIsPaused() || !heroSlides.length) return;
    // Force a fresh progress animation whenever the timer restarts.
    void heroStage?.offsetWidth;
    heroStage?.classList.add('is-autoplaying');
    heroTimer = window.setTimeout(() => showHeroSlide(heroIndex + 1), heroDelay);
  };

  const showHeroSlide = (nextIndex) => {
    if (!heroSlides.length) return;
    heroIndex = (nextIndex + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((slide, index) => {
      const active = index === heroIndex;
      if (active && !slide.getAttribute('src') && slide.dataset.src) slide.src = slide.dataset.src;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    heroDots?.querySelectorAll('span').forEach((dot, index) => {
      dot.classList.toggle('is-active', index === heroIndex);
    });
    if (heroCaption) heroCaption.textContent = heroCaptions[heroIndex] ?? 'Water Physics screenshot';
    if (heroCount) heroCount.textContent = `${heroIndex + 1} / ${heroSlides.length}`;
    scheduleHeroRotation();
  };

  document.querySelector('[data-hero-prev]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    showHeroSlide(heroIndex - 1);
  });
  document.querySelector('[data-hero-next]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    showHeroSlide(heroIndex + 1);
  });
  heroAutoplay?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    heroUserPaused = !heroUserPaused;
    syncHeroAutoplayButton();
    scheduleHeroRotation();
  });

  if (heroGallery) {
    let galleryPointer = null;
    let galleryStartX = 0;
    let galleryStartY = 0;
    let galleryDistance = 0;
    let suppressGalleryClick = false;

    heroGallery.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      showHeroSlide(heroIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    });
    heroGallery.addEventListener('click', () => {
      if (suppressGalleryClick) {
        suppressGalleryClick = false;
        return;
      }
      showHeroSlide(heroIndex + 1);
    });
    heroGallery.addEventListener('pointerdown', (event) => {
      heroDragPaused = true;
      scheduleHeroRotation();
      galleryPointer = event.pointerId;
      galleryStartX = event.clientX;
      galleryStartY = event.clientY;
      galleryDistance = 0;
      suppressGalleryClick = false;
      heroGallery.classList.add('is-dragging');
      heroGallery.setPointerCapture?.(event.pointerId);
    });
    heroGallery.addEventListener('pointermove', (event) => {
      if (event.pointerId !== galleryPointer) return;
      const deltaX = event.clientX - galleryStartX;
      const deltaY = event.clientY - galleryStartY;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;
      galleryDistance = deltaX;
      suppressGalleryClick = Math.abs(deltaX) > 8;
    });
    const finishGalleryDrag = (event) => {
      if (event.pointerId !== galleryPointer) return;
      heroGallery.classList.remove('is-dragging');
      if (Math.abs(galleryDistance) > 48) showHeroSlide(heroIndex + (galleryDistance < 0 ? 1 : -1));
      if (heroGallery.hasPointerCapture?.(event.pointerId)) heroGallery.releasePointerCapture(event.pointerId);
      galleryPointer = null;
      heroDragPaused = false;
      scheduleHeroRotation();
    };
    heroGallery.addEventListener('pointerup', finishGalleryDrag);
    heroGallery.addEventListener('pointercancel', finishGalleryDrag);
  }

  heroStage?.addEventListener('pointerenter', () => {
    heroHoverPaused = true;
    scheduleHeroRotation();
  });
  heroStage?.addEventListener('pointerleave', () => {
    heroHoverPaused = false;
    scheduleHeroRotation();
  });
  heroStage?.addEventListener('focusin', () => {
    heroFocusPaused = true;
    scheduleHeroRotation();
  });
  heroStage?.addEventListener('focusout', () => {
    window.setTimeout(() => {
      heroFocusPaused = Boolean(heroStage?.contains(document.activeElement));
      scheduleHeroRotation();
    }, 0);
  });

  if ('IntersectionObserver' in window && heroStage) {
    const heroObserver = new IntersectionObserver(([entry]) => {
      heroInView = entry.isIntersecting;
      scheduleHeroRotation();
    }, { threshold: 0.2 });
    heroObserver.observe(heroStage);
  }

  document.addEventListener('visibilitychange', scheduleHeroRotation);
  syncHeroAutoplayButton();
  showHeroSlide(0);

  const compact = (value) => new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value));

  const setStat = (name, value) => {
    const el = document.querySelector(`[data-stat="${name}"]`);
    if (el) el.textContent = value;
  };

  const proofBar = document.querySelector('.proof-bar');
  const updated = document.querySelector('[data-updated]');
  const playingLabel = document.querySelector('[data-playing-label]');
  let snapshotDate = null;

  const snapshotAge = (milliseconds) => {
    const minutes = Math.max(0, Math.floor(milliseconds / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  const updateSnapshotStatus = () => {
    if (!snapshotDate || Number.isNaN(snapshotDate.getTime())) return;
    const age = Math.max(0, Date.now() - snapshotDate.getTime());
    const stale = age > 2 * 60 * 60 * 1000;
    proofBar?.classList.toggle('is-stale', stale);
    if (playingLabel) playingLabel.textContent = stale ? 'last reported online' : 'online at last update';
    if (updated) {
      updated.textContent = `${stale ? 'Snapshot' : 'Updated'} ${snapshotAge(age)}`;
      updated.title = `Official Roblox data refreshed ${new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(snapshotDate)}`;
    }
  };

  fetch(`data/roblox.json?v=${Date.now()}`, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('Roblox snapshot unavailable');
      return response.json();
    })
    .then((data) => {
      setStat('playing', new Intl.NumberFormat('en').format(data.game.playing));
      setStat('visits', compact(data.game.visits));
      setStat('favorites', compact(data.game.favorites));
      setStat('members', compact(data.group.members));
      const totalVotes = data.game.upVotes + data.game.downVotes;
      if (totalVotes > 0) setStat('rating', `${Math.round((data.game.upVotes / totalVotes) * 100)}%`);
      snapshotDate = new Date(data.refreshedAt);
      updateSnapshotStatus();
      window.setInterval(updateSnapshotStatus, 60000);
    })
    .catch(() => {
      proofBar?.classList.add('is-stale');
      if (playingLabel) playingLabel.textContent = 'last reported online';
      if (updated) updated.textContent = 'Snapshot unavailable';
    });

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
