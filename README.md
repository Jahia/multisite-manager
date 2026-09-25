# Multisite manager

Browse and transfer content between Jahia sites, side by side.

Jahia 7.3 had a manager showing every site a user could reach on one screen, used to copy or move
content between them. jContent shows one site at a time. This brings the capability back as two
independent panes, each a site of its own.

## What it does

- Two independent panes, each with its own site switcher, filtered by `jContentAccess`
- One tree per pane holding pages, content folders and media together
- Branch-by-branch loading, so a large site opens immediately
- Copy, cut and paste in either direction, with the destination named in the toolbar
- **Paste as reference**, with the reference type chosen from what is being referenced
- Drag rows between panes to move them
- One level of undo: a move goes back — under its original name — and a copy or reference is removed
- Pasted rows tinted green briefly, so the result of an action is visible
- References show the site they point at, with the full path as a tooltip
- A folder that will not accept what is being dragged says so while you are still holding it
- Thumbnail preview on hovering an image
- Publication status on every row, so you can see what is published before moving it
- Search each site by name and title
- Full keyboard control: arrows to move, tab between the panes, space and shift+arrows to
  select, Ctrl+A, enter, Ctrl+C / X / V
- Each pane reopens on the site it was last showing
- Says when something was renamed on arrival, rather than leaving you to find out
- Per-pane refresh, and a banner when a transfer is refused

## Requirements

Jahia 8.2.0.0 or later, with `jcontent` and `jahia-ui-root` deployed. **Released versions are
enough** — this module consumes jContent's published API (`appShell.remotes.jcontent`) and standard
`@jahia/ui-extender` registration points. No patched build of either is required.

## Building

```bash
yarn install
yarn test                 # 94 specs, about 3 seconds
yarn lint
yarn build:production     # or: mvn clean package
```

`mvn package` runs the frontend build and produces `target/multisite-manager-<version>.jar`, which
can be dropped into a Jahia instance's `modules` folder.

## How it is put together

The module owns its own route and its own slice of the redux store, and borrows jContent's
components to fill them. The piece that makes two browsers possible is worth knowing about:
jContent's accordion items render `ContentTree` with no state wiring, so those trees bind to
jContent's own store — but `ContentTree` accepts a `selector` and path actions as props. jContent's
content picker already uses this to run a second browser off its own slice; this does the same,
once per pane.

Reference rules were verified against the repository rather than assumed:

| Reference type | May point at |
|---|---|
| `jnt:contentReference` | `jmix:droppableContent` |
| `jnt:fileReference` | `jnt:file` |
| `jnt:contentFolderReference` | `jnt:contentFolder` |

So the type follows what is being referenced, not the destination. A media folder (`jnt:folder`)
accepts none of them, and a page cannot be referenced at all.

## Known limits

- **No end-to-end tests.** 77 unit specs cover what the module *decides* — the structural refusals,
  the reference type mapping, tree ordering, the reducer, the keyboard, rename detection and undo
  naming — and each was mutation-checked. Nothing yet proves what it *does* to a repository: that a
  paste lands, a reference resolves, a drag refuses, or that the permission check gates anything.
  That needs Cypress against a live Jahia.
- Each branch is fetched 200 rows at a time, so a folder with more than that shows only the first
  200. Rendering itself is virtualised, so an open tree of several thousand rows stays responsive.
- The drag-time compatibility check matches on primary node type only, while a node can also
  satisfy a constraint through a supertype or a mixin. It therefore errs towards refusing, and the
  server remains the authority - anything that slips through is refused there and reported in the
  pane.
- The clipboard is the module's own, so copying in jContent does not paste here.
- If both panes show the same site, only the source and destination refresh after a transfer.
- References deliberately keep pointing at the source site. A copied item that refers to a category
  or an image still refers to the original.

## Licence

MIT
