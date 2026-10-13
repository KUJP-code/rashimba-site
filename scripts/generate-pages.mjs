import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const escape = (value) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const render = (template, data) => template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in data)) throw new Error(`Missing template value: ${key}`);
  return data[key];
});

export function readAnnouncements() {
  const slugs = new Set();
  return readdirSync(resolve(root, 'content/news')).filter(file => file.endsWith('.html')).map(file => {
    const source = read(`content/news/${file}`);
    const metadata = source.match(/^\s*<!--\s*(\{[\s\S]*?\})\s*-->/);
    if (!metadata) throw new Error(`${file}: begin with the JSON metadata comment from templates/announcement.html`);
    const article = JSON.parse(metadata[1]);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug) || slugs.has(article.slug)) throw new Error(`${file}: use a unique lowercase slug with hyphens`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(article.date) || !Number.isFinite(Date.parse(article.date)) || new Date(article.date).toISOString().slice(0, 10) !== article.date) throw new Error(`${file}: use a valid YYYY-MM-DD date`);
    if (typeof article.title !== 'string' || !article.title.trim()) throw new Error(`${file}: title is required`);
    slugs.add(article.slug);
    return { ...article, body: source.slice(metadata[0].length).trim() };
  }).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

function newsList(articles) {
  return `<ul class="news-list">${articles.map(article => `<li><a href="/news/${article.slug}/"><time datetime="${article.date}">${article.date.replaceAll('-', '.')}</time><p>${escape(article.title)}</p></a></li>`).join('\n')}</ul>`;
}

export function sharedHtml(html) {
  return html.replace('<!-- site:header -->', () => read('src/partials/header.html'))
    .replace('<!-- site:footer -->', () => read('src/partials/footer.html'))
    .replace('<!-- site:parents-header -->', () => read('src/partials/parents-header.html'))
    .replace('<!-- site:parents-footer -->', () => read('src/partials/parents-footer.html'))
    .replace('<!-- site:latest-news -->', () => newsList(readAnnouncements().slice(0, 3)));
}

export function generatePages() {
  const articles = readAnnouncements();
  const page = read('templates/page.html');
  const divider = '<span class="breadcrumb-divider" aria-hidden="true"><img src="/assets/breadcrumb-divider.svg" alt="" /></span>';
  const crumbs = (items) => '<a href="/">トップ</a>' + divider + items.join(divider);
  const inputs = { home: resolve(root, 'index.html') };
  // These directories contain generated files only; editable sources live in templates/ and content/.
  rmSync(resolve(root, 'news'), { recursive: true, force: true });
  function write(path, data, layout = page) {
    const output = resolve(root, path);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, render(layout, data));
    inputs[path] = output;
  }
  write('parents/index.html', {}, read('templates/parents.html'));
  write('news/index.html', {
    title: 'お知らせ一覧', description: 'らしんばの最新のお知らせと開発状況をご紹介します。',
    breadcrumbs: crumbs(['<span aria-current="page">お知らせ一覧</span>']),
    content: render(read('templates/news.html'), { newsList: newsList(articles) }),
  });
  write('contact/index.html', {
    title: 'スポンサー資料をもらう', description: 'らしんばのスポンサー資料のご請求・お問い合わせはこちら。',
    breadcrumbs: crumbs(['<span aria-current="page">お問い合わせ</span>']),
    content: read('templates/contact.html'),
  });
  write('privacy/index.html', {
    title: 'プライバシーポリシー', description: 'らしんばにおける個人情報その他の情報の取扱いについて。',
    breadcrumbs: crumbs(['<span aria-current="page">プライバシーポリシー</span>']),
    content: read('content/legal/privacy.html'),
  });
  write('terms/index.html', {
    title: '利用規約', description: 'らしんばの利用規約。',
    content: read('content/legal/terms.html'),
  }, read('templates/standalone-legal.html'));
  for (const article of articles) {
    const data = { ...article, title: escape(article.title), displayDate: article.date.replaceAll('-', '.') };
    write(`news/${article.slug}/index.html`, {
      title: data.title, description: data.title,
      breadcrumbs: crumbs(['<a href="/news/">お知らせ一覧</a>', `<span aria-current="page">${data.title}</span>`]),
      content: render(read('templates/article.html'), data),
    });
  }
  return inputs;
}
