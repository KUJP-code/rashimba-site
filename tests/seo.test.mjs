import {test} from 'node:test';
import assert from 'node:assert/strict';
import {siteOrigin,isStaging,canonicalPath,seoHtml,sitemapXml,robotsTxt} from '../scripts/seo.mjs';
const html=(title='らしんば',description='無料の英語学習アプリ')=>`<html><head><title>${title}</title><meta name="description" content="${description}" /></head><body><h1>お知らせ</h1></body></html>`;

test('official origin rejects preview hosts, paths, credentials, and insecure protocols',()=>{
 assert.equal(siteOrigin('https://rashimba.com/'),'https://rashimba.com');
 assert.equal(siteOrigin('https://www.rashimba.com'),'https://www.rashimba.com');
 for(const value of ['https://preview.project.pages.dev','http://rashimba.com','https://rashimba.com/parents/','https://rashimba.com/?secret=1','https://user:pass@rashimba.com','https://rashimba.com:8443'])assert.throws(()=>siteOrigin(value));
});
test('only deploy builds are indexable on Cloudflare, including separate staging projects',()=>{
 assert.equal(isStaging({CF_PAGES_BRANCH:'deploy',CF_PAGES:'1'}),false);
 for(const CF_PAGES_BRANCH of ['staging','main','feature/seo'])assert.equal(isStaging({CF_PAGES_BRANCH}),true);
 assert.equal(isStaging({CF_PAGES:'1'}),true);
 assert.equal(isStaging({}),false);
});
test('HTML entry files and query strings use one canonical URL',()=>{
 assert.equal(canonicalPath('/index.html?ref=test'),'/');
 for(const path of ['/parents/index.html','/parents','/parents/?source=ad#signup'])assert.equal(canonicalPath(path),'/parents/');
 assert.equal(canonicalPath('/news/new-partner/index.html'),'/news/new-partner/');
 assert.equal(canonicalPath('/404.html'),'/404.html');
});
test('all search and share metadata is static and values are safely escaped',()=>{
 const output=seoHtml(html('らしんば &amp; お知らせ','A &quot;quote&quot; &amp; B'),{path:'/parents/index.html?ref=test'});
 assert.match(output,/rel="canonical" href="https:\/\/rashimba.com\/parents\/"/);
 assert.match(output,/og:description" content="A &quot;quote&quot; &amp; B"/);
 assert.match(output,/twitter:card" content="summary_large_image"/);
 const data=JSON.parse(output.match(/application\/ld\+json">(.*?)<\/script>/)[1]);
 assert.equal(data['@graph'][0].description,'A "quote" & B');
});
test('news JSON-LD cannot break out of its script and preserves the real article date',()=>{
 const article={slug:'test',title:'Update </script><script>alert(1)</script>',date:'2026-10-13'};
 const output=seoHtml(html('News'),{path:'/news/test/'},[article]);
 const script=output.match(/application\/ld\+json">(.*?)<\/script>/)[1];
 assert.ok(!script.includes('</script>'));
 const data=JSON.parse(script)['@graph'].find(n=>n['@type']==='Article');
 assert.equal(data.headline,article.title);assert.equal(data.datePublished,article.date);
});
test('404 page is noindex and has no canonical or misleading rich result markup',()=>{
 const output=seoHtml(html(),{path:'/404.html'});
 assert.match(output,/noindex, nofollow/);assert.ok(!output.includes('rel="canonical"'));
 assert.ok(!output.includes('application/ld+json'));
});
test('sitemap includes unique canonical pages, excludes 404s, and is empty on staging',()=>{
 const paths=['/index.html','/parents/index.html','/parents/','/404.html','/news/update/index.html'];
 const output=sitemapXml(paths,{staging:false});
 assert.equal((output.match(/<loc>/g)||[]).length,3);
 assert.ok(!output.includes('404.html'));assert.ok(!output.includes('index.html'));
 assert.ok(!sitemapXml(paths,{staging:true}).includes('<loc>'));
 assert.match(robotsTxt({staging:false}),/Sitemap: https:\/\/rashimba.com\/sitemap.xml/);
 assert.ok(!robotsTxt({staging:true}).includes('Sitemap:'));
 assert.ok(!robotsTxt({staging:true}).includes('Disallow: /'));
});
