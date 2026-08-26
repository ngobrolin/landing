import { describe, it, expect } from 'vitest';
import { mediaKit, MEDIA_KIT_FIGURES } from './media-kit';
import { assessMediaKitFreshness } from '../../scripts/lib/media-kit-freshness';

describe('media-kit.json', () => {
  // The freshness check reads this date. A prose date ("Agustus 2026") would
  // make the alarm depend on parsing rendered copy, which breaks the first time
  // the wording changes.
  it('stores a machine-readable capture date', () => {
    expect(mediaKit.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(assessMediaKitFreshness(mediaKit.capturedAt, new Date()).unreadable).toBe(
      false
    );
  });

  /**
   * The alarm names figures from `MEDIA_KIT_FIGURES`. A figure added to the
   * JSON without an entry there would sit on the sponsor page and never be
   * nagged about — the exact silence this whole mechanism exists to break.
   *
   * An invariant, not a snapshot: it does not care which figures exist, only
   * that the store and the catalogue describe the same set.
   */
  it('has exactly one catalogue entry per stored figure', () => {
    const stored = Object.keys(mediaKit).filter(key => key !== 'capturedAt');
    const catalogued = MEDIA_KIT_FIGURES.map(figure => figure.key);

    expect([...catalogued].sort()).toEqual([...stored].sort());
  });

  it('tells a maintainer where in YouTube Studio to read each figure', () => {
    for (const figure of MEDIA_KIT_FIGURES) {
      expect(figure.label).toBeTruthy();
      expect(figure.where).toContain('YouTube Studio');
    }
  });

  // The subscriber count is derived weekly by the sync. A hand-copy here would
  // be a second copy of a figure that already moves on its own.
  it('stores no figure the read-only API key can derive', () => {
    expect(Object.keys(mediaKit)).not.toContain('subscriberCount');
    expect(MEDIA_KIT_FIGURES.map(f => f.key)).not.toContain('subscriberCount');
  });
});
