import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_CONTAINER_MARKUP = '<div id="navbar-container"></div>';
const DEFAULT_NAV_REGEX = /<div[^>]*class="[^"]*nav-bar[^"]*"[^>]*>[\s\S]*?<\/div>/;

export type SharedNavOptions = {
  sharedRoot: string;
  activeHrefs?: string[];
  fallbackHtml: string;
  includeNavHeightScript?: boolean;
};

export type InjectSharedNavOptions = {
  html: string;
  navBarHtml: string;
  replaceExistingNavBar?: boolean;
  containerMarkup?: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function withActiveHref(navBarHtml: string, href: string): string {
  const escapedHref = escapeRegExp(href);
  const withDoubleQuote = new RegExp(`href="${escapedHref}"(?![^>]*\\bclass=)`, 'g');
  const withSingleQuote = new RegExp(`href='${escapedHref}'(?![^>]*\\bclass=)`, 'g');

  return navBarHtml
    .replace(withDoubleQuote, `href="${href}" class="on"`)
    .replace(withSingleQuote, `href='${href}' class="on"`);
}

export function readSharedNavBarHtml(sharedRoot: string, fallbackHtml: string): string {
  const navBarPath = path.join(sharedRoot, 'nav-bar.html');
  try {
    return fs.readFileSync(navBarPath, 'utf-8');
  } catch (error) {
    console.error('[shared-nav] failed to read nav bar:', navBarPath, error);
    return fallbackHtml;
  }
}

export function buildSharedNavBarHtml(options: SharedNavOptions): string {
  const activeHrefs = options.activeHrefs ?? [];
  let navBarHtml = readSharedNavBarHtml(options.sharedRoot, options.fallbackHtml);

  for (const href of activeHrefs) {
    navBarHtml = withActiveHref(navBarHtml, href);
  }

  if (options.includeNavHeightScript === false) {
    return navBarHtml;
  }

  return `${navBarHtml}
<script>
(function() {
  function setNavHeight() {
    const navBar = document.querySelector('.nav-bar');
    if (!navBar) {
      return;
    }
    const height = navBar.offsetHeight;
    document.documentElement.style.setProperty('--nav-height', height + 'px');
    document.body.style.paddingTop = 'var(--nav-height)';
  }

  const observer = new MutationObserver(function() {
    if (document.querySelector('.nav-bar')) {
      observer.disconnect();
      setNavHeight();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  setNavHeight();
  document.addEventListener('DOMContentLoaded', setNavHeight);
  window.addEventListener('load', setNavHeight);
  window.addEventListener('resize', setNavHeight);
})();
</script>`;
}

export function injectSharedNavBar(options: InjectSharedNavOptions): string {
  const containerMarkup = options.containerMarkup ?? DEFAULT_CONTAINER_MARKUP;

  if (options.html.includes(containerMarkup)) {
    return options.html.replace(containerMarkup, `<div id="navbar-container">${options.navBarHtml}</div>`);
  }

  if (options.replaceExistingNavBar !== false && DEFAULT_NAV_REGEX.test(options.html)) {
    return options.html.replace(DEFAULT_NAV_REGEX, options.navBarHtml);
  }

  if (options.html.includes('<body>')) {
    return options.html.replace('<body>', `<body>${options.navBarHtml}`);
  }

  return `${options.navBarHtml}${options.html}`;
}
