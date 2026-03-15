export interface Pod {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  imageUrl?: string;
}

export interface Cart {
  id: string;
  podId: string;
  name: string;
  cuisine: string;
  description: string;
  imageUrl?: string;
  gallery?: string; // JSON stringified array of URLs
  menuGallery?: string; // JSON stringified array of URLs
  tags?: string; // JSON stringified array of 5-letter strings
  instagramUrl?: string;
  websiteUrl?: string;
  rating: number;
  latitude?: number;
  longitude?: number;
  ownerEmail?: string;
  openTime?: string;
  closeTime?: string;
  favorites?: string[];
}
