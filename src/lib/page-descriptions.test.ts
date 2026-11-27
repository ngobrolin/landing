import { describe, expect, it } from 'vitest';
import { getEpisodes } from './episodes';
import { ABOUT_DESCRIPTION, HOME_DESCRIPTION, getArchiveDescription } from './page-descriptions';

const all = () => [HOME_DESCRIPTION, ABOUT_DESCRIPTION, getArchiveDescription(getEpisodes().length)];

describe('page descriptions', () => {
  it('fit a search snippet and use no em dash', () => {
    for (const description of all()) {
      expect(description.length, description).toBeLessThanOrEqual(160);
      expect(description).not.toContain('—');
    }
  });

  // Room for a four-digit archive without rewriting the sentence.
  it('still fits once the archive reaches 9999 episodes', () => {
    expect(getArchiveDescription(9999).length).toBeLessThanOrEqual(160);
  });

  it('says what the home page offers', () => {
    expect(HOME_DESCRIPTION).toMatch(/web development/);
    expect(HOME_DESCRIPTION).toMatch(/Indonesia/);
    expect(HOME_DESCRIPTION).toMatch(/transkrip/);
    expect(HOME_DESCRIPTION).toMatch(/ringkasan/);
  });

  it('names all three hosts on the about page', () => {
    for (const host of ['Eka', 'Ivan', 'Riza Fahmi']) expect(ABOUT_DESCRIPTION).toContain(host);
  });

  it('states the real archive size and what can be searched', () => {
    const description = getArchiveDescription(getEpisodes().length);
    expect(description).toContain(`${getEpisodes().length} episode`);
    expect(description).toMatch(/transkrip/);
    expect(description).toMatch(/topik/);
  });
});
