const test = require("node:test");
const assert = require("node:assert/strict");
const { render } = require("./index.js");

const body = (resume, options) => render(resume, options).split("</head>")[1];

test("a job shows its title, employer, dates and technologies", () => {
  const html = body({
    work: [{ position: "Engineer", name: "Acme", startDate: "2025-02", tech: ["Rust", "egui"] }],
  });
  assert.match(html, /<h3>Engineer <span class="org">at Acme<\/span><\/h3>/);
  assert.match(html, /<span class="when">Feb 2025 – Present<\/span>/);
  assert.match(html, /<p class="with">Rust, egui<\/p>/);
});

test("a project that only names its start year is not marked as ongoing", () => {
  const html = body({ projects: [{ name: "n2t", startDate: "2015" }] });
  assert.match(html, /<span class="when">2015<\/span>/);
  assert.doesNotMatch(html, /Present/);
});

test("a section with no items is left out", () => {
  const html = body({ work: [{ position: "Engineer" }], education: [], skills: [] });
  assert.match(html, /Experience/);
  assert.doesNotMatch(html, /Education|Skills/);
});

test("skills are listed as a name and its keywords", () => {
  const html = body({ skills: [{ name: "Data", level: "Expert", keywords: ["SQL", "Redis"] }] });
  assert.match(html, /<dt>Data<small>Expert<\/small><\/dt><dd>SQL, Redis<\/dd>/);
});

test("prose keeps links to the web and shows every other tag as text", () => {
  const html = body({
    work: [
      {
        position: "Engineer",
        highlights: [
          "Wrote an <a href='https://example.com/sdk?a=1&b=2'>SDK</a>.",
          "<script>alert(1)</script> <a href='javascript:alert(1)'>x</a>",
        ],
      },
    ],
  });
  assert.match(html, /<a href="https:\/\/example.com\/sdk\?a=1&#38;b=2">SDK<\/a>/);
  assert.doesNotMatch(html, /<script|href="javascript/);
});

test("the header shows the name, label, summary and contact links", () => {
  const html = body({
    basics: {
      name: "Ada Lovelace",
      label: "Analyst",
      summary: "Wrote the first program.",
      email: "ada@example.com",
      location: { city: "London" },
      profiles: [{ network: "GitHub", url: "https://www.github.com/ada/" }],
    },
  });
  assert.match(html, /<h1>Ada Lovelace<\/h1>/);
  assert.match(html, /<p class="label">Analyst<\/p>/);
  assert.match(html, /<p class="lede">Wrote the first program.<\/p>/);
  assert.match(html, /London · <a href="mailto:ada@example.com">ada@example.com<\/a>/);
  assert.match(html, /<a href="https:\/\/www.github.com\/ada\/">github.com\/ada<\/a>/);
});

test("the nav, PDF link and extra head appear only when asked for", () => {
  const plain = render({});
  assert.doesNotMatch(plain, /<nav/);
  const html = render({}, {
    nav: [{ label: "Home", href: "/" }, { label: "Resume", href: "/resume/", current: true }],
    pdf: "/resume/r.pdf",
    note: "draft",
    head: '<style id="site">.nav{}</style>',
  });
  assert.match(html, /<a href="\/">Home<\/a><span class="sep" aria-hidden="true">\/<\/span><a href="\/resume\/" aria-current="page">Resume<\/a>/);
  assert.match(html, /<a class="pdf" href="\/resume\/r.pdf">Download PDF<\/a>/);
  assert.match(html, /draft/);
  assert.match(html.split("</head>")[0], /<style id="site">/);
});
