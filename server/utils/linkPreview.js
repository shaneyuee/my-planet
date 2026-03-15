import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export async function fetchLinkPreview(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PersonalSpace/1.0)' },
      timeout: 5000,
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr('content')
      || $('meta[name="twitter:title"]').attr('content')
      || $('title').text()
      || '';

    const description = $('meta[property="og:description"]').attr('content')
      || $('meta[name="twitter:description"]').attr('content')
      || $('meta[name="description"]').attr('content')
      || '';

    const image = $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content')
      || '';

    return {
      title: title.slice(0, 200),
      description: description.slice(0, 500),
      image,
    };
  } catch {
    return { title: '', description: '', image: '' };
  }
}
