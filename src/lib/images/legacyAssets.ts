/**
 * Images that used to be served from the WordPress site at
 * himalayankoh.com/wp-content/uploads/. They are now committed to this repo
 * under public/images/legacy/ and served from our own domain, so the site has
 * no runtime dependency on WordPress and the old host can be shut down.
 *
 * Every reference to these nine files goes through this module. To move them
 * somewhere else later (Supabase Storage, a CDN), change the paths here — the
 * rest of the codebase does not name them.
 *
 * The `wordpress` field on each entry is the original source URL. It is not
 * used at runtime; scripts/fetch-legacy-images.mjs reads it to download the
 * files while the old host is still reachable. Once the files are committed,
 * that script's only remaining purpose is documenting where they came from.
 */

export type LegacyImageKey =
  | 'horseLickPaddock'
  | 'horseLicking'
  | 'horsesBanner'
  | 'cattleGrazing'
  | 'cattleSaltBag'
  | 'bowlOfSalt'
  | 'saltPouch6lb'
  | 'pinkSaltJar16oz'
  | 'saltRockBag';

export interface LegacyImage {
  /** Path served from our own domain, relative to the site root. */
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Original WordPress URL — used only by the fetch script. */
  readonly wordpress: string;
}

const LEGACY_DIR = '/images/legacy';
const WP_BASE = 'https://himalayankoh.com/wp-content/uploads';

export const LEGACY_IMAGES: Record<LegacyImageKey, LegacyImage> = {
  horseLickPaddock: {
    src: `${LEGACY_DIR}/horse-salt-lick-paddock.jpg`,
    width: 600,
    height: 450,
    wordpress: `${WP_BASE}/2021/03/horse-lick-himalayan-salt5-600x450.jpg`,
  },
  horseLicking: {
    src: `${LEGACY_DIR}/horse-licking-salt.jpg`,
    width: 600,
    height: 450,
    wordpress: `${WP_BASE}/2017/10/slat-licking-horse.jpg`,
  },
  horsesBanner: {
    src: `${LEGACY_DIR}/horses-grazing-banner.jpg`,
    width: 1300,
    height: 200,
    wordpress: `${WP_BASE}/2019/08/horses-1300x200.jpg`,
  },
  cattleGrazing: {
    src: `${LEGACY_DIR}/cattle-grazing.jpg`,
    width: 600,
    height: 450,
    wordpress: `${WP_BASE}/2017/10/blog9.jpg`,
  },
  cattleSaltBag: {
    src: `${LEGACY_DIR}/cattle-salt-bag.jpg`,
    width: 600,
    height: 450,
    wordpress: `${WP_BASE}/2020/10/1-600x450.jpeg`,
  },
  bowlOfSalt: {
    src: `${LEGACY_DIR}/bowl-of-salt.jpg`,
    width: 600,
    height: 450,
    wordpress: `${WP_BASE}/2017/10/bowl-of-salt.jpg`,
  },
  saltPouch6lb: {
    src: `${LEGACY_DIR}/salt-pouch-6lb.webp`,
    width: 500,
    height: 500,
    wordpress: `${WP_BASE}/2025/07/6-lbs-pouche.webp`,
  },
  pinkSaltJar16oz: {
    src: `${LEGACY_DIR}/pink-salt-16oz-jar.jpg`,
    width: 500,
    height: 500,
    wordpress: `${WP_BASE}/2024/08/WhatsApp-Image-2024-08-02-at-11.31.07-PM-500x500.jpeg`,
  },
  saltRockBag: {
    src: `${LEGACY_DIR}/salt-rock-bag.jpg`,
    width: 600,
    height: 450,
    wordpress: `${WP_BASE}/2023/08/S6-600x450.jpg`,
  },
};

/** Shorthand for the common case of only needing the path. */
export const legacyImage = (key: LegacyImageKey): string => LEGACY_IMAGES[key].src;
