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
    mode: 'select-price',
    price: null,
    shipping: null,
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
  panel.style.width = 'min(360px, calc(100vw - 24px))';
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
    '<div style="font-size:12px;color:#475569;margin-top:4px">No code needed. Click the on-page values we should track.</div>',
    '</div>',
    '<div style="padding:12px 14px;display:grid;gap:10px">',
    '<div id="mi-instruction" style="font-size:13px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px"></div>',
    '<div style="display:grid;gap:8px">',
    '<div style="font-size:12px"><strong>Price element:</strong> <span id="mi-price-value" style="color:#475569">Not selected</span></div>',
    '<div style="font-size:12px"><strong>Shipping element:</strong> <span id="mi-shipping-value" style="color:#475569">Not selected (optional)</span></div>',
    '</div>',
    '<div id="mi-status" style="font-size:12px;border-radius:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155"></div>',
    '<div style="display:flex;flex-wrap:wrap;gap:8px">',
    '<button id="mi-select-price" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Select Price</button>',
    '<button id="mi-select-shipping" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Select Shipping</button>',
    '<button id="mi-skip-shipping" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Skip Shipping</button>',
    '<button id="mi-restart" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Restart</button>',
    '</div>',
    '<div style="display:flex;gap:8px">',
    '<button id="mi-save" type="button" style="flex:1;border:1px solid #0f172a;background:#0f172a;color:#ffffff;border-radius:8px;padding:10px 12px;font-size:12px;font-weight:600;cursor:pointer">Save and Validate</button>',
    '<button id="mi-back" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:10px 12px;font-size:12px;cursor:pointer">Back</button>',
    '</div>',
    '</div>',
  ].join('');

  document.body.appendChild(panel);

  const instructionEl = panel.querySelector('#mi-instruction');
  const priceValueEl = panel.querySelector('#mi-price-value');
  const shippingValueEl = panel.querySelector('#mi-shipping-value');
  const statusEl = panel.querySelector('#mi-status');
  const selectPriceBtn = panel.querySelector('#mi-select-price');
  const selectShippingBtn = panel.querySelector('#mi-select-shipping');
  const skipShippingBtn = panel.querySelector('#mi-skip-shipping');
  const restartBtn = panel.querySelector('#mi-restart');
  const saveBtn = panel.querySelector('#mi-save');
  const backBtn = panel.querySelector('#mi-back');

  let highlighted = null;

  const isSelecting = () => state.mode === 'select-price' || state.mode === 'select-shipping';

  const clearHighlight = () => {
    if (!highlighted) return;
    highlighted.style.outline = highlighted.dataset.__monsterindex_outline || '';
    delete highlighted.dataset.__monsterindex_outline;
    highlighted = null;
  };

  const highlight = (el) => {
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

  const setStatus = (text, tone = 'info') => {
    if (!(statusEl instanceof HTMLElement)) return;

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

  const updateUi = () => {
    if (instructionEl instanceof HTMLElement) {
      if (state.mode === 'select-price') {
        instructionEl.textContent = 'Step 1: Click the product price on the page.';
      } else if (state.mode === 'select-shipping') {
        instructionEl.textContent = 'Step 2 (optional): Click shipping cost, or use "Skip Shipping".';
      } else if (state.mode === 'ready') {
        instructionEl.textContent = 'Step 3: Click "Save and Validate" to finish setup.';
      } else if (state.mode === 'done') {
        instructionEl.textContent = 'Setup complete. You can safely go back to the admin page.';
      }
    }

    if (priceValueEl instanceof HTMLElement) {
      priceValueEl.textContent = state.price?.sample_text || 'Not selected';
      priceValueEl.style.color = state.price ? '#0f766e' : '#475569';
    }

    if (shippingValueEl instanceof HTMLElement) {
      shippingValueEl.textContent = state.shipping?.sample_text || 'Not selected (optional)';
      shippingValueEl.style.color = state.shipping ? '#0f766e' : '#475569';
    }

    if (selectPriceBtn instanceof HTMLButtonElement) {
      selectPriceBtn.disabled = state.submitting || state.mode === 'done';
    }

    if (selectShippingBtn instanceof HTMLButtonElement) {
      selectShippingBtn.disabled = !state.price || state.submitting || state.mode === 'done';
    }

    if (skipShippingBtn instanceof HTMLButtonElement) {
      skipShippingBtn.disabled = !state.price || state.submitting || state.mode === 'done';
      skipShippingBtn.style.display = state.price && state.mode !== 'done' ? 'inline-block' : 'none';
    }

    if (restartBtn instanceof HTMLButtonElement) {
      restartBtn.disabled = state.submitting || state.mode === 'done';
    }

    if (saveBtn instanceof HTMLButtonElement) {
      saveBtn.disabled = !state.price || state.submitting || state.mode === 'done';
      saveBtn.textContent = state.submitting ? 'Saving...' : state.mode === 'done' ? 'Saved' : 'Save and Validate';
    }

    if (!isSelecting()) {
      clearHighlight();
    }
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

  const xpath = (element) => {
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
    xpath: xpath(element),
    sample_text: (element.textContent || '').trim().slice(0, 500),
  });

  const submitAndValidate = async () => {
    if (!state.price || state.submitting) {
      return;
    }

    state.submitting = true;
    updateUi();
    setStatus('Saving selectors and running a quick validation...', 'info');

    const payload = {
      token,
      page_url: sourceUrl,
      page_title: document.title,
      selectors: {
        price: state.price || {},
        shipping: state.shipping || {},
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
        throw new Error(data.message || 'Could not validate these selectors. Try selecting clearer values.');
      }

      state.done = true;
      state.mode = 'done';
      window.__monsterindex_selector_unsaved = false;

      const parsedPrice =
        typeof data.price_cents === 'number'
          ? `${data.currency} ${(data.price_cents / 100).toFixed(2)}`
          : 'Unknown';

      setStatus(`Saved successfully. Detected price: ${parsedPrice}.`, 'success');
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Save failed. Please retry with a more specific selection.';
      setStatus(message, 'error');
    } finally {
      state.submitting = false;
      updateUi();
    }
  };

  const onMouseOver = (event) => {
    if (!isSelecting()) return;

    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.closest('[data-monsterindex-ignore="true"]')) return;

    highlight(el);
  };

  const onClick = (event) => {
    if (!isSelecting()) return;

    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.closest('[data-monsterindex-ignore="true"]')) return;

    event.preventDefault();
    event.stopPropagation();

    if (state.mode === 'select-price') {
      state.price = toSelector(el);
      state.mode = 'select-shipping';
      setStatus('Price selected. Now select shipping or skip it.', 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-shipping') {
      state.shipping = toSelector(el);
      state.mode = 'ready';
      setStatus('Shipping selected. You can now save this setup.', 'success');
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

  if (selectPriceBtn instanceof HTMLButtonElement) {
    selectPriceBtn.addEventListener('click', () => {
      state.mode = 'select-price';
      setStatus('Click the product price on the page.', 'info');
      updateUi();
    });
  }

  if (selectShippingBtn instanceof HTMLButtonElement) {
    selectShippingBtn.addEventListener('click', () => {
      if (!state.price) {
        setStatus('Select a price first.', 'error');
        return;
      }

      state.mode = 'select-shipping';
      setStatus('Click the shipping value on the page, or skip shipping.', 'info');
      updateUi();
    });
  }

  if (skipShippingBtn instanceof HTMLButtonElement) {
    skipShippingBtn.addEventListener('click', () => {
      if (!state.price) return;
      state.shipping = null;
      state.mode = 'ready';
      setStatus('Shipping skipped. You can save now.', 'info');
      updateUi();
    });
  }

  if (restartBtn instanceof HTMLButtonElement) {
    restartBtn.addEventListener('click', () => {
      state.price = null;
      state.shipping = null;
      state.mode = 'select-price';
      state.done = false;
      window.__monsterindex_selector_unsaved = true;
      setStatus('Restarted. Click the product price to begin again.', 'info');
      updateUi();
    });
  }

  if (saveBtn instanceof HTMLButtonElement) {
    saveBtn.addEventListener('click', submitAndValidate);
  }

  if (backBtn instanceof HTMLButtonElement) {
    backBtn.addEventListener('click', () => {
      if (window.__monsterindex_selector_unsaved && !window.confirm('You still have unsaved selector changes. Leave anyway?')) {
        return;
      }

      window.__monsterindex_selector_unsaved = false;
      window.location.assign(returnUrl);
    });
  }

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('click', onClick, true);
  window.addEventListener('beforeunload', onBeforeUnload);

  setStatus('Step 1: Click the product price on the page.', 'info');
  updateUi();
})();
