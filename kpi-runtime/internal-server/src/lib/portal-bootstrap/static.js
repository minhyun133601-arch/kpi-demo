import { PORTAL_DATA_BOOTSTRAP_PATH } from './shared.js';

function buildPortalDataBootstrapTag() {
  return `    <script src="${PORTAL_DATA_BOOTSTRAP_PATH}"></script>\n`;
}

export function injectPortalDataBootstrap(html) {
  let nextHtml = String(html || '');
  const bootstrapTag = buildPortalDataBootstrapTag();
  const bootstrapSrc = `src="${PORTAL_DATA_BOOTSTRAP_PATH}"`;
  if (nextHtml.includes(bootstrapSrc)) {
    return {
      html: nextHtml,
      inserted: false,
    };
  }

  let inserted = false;
  if (!inserted) {
    const xlsxTag = '<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>';
    if (nextHtml.includes(xlsxTag)) {
      nextHtml = nextHtml.replace(xlsxTag, `${bootstrapTag}    ${xlsxTag}`);
      inserted = true;
    }
  }

  if (!inserted && nextHtml.includes('</body>')) {
    nextHtml = nextHtml.replace('</body>', `${bootstrapTag}</body>`);
    inserted = true;
  }

  return {
    html: nextHtml,
    inserted,
  };
}
