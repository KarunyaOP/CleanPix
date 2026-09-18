export interface NavItem {
  label: string;
  href: string;
  isActive?: boolean;
}

export interface TrustFeature {
  id: string;
  icon: string;
  title: string;
}

export interface UseCaseItem {
  id: string;
  icon: string;
  label: string;
}

export interface SmartPresetThumb {
  id: string;
  label: string;
  imageUrl: string;
  category: 'product' | 'person' | 'nature' | 'pet';
}

export * from "./schema";
