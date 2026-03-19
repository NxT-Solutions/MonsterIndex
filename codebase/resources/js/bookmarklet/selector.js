(function () {
  const scriptTag = document.currentScript;
  if (!(scriptTag instanceof HTMLScriptElement)) {
    return;
  }

  const scriptUrl = new URL(scriptTag.src);
  const token = scriptUrl.searchParams.get('token');
  const sourceUrl = scriptUrl.searchParams.get('source_url') || window.location.href;
  const returnUrl = scriptUrl.searchParams.get('return_url') || '/admin/monsters';
  const language =
    typeof __monsterindexLocale === 'string' && __monsterindexLocale !== ''
      ? __monsterindexLocale
      : scriptUrl.searchParams.get('lang') || 'en';
  const messages =
    typeof __monsterindexLocaleMessages === 'object' && __monsterindexLocaleMessages !== null
      ? __monsterindexLocaleMessages
      : {};
  const interpolate = (template, values = {}) =>
    String(template || '').replace(/\{(\w+)\}/g, (_, key) => {
      const value = values[key];
      return value === null || value === undefined ? '' : String(value);
    });
  const t = (key, values) => interpolate(messages[key] || key, values);

  const showOverlayDialog = ({
    title,
    description,
    confirmLabel,
    cancelLabel,
    destructive = false,
  }) =>
    new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.setAttribute('data-monsterindex-ignore', 'true');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '2147483647';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '20px';
      overlay.style.background = 'rgba(2, 6, 5, 0.72)';
      overlay.style.backdropFilter = 'blur(12px)';

      const dialog = document.createElement('div');
      dialog.setAttribute('data-monsterindex-ignore', 'true');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-label', title);
      dialog.style.width = 'min(460px, calc(100vw - 32px))';
      dialog.style.borderRadius = '22px';
      dialog.style.border = '1px solid rgba(196, 255, 45, 0.2)';
      dialog.style.background =
        'linear-gradient(180deg, rgba(12, 19, 22, 0.98), rgba(6, 13, 14, 0.98))';
      dialog.style.boxShadow =
        '0 30px 80px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
      dialog.style.color = '#f5fee7';
      dialog.style.fontFamily = 'Rajdhani, ui-sans-serif, system-ui, -apple-system, sans-serif';
      dialog.innerHTML = `
        <div style="padding:20px 20px 16px;border-bottom:1px solid rgba(255,255,255,0.08)">
          <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(196,255,45,0.78)">${t('MonsterIndex')}</div>
          <div style="margin-top:8px;font-size:24px;line-height:1;font-weight:700">${title}</div>
          <div style="margin-top:10px;font-size:15px;line-height:1.45;color:rgba(232,244,235,0.8)">${
            description || ''
          }</div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;padding:18px 20px 20px">
          ${
            cancelLabel
              ? `<button type="button" data-monsterindex-action="cancel" style="border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.04);color:#f5fee7;border-radius:999px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer">${cancelLabel}</button>`
              : ''
          }
          <button type="button" data-monsterindex-action="confirm" style="border:1px solid ${
            destructive ? 'rgba(255, 123, 123, 0.3)' : 'rgba(196,255,45,0.16)'
          };background:${
            destructive
              ? 'linear-gradient(135deg, rgba(255, 99, 99, 0.95), rgba(224, 58, 95, 0.95))'
              : 'linear-gradient(135deg, rgba(196,255,45,0.98), rgba(64,230,181,0.98))'
          };color:${destructive ? '#fff8f8' : '#071207'};border-radius:999px;padding:10px 16px;font-size:14px;font-weight:700;cursor:pointer">${
            confirmLabel
          }</button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const confirmButton = dialog.querySelector('[data-monsterindex-action="confirm"]');
      const cancelButton = dialog.querySelector('[data-monsterindex-action="cancel"]');
      const activeElement = document.activeElement;

      const cleanup = (value) => {
        document.removeEventListener('keydown', onKeyDown, true);
        overlay.remove();
        if (activeElement instanceof HTMLElement) {
          activeElement.focus();
        }
        resolve(value);
      };

      const onKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cleanup(false);
        }
      };

      document.addEventListener('keydown', onKeyDown, true);

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay && cancelButton instanceof HTMLButtonElement) {
          cleanup(false);
        }
      });

      if (confirmButton instanceof HTMLButtonElement) {
        confirmButton.addEventListener('click', () => cleanup(true));
        window.setTimeout(() => confirmButton.focus(), 10);
      }

      if (cancelButton instanceof HTMLButtonElement) {
        cancelButton.addEventListener('click', () => cleanup(false));
      }
    });

  if (!token) {
    void showOverlayDialog({
      title: t('Selector session missing'),
      description: t('The MonsterIndex selector token is missing. Regenerate the selector session and open it again from the app.'),
      confirmLabel: t('Close'),
    });
    return;
  }

  const captureEndpoint = new URL('/api/bookmarklet/capture', scriptUrl.origin);

  const state = {
    mode: 'select-price-main',
    priceParts: [],
    shippingParts: [],
    quantityParts: [],
    shippingManualValue: '',
    quantityManualValue: '',
    shippingSkipped: false,
    freeClick: false,
    panelCollapsed: false,
    restoreMode: 'select-price-main',
    submitting: false,
    done: false,
  };

  window.__monsterindex_selector_unsaved = true;

  const panel = document.createElement('aside');
  panel.setAttribute('data-monsterindex-ignore', 'true');
  panel.style.position = 'fixed';
  panel.style.right = '16px';
  panel.style.bottom = '16px';
  panel.style.zIndex = '2147483647';
  panel.style.width = 'min(390px, calc(100vw - 24px))';
  panel.style.maxHeight = 'calc(100vh - 120px)';
  panel.style.overflowY = 'auto';
  panel.style.borderRadius = '14px';
  panel.style.border = '1px solid #cbd5e1';
  panel.style.background = '#ffffff';
  panel.style.boxShadow = '0 22px 48px rgba(2,6,23,.35)';
  panel.style.fontFamily = 'ui-sans-serif,system-ui,-apple-system,sans-serif';
  panel.style.color = '#0f172a';

  panel.innerHTML = `
    <div style="padding:14px 14px 10px;border-bottom:1px solid #e2e8f0;background:linear-gradient(180deg,#fff,#f8fafc)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div style="min-width:0">
          <div style="font-size:14px;font-weight:700">${t('Guided Price Selector')}</div>
          <div style="font-size:12px;color:#475569;margin-top:4px">${t('Click values on the page. If a value is split (example 32 and 99), use "Add Part".')}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;flex-shrink:0">
          <button id="mi-free-click-toggle" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:600;cursor:pointer">${t('Free Click')}</button>
          <button id="mi-collapse-panel" type="button" aria-label="${t('Minimize selector panel')}" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:600;cursor:pointer">${t('Minimize')}</button>
        </div>
      </div>
    </div>
    <div style="padding:12px 14px;display:grid;gap:10px">
      <div id="mi-instruction" style="font-size:13px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px"></div>
      <div style="display:grid;gap:8px">
        <div style="font-size:12px"><strong>${t('Price:')}</strong> <span id="mi-price-value" style="color:#475569">${t('Not selected')}</span></div>
        <div style="font-size:12px"><strong>${t('Shipping:')}</strong> <span id="mi-shipping-value" style="color:#475569">${t('Not selected (optional)')}</span></div>
        <div style="font-size:12px"><strong>${t('Can count:')}</strong> <span id="mi-quantity-value" style="color:#475569">${t('Not selected (optional)')}</span></div>
      </div>
      <div id="mi-status" style="font-size:12px;border-radius:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155"></div>
      <div style="display:grid;gap:6px">
        <div style="font-size:11px;font-weight:600;color:#64748b">${t('Price setup')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button id="mi-select-price-main" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${t('Select Price')}</button>
          <button id="mi-add-price-part" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${t('Add Price Part')}</button>
        </div>
      </div>
      <div style="display:grid;gap:6px">
        <div style="font-size:11px;font-weight:600;color:#64748b">${t('Shipping setup (optional)')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button id="mi-select-shipping-main" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${t('Select Shipping')}</button>
          <button id="mi-add-shipping-part" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${t('Add Shipping Part')}</button>
          <button id="mi-skip-shipping" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${t('Skip Shipping')}</button>
        </div>
        <input id="mi-shipping-manual" type="text" inputmode="decimal" placeholder="${t('Or type shipping manually (example: 4.99)')}" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;color:#0f172a" />
      </div>
      <div style="display:grid;gap:6px">
        <div style="font-size:11px;font-weight:600;color:#64748b">${t('Quantity setup (optional, for price per can)')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button id="mi-select-quantity-main" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${t('Select Can Count')}</button>
          <button id="mi-add-quantity-part" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${t('Add Count Part')}</button>
        </div>
        <input id="mi-quantity-manual" type="number" min="1" step="1" placeholder="${t('Or type can count manually (example: 12)')}" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;color:#0f172a" />
      </div>
      <div style="display:flex;gap:8px">
        <button id="mi-reset" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${t('Restart')}</button>
        <button id="mi-save" type="button" style="flex:1;border:1px solid #0f172a;background:#0f172a;color:#ffffff;border-radius:8px;padding:10px 12px;font-size:12px;font-weight:600;cursor:pointer">${t('Save and Validate')}</button>
        <button id="mi-back" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:10px 12px;font-size:12px;cursor:pointer">${t('Back')}</button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  const collapsedDock = document.createElement('div');
  collapsedDock.setAttribute('data-monsterindex-ignore', 'true');
  collapsedDock.style.position = 'fixed';
  collapsedDock.style.right = '24px';
  collapsedDock.style.bottom = '24px';
  collapsedDock.style.zIndex = '2147483647';
  collapsedDock.style.display = 'none';
  collapsedDock.style.maxWidth = 'min(380px, calc(100vw - 48px))';
  collapsedDock.style.borderRadius = '18px';
  collapsedDock.style.border = '1px solid rgba(148, 163, 184, 0.28)';
  collapsedDock.style.background = 'rgba(15, 23, 42, 0.96)';
  collapsedDock.style.boxShadow = '0 22px 48px rgba(2,6,23,.34)';
  collapsedDock.style.color = '#f8fafc';
  collapsedDock.style.fontFamily = 'ui-sans-serif,system-ui,-apple-system,sans-serif';
  collapsedDock.style.overflow = 'hidden';
  collapsedDock.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;flex-wrap:wrap">
      <div style="display:grid;gap:4px;flex:1 1 180px;min-width:0">
        <div id="mi-collapsed-title" style="font-size:12px;font-weight:700"></div>
        <div id="mi-collapsed-note" style="font-size:11px;color:rgba(226,232,240,0.85)"></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="mi-open-selector" type="button" style="border:1px solid rgba(255,255,255,0.18);background:#ffffff;color:#0f172a;border-radius:12px;padding:9px 12px;font-size:12px;font-weight:700;cursor:pointer">${t('Open Selector')}</button>
        <button id="mi-resume-selecting" type="button" style="border:1px solid rgba(255,255,255,0.18);background:transparent;color:#f8fafc;border-radius:12px;padding:9px 12px;font-size:12px;font-weight:600;cursor:pointer">${t('Resume Selecting')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(collapsedDock);

  const instructionEl = panel.querySelector('#mi-instruction');
  const priceValueEl = panel.querySelector('#mi-price-value');
  const shippingValueEl = panel.querySelector('#mi-shipping-value');
  const quantityValueEl = panel.querySelector('#mi-quantity-value');
  const statusEl = panel.querySelector('#mi-status');

  const selectPriceMainBtn = panel.querySelector('#mi-select-price-main');
  const addPricePartBtn = panel.querySelector('#mi-add-price-part');
  const selectShippingMainBtn = panel.querySelector('#mi-select-shipping-main');
  const addShippingPartBtn = panel.querySelector('#mi-add-shipping-part');
  const skipShippingBtn = panel.querySelector('#mi-skip-shipping');
  const shippingManualInput = panel.querySelector('#mi-shipping-manual');
  const selectQuantityMainBtn = panel.querySelector('#mi-select-quantity-main');
  const addQuantityPartBtn = panel.querySelector('#mi-add-quantity-part');
  const quantityManualInput = panel.querySelector('#mi-quantity-manual');
  const resetBtn = panel.querySelector('#mi-reset');
  const saveBtn = panel.querySelector('#mi-save');
  const backBtn = panel.querySelector('#mi-back');
  const freeClickToggleBtn = panel.querySelector('#mi-free-click-toggle');
  const collapsePanelBtn = panel.querySelector('#mi-collapse-panel');
  const openSelectorBtn = collapsedDock.querySelector('#mi-open-selector');
  const resumeSelectingBtn = collapsedDock.querySelector('#mi-resume-selecting');
  const collapsedTitleEl = collapsedDock.querySelector('#mi-collapsed-title');
  const collapsedNoteEl = collapsedDock.querySelector('#mi-collapsed-note');

  let highlighted = null;

  const selectingModes = new Set([
    'select-price-main',
    'select-price-extra',
    'select-shipping-main',
    'select-shipping-extra',
    'select-quantity-main',
    'select-quantity-extra',
  ]);

  const isSelecting = () => selectingModes.has(state.mode);
  const defaultSelectionMode = () => (state.priceParts.length === 0 ? 'select-price-main' : 'idle');

  const cleanText = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

  const sampleText = (element) => {
    if (!(element instanceof Element)) {
      return '';
    }

    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      return cleanText(element.value || element.getAttribute('value') || '');
    }

    if (element instanceof HTMLElement) {
      const visibleText = cleanText(element.innerText || '');
      if (visibleText !== '') {
        return visibleText;
      }
    }

    const clone = element.cloneNode(true);
    if (clone instanceof Element) {
      clone
        .querySelectorAll('script, style, noscript, template, svg style, svg title, svg desc')
        .forEach((node) => node.remove());
    }

    return cleanText((clone.textContent || '').slice(0, 500));
  };

  const setStatus = (text, tone = 'info') => {
    if (!(statusEl instanceof HTMLElement)) {
      return;
    }

    statusEl.textContent = text;

    if (tone === 'success') {
      statusEl.style.background = '#ecfdf5';
      statusEl.style.borderColor = '#a7f3d0';
      statusEl.style.color = '#065f46';
      return;
    }

    if (tone === 'error') {
      statusEl.style.background = '#fef2f2';
      statusEl.style.borderColor = '#fecaca';
      statusEl.style.color = '#991b1b';
      return;
    }

    statusEl.style.background = '#f8fafc';
    statusEl.style.borderColor = '#e2e8f0';
    statusEl.style.color = '#334155';
  };

  const clearHighlight = () => {
    if (!highlighted) {
      return;
    }

    highlighted.style.outline = highlighted.dataset.__monsterindex_outline || '';
    delete highlighted.dataset.__monsterindex_outline;
    highlighted = null;
  };

  const setHighlight = (el) => {
    if (highlighted && highlighted !== el) {
      highlighted.style.outline = highlighted.dataset.__monsterindex_outline || '';
      delete highlighted.dataset.__monsterindex_outline;
    }

    highlighted = el;

    if (!highlighted.dataset.__monsterindex_outline) {
      highlighted.dataset.__monsterindex_outline = highlighted.style.outline || '';
    }

    highlighted.style.outline = '2px solid #f97316';
  };

  const escapeCss = (value) => {
    const input = String(value || '');
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(input);
    }

    return input.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
  };

  const escapeAttr = (value) =>
    String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');

  const isUnwrappedTemplateRoot = (element) =>
    element instanceof Element && element.hasAttribute('data-monsterindex-unwrapped-template-root');

  const isUniqueSelector = (selector) => {
    if (!selector || typeof selector !== 'string') {
      return false;
    }

    try {
      return document.querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  };

  const stableClassNames = (element) => {
    if (!(element instanceof Element)) {
      return [];
    }

    const genericClassPattern = /^(active|selected|disabled|hidden|visible|open|closed)$/i;

    return Array.from(element.classList || [])
      .map((name) => name.trim())
      .filter(
        (name) =>
          name !== '' &&
          name.length <= 60 &&
          /^[a-zA-Z0-9_-]+$/.test(name) &&
          !genericClassPattern.test(name),
      );
  };

  const selectorCandidates = (element) => {
    if (!(element instanceof Element)) {
      return [];
    }

    const tag = element.nodeName.toLowerCase();
    const candidates = [];

    if (element.id && element.id.trim() !== '') {
      candidates.push(`#${escapeCss(element.id.trim())}`);
      candidates.push(`${tag}#${escapeCss(element.id.trim())}`);
    }

    const attrs = ['data-testid', 'data-test', 'data-qa', 'itemprop', 'name', 'aria-label'];
    attrs.forEach((attr) => {
      const value = element.getAttribute(attr);
      if (typeof value === 'string' && value.trim() !== '' && value.length <= 120) {
        candidates.push(`${tag}[${attr}="${escapeAttr(value.trim())}"]`);
      }
    });

    const classes = stableClassNames(element);
    if (classes.length > 0) {
      const topClasses = classes.slice(0, 3);
      candidates.push(`${tag}.${topClasses.map((name) => escapeCss(name)).join('.')}`);
      topClasses.forEach((name) => {
        candidates.push(`${tag}.${escapeCss(name)}`);
      });
    }

    candidates.push(tag);

    return [...new Set(candidates)].filter((candidate) => candidate !== '');
  };

  const absoluteCssPath = (element) => {
    if (!(element instanceof Element)) {
      return '';
    }

    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();

      if (current.id) {
        selector += `#${escapeCss(current.id)}`;
        path.unshift(selector);
        break;
      }

      let sibling = current;
      let nth = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.nodeName.toLowerCase() === selector) nth++;
      }

      selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  };

  const cssPath = (element) => {
    if (!(element instanceof Element)) {
      return '';
    }

    const directCandidates = selectorCandidates(element);
    const firstUniqueDirect = directCandidates.find((candidate) => isUniqueSelector(candidate));
    if (firstUniqueDirect) {
      return firstUniqueDirect;
    }

    const preferredChild =
      directCandidates.find(
        (candidate) =>
          candidate.startsWith('#') || candidate.includes('[data-') || candidate.includes('.'),
      ) || directCandidates[0];

    if (!preferredChild) {
      return absoluteCssPath(element);
    }

    let childChain = preferredChild;
    let parent = element.parentElement;
    let depth = 0;

    while (parent && depth < 6) {
      const parentCandidates = selectorCandidates(parent);
      for (const parentCandidate of parentCandidates) {
        const direct = `${parentCandidate} > ${childChain}`;
        if (isUniqueSelector(direct)) {
          return direct;
        }

        const descendant = `${parentCandidate} ${childChain}`;
        if (isUniqueSelector(descendant)) {
          return descendant;
        }
      }

      const preferredParent =
        parentCandidates.find(
          (candidate) =>
            candidate.startsWith('#') || candidate.includes('[data-') || candidate.includes('.'),
        ) || parentCandidates[0];

      if (preferredParent) {
        childChain = `${preferredParent} > ${childChain}`;
        if (isUniqueSelector(childChain)) {
          return childChain;
        }
      }

      if (isUnwrappedTemplateRoot(parent)) {
        break;
      }

      parent = parent.parentElement;
      depth++;
    }

    return absoluteCssPath(element);
  };

  const xpathPath = (element) => {
    if (!(element instanceof Element)) return '';
    const segments = [];

    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let i = 1;
      let sibling = element.previousElementSibling;

      while (sibling) {
        if (sibling.nodeName === element.nodeName) i++;
        sibling = sibling.previousElementSibling;
      }

      segments.unshift(`${element.nodeName.toLowerCase()}[${i}]`);
      element = element.parentElement;
    }

    return '/' + segments.join('/');
  };

  const toSelector = (element) => ({
    css: cssPath(element),
    xpath: xpathPath(element),
    sample_text: sampleText(element),
  });

  const inferJoinWith = (parts) => {
    if (!Array.isArray(parts) || parts.length <= 1) {
      return '';
    }

    if (parts.length === 2) {
      const left = cleanText(parts[0].sample_text || '');
      const rightDigits = cleanText(parts[1].sample_text || '').replace(/\D+/g, '');
      const leftHasDecimal = /[.,]\d{1,2}\b/.test(left);

      if (!leftHasDecimal && /^\d{2}$/.test(rightDigits)) {
        return '.';
      }
    }

    return '';
  };

  const selectorPayloadFromParts = (parts) => {
    if (!Array.isArray(parts) || parts.length === 0) {
      return {};
    }

    const joinWith = inferJoinWith(parts);
    const first = parts[0];
    const combinedSample = parts
      .map((part) => cleanText(part.sample_text || ''))
      .filter((value) => value !== '')
      .join(joinWith);

    const payload = {
      css: first.css || '',
      xpath: first.xpath || '',
      sample_text: combinedSample || cleanText(first.sample_text || ''),
    };

    if (parts.length > 1) {
      payload.parts = parts;
      payload.join_with = joinWith;
    }

    return payload;
  };

  const withManualValue = (selectorPayload, manualValue) => {
    const normalizedManual = cleanText(manualValue);
    if (normalizedManual === '') {
      return selectorPayload;
    }

    return {
      ...selectorPayload,
      manual_value: normalizedManual,
    };
  };

  const previewParts = (parts, fallbackLabel) => {
    if (!Array.isArray(parts) || parts.length === 0) {
      return fallbackLabel;
    }

    const joinWith = inferJoinWith(parts);
    const text = parts
      .map((part) => cleanText(part.sample_text || ''))
      .filter((value) => value !== '')
      .join(joinWith);

    if (text) {
      return text;
    }

    if (parts.length > 1) {
      return t('Selected {count} parts', {
        count: parts.length,
      });
    }

    return t('Selected {count} part', {
      count: parts.length,
    });
  };

  const rememberRestoreMode = () => {
    if (isSelecting()) {
      state.restoreMode = state.mode;
      return;
    }

    state.restoreMode = defaultSelectionMode();
  };

  const enableFreeClick = ({ collapse = true } = {}) => {
    if (state.submitting || state.done) {
      return;
    }

    rememberRestoreMode();
    state.freeClick = true;
    state.panelCollapsed = collapse;
    state.mode = 'free-click';
    setStatus(
      t('Free click is enabled. Interact with the page to close drawers or overlays.'),
      'info',
    );
    updateUi();
  };

  const openSelectorPanel = () => {
    state.panelCollapsed = false;
    updateUi();
  };

  const resumeSelecting = () => {
    if (state.done) {
      state.panelCollapsed = false;
      updateUi();
      return;
    }

    state.freeClick = false;
    state.panelCollapsed = false;
    state.mode = selectingModes.has(state.restoreMode)
      ? state.restoreMode
      : defaultSelectionMode();
    setStatus(t('Selection mode restored. Click a value when ready.'), 'info');
    updateUi();
  };

  const updateInstruction = () => {
    if (!(instructionEl instanceof HTMLElement)) {
      return;
    }

    if (state.freeClick) {
      instructionEl.textContent = t(
        'Free click mode is active. Interact with the page, then reopen the selector when you are ready to capture a value.',
      );
      return;
    }

    if (state.mode === 'select-price-main') {
      instructionEl.textContent = t('Click the main price value on the page.');
      return;
    }

    if (state.mode === 'select-price-extra') {
      instructionEl.textContent = t('Click the extra price part (for example cents).');
      return;
    }

    if (state.mode === 'select-shipping-main') {
      instructionEl.textContent = t('Click the main shipping amount.');
      return;
    }

    if (state.mode === 'select-shipping-extra') {
      instructionEl.textContent = t('Click the extra shipping part (optional).');
      return;
    }

    if (state.mode === 'select-quantity-main') {
      instructionEl.textContent = t('Click the can count (example: 12 pack).');
      return;
    }

    if (state.mode === 'select-quantity-extra') {
      instructionEl.textContent = t('Click extra can-count part if the count is split.');
      return;
    }

    if (state.mode === 'done') {
      instructionEl.textContent = t('Setup saved. You can now go back.');
      return;
    }

    instructionEl.textContent = t('Use the buttons to select values, then click Save and Validate.');
  };

  const updateUi = () => {
    panel.style.display = state.panelCollapsed ? 'none' : 'block';
    collapsedDock.style.display = state.panelCollapsed ? 'block' : 'none';

    if (collapsedTitleEl instanceof HTMLElement) {
      collapsedTitleEl.textContent = state.freeClick
        ? t('Free click is active')
        : t('Selector minimized');
    }

    if (collapsedNoteEl instanceof HTMLElement) {
      collapsedNoteEl.textContent = state.freeClick
        ? t('Interact with the page, then reopen the selector when ready.')
        : t('Reopen the selector to continue capturing values.');
    }

    if (priceValueEl instanceof HTMLElement) {
      priceValueEl.textContent = previewParts(state.priceParts, t('Not selected'));
      priceValueEl.style.color = state.priceParts.length > 0 ? '#0f766e' : '#475569';
    }

    if (shippingValueEl instanceof HTMLElement) {
      const manualShipping = cleanText(state.shippingManualValue);
      shippingValueEl.textContent = state.shippingSkipped
        ? t('Skipped')
        : manualShipping !== ''
        ? t('Manual: {value}', { value: manualShipping })
        : previewParts(state.shippingParts, t('Not selected (optional)'));
      shippingValueEl.style.color =
        state.shippingParts.length > 0 || manualShipping !== '' || state.shippingSkipped
          ? '#0f766e'
          : '#475569';
    }

    if (quantityValueEl instanceof HTMLElement) {
      const manualCount = cleanText(state.quantityManualValue);
      quantityValueEl.textContent =
        manualCount !== ''
          ? t('Manual: {value}', { value: manualCount })
          : previewParts(state.quantityParts, t('Not selected (optional)'));
      quantityValueEl.style.color =
        state.quantityParts.length > 0 || manualCount !== '' ? '#0f766e' : '#475569';
    }

    if (selectPriceMainBtn instanceof HTMLButtonElement) {
      selectPriceMainBtn.disabled = state.submitting || state.done;
    }

    if (addPricePartBtn instanceof HTMLButtonElement) {
      addPricePartBtn.disabled = state.priceParts.length === 0 || state.submitting || state.done;
    }

    if (selectShippingMainBtn instanceof HTMLButtonElement) {
      selectShippingMainBtn.disabled = state.priceParts.length === 0 || state.submitting || state.done;
    }

    if (addShippingPartBtn instanceof HTMLButtonElement) {
      addShippingPartBtn.disabled = state.shippingParts.length === 0 || state.submitting || state.done;
    }

    if (skipShippingBtn instanceof HTMLButtonElement) {
      skipShippingBtn.disabled = state.priceParts.length === 0 || state.submitting || state.done;
    }

    if (shippingManualInput instanceof HTMLInputElement) {
      shippingManualInput.disabled = state.priceParts.length === 0 || state.submitting || state.done || state.shippingSkipped;
    }

    if (selectQuantityMainBtn instanceof HTMLButtonElement) {
      selectQuantityMainBtn.disabled = state.priceParts.length === 0 || state.submitting || state.done;
    }

    if (addQuantityPartBtn instanceof HTMLButtonElement) {
      addQuantityPartBtn.disabled = state.quantityParts.length === 0 || state.submitting || state.done;
    }

    if (quantityManualInput instanceof HTMLInputElement) {
      quantityManualInput.disabled = state.priceParts.length === 0 || state.submitting || state.done;
    }

    if (resetBtn instanceof HTMLButtonElement) {
      resetBtn.disabled = state.submitting || state.done;
    }

    if (saveBtn instanceof HTMLButtonElement) {
      saveBtn.disabled = state.priceParts.length === 0 || state.submitting || state.done;
      saveBtn.textContent = state.submitting
        ? t('Saving...')
        : state.done
        ? t('Saved')
        : t('Save and Validate');
    }

    if (freeClickToggleBtn instanceof HTMLButtonElement) {
      freeClickToggleBtn.textContent = state.freeClick ? t('Resume Selecting') : t('Free Click');
      freeClickToggleBtn.style.background = state.freeClick ? '#0f172a' : '#ffffff';
      freeClickToggleBtn.style.borderColor = state.freeClick ? '#0f172a' : '#cbd5e1';
      freeClickToggleBtn.style.color = state.freeClick ? '#ffffff' : '#0f172a';
    }

    if (collapsePanelBtn instanceof HTMLButtonElement) {
      collapsePanelBtn.disabled = state.submitting;
    }

    if (openSelectorBtn instanceof HTMLButtonElement) {
      openSelectorBtn.disabled = state.submitting;
    }

    if (resumeSelectingBtn instanceof HTMLButtonElement) {
      resumeSelectingBtn.disabled = state.submitting;
      resumeSelectingBtn.style.display = state.freeClick ? 'inline-flex' : 'none';
    }

    updateInstruction();

    if (!isSelecting()) {
      clearHighlight();
    }
  };

  const startSelection = (mode, message) => {
    if (state.submitting || state.done) {
      return;
    }

    state.freeClick = false;
    state.panelCollapsed = false;
    state.restoreMode = mode;
    state.mode = mode;
    setStatus(message, 'info');
    updateUi();
  };

  const submitAndValidate = async () => {
    if (state.priceParts.length === 0 || state.submitting) {
      return;
    }

    state.submitting = true;
    state.mode = 'idle';
    updateUi();
    setStatus(
      t('Saving selectors and validating with a quick scrape...'),
      'info',
    );

    const shippingSelectorPayload = state.shippingSkipped
      ? {}
      : withManualValue(
          selectorPayloadFromParts(state.shippingParts),
          state.shippingManualValue,
        );
    const quantitySelectorPayload = withManualValue(
      selectorPayloadFromParts(state.quantityParts),
      state.quantityManualValue,
    );

    try {
      const payload = {
        lang: language,
        token,
        page_url: sourceUrl,
        page_title: document.title,
        selectors: {
          price: selectorPayloadFromParts(state.priceParts),
          shipping: shippingSelectorPayload,
          quantity: quantitySelectorPayload,
        },
      };

      const response = await fetch(captureEndpoint.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            t('Could not validate these selectors yet. Try selecting clearer values.'),
        );
      }

      state.done = true;
      state.mode = 'done';
      window.__monsterindex_selector_unsaved = false;

      const parsedPrice =
        typeof data.price_cents === 'number'
          ? `${data.currency} ${(data.price_cents / 100).toFixed(2)}`
          : t('Unknown');

      const perCanText =
        typeof data.price_per_can_cents === 'number'
          ? t(' • Per can: {value}', {
                value: `${data.currency} ${(data.price_per_can_cents / 100).toFixed(2)}`,
              })
          : '';

      setStatus(
        t('Saved successfully. Detected price: {price}{per_can}. Redirecting back...', {
            price: parsedPrice,
            per_can: perCanText,
          }),
        'success',
      );

      window.setTimeout(() => {
        window.location.assign(returnUrl);
      }, 900);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('Save failed. Please retry with another selection.');
      setStatus(message, 'error');
    } finally {
      state.submitting = false;
      updateUi();
    }
  };

  if (selectPriceMainBtn instanceof HTMLButtonElement) {
    selectPriceMainBtn.addEventListener('click', () => {
      startSelection(
        'select-price-main',
        t('Click the main price value.'),
      );
    });
  }

  if (addPricePartBtn instanceof HTMLButtonElement) {
    addPricePartBtn.addEventListener('click', () => {
      startSelection(
        'select-price-extra',
        t('Click the extra price part (for example cents).'),
      );
    });
  }

  if (selectShippingMainBtn instanceof HTMLButtonElement) {
    selectShippingMainBtn.addEventListener('click', () => {
      startSelection(
        'select-shipping-main',
        t('Click the main shipping amount.'),
      );
    });
  }

  if (addShippingPartBtn instanceof HTMLButtonElement) {
    addShippingPartBtn.addEventListener('click', () => {
      startSelection(
        'select-shipping-extra',
        t('Click the extra shipping part.'),
      );
    });
  }

  if (skipShippingBtn instanceof HTMLButtonElement) {
    skipShippingBtn.addEventListener('click', () => {
      if (state.priceParts.length === 0) {
        setStatus(
          t('Select a price before skipping shipping.'),
          'error',
        );
        return;
      }

      state.shippingParts = [];
      state.shippingManualValue = '';
      if (shippingManualInput instanceof HTMLInputElement) {
        shippingManualInput.value = '';
      }
      state.shippingSkipped = true;
      state.mode = 'idle';
      setStatus(
        t('Shipping skipped. You can save now.'),
        'info',
      );
      updateUi();
    });
  }

  if (shippingManualInput instanceof HTMLInputElement) {
    shippingManualInput.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      state.shippingManualValue = cleanText(target.value);
      if (state.shippingManualValue !== '') {
        state.shippingSkipped = false;
      }

      window.__monsterindex_selector_unsaved = true;
      updateUi();
    });
  }

  if (selectQuantityMainBtn instanceof HTMLButtonElement) {
    selectQuantityMainBtn.addEventListener('click', () => {
      startSelection(
        'select-quantity-main',
        t('Click the can count (for example 12 pack).'),
      );
    });
  }

  if (addQuantityPartBtn instanceof HTMLButtonElement) {
    addQuantityPartBtn.addEventListener('click', () => {
      startSelection(
        'select-quantity-extra',
        t('Click the extra count part if needed.'),
      );
    });
  }

  if (quantityManualInput instanceof HTMLInputElement) {
    quantityManualInput.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      state.quantityManualValue = cleanText(target.value);
      window.__monsterindex_selector_unsaved = true;
      updateUi();
    });
  }

  if (resetBtn instanceof HTMLButtonElement) {
    resetBtn.addEventListener('click', () => {
      state.priceParts = [];
      state.shippingParts = [];
      state.quantityParts = [];
      state.shippingManualValue = '';
      state.quantityManualValue = '';
      if (shippingManualInput instanceof HTMLInputElement) {
        shippingManualInput.value = '';
      }
      if (quantityManualInput instanceof HTMLInputElement) {
        quantityManualInput.value = '';
      }
      state.shippingSkipped = false;
      state.freeClick = false;
      state.panelCollapsed = false;
      state.restoreMode = 'select-price-main';
      state.done = false;
      state.mode = 'select-price-main';
      window.__monsterindex_selector_unsaved = true;
      setStatus(
        t('Restarted. Click the main price value to begin.'),
        'info',
      );
      updateUi();
    });
  }

  if (saveBtn instanceof HTMLButtonElement) {
    saveBtn.addEventListener('click', submitAndValidate);
  }

  if (backBtn instanceof HTMLButtonElement) {
    backBtn.addEventListener('click', async () => {
      const shouldLeave =
        !window.__monsterindex_selector_unsaved ||
        (await showOverlayDialog({
          title: t('Leave selector without saving?'),
          description: t('You still have unsaved selector changes. Leave anyway?'),
          confirmLabel: t('Leave page'),
          cancelLabel: t('Stay here'),
          destructive: true,
        }));

      if (!shouldLeave) {
        return;
      }

      window.__monsterindex_selector_unsaved = false;
      window.location.assign(returnUrl);
    });
  }

  if (freeClickToggleBtn instanceof HTMLButtonElement) {
    freeClickToggleBtn.addEventListener('click', () => {
      if (state.freeClick) {
        resumeSelecting();
        return;
      }

      enableFreeClick({ collapse: true });
    });
  }

  if (collapsePanelBtn instanceof HTMLButtonElement) {
    collapsePanelBtn.addEventListener('click', () => {
      if (state.submitting) {
        return;
      }

      state.panelCollapsed = true;
      updateUi();
    });
  }

  if (openSelectorBtn instanceof HTMLButtonElement) {
    openSelectorBtn.addEventListener('click', openSelectorPanel);
  }

  if (resumeSelectingBtn instanceof HTMLButtonElement) {
    resumeSelectingBtn.addEventListener('click', resumeSelecting);
  }

  const onMouseOver = (event) => {
    if (!isSelecting()) {
      return;
    }

    const el = event.target;
    if (!(el instanceof Element)) {
      return;
    }

    if (el.closest('[data-monsterindex-ignore="true"]')) {
      return;
    }

    setHighlight(el);
  };

  const onClick = (event) => {
    if (!isSelecting()) {
      return;
    }

    const el = event.target;
    if (!(el instanceof Element)) {
      return;
    }

    if (el.closest('[data-monsterindex-ignore="true"]')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const selector = toSelector(el);

    if (state.mode === 'select-price-main') {
      state.priceParts = [selector];
      state.shippingSkipped = false;
      state.mode = 'idle';
      setStatus(
        t('Main price selected. Add another part if needed.'),
        'success',
      );
      updateUi();
      return;
    }

    if (state.mode === 'select-price-extra') {
      state.priceParts.push(selector);
      state.mode = 'idle';
      setStatus(t('Extra price part added.'), 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-shipping-main') {
      state.shippingParts = [selector];
      state.shippingManualValue = '';
      if (shippingManualInput instanceof HTMLInputElement) {
        shippingManualInput.value = '';
      }
      state.shippingSkipped = false;
      state.mode = 'idle';
      setStatus(t('Main shipping selected.'), 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-shipping-extra') {
      state.shippingParts.push(selector);
      state.shippingSkipped = false;
      state.mode = 'idle';
      setStatus(
        t('Extra shipping part added.'),
        'success',
      );
      updateUi();
      return;
    }

    if (state.mode === 'select-quantity-main') {
      state.quantityParts = [selector];
      state.quantityManualValue = '';
      if (quantityManualInput instanceof HTMLInputElement) {
        quantityManualInput.value = '';
      }
      state.mode = 'idle';
      setStatus(t('Can count selected.'), 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-quantity-extra') {
      state.quantityParts.push(selector);
      state.mode = 'idle';
      setStatus(
        t('Extra can-count part added.'),
        'success',
      );
      updateUi();
    }
  };

  const onBeforeUnload = (event) => {
    if (!window.__monsterindex_selector_unsaved) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  };

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('click', onClick, true);
  window.addEventListener('beforeunload', onBeforeUnload);

  setStatus(
    t('Step 1: click the main price value.'),
    'info',
  );
  updateUi();
})();
