(function () {
  const scriptTag = document.currentScript;
  if (!(scriptTag instanceof HTMLScriptElement)) {
    return;
  }

  const scriptUrl = new URL(scriptTag.src);
  const token = scriptUrl.searchParams.get('token');
  const sourceUrl = scriptUrl.searchParams.get('source_url') || window.location.href;
  const returnUrl = scriptUrl.searchParams.get('return_url') || '/admin/monsters';

  if (!token) {
    alert('MonsterIndex selector token missing. Regenerate the selector session.');
    return;
  }

  const captureEndpoint = new URL('/api/bookmarklet/capture', scriptUrl.origin);

  const state = {
    mode: 'select-price-main',
    priceParts: [],
    shippingParts: [],
    quantityParts: [],
    shippingSkipped: false,
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

  panel.innerHTML = [
    '<div style="padding:14px 14px 10px;border-bottom:1px solid #e2e8f0;background:linear-gradient(180deg,#fff,#f8fafc)">',
    '<div style="font-size:14px;font-weight:700">Guided Price Selector</div>',
    '<div style="font-size:12px;color:#475569;margin-top:4px">Click values on the page. If a value is split (example 32 and 99), use "Add Part".</div>',
    '</div>',
    '<div style="padding:12px 14px;display:grid;gap:10px">',
    '<div id="mi-instruction" style="font-size:13px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px"></div>',
    '<div style="display:grid;gap:8px">',
    '<div style="font-size:12px"><strong>Price:</strong> <span id="mi-price-value" style="color:#475569">Not selected</span></div>',
    '<div style="font-size:12px"><strong>Shipping:</strong> <span id="mi-shipping-value" style="color:#475569">Not selected (optional)</span></div>',
    '<div style="font-size:12px"><strong>Can count:</strong> <span id="mi-quantity-value" style="color:#475569">Not selected (optional)</span></div>',
    '</div>',
    '<div id="mi-status" style="font-size:12px;border-radius:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155"></div>',
    '<div style="display:grid;gap:6px">',
    '<div style="font-size:11px;font-weight:600;color:#64748b">Price setup</div>',
    '<div style="display:flex;flex-wrap:wrap;gap:8px">',
    '<button id="mi-select-price-main" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Select Price</button>',
    '<button id="mi-add-price-part" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Add Price Part</button>',
    '</div>',
    '</div>',
    '<div style="display:grid;gap:6px">',
    '<div style="font-size:11px;font-weight:600;color:#64748b">Shipping setup (optional)</div>',
    '<div style="display:flex;flex-wrap:wrap;gap:8px">',
    '<button id="mi-select-shipping-main" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Select Shipping</button>',
    '<button id="mi-add-shipping-part" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Add Shipping Part</button>',
    '<button id="mi-skip-shipping" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Skip Shipping</button>',
    '</div>',
    '</div>',
    '<div style="display:grid;gap:6px">',
    '<div style="font-size:11px;font-weight:600;color:#64748b">Quantity setup (optional, for price per can)</div>',
    '<div style="display:flex;flex-wrap:wrap;gap:8px">',
    '<button id="mi-select-quantity-main" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Select Can Count</button>',
    '<button id="mi-add-quantity-part" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Add Count Part</button>',
    '</div>',
    '</div>',
    '<div style="display:flex;gap:8px">',
    '<button id="mi-reset" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Restart</button>',
    '<button id="mi-save" type="button" style="flex:1;border:1px solid #0f172a;background:#0f172a;color:#ffffff;border-radius:8px;padding:10px 12px;font-size:12px;font-weight:600;cursor:pointer">Save and Validate</button>',
    '<button id="mi-back" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:10px 12px;font-size:12px;cursor:pointer">Back</button>',
    '</div>',
    '</div>',
  ].join('');

  document.body.appendChild(panel);

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
  const selectQuantityMainBtn = panel.querySelector('#mi-select-quantity-main');
  const addQuantityPartBtn = panel.querySelector('#mi-add-quantity-part');
  const resetBtn = panel.querySelector('#mi-reset');
  const saveBtn = panel.querySelector('#mi-save');
  const backBtn = panel.querySelector('#mi-back');

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

  const cleanText = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

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

  const cssPath = (element) => {
    if (!(element instanceof Element)) return '';
    const path = [];

    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();

      if (element.id) {
        selector += `#${CSS.escape(element.id)}`;
        path.unshift(selector);
        break;
      }

      let sibling = element;
      let nth = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.nodeName.toLowerCase() === selector) nth++;
      }

      selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      element = element.parentElement;
    }

    return path.join(' > ');
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
    sample_text: cleanText((element.textContent || '').slice(0, 500)),
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

  const previewParts = (parts, fallbackLabel) => {
    if (!Array.isArray(parts) || parts.length === 0) {
      return fallbackLabel;
    }

    const joinWith = inferJoinWith(parts);
    const text = parts
      .map((part) => cleanText(part.sample_text || ''))
      .filter((value) => value !== '')
      .join(joinWith);

    return text || `Selected ${parts.length} part${parts.length > 1 ? 's' : ''}`;
  };

  const updateInstruction = () => {
    if (!(instructionEl instanceof HTMLElement)) {
      return;
    }

    if (state.mode === 'select-price-main') {
      instructionEl.textContent = 'Click the main price value on the page.';
      return;
    }

    if (state.mode === 'select-price-extra') {
      instructionEl.textContent = 'Click the extra price part (for example cents).';
      return;
    }

    if (state.mode === 'select-shipping-main') {
      instructionEl.textContent = 'Click the main shipping amount.';
      return;
    }

    if (state.mode === 'select-shipping-extra') {
      instructionEl.textContent = 'Click the extra shipping part (optional).';
      return;
    }

    if (state.mode === 'select-quantity-main') {
      instructionEl.textContent = 'Click the can count (example: 12 pack).';
      return;
    }

    if (state.mode === 'select-quantity-extra') {
      instructionEl.textContent = 'Click extra can-count part if the count is split.';
      return;
    }

    if (state.mode === 'done') {
      instructionEl.textContent = 'Setup saved. You can now go back.';
      return;
    }

    instructionEl.textContent = 'Use the buttons to select values, then click Save and Validate.';
  };

  const updateUi = () => {
    if (priceValueEl instanceof HTMLElement) {
      priceValueEl.textContent = previewParts(state.priceParts, 'Not selected');
      priceValueEl.style.color = state.priceParts.length > 0 ? '#0f766e' : '#475569';
    }

    if (shippingValueEl instanceof HTMLElement) {
      shippingValueEl.textContent = state.shippingSkipped
        ? 'Skipped'
        : previewParts(state.shippingParts, 'Not selected (optional)');
      shippingValueEl.style.color =
        state.shippingParts.length > 0 || state.shippingSkipped ? '#0f766e' : '#475569';
    }

    if (quantityValueEl instanceof HTMLElement) {
      quantityValueEl.textContent = previewParts(state.quantityParts, 'Not selected (optional)');
      quantityValueEl.style.color = state.quantityParts.length > 0 ? '#0f766e' : '#475569';
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

    if (selectQuantityMainBtn instanceof HTMLButtonElement) {
      selectQuantityMainBtn.disabled = state.priceParts.length === 0 || state.submitting || state.done;
    }

    if (addQuantityPartBtn instanceof HTMLButtonElement) {
      addQuantityPartBtn.disabled = state.quantityParts.length === 0 || state.submitting || state.done;
    }

    if (resetBtn instanceof HTMLButtonElement) {
      resetBtn.disabled = state.submitting || state.done;
    }

    if (saveBtn instanceof HTMLButtonElement) {
      saveBtn.disabled = state.priceParts.length === 0 || state.submitting || state.done;
      saveBtn.textContent = state.submitting ? 'Saving...' : state.done ? 'Saved' : 'Save and Validate';
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
    setStatus('Saving selectors and validating with a quick scrape...', 'info');

    const payload = {
      token,
      page_url: sourceUrl,
      page_title: document.title,
      selectors: {
        price: selectorPayloadFromParts(state.priceParts),
        shipping: state.shippingSkipped ? {} : selectorPayloadFromParts(state.shippingParts),
        quantity: selectorPayloadFromParts(state.quantityParts),
      },
    };

    try {
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
            'Could not validate these selectors yet. Try selecting clearer values.',
        );
      }

      state.done = true;
      state.mode = 'done';
      window.__monsterindex_selector_unsaved = false;

      const parsedPrice =
        typeof data.price_cents === 'number'
          ? `${data.currency} ${(data.price_cents / 100).toFixed(2)}`
          : 'Unknown';

      const perCanText =
        typeof data.price_per_can_cents === 'number'
          ? ` • Per can: ${data.currency} ${(data.price_per_can_cents / 100).toFixed(2)}`
          : '';

      setStatus(`Saved successfully. Detected price: ${parsedPrice}${perCanText}.`, 'success');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Save failed. Please retry with another selection.';
      setStatus(message, 'error');
    } finally {
      state.submitting = false;
      updateUi();
    }
  };

  if (selectPriceMainBtn instanceof HTMLButtonElement) {
    selectPriceMainBtn.addEventListener('click', () => {
      startSelection('select-price-main', 'Click the main price value.');
    });
  }

  if (addPricePartBtn instanceof HTMLButtonElement) {
    addPricePartBtn.addEventListener('click', () => {
      startSelection('select-price-extra', 'Click the extra price part (for example cents).');
    });
  }

  if (selectShippingMainBtn instanceof HTMLButtonElement) {
    selectShippingMainBtn.addEventListener('click', () => {
      startSelection('select-shipping-main', 'Click the main shipping amount.');
    });
  }

  if (addShippingPartBtn instanceof HTMLButtonElement) {
    addShippingPartBtn.addEventListener('click', () => {
      startSelection('select-shipping-extra', 'Click the extra shipping part.');
    });
  }

  if (skipShippingBtn instanceof HTMLButtonElement) {
    skipShippingBtn.addEventListener('click', () => {
      if (state.priceParts.length === 0) {
        setStatus('Select a price before skipping shipping.', 'error');
        return;
      }

      state.shippingParts = [];
      state.shippingSkipped = true;
      state.mode = 'idle';
      setStatus('Shipping skipped. You can save now.', 'info');
      updateUi();
    });
  }

  if (selectQuantityMainBtn instanceof HTMLButtonElement) {
    selectQuantityMainBtn.addEventListener('click', () => {
      startSelection('select-quantity-main', 'Click the can count (for example 12 pack).');
    });
  }

  if (addQuantityPartBtn instanceof HTMLButtonElement) {
    addQuantityPartBtn.addEventListener('click', () => {
      startSelection('select-quantity-extra', 'Click the extra count part if needed.');
    });
  }

  if (resetBtn instanceof HTMLButtonElement) {
    resetBtn.addEventListener('click', () => {
      state.priceParts = [];
      state.shippingParts = [];
      state.quantityParts = [];
      state.shippingSkipped = false;
      state.done = false;
      state.mode = 'select-price-main';
      window.__monsterindex_selector_unsaved = true;
      setStatus('Restarted. Click the main price value to begin.', 'info');
      updateUi();
    });
  }

  if (saveBtn instanceof HTMLButtonElement) {
    saveBtn.addEventListener('click', submitAndValidate);
  }

  if (backBtn instanceof HTMLButtonElement) {
    backBtn.addEventListener('click', () => {
      if (
        window.__monsterindex_selector_unsaved &&
        !window.confirm('You still have unsaved selector changes. Leave anyway?')
      ) {
        return;
      }

      window.__monsterindex_selector_unsaved = false;
      window.location.assign(returnUrl);
    });
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
      setStatus('Main price selected. Add another part if needed.', 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-price-extra') {
      state.priceParts.push(selector);
      state.mode = 'idle';
      setStatus('Extra price part added.', 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-shipping-main') {
      state.shippingParts = [selector];
      state.shippingSkipped = false;
      state.mode = 'idle';
      setStatus('Main shipping selected.', 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-shipping-extra') {
      state.shippingParts.push(selector);
      state.shippingSkipped = false;
      state.mode = 'idle';
      setStatus('Extra shipping part added.', 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-quantity-main') {
      state.quantityParts = [selector];
      state.mode = 'idle';
      setStatus('Can count selected.', 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-quantity-extra') {
      state.quantityParts.push(selector);
      state.mode = 'idle';
      setStatus('Extra can-count part added.', 'success');
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

  setStatus('Step 1: click the main price value.', 'info');
  updateUi();
})();
