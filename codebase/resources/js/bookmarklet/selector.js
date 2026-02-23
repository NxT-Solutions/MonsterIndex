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
    scriptUrl.searchParams.get('lang') === 'nl' ||
    new URLSearchParams(window.location.search).get('lang') === 'nl'
      ? 'nl'
      : 'en';
  const x = (english, dutch) => (language === 'nl' ? dutch : english);

  if (!token) {
    alert(
      x(
        'MonsterIndex selector token missing. Regenerate the selector session.',
        'MonsterIndex selectortoken ontbreekt. Genereer de selectorsessie opnieuw.',
      ),
    );
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
      <div style="font-size:14px;font-weight:700">${x('Guided Price Selector', 'Geleide Prijsselector')}</div>
      <div style="font-size:12px;color:#475569;margin-top:4px">${x(
        'Click values on the page. If a value is split (example 32 and 99), use "Add Part".',
        'Klik waarden op de pagina. Als een waarde opgesplitst is (bijvoorbeeld 32 en 99), gebruik dan "Deel toevoegen".',
      )}</div>
    </div>
    <div style="padding:12px 14px;display:grid;gap:10px">
      <div id="mi-instruction" style="font-size:13px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px"></div>
      <div style="display:grid;gap:8px">
        <div style="font-size:12px"><strong>${x('Price:', 'Prijs:')}</strong> <span id="mi-price-value" style="color:#475569">${x(
          'Not selected',
          'Niet geselecteerd',
        )}</span></div>
        <div style="font-size:12px"><strong>${x('Shipping:', 'Verzending:')}</strong> <span id="mi-shipping-value" style="color:#475569">${x(
          'Not selected (optional)',
          'Niet geselecteerd (optioneel)',
        )}</span></div>
        <div style="font-size:12px"><strong>${x('Can count:', 'Blik-aantal:')}</strong> <span id="mi-quantity-value" style="color:#475569">${x(
          'Not selected (optional)',
          'Niet geselecteerd (optioneel)',
        )}</span></div>
      </div>
      <div id="mi-status" style="font-size:12px;border-radius:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155"></div>
      <div style="display:grid;gap:6px">
        <div style="font-size:11px;font-weight:600;color:#64748b">${x('Price setup', 'Prijsinstelling')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button id="mi-select-price-main" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${x(
            'Select Price',
            'Selecteer Prijs',
          )}</button>
          <button id="mi-add-price-part" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${x(
            'Add Price Part',
            'Voeg Prijsdeel Toe',
          )}</button>
        </div>
      </div>
      <div style="display:grid;gap:6px">
        <div style="font-size:11px;font-weight:600;color:#64748b">${x(
          'Shipping setup (optional)',
          'Verzendinstelling (optioneel)',
        )}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button id="mi-select-shipping-main" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${x(
            'Select Shipping',
            'Selecteer Verzending',
          )}</button>
          <button id="mi-add-shipping-part" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${x(
            'Add Shipping Part',
            'Voeg Verzendingdeel Toe',
          )}</button>
          <button id="mi-skip-shipping" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${x(
            'Skip Shipping',
            'Sla Verzending Over',
          )}</button>
        </div>
        <input id="mi-shipping-manual" type="text" inputmode="decimal" placeholder="${x(
          'Or type shipping manually (example: 4.99)',
          'Of vul verzendkosten handmatig in (voorbeeld: 4,99)',
        )}" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;color:#0f172a" />
      </div>
      <div style="display:grid;gap:6px">
        <div style="font-size:11px;font-weight:600;color:#64748b">${x(
          'Quantity setup (optional, for price per can)',
          'Aantalinstelling (optioneel, voor prijs per blik)',
        )}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button id="mi-select-quantity-main" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${x(
            'Select Can Count',
            'Selecteer Blik-aantal',
          )}</button>
          <button id="mi-add-quantity-part" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${x(
            'Add Count Part',
            'Voeg Aantaldeel Toe',
          )}</button>
        </div>
        <input id="mi-quantity-manual" type="number" min="1" step="1" placeholder="${x(
          'Or type can count manually (example: 12)',
          'Of vul aantal blikjes handmatig in (voorbeeld: 12)',
        )}" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;color:#0f172a" />
      </div>
      <div style="display:flex;gap:8px">
        <button id="mi-reset" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">${x(
          'Restart',
          'Herstart',
        )}</button>
        <button id="mi-save" type="button" style="flex:1;border:1px solid #0f172a;background:#0f172a;color:#ffffff;border-radius:8px;padding:10px 12px;font-size:12px;font-weight:600;cursor:pointer">${x(
          'Save and Validate',
          'Opslaan en Valideren',
        )}</button>
        <button id="mi-back" type="button" style="border:1px solid #cbd5e1;background:#ffffff;border-radius:8px;padding:10px 12px;font-size:12px;cursor:pointer">${x(
          'Back',
          'Terug',
        )}</button>
      </div>
    </div>
  `;

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
  const shippingManualInput = panel.querySelector('#mi-shipping-manual');
  const selectQuantityMainBtn = panel.querySelector('#mi-select-quantity-main');
  const addQuantityPartBtn = panel.querySelector('#mi-add-quantity-part');
  const quantityManualInput = panel.querySelector('#mi-quantity-manual');
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

    return x(
      `Selected ${parts.length} part${parts.length > 1 ? 's' : ''}`,
      `Geselecteerd: ${parts.length} deel${parts.length > 1 ? 'en' : ''}`,
    );
  };

  const updateInstruction = () => {
    if (!(instructionEl instanceof HTMLElement)) {
      return;
    }

    if (state.mode === 'select-price-main') {
      instructionEl.textContent = x(
        'Click the main price value on the page.',
        'Klik de hoofdprijs op de pagina.',
      );
      return;
    }

    if (state.mode === 'select-price-extra') {
      instructionEl.textContent = x(
        'Click the extra price part (for example cents).',
        'Klik het extra prijsdeel (bijvoorbeeld centen).',
      );
      return;
    }

    if (state.mode === 'select-shipping-main') {
      instructionEl.textContent = x(
        'Click the main shipping amount.',
        'Klik het hoofdverzendbedrag.',
      );
      return;
    }

    if (state.mode === 'select-shipping-extra') {
      instructionEl.textContent = x(
        'Click the extra shipping part (optional).',
        'Klik het extra verzenddeel (optioneel).',
      );
      return;
    }

    if (state.mode === 'select-quantity-main') {
      instructionEl.textContent = x(
        'Click the can count (example: 12 pack).',
        'Klik het aantal blikjes (voorbeeld: 12-pack).',
      );
      return;
    }

    if (state.mode === 'select-quantity-extra') {
      instructionEl.textContent = x(
        'Click extra can-count part if the count is split.',
        'Klik een extra deel van het blik-aantal als het opgesplitst is.',
      );
      return;
    }

    if (state.mode === 'done') {
      instructionEl.textContent = x(
        'Setup saved. You can now go back.',
        'Instelling opgeslagen. Je kunt nu teruggaan.',
      );
      return;
    }

    instructionEl.textContent = x(
      'Use the buttons to select values, then click Save and Validate.',
      'Gebruik de knoppen om waarden te selecteren en klik daarna op Opslaan en Valideren.',
    );
  };

  const updateUi = () => {
    if (priceValueEl instanceof HTMLElement) {
      priceValueEl.textContent = previewParts(state.priceParts, x('Not selected', 'Niet geselecteerd'));
      priceValueEl.style.color = state.priceParts.length > 0 ? '#0f766e' : '#475569';
    }

    if (shippingValueEl instanceof HTMLElement) {
      const manualShipping = cleanText(state.shippingManualValue);
      shippingValueEl.textContent = state.shippingSkipped
        ? x('Skipped', 'Overgeslagen')
        : manualShipping !== ''
        ? x(`Manual: ${manualShipping}`, `Handmatig: ${manualShipping}`)
        : previewParts(state.shippingParts, x('Not selected (optional)', 'Niet geselecteerd (optioneel)'));
      shippingValueEl.style.color =
        state.shippingParts.length > 0 || manualShipping !== '' || state.shippingSkipped
          ? '#0f766e'
          : '#475569';
    }

    if (quantityValueEl instanceof HTMLElement) {
      const manualCount = cleanText(state.quantityManualValue);
      quantityValueEl.textContent =
        manualCount !== ''
          ? x(`Manual: ${manualCount}`, `Handmatig: ${manualCount}`)
          : previewParts(state.quantityParts, x('Not selected (optional)', 'Niet geselecteerd (optioneel)'));
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
        ? x('Saving...', 'Opslaan...')
        : state.done
        ? x('Saved', 'Opgeslagen')
        : x('Save and Validate', 'Opslaan en Valideren');
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
    setStatus(
      x(
        'Saving selectors and validating with a quick scrape...',
        'Selectors opslaan en valideren met een snelle scrape...',
      ),
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
            x(
              'Could not validate these selectors yet. Try selecting clearer values.',
              'Kon deze selectors nog niet valideren. Probeer duidelijkere waarden te selecteren.',
            ),
        );
      }

      state.done = true;
      state.mode = 'done';
      window.__monsterindex_selector_unsaved = false;

      const parsedPrice =
        typeof data.price_cents === 'number'
          ? `${data.currency} ${(data.price_cents / 100).toFixed(2)}`
          : x('Unknown', 'Onbekend');

      const perCanText =
        typeof data.price_per_can_cents === 'number'
          ? x(
              ` • Per can: ${data.currency} ${(data.price_per_can_cents / 100).toFixed(2)}`,
              ` • Per blik: ${data.currency} ${(data.price_per_can_cents / 100).toFixed(2)}`,
            )
          : '';

      setStatus(
        x(
          `Saved successfully. Detected price: ${parsedPrice}${perCanText}.`,
          `Succesvol opgeslagen. Gedetecteerde prijs: ${parsedPrice}${perCanText}.`,
        ),
        'success',
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : x(
              'Save failed. Please retry with another selection.',
              'Opslaan mislukt. Probeer opnieuw met een andere selectie.',
            );
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
        x('Click the main price value.', 'Klik de hoofdprijs.'),
      );
    });
  }

  if (addPricePartBtn instanceof HTMLButtonElement) {
    addPricePartBtn.addEventListener('click', () => {
      startSelection(
        'select-price-extra',
        x(
          'Click the extra price part (for example cents).',
          'Klik het extra prijsdeel (bijvoorbeeld centen).',
        ),
      );
    });
  }

  if (selectShippingMainBtn instanceof HTMLButtonElement) {
    selectShippingMainBtn.addEventListener('click', () => {
      startSelection(
        'select-shipping-main',
        x('Click the main shipping amount.', 'Klik het hoofdverzendbedrag.'),
      );
    });
  }

  if (addShippingPartBtn instanceof HTMLButtonElement) {
    addShippingPartBtn.addEventListener('click', () => {
      startSelection(
        'select-shipping-extra',
        x('Click the extra shipping part.', 'Klik het extra verzenddeel.'),
      );
    });
  }

  if (skipShippingBtn instanceof HTMLButtonElement) {
    skipShippingBtn.addEventListener('click', () => {
      if (state.priceParts.length === 0) {
        setStatus(
          x(
            'Select a price before skipping shipping.',
            'Selecteer eerst een prijs voordat je verzending overslaat.',
          ),
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
        x('Shipping skipped. You can save now.', 'Verzending overgeslagen. Je kunt nu opslaan.'),
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
        x(
          'Click the can count (for example 12 pack).',
          'Klik het aantal blikjes (bijvoorbeeld 12-pack).',
        ),
      );
    });
  }

  if (addQuantityPartBtn instanceof HTMLButtonElement) {
    addQuantityPartBtn.addEventListener('click', () => {
      startSelection(
        'select-quantity-extra',
        x(
          'Click the extra count part if needed.',
          'Klik indien nodig het extra aantaldeel.',
        ),
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
      state.done = false;
      state.mode = 'select-price-main';
      window.__monsterindex_selector_unsaved = true;
      setStatus(
        x(
          'Restarted. Click the main price value to begin.',
          'Herstart. Klik de hoofdprijs om te beginnen.',
        ),
        'info',
      );
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
        !window.confirm(
          x(
            'You still have unsaved selector changes. Leave anyway?',
            'Je hebt nog niet-opgeslagen selectorwijzigingen. Toch verlaten?',
          ),
        )
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
      setStatus(
        x(
          'Main price selected. Add another part if needed.',
          'Hoofdprijs geselecteerd. Voeg indien nodig een extra deel toe.',
        ),
        'success',
      );
      updateUi();
      return;
    }

    if (state.mode === 'select-price-extra') {
      state.priceParts.push(selector);
      state.mode = 'idle';
      setStatus(x('Extra price part added.', 'Extra prijsdeel toegevoegd.'), 'success');
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
      setStatus(x('Main shipping selected.', 'Hoofdverzending geselecteerd.'), 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-shipping-extra') {
      state.shippingParts.push(selector);
      state.shippingSkipped = false;
      state.mode = 'idle';
      setStatus(
        x('Extra shipping part added.', 'Extra verzenddeel toegevoegd.'),
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
      setStatus(x('Can count selected.', 'Blik-aantal geselecteerd.'), 'success');
      updateUi();
      return;
    }

    if (state.mode === 'select-quantity-extra') {
      state.quantityParts.push(selector);
      state.mode = 'idle';
      setStatus(
        x('Extra can-count part added.', 'Extra blik-aantaldeel toegevoegd.'),
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
    x('Step 1: click the main price value.', 'Stap 1: klik de hoofdprijs.'),
    'info',
  );
  updateUi();
})();
