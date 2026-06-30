import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { RawListing } from '../freshness-scorer';
import { JobSource } from '../job-source.interface';

interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

interface RssFeed {
  rss: { channel: { item: RssItem | RssItem[] } };
}

const parser = new XMLParser({ cdataPropName: '__cdata' });

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

@Injectable()
export class WeWorkRemotelySource implements JobSource {
  readonly sourceName = 'weworkremotely';

  async fetchListings(): Promise<RawListing[]> {
    const res = await fetch('https://weworkremotely.com/remote-jobs.rss');
    if (!res.ok) throw new Error(`WeWorkRemotely returned ${res.status}`);

    const xml = await res.text();
    const feed = parser.parse(xml) as RssFeed;
    const items = feed.rss.channel.item;
    const list = Array.isArray(items) ? items : [items];

    return list.map((item) => {
      // WWR title format: "Company Name: Job Title" or just "Job Title"
      const rawTitle = item.title as unknown as { __cdata?: string } | string;
      const titleStr =
        typeof rawTitle === 'object'
          ? (rawTitle.__cdata ?? '')
          : String(rawTitle ?? '');
      const colonIdx = titleStr.indexOf(': ');
      const companyName =
        colonIdx > -1 ? titleStr.slice(0, colonIdx) : 'Unknown';
      const title = colonIdx > -1 ? titleStr.slice(colonIdx + 2) : titleStr;

      const rawDesc = item.description as unknown as
        { __cdata?: string } | string;
      const descStr =
        typeof rawDesc === 'object'
          ? (rawDesc.__cdata ?? '')
          : String(rawDesc ?? '');

      return {
        title,
        companyName,
        url: item.link,
        postedAt: item.pubDate ? new Date(item.pubDate) : null,
        salaryMin: null,
        salaryMax: null,
        currency: null,
        description: stripHtml(descStr) || null,
      };
    });
  }
}
