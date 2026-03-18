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
  description: string;
  imageUrl?: string;
  menuGallery?: string; // JSON stringified array of URLs
  tags?: string; // JSON stringified array of {name: string, tag: string}
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
