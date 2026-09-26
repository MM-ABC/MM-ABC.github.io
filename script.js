/* MM-ABC: navigation, accessible benchmark/task tabs, figures, and citation. */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const benchmarkData = {
    ebench: {
      name: 'EBench',
      context: 'Success rate (%)',
      value: '44.71%',
      description: 'We post-train MM-ABC for 100k steps with a batch size of 512. We evaluate a single checkpoint on the official held-out test split, reporting task success and stage-wise progress.',
      rows: [['MM-ABC', 44.71], ['π₀.₅', 41.41], ['InternVLA-A1.5', 34.17], ['π₀', 33.72], ['GigaBrain-0.7', 33.27], ['Cosmos3-Edge', 29.29], ['Fast-WAM', 25.64], ['X-VLA', 23.72]],
      decimals: 2
    },
    robocasa: {
      name: 'RoboCasa365',
      context: 'Success rate (%)',
      value: '61.2%',
      description: 'We post-train MM-ABC on the full target demonstration set for 120k steps with a batch size of 512. We evaluate 50 tasks in held-out kitchens across the atomic-seen, composite-seen, and composite-unseen splits, reporting success rates and the task-weighted average.',
      rows: [['MM-ABC', 61.2], ['ABot-M0.5', 54.2], ['LingBot-VA', 45.1], ['GR00T-N1.5', 43.7], ['Fast-WAM', 43.5]],
      decimals: 1
    },
    libero: {
      name: 'LIBERO',
      context: 'Success rate (%)',
      value: '99.1%',
      description: 'We post-train MM-ABC on the standard LIBERO demonstrations. We evaluate 10 tasks per suite across Spatial, Object, Goal, and Long, with 50 trials per task, reporting mean success.',
      rows: [['MM-ABC', 99.1], ['ABot-M0', 98.6], ['Cosmos-Policy', 98.5], ['LingBot-VA', 98.5], ['X-VLA', 98.1]],
      decimals: 1
    },
    'libero-plus': {
      name: 'LIBERO-Plus',
      context: 'Success rate (%)',
      value: '82.8%',
      description: 'We use the LIBERO-trained MM-ABC policy without further training. We evaluate all 10,030 episodes across seven perturbation categories under the official protocol, reporting overall success.',
      rows: [['MM-ABC', 82.8], ['Cosmos-Policy', 82.2], ['ABot-M0', 80.5], ['StarVLA', 74.1], ['X-VLA', 70.5]],
      decimals: 1
    },
    maniskill: {
      name: 'ManiSkill-HAB',
      context: 'SetTable · Skill and mean success rates (%)',
      value: '86.4%',
      description: 'We post-train one MM-ABC policy per suite for 100k steps with a batch size of 64. We evaluate seven skills in SetTable and picking and placement across nine object categories in TidyHouse and PrepareGroceries, reporting skill-level results and suite means.',
      rows: [['SetTable', 86.4], ['TidyHouse', 70.2], ['PrepareGroceries', 65.6]],
      decimals: 1,
      allOurs: true
    }
  };
  const taskData = {
    birthday: { name: 'Birthday Party Setup', rate: 75, description: 'The robot picks up a cake from the table directly ahead, carries it to the decorated table on the left, and sets it down. It then picks up a birthday candle, passes it between its two hands, and inserts it into the cake. Finally, it moves beside the table and turns on the speaker to play music.', video: 'birthday-party-setup' },
    office: { name: 'Office Folder Arrangement', rate: 90, description: 'The robot picks up a folder from the office desk in front of it, passes it between both hands, and holds it steady. It then carries the folder to the desk on its right, aligns it with the file organizer, and inserts it.', video: 'office-folder-arrangement' },
    kitchen: { name: 'Kitchen Work', rate: 90, description: 'The robot picks up a food container from the table and pours the food into a pot. It then puts the lid on the storage container, places the container into the cabinet, and closes the cabinet door.', video: 'kitchen-work' },
    industrial: { name: 'Industrial Parts Organization', rate: 75, description: 'The robot places scattered industrial parts neatly into a parts bin, carries the filled bin to the table behind it, and stacks it neatly with the other bins.', video: 'industrial-parts-organization' },
    lab: { name: 'Chemistry Lab Operation', rate: 85, description: 'The robot picks up a test tube, moves to the laboratory bench behind it, pours the reagent into a beaker that already holds another reagent, and stirs until the two are thoroughly mixed.', video: 'chemistry-lab-operation' }
  };
  const svgCache = new Map();
  let svgInstance = 0;
  let taskVideoController;

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setupNavigation() {
    const header = document.querySelector('.site-header');
    const navigation = document.getElementById('section-nav');
    const menuButton = document.getElementById('menu-toggle');
    if (!navigation) return;
    const links = Array.from(navigation.querySelectorAll('a[href^="#"]'));
    const sections = links.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);

    function closeMenu(returnFocus) {
      if (!menuButton) return;
      menuButton.setAttribute('aria-expanded', 'false');
      if (header) header.classList.remove('is-menu-open');
      navigation.classList.remove('is-open');
      if (returnFocus) menuButton.focus();
    }

    if (menuButton) {
      menuButton.addEventListener('click', function () {
        const open = menuButton.getAttribute('aria-expanded') !== 'true';
        menuButton.setAttribute('aria-expanded', String(open));
        if (header) header.classList.toggle('is-menu-open', open);
        navigation.classList.toggle('is-open', open);
      });
      links.forEach(link => link.addEventListener('click', () => closeMenu(false)));
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
          closeMenu(true);
        }
      });
      document.addEventListener('pointerdown', function (event) {
        if (menuButton.getAttribute('aria-expanded') === 'true' &&
            !navigation.contains(event.target) && !menuButton.contains(event.target)) closeMenu(false);
      });
      window.addEventListener('resize', () => closeMenu(false), { passive: true });
    }

    let pending = false;
    function update() {
      pending = false;
      const offset = (header ? header.getBoundingClientRect().height : 0) + 100;
      let active = sections.length ? sections[0].id : '';
      sections.forEach(section => {
        if (section.getBoundingClientRect().top <= offset) active = section.id;
      });
      if (sections.length && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3) {
        active = sections[sections.length - 1].id;
      }
      links.forEach(link => {
        if (link.hash === '#' + active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
    }
    function schedule() {
      if (!pending) {
        pending = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('pageshow', schedule);
    update();
  }

  function setupReveals() {
    if (!('IntersectionObserver' in window) || reducedMotion.matches) return;
    const elements = Array.from(document.querySelectorAll('[data-reveal]'));
    const pending = new Set(elements);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { rootMargin: '0px 0px -36px 0px', threshold: 0 });

    function reveal(element) {
      if (!element || !pending.delete(element)) return;
      element.classList.remove('reveal-pending');
      element.classList.add('is-visible');
      observer.unobserve(element);
      if (!pending.size) observer.disconnect();
    }
    elements.forEach(element => {
      // Above-the-fold content remains immediately available on direct visits.
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight && bounds.bottom > 0) reveal(element);
      else {
        element.classList.add('reveal-pending');
        observer.observe(element);
      }
    });
    document.addEventListener('focusin', event => {
      if (event.target instanceof Element) reveal(event.target.closest('[data-reveal]'));
    });
    function onMotionChange() {
      if (reducedMotion.matches) pending.forEach(reveal);
    }
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionChange);
    else reducedMotion.addListener(onMotionChange);
  }

  function setupTabs(listId, dataAttribute, render) {
    const list = document.getElementById(listId);
    if (!list) return;
    const tabs = Array.from(list.querySelectorAll('[data-' + dataAttribute + ']'));
    if (!tabs.length) return;

    function select(tab, moveFocus) {
      const key = tab.getAttribute('data-' + dataAttribute);
      render(key);
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel && tab.id) panel.setAttribute('aria-labelledby', tab.id);
      if (moveFocus) {
        tab.focus({ preventScroll: true });
        tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      }
    }

    tabs.forEach((tab, index) => {
      if (!tab.id) tab.id = listId + '-tab-' + index;
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        select(tabs[next], true);
      });
    });
    select(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0], false);
  }

  function renderBenchmark(key) {
    const data = benchmarkData[key];
    if (!data) return;
    setText('benchmark-name', data.name);
    setText('benchmark-context', data.context);
    setText('benchmark-value', data.value);
    setText('benchmark-description', data.description);
    const chart = document.getElementById('benchmark-chart');
    if (!chart) return;
    chart.setAttribute('aria-label', data.name + ': ' + data.context);
    const fragment = document.createDocumentFragment();
    data.rows.forEach(([name, value], index) => {
      const row = document.createElement('li');
      row.className = 'comparison-row' + (data.allOurs || index === 0 ? ' is-ours' : '');
      const label = document.createElement('span');
      label.className = 'comparison-label';
      label.textContent = name;
      const track = document.createElement('span');
      track.className = 'comparison-track';
      track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span');
      fill.className = 'comparison-fill';
      fill.style.setProperty('--bar', value + '%');
      track.appendChild(fill);
      const number = document.createElement('span');
      number.className = 'comparison-value';
      number.textContent = value.toFixed(data.decimals) + '%';
      row.append(label, track, number);
      fragment.appendChild(row);
    });
    chart.replaceChildren(fragment);
  }

  function setupTaskVideo() {
    const video = document.getElementById('task-video');
    if (!video) return;
    const source = video.querySelector('source');
    if (!source) return;
    // The demo speed is encoded into 30 fps files; play them at their native
    // rate to keep decoding and download requirements low.
    const encodedPlaybackSpeed = 3;
    video.defaultPlaybackRate = 1;
    video.playbackRate = 1;
    video.addEventListener('ratechange', () => {
      setText('task-playback-speed', encodedPlaybackSpeed * video.playbackRate + '× speed');
    });
    let visible = false;
    let wantsPlayback = !reducedMotion.matches;
    let internalPauses = 0;

    function pause() {
      if (!video.paused) {
        // The queued pause event must not overwrite the reader's playback choice.
        internalPauses += 1;
        video.pause();
      }
    }

    function updatePlayback() {
      if (!visible || document.hidden || !wantsPlayback) {
        pause();
        return;
      }
      if (video.paused) {
        const playback = video.play();
        if (playback && playback.catch) {
          // Autoplay may be blocked, or a quick tab change may cancel play().
          playback.catch(() => {});
        }
      }
    }

    video.addEventListener('play', () => {
      if (video.paused) return;
      wantsPlayback = true;
      if (!visible || document.hidden) pause();
    });
    video.addEventListener('pause', () => {
      if (internalPauses) internalPauses -= 1;
      else if (video.paused) wantsPlayback = false;
    });
    document.addEventListener('visibilitychange', updatePlayback);

    function onMotionChange() {
      if (reducedMotion.matches) {
        wantsPlayback = false;
        pause();
      }
    }
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionChange);
    else reducedMotion.addListener(onMotionChange);

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        updatePlayback();
      }, { threshold: 0 });
      observer.observe(video);
    } else {
      function updateVisibility() {
        const bounds = video.getBoundingClientRect();
        visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
        updatePlayback();
      }
      window.addEventListener('scroll', updateVisibility, { passive: true });
      window.addEventListener('resize', updateVisibility, { passive: true });
      updateVisibility();
    }

    taskVideoController = {
      select(data) {
        const nextSource = './assets/videos/' + data.video + '-' + encodedPlaybackSpeed + 'x.mp4';
        video.poster = './assets/videos/' + data.video + '.webp';
        video.setAttribute('aria-label', data.name);
        if (source.getAttribute('src') !== nextSource) {
          pause();
          source.setAttribute('src', nextSource);
          // preload="none" keeps the other demos from downloading in advance.
          video.load();
          // load() discards the previous resource's queued media events, including
          // our pause event. Do not let that cancelled event mask a later user pause.
          internalPauses = 0;
        }
        video.playbackRate = 1;
        updatePlayback();
      }
    };
  }

  function renderTask(key) {
    const data = taskData[key];
    if (!data) return;
    const index = Object.keys(taskData).indexOf(key) + 1;
    setText('task-index', String(index).padStart(2, '0') + ' / 05');
    setText('task-name', data.name);
    setText('task-description', data.description);
    setText('task-rate', data.rate + '%');
    if (taskVideoController) taskVideoController.select(data);
    const strip = document.getElementById('task-strip');
    if (strip) {
      strip.src = './assets/images/task-' + key + '.webp';
      strip.alt = data.name;
      strip.width = 2448;
      strip.height = 384;
    }
  }

  function loadSvg(source) {
    const url = new URL(source, document.baseURI);
    // Keep the original <img> as a fallback when opened directly from disk.
    if (!/^https?:$/.test(url.protocol) || url.origin !== window.location.origin) {
      return Promise.reject(new Error('Inline figures require a same-origin HTTP page.'));
    }
    if (svgCache.has(url.href)) return svgCache.get(url.href);
    const request = fetch(url.href, { credentials: 'same-origin', mode: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error('Figure request failed.');
        return response.text();
      })
      .then(markup => {
        const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
        const svg = parsed.documentElement;
        if (svg.localName !== 'svg' || parsed.querySelector('parsererror')) throw new Error('Invalid SVG figure.');
        // These are our static, local paper assets; discard executable markup.
        svg.querySelectorAll('script, foreignObject, iframe, object, embed, animate, animateTransform, set').forEach(node => node.remove());
        [svg, ...svg.querySelectorAll('*')].forEach(node => {
          Array.from(node.attributes).forEach(attribute => {
            if (/^on/i.test(attribute.name)) node.removeAttributeNode(attribute);
            else if (attribute.localName === 'href' && !/^(#|data:image\/)/i.test(attribute.value.trim())) {
              node.removeAttributeNode(attribute);
            }
          });
        });
        return svg;
      })
      .catch(error => {
        svgCache.delete(url.href);
        throw error;
      });
    svgCache.set(url.href, request);
    return request;
  }

  function createInlineSvg(template, original, description) {
    const svg = document.importNode(template, true);
    const prefix = 'mmabc-figure-' + (++svgInstance) + '-';
    const idMap = new Map();
    [svg, ...svg.querySelectorAll('[id]')].forEach(node => {
      if (node.id) {
        const nextId = prefix + node.id;
        idMap.set(node.id, nextId);
        node.id = nextId;
      }
    });
    function rewriteReferences(value) {
      return value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (match, quote, id) => {
        return idMap.has(id) ? 'url(#' + idMap.get(id) + ')' : match;
      });
    }
    [svg, ...svg.querySelectorAll('*')].forEach(node => {
      Array.from(node.attributes).forEach(attribute => {
        let value = rewriteReferences(attribute.value);
        if (attribute.localName === 'href' && value[0] === '#' && idMap.has(value.slice(1))) {
          value = '#' + idMap.get(value.slice(1));
        } else if (/^aria-(labelledby|describedby)$/.test(attribute.name)) {
          value = value.split(/\s+/).map(id => idMap.get(id) || id).join(' ');
        }
        if (attribute.value !== value) attribute.value = value;
      });
      if (node.localName === 'style') {
        let style = rewriteReferences(node.textContent);
        idMap.forEach((newId, oldId) => {
          const escaped = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          style = style.replace(new RegExp('#' + escaped + '(?![\\w-])', 'g'), '#' + newId);
        });
        node.textContent = style;
      }
    });
    if (original) {
      const classes = original.getAttribute('class');
      if (classes) classes.split(/\s+/).filter(Boolean).forEach(name => svg.classList.add(name));
      ['width', 'height', 'data-inline-svg'].forEach(attribute => {
        if (original.hasAttribute(attribute)) svg.setAttribute(attribute, original.getAttribute(attribute));
      });
    }
    svg.classList.add('paper-figure-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', description || (original && original.alt) || 'Research figure');
    svg.setAttribute('focusable', 'false');
    // Real <text> nodes remain selectable in the page.
    svg.style.userSelect = 'text';
    return svg;
  }

  function setupInlineFigures() {
    const figures = Array.from(document.querySelectorAll('img[data-inline-svg]'));
    let observer;
    function hydrate(placeholder) {
      if (observer) observer.unobserve(placeholder);
      loadSvg(placeholder.src).then(template => {
        if (placeholder.isConnected) placeholder.replaceWith(createInlineSvg(template, placeholder));
      }).catch(() => { /* Preserve the external SVG image when hydration is unavailable. */ });
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) hydrate(entry.target); });
      }, { rootMargin: '500px 0px' });
      figures.forEach(figure => observer.observe(figure));
    } else figures.forEach(hydrate);
  }

  function setupCitation() {
    const button = document.getElementById('copy-citation');
    const code = document.getElementById('bibtex');
    if (!button || !code) return;
    let resetTimer;
    const label = button.querySelector('[data-copy-label]');
    const originalLabel = label ? label.textContent : null;
    function selectCitation() {
      const selection = window.getSelection();
      if (!selection) return false;
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    }
    button.addEventListener('click', async function () {
      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(code.textContent);
          copied = true;
        } catch (_) { /* Try selection-based copying if clipboard permission fails. */ }
      }
      if (!copied && selectCitation()) {
        try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
        if (copied) window.getSelection().removeAllRanges();
      }
      setText('copy-status', copied ? 'BibTeX copied to clipboard.' : 'Citation selected. Press Command+C or Ctrl+C to copy.');
      if (label) label.textContent = copied ? 'Copied' : 'Text selected';
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () {
        if (label) label.textContent = originalLabel;
      }, 3000);
    });
  }

  function start() {
    [setupNavigation, setupReveals, setupInlineFigures, setupTaskVideo,
      () => setupTabs('benchmark-tabs', 'benchmark', renderBenchmark),
      () => setupTabs('task-tabs', 'task', renderTask),
      setupCitation
    ].forEach(setup => {
      try { setup(); } catch (error) { console.warn('An optional MM-ABC interaction could not start.', error); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
