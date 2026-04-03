import { buildSearchIndex } from '@/lib/data';
import PageHeader from '@/components/PageHeader';
import SearchClient from '@/components/SearchClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Search' };

export default function SearchPage() {
  const index = buildSearchIndex();

  return (
    <div>
      <PageHeader
        title="Search"
        subtitle="Search across all game content — professions, spells, feats, origins, actions, and more."
        count={index.length}
        countLabel="indexed entries"
      />
      <SearchClient index={index} />
    </div>
  );
}
