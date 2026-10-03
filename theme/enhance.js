// Small, idempotent DOM annotations; all Antigravity controls stay native.
(() => {
  if (globalThis.__antigravityGeminiStyleV2) return;
  globalThis.__antigravityGeminiStyleV2 = true;
  const css = __GEMINI_CSS__;
  function mark(element, attribute, value = '') {
    if (element && element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
  }
  function annotate() {
    let sheet = document.getElementById('antigravity-gemini-theme');
    if (!sheet) {
      sheet = document.createElement('style');
      sheet.id = 'antigravity-gemini-theme';
      sheet.textContent = css;
      (document.head || document.documentElement).append(sheet);
    }
    if (sheet.textContent !== css) sheet.textContent = css;
    const sidebar = document.querySelector('[role="navigation"][aria-label="Sidebar"]');
    if (sidebar) {
      const inner = sidebar.parentElement;
      const frame = inner?.parentElement;
      const shell = sidebar.closest('[style*="--sidebar-width"]');
      const expanded = !!frame && parseFloat(frame.style.width) > 0 && frame.style.visibility !== 'hidden';
      for (const [element, marker] of [[inner,'data-gemini-sidebar-inner'], [frame,'data-gemini-sidebar-frame'], [shell,'data-gemini-shell']]) {
        if (!element) continue;
        if (!element.hasAttribute(marker)) element.setAttribute(marker, '');
        const flag = String(expanded);
        if (element.getAttribute('data-gemini-expanded') !== flag) element.setAttribute('data-gemini-expanded', flag);
      }
      const top = sidebar.firstElementChild;
      if (top && !top.querySelector('.gemini-antigravity-brand')) {
        const brand = document.createElement('span');
        brand.className = 'gemini-antigravity-brand';
        brand.textContent = 'Antigravity';
        top.append(brand);
      }
    }
    const toggle = [...document.querySelectorAll('[data-testid="sidebar-toggle"]')].find(element => !element.closest('[data-aux-pane-open]'));
    mark(toggle?.parentElement, 'data-gemini-nav-controls');
    mark(toggle?.parentElement?.parentElement, 'data-gemini-nav-tools');
    let breadcrumbRow = document.querySelector('[data-testid="breadcrumb-segment"]');
    while (breadcrumbRow && !breadcrumbRow.style.paddingLeft.includes('--static-cluster-width')) breadcrumbRow = breadcrumbRow.parentElement;
    mark(breadcrumbRow, 'data-gemini-breadcrumb-row');
    for (const pane of document.querySelectorAll('[data-aux-pane-open]')) {
      const tabs = pane.querySelector('[data-active-tab-id]');
      for (const tab of tabs?.querySelectorAll('[data-tab-id]') || []) {
        mark(tab, 'data-gemini-tab-selected', String(tab.getAttribute('data-tab-id') === tabs.getAttribute('data-active-tab-id')));
      }
    }
    const picker = document.querySelector('[data-testid="model-selector-trigger"]');
    const selected = picker?.getAttribute('aria-label')?.replace(/^Select model, current:\s*/, '') || '';
    const shortModel = selected.includes('Flash') ? 'Flash' : selected.includes('Pro') ? 'Pro' : selected.includes('Sonnet') ? 'Sonnet' : selected.includes('Opus') ? 'Opus' : selected.includes('GPT-OSS') ? 'GPT-OSS' : selected;
    mark(picker, 'data-gemini-model-short', shortModel);
    mark(picker, 'title', selected);
    for (const panel of document.querySelectorAll('[data-testid="model-selector-panel"]')) {
      mark(panel.closest('[role="menu"]'), 'data-gemini-model-menu');
      for (const row of panel.querySelectorAll('[role="menuitem"]')) {
        const label = row.querySelector('[data-model-base]')?.getAttribute('data-model-base') || row.getAttribute('data-model-label');
        if (!label) continue;
        const content = row.firstElementChild;
        const effort = content?.querySelector('span:nth-child(2)')?.textContent?.trim();
        const badge = content?.querySelector('[data-tooltip-id]');
        const fast = badge?.textContent?.trim() === 'Fast';
        if (fast) mark(badge, 'data-gemini-fast');
        let description = row.querySelector('.gemini-model-description');
        if (!description) {
          description = document.createElement('span');
          description.className = 'gemini-model-description';
          row.append(description);
        }
        let detail = effort ? `${effort} thinking${fast ? ' · Fast' : ''}` : label.includes('Thinking') ? 'Thinking model' : label.includes('Medium') ? 'Medium reasoning' : 'Coding model';
        if (description.textContent !== detail) description.textContent = detail;
        mark(row, 'data-gemini-model-row');
        mark(row, 'data-gemini-selected', String(selected === label || selected.startsWith(label + ' ')));
      }
    }
    mark(document.querySelector('[role="dialog"][aria-label="Settings"]'), 'data-gemini-settings');
    mark(document.querySelector('input[placeholder*="Search conversations"]')?.parentElement, 'data-gemini-history-search');
    for (const toolbar of document.querySelectorAll('[data-testid="cascade-system-message-toolbar"]')) {
      mark(toolbar.parentElement?.parentElement, 'data-gemini-response-actions-wrap');
    }
    for (const body of document.querySelectorAll('[role="article"][aria-label="Agent response"] .md-divider-spacing')) {
      mark(body, 'data-gemini-response-body');
    }
    for (const panel of document.querySelectorAll('[data-testid="running-items-panel"]')) {
      const summary = panel.querySelector('button[aria-expanded]');
      if (summary && !panel.hasAttribute('data-gemini-running-prepared')) {
        mark(panel, 'data-gemini-running-prepared');
        if (summary.getAttribute('aria-expanded') === 'true') summary.click();
      }
    }
    const input = document.querySelector('[aria-label="Message input"]');
    if (!input) return;
    const box = input.closest('[data-testid="agent-input-box"]');
    const container = input.closest('[id="antigravity.agentSidePanelInputBox"]');
    const surface = [...(container?.children || [])].find(element => element.contains(input));
    mark(surface, 'data-gemini-composer-surface');
    mark([...(surface?.children || [])].find(element => element.contains(input)), 'data-gemini-composer-editor');
    const controls = [...(surface?.children || [])].find(element => element.querySelector('[aria-label="Add context"]'));
    mark(controls, 'data-gemini-composer-controls');
    mark(controls?.querySelector('[aria-label="Add context"]')?.parentElement, 'data-gemini-context-cluster');
    const placeholder = input.nextElementSibling;
    if (placeholder?.tagName === 'P' && placeholder.textContent !== 'Ask Antigravity') {
      mark(input, 'title', 'Ask Antigravity. Use @ to mention context or / for actions.');
      placeholder.textContent = 'Ask Antigravity';
    }
    const conversation = input.closest('[data-testid="conversation-view"]');
    if (conversation) {
      const dock = [...conversation.children].find(element => element.contains(box));
      mark(dock, 'data-gemini-conversation-dock');
      mark([...(dock?.children || [])].find(element => element.contains(box)), 'data-gemini-conversation-composer-column');
      if (dock && !dock.querySelector('.gemini-conversation-note')) {
        const note = document.createElement('p');
        note.className = 'gemini-conversation-note';
        note.textContent = 'AI responses can make mistakes.';
        dock.append(note);
      }
      for (const step of conversation.querySelectorAll('[data-testid="user-input-step"]')) {
        const bubble = [...step.querySelectorAll('[data-testid="lifted-context-menu-trigger"]')].find(element => element.querySelector('[data-quotable="true"]'));
        mark(bubble, 'data-gemini-user-bubble');
      }
    }
    let home = input;
    while (home && !home.className?.includes?.('pt-[30vh]')) home = home.parentElement;
    if (home) {
      home.setAttribute('data-gemini-home', '');
      const body = home.parentElement?.parentElement?.parentElement;
      if (body) body.setAttribute('data-gemini-main', '');
      if (!home.querySelector('.gemini-antigravity-greeting')) {
        const heading = document.createElement('h1');
        heading.className = 'gemini-antigravity-greeting';
        heading.textContent = 'What will you build?';
        home.prepend(heading);
      }
      const column = box?.parentElement?.parentElement?.parentElement;
      if (column) column.setAttribute('data-gemini-composer-column', '');
    }
  }
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; annotate(); });
  }
  function start() {
    annotate();
    new MutationObserver(schedule).observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
