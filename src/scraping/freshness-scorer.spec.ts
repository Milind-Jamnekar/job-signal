import { FreshnessScorer, RawListing } from './freshness-scorer';

const scorer = new FreshnessScorer();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

const base: RawListing = {
  title: 'Backend Engineer',
  companyName: 'Acme',
  url: 'https://example.com/job/1',
  postedAt: daysAgo(3),
  salaryMin: 80_000,
  salaryMax: 120_000,
  currency: 'USD',
  description: 'x'.repeat(600),
};

describe('FreshnessScorer', () => {
  describe('age signal', () => {
    it('returns 30 for a listing posted <7 days ago', () => {
      expect(
        scorer.score({ ...base, postedAt: daysAgo(3) }, false),
      ).toBeGreaterThanOrEqual(30 + 20 + 15 + 20);
    });

    it('returns 20 for 7–13 days ago', () => {
      const s = scorer['ageScore'](daysAgo(10));
      expect(s).toBe(20);
    });

    it('returns 10 for 14–29 days ago', () => {
      const s = scorer['ageScore'](daysAgo(20));
      expect(s).toBe(10);
    });

    it('returns 0 for >30 days ago', () => {
      const s = scorer['ageScore'](daysAgo(45));
      expect(s).toBe(0);
    });

    it('returns 0 for null postedAt', () => {
      const s = scorer['ageScore'](null);
      expect(s).toBe(0);
    });
  });

  describe('salary signal', () => {
    it('returns 20 for USD listing with min+max', () => {
      expect(scorer['salaryScore'](base)).toBe(20);
    });

    it('returns 0 when salary is absent', () => {
      expect(
        scorer['salaryScore']({ ...base, salaryMin: null, salaryMax: null }),
      ).toBe(0);
    });

    it('returns 0 for non-USD currency', () => {
      expect(scorer['salaryScore']({ ...base, currency: 'INR' })).toBe(0);
    });
  });

  describe('description signal', () => {
    it('returns 15 for >500 chars', () => {
      expect(scorer['descriptionScore']('x'.repeat(501))).toBe(15);
    });

    it('returns 8 for 201–500 chars', () => {
      expect(scorer['descriptionScore']('x'.repeat(300))).toBe(8);
    });

    it('returns 0 for ≤200 chars', () => {
      expect(scorer['descriptionScore']('x'.repeat(100))).toBe(0);
    });

    it('returns 0 for null description', () => {
      expect(scorer['descriptionScore'](null)).toBe(0);
    });
  });

  describe('repost signal', () => {
    it('returns 20 when not a repost', () => {
      expect(scorer['repostScore'](false)).toBe(20);
    });

    it('returns 0 when it is a repost', () => {
      expect(scorer['repostScore'](true)).toBe(0);
    });
  });

  describe('combined', () => {
    it('fresh listing scores ≥60', () => {
      expect(scorer.score(base, false)).toBeGreaterThanOrEqual(60);
    });

    it('zombie listing (old, no salary, short description) scores <60', () => {
      const zombie: RawListing = {
        ...base,
        postedAt: daysAgo(45),
        salaryMin: null,
        salaryMax: null,
        currency: null,
        description: 'Short.',
      };
      expect(scorer.score(zombie, false)).toBeLessThan(60);
    });

    it('repost of a fresh listing loses 20pts', () => {
      const fresh = scorer.score(base, false);
      const repost = scorer.score(base, true);
      expect(fresh - repost).toBe(20);
    });
  });
});
