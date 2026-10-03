// Small, idempotent DOM annotations; all Antigravity controls stay native.
(() => {
  if (globalThis.__antigravityGeminiStyleV3) return;
  globalThis.__antigravityGeminiStyleV3 = true;
  const css = __GEMINI_CSS__;
  const workspace = { open: false, plus: null, project: null, environment: null, panel: null };
  function closeWorkspace(restoreFocus = false) {
    // Dismiss child popups through their native handler before hiding the anchor.
    // Otherwise Base UI can leave an invisible modal backdrop over the editor.
    for (const root of [workspace.project, workspace.environment]) {
      const trigger = root?.querySelector('[aria-expanded="true"][aria-controls]');
      const popup = trigger && document.getElementById(trigger.getAttribute('aria-controls'));
      popup?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', bubbles: true, cancelable: true}));
    }
    workspace.open = false;
    workspace.panel?.remove();
    workspace.panel = null;
    document.documentElement.removeAttribute('data-gemini-workspace-open');
    if (restoreFocus) workspace.plus?.focus();
  }
  function positionWorkspace() {
    if (!workspace.open || !workspace.plus?.isConnected) return;
    const rect = workspace.plus.getBoundingClientRect();
    const height = workspace.project ? 164 : 112;
    const width = Math.min(320, innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left - 8, innerWidth - width - 12));
    const top = rect.bottom + height + 16 <= innerHeight ? rect.bottom + 16 : Math.max(12, rect.top - height - 16);
    const root = document.documentElement;
    for (const [key, value] of Object.entries({left, top, width, height})) root.style.setProperty('--gemini-workspace-' + key, value + 'px');
  }
  function openWorkspace() {
    if (workspace.plus?.getAttribute('aria-expanded') === 'true') {
      document.getElementById(workspace.plus.getAttribute('aria-controls'))?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', bubbles: true, cancelable: true}));
    }
    closeWorkspace();
    workspace.open = true;
    const panel = document.createElement('div');
    panel.className = 'gemini-workspace-panel';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Workspace');
    panel.setAttribute('aria-owns', [workspace.project?.id, workspace.environment?.id].filter(Boolean).join(' '));
    const heading = document.createElement('span');
    heading.textContent = 'Workspace';
    panel.append(heading);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'gemini-workspace-close';
    close.setAttribute('aria-label', 'Close workspace');
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    close.addEventListener('click', () => closeWorkspace(true));
    panel.append(close);
    workspace.panel = panel;
    let mount = workspace.project || workspace.environment;
    const other = workspace.environment || workspace.project;
    while (mount && (!mount.contains(other) || mount === other)) mount = mount.parentElement;
    (mount || document.body).append(panel);
    mark(document.documentElement, 'data-gemini-workspace-open', workspace.project ? 'project-and-environment' : 'environment');
    positionWorkspace();
    (workspace.project?.querySelector('button') || workspace.environment?.querySelector('button') || close).focus();
  }
  function annotateWorkspace(plus, project, environment) {
    if (workspace.open && (workspace.plus !== plus || workspace.project !== project || workspace.environment !== environment)) closeWorkspace();
    workspace.plus = plus;
    workspace.project = project;
    workspace.environment = environment;
    // Native focus restoration can reopen a popup after its anchor is hidden.
    // Keep the native modal state in sync with Workspace visibility.
    if (!document.documentElement.hasAttribute('data-gemini-workspace-open') &&
        (project?.querySelector('[aria-expanded="true"]') || environment?.querySelector('[aria-expanded="true"]'))) {
      closeWorkspace();
    }
    if (project) {
      mark(project, 'data-gemini-workspace-project');
      if (!project.id) project.id = 'gemini-workspace-project';
    }
    if (environment) {
      mark(environment, 'data-gemini-workspace-environment');
      if (!environment.id) environment.id = 'gemini-workspace-environment';
      mark(environment.closest('.h-fit'), 'data-gemini-runtime-footer');
    }
    const menu = plus?.getAttribute('aria-expanded') === 'true' ? document.getElementById(plus.getAttribute('aria-controls')) : null;
    if (!menu || (!project && !environment)) return;
    mark(menu, 'data-gemini-context-menu');
    const existing = menu.querySelector('.gemini-workspace-menu-item');
    if (existing) { existing.removeAttribute('aria-haspopup'); return; }
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'gemini-workspace-menu-item';
    row.setAttribute('role', 'menuitem');
    row.setAttribute('tabindex', '-1');
    row.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v11H3V7Z"/></svg><span>Workspace</span><svg class="gemini-workspace-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
    menu.append(row);
  }
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
    const navigation = [...document.querySelectorAll('[data-gemini-nav-tools]')].find(element => !element.closest('[data-aux-pane-open]'));
    const titleBar = document.querySelector('[data-testid="title-menu-bar"]');
    const boundary = Math.max(navigation?.getBoundingClientRect().bottom || 0, titleBar?.getBoundingClientRect().bottom || 0);
    const available = Math.max(96, Math.min(360, Math.floor((surface?.getBoundingClientRect().top || 0) - boundary - 12)));
    for (const menu of document.querySelectorAll('[data-mention-menu], [data-command-menu]')) {
      if (menu.style.getPropertyValue('--gemini-typeahead-height') !== available + 'px') menu.style.setProperty('--gemini-typeahead-height', available + 'px');
    }
    mark([...(surface?.children || [])].find(element => element.contains(input)), 'data-gemini-composer-editor');
    const controls = [...(surface?.children || [])].find(element => element.querySelector('[aria-label="Add context"]'));
    mark(controls, 'data-gemini-composer-controls');
    mark(controls?.querySelector('[aria-label="Add context"]')?.parentElement, 'data-gemini-context-cluster');
    const project = document.querySelector('[data-testid="project-selector-trigger"]')?.closest('.relative.w-full');
    const environment = document.querySelector('[aria-label="Select Environment"]')?.parentElement?.parentElement;
    annotateWorkspace(controls?.querySelector('[aria-label="Add context"]'), project, environment);
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
    new MutationObserver(schedule).observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'aria-expanded', 'aria-controls', 'aria-label', 'data-active-tab-id']});
    const handleWorkspaceClick = event => {
      if (!event.target.closest('.gemini-workspace-menu-item')) return;
      event.preventDefault(); event.stopPropagation(); openWorkspace();
    };
    // Register at the document boundary so the native menu retains its own handlers.
    const handleWorkspaceKeys = event => {
      const menu = document.querySelector('[data-gemini-context-menu]');
      const row = menu?.querySelector('.gemini-workspace-menu-item');
      if (!row || !menu.contains(document.activeElement)) return;
      const items = [...menu.querySelectorAll('[role="menuitem"]')].filter(item => item !== row && !item.hasAttribute('data-disabled'));
      const active = document.activeElement;
      if (event.key === 'End' || event.key === 'ArrowDown' && active === items.at(-1) || event.key === 'ArrowUp' && active === items[0]) {
        event.preventDefault(); event.stopPropagation(); row.focus();
      } else if (active === row && ['ArrowUp', 'ArrowDown', 'Home', 'Enter', ' '].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        if (event.key === 'Enter' || event.key === ' ') openWorkspace();
        else (event.key === 'ArrowUp' ? items.at(-1) : items[0])?.focus();
      }
    };
    globalThis.__geminiWorkspaceEvents = {click: handleWorkspaceClick, keydown: handleWorkspaceKeys};
    if (!globalThis.__geminiWorkspaceEventsBound) {
      globalThis.__geminiWorkspaceEventsBound = true;
      addEventListener('click', event => globalThis.__geminiWorkspaceEvents.click(event), true);
      addEventListener('keydown', event => globalThis.__geminiWorkspaceEvents.keydown(event), true);
    }
    document.addEventListener('pointerdown', event => {
      if (!workspace.open || event.target.closest('.gemini-workspace-panel, [data-gemini-workspace-project], [data-gemini-workspace-environment], [role="menu"], [role="dialog"]')) return;
      closeWorkspace();
    }, true);
    document.addEventListener('keydown', event => {
      if (!workspace.open || event.key !== 'Escape') return;
      if (workspace.project?.querySelector('[aria-expanded="true"]') || workspace.environment?.querySelector('[aria-expanded="true"]')) return;
      event.preventDefault(); closeWorkspace(true);
    });
    addEventListener('resize', () => { positionWorkspace(); schedule(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
