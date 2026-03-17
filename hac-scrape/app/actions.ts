'use server';

import { scrapeHAC } from '@/scraper';

export async function handleScrapeAction(formData: FormData) {
  const url = formData.get('url') as string;
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  try {
    const data = await scrapeHAC(url, username, password);
    return { data };
  } catch (err: any) {
    return { error: err.message || 'Failed to scrape data.' };
  }
}
