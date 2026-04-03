import CharacterList from '@/components/CharacterList';
import PageHeader from '@/components/PageHeader';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Characters' };

export default function CharactersPage() {
  return (
    <div>
      <PageHeader
        title="Characters"
        subtitle="Your saved adventurers. Create new characters or continue an existing one."
      />
      <CharacterList />
    </div>
  );
}
