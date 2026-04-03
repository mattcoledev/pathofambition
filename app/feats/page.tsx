import { getProfessionFeats, getOriginFeats } from '@/lib/data';
import PageHeader from '@/components/PageHeader';
import FeatsClient from '@/components/FeatsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Feats' };

export default function FeatsPage() {
  const { owners: profOwners, feats: profFeats } = getProfessionFeats();
  const { owners: originOwners, feats: originFeats } = getOriginFeats();

  const total = profFeats.length + originFeats.length;

  return (
    <div>
      <PageHeader
        title="Feats"
        subtitle="Special abilities earned through origins and profession advancement."
        count={total}
        countLabel="feats"
      />
      <FeatsClient
        profOwners={profOwners}
        profFeats={profFeats}
        originOwners={originOwners}
        originFeats={originFeats}
      />
    </div>
  );
}
