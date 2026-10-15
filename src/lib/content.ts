import {normalizeCategory} from './categories';
import {normalizeSocialLinks} from './socials';
import type {Post, SiteSettings, Snapshot} from './types';

export function withoutLegacyTags<T extends object>(value: T): Omit<T, 'tags'> {
  const {tags: _tags, ...rest} = value as T & {tags?: unknown};
  return rest;
}

export function normalizePost(post: Omit<Post, 'category'> & {category: string}): Post {
  return {...withoutLegacyTags(post), category: normalizeCategory(post.category, post.slug, post.title)};
}

export function normalizeSettings(settings: Omit<SiteSettings,'socials'> & {socials?:Partial<SiteSettings['socials']>|null}): SiteSettings {
  return {...settings, socials:normalizeSocialLinks(settings.socials), projects: settings.projects.map(withoutLegacyTags)};
}

export function normalizeSnapshot(snapshot: Snapshot): Snapshot {
  return {...snapshot, settings: normalizeSettings(snapshot.settings), posts: snapshot.posts.map(normalizePost)};
}
