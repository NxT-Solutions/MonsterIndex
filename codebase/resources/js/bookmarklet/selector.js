(function () {
  const scriptTag = document.currentScript;
  const scriptUrl = new URL(scriptTag.src);
  const token = scriptUrl.searchParams.get('token');

  if (!token) {
    alert('MonsterIndex selector token missing. Regenerate the bookmarklet session.');
    return;
  }

  const captureEndpoint = new URL('/api/bookmarklet/capture', scriptUrl.origin);

  const state = {
    step: 'price',
    price: null,
    shipping: null,
  };

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '16px';
  overlay.style.right = '16px';
  overlay.style.zIndex = '2147483647';
  overlay.style.background = '#0f172a';
  overlay.style.color = '#fff';
  overlay.style.padding = '12px 14px';
  overlay.style.borderRadius = '10px';
  overlay.style.fontFamily = 'ui-sans-serif,system-ui,-apple-system,sans-serif';
  overlay.style.fontSize = '12px';
  overlay.style.maxWidth = '320px';
  overlay.style.boxShadow = '0 10px 30px rgba(2,6,23,.4)';
  overlay.textContent = 'MonsterIndex: Click the product price element.';
  document.body.appendChild(overlay);

  let highlighted = null;

  const cleanup = () => {
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (highlighted) {
      highlighted.style.outline = highlighted.dataset.__monsterindex_outline || '';
      delete highlighted.dataset.__monsterindex_outline;
    }
  };

  const setOverlayText = (text) => {
    overlay.textContent = text;
  };

  const onMouseOver = (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;

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

  const onMouseOut = () => {};

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

  const onClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const el = event.target;
    if (!(el instanceof Element)) return;

    if (state.step === 'price') {
      state.price = toSelector(el);

      if (window.confirm('Capture an optional shipping selector now?')) {
        state.step = 'shipping';
        setOverlayText('MonsterIndex: Click the shipping-cost element.');
        return;
      }

      submitAndFinish();
      return;
    }

    if (state.step === 'shipping') {
      state.shipping = toSelector(el);
      submitAndFinish();
    }
  };

  const submitAndFinish = () => {
    const params = new URLSearchParams({
      token,
      page_url: window.location.href,
      page_title: document.title,
      price_css: state.price?.css || '',
      price_xpath: state.price?.xpath || '',
      price_sample: state.price?.sample_text || '',
      shipping_css: state.shipping?.css || '',
      shipping_xpath: state.shipping?.xpath || '',
      shipping_sample: state.shipping?.sample_text || '',
    });

    cleanup();
    const captureUrl = `${captureEndpoint.toString()}?${params.toString()}`;
    window.open(captureUrl, '_blank', 'noopener,noreferrer,width=640,height=720');
    alert('MonsterIndex: selectors submitted. Check the opened tab for validation status.');
  };

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('click', onClick, true);
})();
