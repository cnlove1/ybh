type ElementPreviewStyle = {
  fontSize?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  boxShadow?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  width?: string;
  height?: string;
};

type PickerCommand = {
  type: 'APP_ELEMENT_PICKER_ENABLE' | 'APP_ELEMENT_PICKER_DISABLE';
} | {
  type: 'APP_ELEMENT_STYLE_APPLY';
  payload?: {
    key: string;
    selector?: string;
    domPath?: string;
    styles?: ElementPreviewStyle;
  };
} | {
  type: 'APP_ELEMENT_STYLE_CLEAR';
  payload?: {
    key?: string;
  };
} | {
  type: 'APP_ELEMENT_MARKER_ADD';
  payload: {
    key: string;
    index: number;
    selector?: string;
    domPath?: string;
  };
} | {
  type: 'APP_ELEMENT_MARKER_REMOVE';
  payload: { key: string };
} | {
  type: 'APP_ELEMENT_MARKER_CLEAR';
};

type SelectedElementRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
};

type SelectedElementContext = {
  id: string;
  label: string;
  tagName: string;
  text?: string;
  ariaLabel?: string;
  idAttribute?: string;
  className?: string;
  selector: string;
  domPath: string;
  rect: SelectedElementRect;
  viewport: {
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
  };
  computedStyle?: {
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    fontWeight?: string;
    textAlign?: string;
    borderRadius?: string;
    borderColor?: string;
    borderWidth?: string;
    boxShadow?: string;
    display?: string;
    margin?: string;
    marginTop?: string;
    marginRight?: string;
    marginBottom?: string;
    marginLeft?: string;
    padding?: string;
    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    width?: string;
    height?: string;
  };
  outerHTMLPreview?: string;
  nearbyText?: string;
};

const HIGHLIGHT_ID = '__vibe_element_picker_highlight__';
const LABEL_ID = '__vibe_element_picker_label__';
const MAX_TEXT_LEN = 180;
const MAX_HTML_LEN = 1200;

const STYLE_KEYS: (keyof ElementPreviewStyle)[] = [
  'fontSize', 'color', 'fontWeight', 'textAlign', 'backgroundColor',
  'borderColor', 'borderWidth', 'borderRadius', 'boxShadow',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'width', 'height',
];

let enabled = false;
// 锁定态：点击选中元素后置为 true，高亮框固定在选中元素上，暂停 hover 跟随与再次点击
let locked = false;
let currentElement: Element | null = null;
let highlightEl: HTMLDivElement | null = null;
let labelEl: HTMLDivElement | null = null;

const previewStyleRecords = new Map<string, {
  element: HTMLElement;
  previous: Record<string, string>;
  priority: Record<string, string>;
}>();

const markers = new Map<string, {
  element: HTMLDivElement;
  targetSelector?: string;
  targetDomPath?: string;
}>();

let markerUpdateTimer: ReturnType<typeof setTimeout> | null = null;

function truncate(value: string | undefined | null, max: number): string | undefined {
  const text = value?.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function getElementLabel(el: Element): string {
  const aria = el.getAttribute('aria-label');
  const text = truncate(el.textContent, 40);
  const id = el.id ? `#${el.id}` : '';
  return aria || text || id || el.tagName.toLowerCase();
}

function getSelector(el: Element): string {
  if (el.id) return `#${cssEscape(el.id)}`;
  const path: string[] = [];
  let node: Element | null = el;

  while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.body) {
    const tag = node.tagName.toLowerCase();
    const classNames = Array.from(node.classList).slice(0, 2).map(cssEscape);
    let segment = tag + (classNames.length ? `.${classNames.join('.')}` : '');
    const parent: HTMLElement | null = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(item => item.tagName === node!.tagName);
      if (siblings.length > 1) {
        segment += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
    }
    path.unshift(segment);
    node = parent;
  }

  return path.length ? path.join(' > ') : el.tagName.toLowerCase();
}

function getDomPath(el: Element): string {
  const path: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    const tag = node.tagName.toLowerCase();
    const index = node.parentElement
      ? Array.from(node.parentElement.children).indexOf(node) + 1
      : 1;
    path.unshift(`${tag}[${index}]`);
    node = node.parentElement;
  }
  return path.join('/');
}

function getElementByDomPath(path: string | undefined): HTMLElement | null {
  if (!path) return null;
  const segments = path.split('/').filter(Boolean);
  let node: Element | null = document.documentElement;

  for (let i = 1; i < segments.length; i++) {
    const match = segments[i].match(/^([a-z0-9-]+)\[(\d+)\]$/i);
    if (!match || !node) return null;
    const tag = match[1].toLowerCase();
    const index = Number(match[2]) - 1;
    const children: Element[] = Array.from(node.children).filter(child => child.tagName.toLowerCase() === tag);
    node = children[index] || null;
  }

  return node instanceof HTMLElement ? node : null;
}

function findEditableElement(selector?: string, domPath?: string): HTMLElement | null {
  if (selector) {
    try {
      const element = document.querySelector(selector);
      if (element instanceof HTMLElement) return element;
    } catch {
      // Fallback to domPath below.
    }
  }
  return getElementByDomPath(domPath);
}

