// jsonresume-theme-editorial: a JSON Resume theme with a large serif name,
// the summary set as an opening paragraph, and italic section names in an
// accent colour. render() returns one HTML document with its fonts inside it,
// so the same file can be served as a web page and printed to PDF. It reads
// no files when it renders.

// The stylesheet with its fonts inlined, built by build.js, so rendering
// reads no files.
const { css: CSS } = require("./assets.js");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const escape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Resume prose may carry plain links to the web; every other tag is shown as text.
const LINK = /<a\s+href=(['"])(https?:\/\/[^'"<>\s]+)\1\s*>([^<]*)<\/a>/g;

function prose(value) {
  const text = String(value ?? "");
  let html = "";
  let end = 0;
  for (const match of text.matchAll(LINK)) {
    html += escape(text.slice(end, match.index));
    html += `<a href="${escape(match[2])}">${escape(match[3])}</a>`;
    end = match.index + match[0].length;
  }
  return html + escape(text.slice(end));
}

// "2025-02-14" and "2025-02" read as "Feb 2025"; a bare year stays a year.
function date(value) {
  const [, year, month] = /^(\d{4})(?:-(\d{2}))?/.exec(value ?? "") ?? [];
  if (!year) return "";
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

function span(start, end, ongoing) {
  const from = date(start);
  const to = date(end) || (ongoing && from ? "Present" : "");
  return from && to ? `${from} \u2013 ${to}` : from || to;
}

const words = (...parts) => parts.filter(Boolean).join(" ");

// Every section of the schema, in page order. A dated section turns each item
// into one entry shape; a list section turns each item into a term and its values.
const SECTIONS = [
  {
    key: "work",
    label: "Experience",
    entry: (w) => ({
      when: span(w.startDate, w.endDate, true),
      where: w.location,
      title: w.position,
      org: w.name,
      joiner: "at",
      url: w.url,
      summary: w.summary,
      highlights: w.highlights,
      tags: w.tech ?? w.keywords,
    }),
  },
  {
    key: "skills",
    label: "Skills",
    term: (s) => ({ name: s.name, note: s.level, values: s.keywords }),
  },
  {
    key: "projects",
    label: "Projects",
    entry: (p) => ({
      when: span(p.startDate, p.endDate),
      title: p.name,
      org: p.entity,
      joiner: "for",
      url: p.url,
      summary: p.description,
      highlights: p.highlights,
      tags: p.keywords,
    }),
  },
  {
    key: "education",
    label: "Education",
    entry: (e) => ({
      when: span(e.startDate, e.endDate),
      title: words(e.studyType, e.area) || e.institution,
      org: words(e.studyType, e.area) ? e.institution : "",
      joiner: "at",
      url: e.url,
      summary: e.score ? `Score: ${e.score}` : "",
      tags: e.courses,
    }),
  },
  {
    key: "volunteer",
    label: "Volunteering",
    entry: (v) => ({
      when: span(v.startDate, v.endDate, true),
      title: v.position,
      org: v.organization,
      joiner: "at",
      url: v.url,
      summary: v.summary,
      highlights: v.highlights,
    }),
  },
  {
    key: "awards",
    label: "Awards",
    entry: (a) => ({ when: date(a.date), title: a.title, org: a.awarder, joiner: "from", summary: a.summary }),
  },
  {
    key: "certificates",
    label: "Certificates",
    entry: (c) => ({ when: date(c.date), title: c.name, org: c.issuer, joiner: "from", url: c.url }),
  },
  {
    key: "publications",
    label: "Publications",
    entry: (p) => ({
      when: date(p.releaseDate),
      title: p.name,
      org: p.publisher,
      joiner: "in",
      url: p.url,
      summary: p.summary,
    }),
  },
  {
    key: "languages",
    label: "Languages",
    term: (l) => ({ name: l.language, values: [l.fluency] }),
  },
  {
    key: "interests",
    label: "Interests",
    term: (i) => ({ name: i.name, values: i.keywords }),
  },
  {
    key: "references",
    label: "References",
    entry: (r) => ({ title: r.name, summary: r.reference }),
  },
];

const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const dotted = (parts) => parts.filter(Boolean).join(" · ");

function entryHtml({ when, title, org, joiner, url, summary, highlights, tags }) {
  const name = url ? `<a href="${escape(url)}">${escape(title)}</a>` : escape(title);
  const by = org ? ` <span class="org">${escape(joiner ? `${joiner} ${org}` : org)}</span>` : "";
  return [
    `<article class="entry"><div class="hd"><h3>${name}${by}</h3>`,
    when ? `<span class="when">${escape(when)}</span>` : "",
    "</div>",
    summary ? `<p>${prose(summary)}</p>` : "",
    list(highlights).length
      ? `<ul>${list(highlights).map((h) => `<li>${prose(h)}</li>`).join("")}</ul>`
      : "",
    list(tags).length ? `<p class="with">${list(tags).map(escape).join(", ")}</p>` : "",
    "</article>",
  ].join("");
}

function termHtml({ name, note, values }) {
  const small = note ? `<small>${escape(note)}</small>` : "";
  return `<dt>${escape(name)}${small}</dt><dd>${list(values).map(escape).join(", ")}</dd>`;
}

function sectionHtml(resume, { key, label, entry, term }) {
  const items = list(resume[key]);
  if (!items.length) return "";
  const body = entry
    ? items.map((item) => entryHtml(entry(item))).join("")
    : `<dl class="terms">${items.map((item) => termHtml(term(item))).join("")}</dl>`;
  return `<section aria-labelledby="${key}-h"><h2 id="${key}-h">${label}</h2>${body}</section>`;
}

// A web address as a reader would type it: no scheme, no "www.", no trailing slash.
const bare = (url) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

function contactHtml(basics) {
  const { location = {} } = basics;
  const link = (href, text) => `<a href="${escape(href)}">${escape(text)}</a>`;
  return dotted([
    escape([location.city, location.region].filter(Boolean).join(", ")),
    basics.email && link(`mailto:${basics.email}`, basics.email),
    basics.phone && link(`tel:${basics.phone.replace(/[^\d+]/g, "")}`, basics.phone),
    basics.url && link(basics.url, bare(basics.url)),
    ...list(basics.profiles).map((p) => (p.url ? link(p.url, bare(p.url)) : escape(p.username))),
  ]);
}

function navHtml({ nav = [], pdf, note }) {
  if (!nav.length && !pdf) return "";
  const links = nav
    .map((n) => `<a href="${escape(n.href)}"${n.current ? ' aria-current="page"' : ""}>${escape(n.label)}</a>`)
    .join('<span class="sep" aria-hidden="true">/</span>');
  const end = [
    note ? `<span class="note">${escape(note)}</span>` : "",
    pdf ? `<a class="pdf" href="${escape(pdf)}">Download PDF</a>` : "",
  ].join("");
  return `<nav class="nav screen" aria-label="Site">${links}<span class="sp"></span>${end}</nav>`;
}

// The page colours render() can be asked for. Sepia is the default; white
// suits a site whose other pages are white. Both turn dark gray on a dark
// system and print in ink on white.
const PALETTES = ["sepia", "white"];

// options.palette: "sepia" (the default) or "white".
// options.dark: false keeps the light palette on a dark system, for a site
// whose other pages have no dark mode.
// options.nav: [{ label, href, current }], links shown on screen above the resume.
// options.pdf: address of the PDF, for a Download PDF link beside them.
// options.note: a short tag beside that link, such as a variant name.
// options.head: HTML added to the end of <head>, such as a stylesheet that
// restyles the nav to match the site around it.
function render(resume, options = {}) {
  const basics = resume.basics ?? {};
  const palette = PALETTES.includes(options.palette) ? options.palette : PALETTES[0];
  const contact = contactHtml(basics);

  return `<!doctype html>
<html lang="en" data-palette="${palette}"${options.dark === false ? ' data-dark="off"' : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(words(basics.name, "· Resume"))}</title>
<meta name="description" content="${escape(dotted([basics.name, basics.label]))}">
<meta name="theme-color" content="${palette === "white" ? "#FFFFFF" : "#F8F1E3"}" media="(prefers-color-scheme: light)">
${options.dark === false ? "" : '<meta name="theme-color" content="#2C2C2E" media="(prefers-color-scheme: dark)">'}
<style>
${CSS}</style>
${options.head ?? ""}
</head>
<body>
<div class="page">
${navHtml(options)}
<main>
<header>
<h1>${escape(basics.name)}</h1>
${basics.label ? `<p class="label">${escape(basics.label)}</p>` : ""}
${basics.summary ? `<p class="lede">${prose(basics.summary)}</p>` : ""}
${contact ? `<p class="contact">${contact}</p>` : ""}
</header>
${SECTIONS.map((section) => sectionHtml(resume, section)).filter(Boolean).join("\n")}
</main>
</div>
</body>
</html>
`;
}

// Read by resume-cli's PDF export: the page size and margins come from the CSS.
const pdfRenderOptions = { preferCSSPageSize: true, printBackground: true };

module.exports = { render, pdfRenderOptions, PALETTES };
