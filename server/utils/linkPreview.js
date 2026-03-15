import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export async function fetchLinkPreview(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      timeout: 10000,
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { title: '', description: '', image: '' };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr('content')
      || $('meta[name="twitter:title"]').attr('content')
      || $('title').text()
      || '';

    const description = $('meta[property="og:description"]').attr('content')
      || $('meta[name="twitter:description"]').attr('content')
      || $('meta[name="description"]').attr('content')
      || $('meta[name="Description"]').attr('content')
      || '';

    let image = $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content')
      || '';

    // 将相对路径的图片转为绝对路径
    if (image && !image.startsWith('http')) {
      try {
        image = new URL(image, url).href;
      } catch {}
    }

    return {
      title: title.trim().slice(0, 200),
      description: description.trim().slice(0, 500),
      image,
    };
  } catch {
    return { title: '', description: '', image: '' };
  }
}
