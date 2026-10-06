# DAS · Combat UI (`darsh-dnd-ui`)

[![Tests](https://github.com/Darshyne/darsh-dnd-ui/actions/workflows/tests.yml/badge.svg)](https://github.com/Darshyne/darsh-dnd-ui/actions/workflows/tests.yml)

Part of **Darshyne's Automation Suite (DAS)**. A Baldur's Gate 3-style combat UI for **Foundry VTT V14** and
**dnd5e 6.x**:

- the bottom **Bar**: tabbed actions, a drag-and-drop layout saved per actor, a level drawer for upcastable
  spells, weapon sets, a d20 panel, and an end-turn button with a movement ring;
- the **Party**: a column of character portraits on the side of the screen;
- the **Strip**: the turn order across the top of the screen, during combat.

It replaces BG3 Inspired HUD, Party HUD and Carousel Combat Tracker (declared as conflicts). It **requires the
[`dnd5e-combat`](https://github.com/Darshyne/dnd5e-combat) engine**, whose UI API it reads (`api.ui`: turn
budget, movement, reasons why an action is greyed out, multiattack, light) without recomputing anything itself.
No code or image from the replaced modules or from the game is reused.

## Installation

In Foundry (or on The Forge), *Install Module* → paste the manifest URL:

```
https://github.com/Darshyne/darsh-dnd-ui/releases/latest/download/module.json
```

From source: the Foundry module is the `module/` subfolder, to copy or link into `Data/modules/darsh-dnd-ui`.
Tests: `npm install && npm test`.

The interface is in French only for now. Under active development.

## License

Code under the MIT license (see `LICENSE`).

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
International License, available at https://creativecommons.org/licenses/by/4.0/legalcode. This module is not
affiliated with, nor endorsed by, Wizards of the Coast.
