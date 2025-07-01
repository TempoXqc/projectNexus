// client/src/utils/mapDeckImages.ts

import { clientConfig } from '@/config/clientConfig.ts';

export const mapDeckImages = (deckIds: string[]) => {
  return deckIds.map((id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    image: clientConfig.deckImages[id as keyof typeof clientConfig.deckImages] || '',
  }));
};