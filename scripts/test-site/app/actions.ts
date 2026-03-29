'use server';

import { setTitleSelector as setStoreSelector, TitleSelector } from '../data/settingsStore';
import { revalidatePath } from 'next/cache';

export async function updateTitleSelector(selector: TitleSelector) {
  console.log(`[ACTION] Updating global title selector to: ${selector}`);
  setStoreSelector(selector);
  // Revalidate the articles list page to show the new selector
  revalidatePath('/');
  revalidatePath('/settings');
}
