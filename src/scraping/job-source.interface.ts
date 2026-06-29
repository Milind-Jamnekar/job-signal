import { RawListing } from './freshness-scorer';

export interface JobSource {
  readonly sourceName: string;
  fetchListings(): Promise<RawListing[]>;
}