function getNearbyText(el: Element): string | undefined {
  const parentText = truncate(el.parentElement?.textContent, MAX_TEXT_LEN);
  const ownText = truncate(el.textContent, MAX_TEXT_LEN);
  if (parentText && parentText !== ownText) return parentText;
  return ownText;
}

function ensureOverlay(): void {
  if (!highlightEl) {
    highlightEl = document.createElement('div');
    highlightEl.id = HIGHLIGHT_ID;
    Object.assign(highlightEl.style, {
      position: 'fixed',
      zIndex: '2147483646',
      pointerEvents: 'none',
      border: '2px solid #165dff',
      borderRadius: '8px',
      boxShadow: '0 0 0 4px rgba(22, 93, 255, 0.16)',
      background: 'rgba(22, 93, 255, 0.08)',
      transition: 'all 80ms ease',
      display: 'none',
    });
    document.body.appendChild(highlightEl);
  }

  if (!labelEl) {
    labelEl = document.createElement('div');
    labelEl.id = LABEL_ID;
    Object.assign(labelEl.style, {
      position: 'fixed',
      zIndex: '2147483647',
      pointerEvents: 'none',
      padding: '4px 8px',
      borderRadius: '999px',
      background: '#165dff',
      color: '#fff',
      fontSize: '12px',
      lineHeight: '18px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxShadow: '0 8px 20px rgba(22, 93, 255, 0.24)',
      display: 'none',
    });
    document.body.appendChild(labelEl);
  }
}

function updateOverlay(el: Element): void {
  ensureOverlay();
  const rect = el.getBoundingClientRect();
  if (!highlightEl || !labelEl) return;

  Object.assign(highlightEl.style, {
    display: 'block',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });

  labelEl.textContent = getElementLabel(el);
  Object.assign(labelEl.style, {
    display: 'block',
    top: `${Math.max(8, rect.top - 30)}px`,
    left: `${Math.max(8, rect.left)}px`,
  });
}

function hideOverlay(): void {
  if (highlightEl) highlightEl.style.display = 'none';
  if (labelEl) labelEl.style.display = 'none';
  currentElement = null;
}

function buildElementContext(el: Element): SelectedElementContext {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  const className = el instanceof HTMLElement ? el.className : el.getAttribute('class') || '';

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label: getElementLabel(el),
    tagName: el.tagName.toLowerCase(),
    text: truncate(el.textContent, MAX_TEXT_LEN),
    ariaLabel: el.getAttribute('aria-label') || undefined,
    idAttribute: el.id || undefined,
    className: typeof className === 'string' ? truncate(className, 240) : undefined,
    selector: getSelector(el),
    domPath: getDomPath(el),
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      left: Math.round(rect.left),
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    },
    computedStyle: {
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      textAlign: style.textAlign,
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      borderWidth: style.borderWidth,
      boxShadow: style.boxShadow,
      display: style.display,
      marginTop: style.marginTop,
      marginRight: style.marginRight,
      marginBottom: style.marginBottom,
      marginLeft: style.marginLeft,
      paddingTop: style.paddingTop,
      paddingRight: style.paddingRight,
      paddingBottom: style.paddingBottom,
      paddingLeft: style.paddingLeft,
      width: style.width,
      height: style.height,
    },
    outerHTMLPreview: truncate(el.outerHTML, MAX_HTML_LEN),
    nearbyText: getNearbyText(el),
  };
}

function isPickerOverlay(target: EventTarget | null): boolean {
  if (target === highlightEl || target === labelEl) return true;
  if (target instanceof HTMLElement && target.dataset.vibeMarker) return true;
  return false;
}

function onPointerMove(event: PointerEvent): void {
  if (!enabled || locked || isPickerOverlay(event.target)) return;
  const target = event.target;
  if (!(target instanceof Element) || target === document.documentElement || target === document.body) return;
  currentElement = target;
  updateOverlay(target);
}

