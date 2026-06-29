import { Injectable } from '@nestjs/common';

export interface RawListing {
  title: string;
  companyName: string;
  url: string;
  postedAt: Date | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  description?: string | null;
}

@Injectable()
export class FreshnessScorer {
  score(listing: RawListing, isRepost: boolean): number {
    return (
      this.ageScore(listing.postedAt) +
      this.salaryScore(listing) +
      this.descriptionScore(listing.description) +
      this.repostScore(isRepost)
      // company rating signal (+15) is inactive until Layer 3
    );
  }

  private ageScore(postedAt: Date | null): number {
    if (!postedAt) return 0;
    const ageDays = (Date.now() - postedAt.getTime()) / 86_400_000;
    if (ageDays < 7) return 30;
    if (ageDays < 14) return 20;
    if (ageDays < 30) return 10;
    return 0;
  }

  private salaryScore(listing: RawListing): number {
    if (
      listing.currency === 'USD' &&
      listing.salaryMin != null &&
      listing.salaryMax != null
    ) {
      return 20;
    }
    return 0;
  }

  private descriptionScore(description: string | null | undefined): number {
    const len = description?.length ?? 0;
    if (len > 500) return 15;
    if (len > 200) return 8;
    return 0;
  }

  private repostScore(isRepost: boolean): number {
    return isRepost ? 0 : 20;
  }
}
