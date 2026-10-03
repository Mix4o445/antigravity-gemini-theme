# Design choices

The visual reference is Gemini's dark desktop conversation interface. Antigravity still needs coding tools, file review, terminals, and task status, so those native surfaces use the same colors and spacing.

| Element | Value |
| --- | --- |
| Conversation background | `#101010` |
| Composer and sidebar surface | `#202020` |
| Hover and selected tool surface | `#303134` |
| Main text | `#e3e3e3` |
| Secondary text | `#b6b8bc` |
| Accent and keyboard focus | `#a8c7fa` |
| Conversation width | Up to 800 CSS pixels |
| Composer width | Up to 720 CSS pixels |
| Reply text | 20px / 30px |
| Coding activity text | 16px / 24px |
| Composer radius | 36px |
| Header height | 40px |

Google Sans Flex is embedded locally. Code and terminal content retain monospace typography. Diff insertions and removals use subdued green and red backgrounds with readable syntax colors.

The compact model label retains the full native accessible label and tooltip. The popup keeps the app's real model choices and reasoning submenus. Auxiliary tabs keep native selection and actions, with labels on wide windows and icons on narrower ones.

The theme annotates existing DOM nodes, adds a stylesheet, a greeting, a brand label, model descriptions, and the small AI notice. A newly rendered running-task panel starts collapsed using its native disclosure button. It does not alter requests, authentication, files, model routing, or terminal execution.

The preview HTML is a separate static example. It contains no user history or source code and does not implement the app's controls.
