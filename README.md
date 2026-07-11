# EliousMondal.github.io

Static academic website for Mohammad Elious Ali Mondal. The site is built with
plain HTML, CSS, and JavaScript and can be served directly through GitHub Pages.

## Pages

- `index.html` — editorial homepage with biography, selected research, publications, notes, awards, and contact
- `research.html` — four illustrated research themes
- `publications.html` — publications grouped by year, each with original TOC-style artwork and Paper, PDF, Deep Dive, and Code links
- `blog.html` — searchable and filterable Research Notes library
- `codes.html` — scientific-software projects
- `notes/` — detailed mathematical derivations, worked examples, and four interactive numerical tutorials
- `deep-dives/` — ten paper-specific guides based on the supplied papers and supporting information

## Visual system

The design uses Source Serif 4 and Inter with a warm-paper, ink, teal, copper,
and gold palette. Light and dark themes are supported. Motion is disabled when
the visitor requests reduced motion.

## Updating content

- Add new note cards to `blog.html` and the note URL to `sitemap.xml`.
- Point software cards to project-specific repositories when they become public.
- Update the publication list and its year count when adding a paper.
- Replace or extend artwork inside `assets/research_figures/`, `assets/notes_figures/`, and `assets/publication_figures/`.

Interactive note calculations are implemented in `interactive-notes.js`; paper-guide
plots are implemented in `deep-dive.js`. Both run entirely in the browser without a
server or external numerical service.

Page templates use optimized `.webp` artwork for fast loading while the
full-resolution `.png` source images remain alongside them for future editing.

Push the contents of this directory to the root of the
`EliousMondal.github.io` repository to publish it.