function onClick(event: MouseEvent): void {
  if (!enabled || locked || isPickerOverlay(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const target = currentElement || (event.target instanceof Element ? event.target : null);
  if (!target) return;

  // 锁定选择：高亮框固定在选中元素上，停止 hover 跟随与后续点击，
  // 直到外部（取消/确认）发来 APP_ELEMENT_PICKER_ENABLE 才解锁。
  locked = true;
  currentElement = target;
  updateOverlay(target);

  const payload = buildElementContext(target);
  window.parent.postMessage({
    type: 'APP_ELEMENT_SELECTED',
    payload,
  }, '*');
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    window.parent.postMessage({ type: 'APP_ELEMENT_PICKER_CANCELLED' }, '*');
    disablePicker();
  }
}

function enablePicker(): void {
  if (enabled) return;
  enabled = true;
  ensureOverlay();
  document.documentElement.style.cursor = 'crosshair';
  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('click', onClick, true);
  window.addEventListener('keydown', onKeyDown, true);
}

function disablePicker(): void {
  if (!enabled) return;
  enabled = false;
  locked = false;
  document.documentElement.style.cursor = '';
  window.removeEventListener('pointermove', onPointerMove, true);
  window.removeEventListener('click', onClick, true);
  window.removeEventListener('keydown', onKeyDown, true);
  hideOverlay();
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}

function applyPreviewStyle(payload: { key: string; selector?: string; domPath?: string; styles?: ElementPreviewStyle }): void {
  if (!payload?.key) return;
  const element = findEditableElement(payload.selector, payload.domPath);
  if (!element) return;

  if (!previewStyleRecords.has(payload.key)) {
    const previous: Record<string, string> = {};
    const priority: Record<string, string> = {};
    for (const k of STYLE_KEYS) {
      const prop = camelToKebab(k);
      previous[k] = element.style.getPropertyValue(prop);
      priority[k] = element.style.getPropertyPriority(prop);
    }
    previewStyleRecords.set(payload.key, { element, previous, priority });
  }

  if (payload.styles) {
    for (const k of STYLE_KEYS) {
      if (payload.styles[k] !== undefined) {
        element.style.setProperty(camelToKebab(k), payload.styles[k]!, 'important');
      }
    }
  }
}

function clearPreviewStyle(key?: string): void {
  const keys = key ? [key] : Array.from(previewStyleRecords.keys());
  keys.forEach(itemKey => {
    const record = previewStyleRecords.get(itemKey);
    if (!record) return;
    for (const k of STYLE_KEYS) {
      const prop = camelToKebab(k);
      if (record.previous[k]) {
        record.element.style.setProperty(prop, record.previous[k], record.priority[k] || '');
      } else {
        record.element.style.removeProperty(prop);
      }
    }
    previewStyleRecords.delete(itemKey);
  });
}

// ---- Marker System ----

function createMarkerElement(index: number, key: string): HTMLDivElement {
  const el = document.createElement('div');
  el.dataset.vibeMarker = key;
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: '2147483645',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: '#165dff',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '700',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(22, 93, 255, 0.4)',
    border: '2px solid #fff',
    pointerEvents: 'auto',
    transition: 'transform 0.15s ease',
    userSelect: 'none',
  });
  el.textContent = String(index);
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
  el.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    window.parent.postMessage({ type: 'APP_ELEMENT_MARKER_CLICK', payload: { key } }, '*');
  });
  return el;
}

function positionMarker(markerEl: HTMLDivElement, targetEl: HTMLElement): void {
  const rect = targetEl.getBoundingClientRect();
  markerEl.style.top = `${Math.max(0, rect.top - 8)}px`;
  markerEl.style.left = `${Math.max(0, rect.right - 8)}px`;
}

function addMarker(payload: { key: string; index: number; selector?: string; domPath?: string }): void {
  if (markers.has(payload.key)) {
    removeMarker(payload.key);
  }
  const targetEl = findEditableElement(payload.selector, payload.domPath);
  const markerEl = createMarkerElement(payload.index, payload.key);
  document.body.appendChild(markerEl);

  if (targetEl) {
    positionMarker(markerEl, targetEl);
  }

  markers.set(payload.key, {
    element: markerEl,
    targetSelector: payload.selector,
    targetDomPath: payload.domPath,
  });
}

function removeMarker(key: string): void {
  const marker = markers.get(key);
  if (!marker) return;
  marker.element.remove();
  markers.delete(key);
}

function clearMarkers(): void {
  markers.forEach(marker => marker.element.remove());
  markers.clear();
}

function updateMarkerPositions(): void {
  markers.forEach(marker => {
    const targetEl = findEditableElement(marker.targetSelector, marker.targetDomPath);
    if (targetEl) {
      positionMarker(marker.element, targetEl);
    }
  });
}

function scheduleMarkerUpdate(): void {
  if (markerUpdateTimer) return;
  markerUpdateTimer = setTimeout(() => {
    markerUpdateTimer = null;
    updateMarkerPositions();
  }, 100);
}

if (typeof window !== 'undefined' && window !== window.parent) {
  window.addEventListener('scroll', scheduleMarkerUpdate, true);
  window.addEventListener('resize', scheduleMarkerUpdate);

  window.addEventListener('message', (event: MessageEvent<PickerCommand>) => {
    if (event.data?.type === 'APP_ELEMENT_PICKER_ENABLE') {
      // 解锁并恢复可选择状态：清掉上一次固定的高亮框，等待重新 hover
      locked = false;
      hideOverlay();
      enablePicker();
    }
    if (event.data?.type === 'APP_ELEMENT_PICKER_DISABLE') {
      disablePicker();
    }
    if (event.data?.type === 'APP_ELEMENT_STYLE_APPLY') {
      applyPreviewStyle(event.data.payload as any);
    }
    if (event.data?.type === 'APP_ELEMENT_STYLE_CLEAR') {
      clearPreviewStyle(event.data.payload?.key);
    }
    if (event.data?.type === 'APP_ELEMENT_MARKER_ADD') {
      addMarker(event.data.payload);
    }
    if (event.data?.type === 'APP_ELEMENT_MARKER_REMOVE') {
      removeMarker(event.data.payload.key);
    }
    if (event.data?.type === 'APP_ELEMENT_MARKER_CLEAR') {
      clearMarkers();
    }
  });
}
