import CharacterBuilder from '@/components/CharacterBuilder';
import {
  getBuilderProfessions,
  getBuilderOrigins,
  getBuilderFeats,
  getBuilderSpells,
  getChoiceFeatures,
} from '@/lib/builderData';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'New Character' };

export default function NewCharacterPage() {
  const professions = getBuilderProfessions();
  const origins = getBuilderOrigins();
  const { professionFeats, originFeats } = getBuilderFeats();
  const spells = getBuilderSpells();
  const choiceFeatures = getChoiceFeatures();

  return (
    <CharacterBuilder
      professions={professions}
      origins={origins}
      professionFeats={professionFeats}
      originFeats={originFeats}
      spells={spells}
      choiceFeatures={choiceFeatures}
    />
  );
}
