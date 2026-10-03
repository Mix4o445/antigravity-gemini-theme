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

Project and environment selectors appear in **+ → Workspace**, using the original native buttons in their existing React DOM positions. The nonmodal settings group closes with Escape or its close button. A delegated keyboard handler includes Workspace in the native context menu's arrow-key cycle.

Native `/` and `@` suggestions use 20px corners, 48px rows, 16px labels, and 14px descriptions. The scroll limit comes from the actual gap between the composer and header, preserving the complete upper edge in wide and narrow windows.

The README images are captures of the actual themed Antigravity 2.19.1 app, including its native model picker, actions, and mentions. The navigation sidebar is collapsed during capture to protect private project details. No sample conversations or replacement controls are rendered for the screenshots.
