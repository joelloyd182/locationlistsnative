import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type StoreLogoProps = {
  /** The store's website URL (e.g. "https://www.countdown.co.nz") */
  website?: string;
  /** The store name — used to guess a domain if no website is set */
  storeName?: string;
  /** Whether this is an online store */
  isOnline?: boolean;
  /** Size of the logo container (default: 44) */
  size?: number;
  /** Background color for the container */
  backgroundColor?: string;
  /** Fallback icon color */
  iconColor?: string;
  /** Border radius (default: size-based medium radius) */
  borderRadius?: number;
};

// Known NZ store domain mappings for common names
const KNOWN_DOMAINS: Record<string, string> = {
  'countdown': 'countdown.co.nz',
  'new world': 'newworld.co.nz',
  'pak n save': 'paknsave.co.nz',
  'paknsave': 'paknsave.co.nz',
  "pak'nsave": 'paknsave.co.nz',
  'woolworths': 'woolworths.co.nz',
  'four square': 'foursquare.co.nz',
  'freshchoice': 'freshchoice.co.nz',
  'supervalue': 'supervalue.co.nz',
  'the warehouse': 'thewarehouse.co.nz',
  'warehouse': 'thewarehouse.co.nz',
  'bunnings': 'bunnings.co.nz',
  'mitre 10': 'mitre10.co.nz',
  'kmart': 'kmart.co.nz',
  'chemist warehouse': 'chemistwarehouse.co.nz',
  'amazon': 'amazon.com',
  'ebay': 'ebay.com',
  'mighty ape': 'mightyape.co.nz',
  'noel leeming': 'noelleeming.co.nz',
  'pb tech': 'pbtech.co.nz',
  'farmers': 'farmers.co.nz',
  'briscoes': 'briscoes.co.nz',
  'rebel sport': 'rebelsport.co.nz',
  'torpedo7': 'torpedo7.co.nz',
  'hellofresh': 'hellofresh.co.nz',
  'uber eats': 'ubereats.com',
  'doordash': 'doordash.com',
  'costco': 'costco.com',
  'target': 'target.com',
  'walmart': 'walmart.com',
  'tesco': 'tesco.com',
  'aldi': 'aldi.com',
};

/**
 * Extract a domain from a URL or store name.
 * Tries the website field first, then falls back to known domain mappings.
 */
function getDomain(website?: string, storeName?: string): string | null {
  // Try extracting from website URL
  if (website) {
    try {
      let url = website.trim();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      // If it looks like a bare domain, use it directly
      const cleaned = website.trim().replace(/^www\./, '');
      if (cleaned.includes('.') && !cleaned.includes(' ')) {
        return cleaned;
      }
    }
  }

  // Try matching store name to known domains
  if (storeName) {
    const normalized = storeName.toLowerCase().trim();
    
    // Exact match first
    if (KNOWN_DOMAINS[normalized]) {
      return KNOWN_DOMAINS[normalized];
    }
    
    // Partial match — check if store name starts with a known key
    for (const [key, domain] of Object.entries(KNOWN_DOMAINS)) {
      if (normalized.startsWith(key) || normalized.includes(key)) {
        return domain;
      }
    }
  }

  return null;
}

/**
 * Get a favicon URL for a domain using Google's favicon service.
 * Returns multiple sizes to try.
 */
function getFaviconUrl(domain: string, size: number = 64): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

export default function StoreLogo({
  website,
  storeName,
  isOnline = false,
  size = 44,
  backgroundColor = 'rgba(0,0,0,0.06)',
  iconColor = '#666',
  borderRadius,
}: StoreLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const resolvedRadius = borderRadius ?? Math.round(size * 0.22);
  const iconSize = Math.round(size * 0.5);

  useEffect(() => {
    const domain = getDomain(website, storeName);
    if (domain) {
      // Use 64px for crisp display on high-DPI screens
      const url = getFaviconUrl(domain, 64);
      setLogoUrl(url);
      setFailed(false);
    } else {
      setLogoUrl(null);
      setFailed(true);
    }
  }, [website, storeName]);

  const showFallback = !logoUrl || failed;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: resolvedRadius,
          backgroundColor,
        },
      ]}
    >
      {!showFallback ? (
        <Image
          source={{ uri: logoUrl! }}
          style={[
            styles.logo,
            {
              width: Math.round(size * 0.65),
              height: Math.round(size * 0.65),
              borderRadius: Math.round(size * 0.08),
            },
          ]}
          onError={() => setFailed(true)}
          resizeMode="contain"
        />
      ) : (
        <Ionicons
          name={isOnline ? 'globe-outline' : 'storefront-outline'}
          size={iconSize}
          color={iconColor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    // Sized dynamically via inline styles
  },
});
