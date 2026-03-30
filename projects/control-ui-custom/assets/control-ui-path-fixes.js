(function () {
  const CONFIG_BAD_SUFFIX = '/control-ui-custom/__openclaw/control-ui-config.json';
  const CONFIG_GOOD_URL = new URL('/__openclaw/control-ui-config.json', location.origin).toString();
  const ICON_PATHS = {
    'icon': new URL('/favicon.svg', location.origin).toString(),
    'icon-32': new URL('/favicon-32.png', location.origin).toString(),
    'apple-touch-icon': new URL('/apple-touch-icon.png', location.origin).toString(),
  };

  const rewriteIconHref = (link, value) => {
    const rel = (link?.getAttribute?.('rel') || '').trim().toLowerCase();
    if (rel !== 'icon' && rel !== 'apple-touch-icon') {
      return value;
    }
    const raw = String(value || '');
    if (rel === 'apple-touch-icon') {
      return ICON_PATHS['apple-touch-icon'];
    }
    const sizes = (link.getAttribute('sizes') || '').trim();
    if (
      raw.endsWith('/control-ui-custom/favicon.svg') ||
      raw.endsWith('/control-ui-custom/favicon-32.png') ||
      raw === 'favicon.svg' ||
      raw === './favicon.svg' ||
      raw === 'favicon-32.png' ||
      raw === './favicon-32.png'
    ) {
      return sizes === '32x32' ? ICON_PATHS['icon-32'] : ICON_PATHS.icon;
    }
    return value;
  };

  const normalizeIcons = () => {
    for (const link of document.querySelectorAll('link[rel]')) {
      const rel = (link.getAttribute('rel') || '').trim().toLowerCase();
      if (rel === 'icon') {
        const sizes = (link.getAttribute('sizes') || '').trim();
        const expectedHref = sizes === '32x32' ? ICON_PATHS['icon-32'] : ICON_PATHS.icon;
        if (link.href !== expectedHref) {
          link.href = expectedHref;
        }
        continue;
      }
      if (rel === 'apple-touch-icon') {
        if (link.href !== ICON_PATHS['apple-touch-icon']) {
          link.href = ICON_PATHS['apple-touch-icon'];
        }
      }
    }
  };

  const installFetchRewrite = () => {
    const originalFetch = globalThis.fetch?.bind(globalThis);
    if (!originalFetch) return;
    globalThis.fetch = (input, init) => {
      try {
        const rawUrl =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input instanceof Request
                ? input.url
                : String(input);
        if (rawUrl.endsWith(CONFIG_BAD_SUFFIX)) {
          if (input instanceof Request) {
            return originalFetch(new Request(CONFIG_GOOD_URL, input), init);
          }
          return originalFetch(CONFIG_GOOD_URL, init);
        }
      } catch {}
      return originalFetch(input, init);
    };
  };

  const installIconHrefRewrite = () => {
    const originalSetAttribute = HTMLLinkElement.prototype.setAttribute;
    HTMLLinkElement.prototype.setAttribute = function (name, value) {
      if (String(name).toLowerCase() === 'href') {
        return originalSetAttribute.call(this, name, rewriteIconHref(this, value));
      }
      return originalSetAttribute.call(this, name, value);
    };

    const descriptor = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href');
    if (descriptor?.get && descriptor?.set) {
      Object.defineProperty(HTMLLinkElement.prototype, 'href', {
        configurable: true,
        enumerable: descriptor.enumerable,
        get() {
          return descriptor.get.call(this);
        },
        set(value) {
          descriptor.set.call(this, rewriteIconHref(this, value));
        },
      });
    }
  };

  installFetchRewrite();
  installIconHrefRewrite();
  normalizeIcons();

  const observer = new MutationObserver(() => normalizeIcons());
  observer.observe(document.head, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['href', 'rel', 'sizes'],
  });
})();
