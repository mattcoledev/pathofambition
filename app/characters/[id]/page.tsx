import CharacterSheetPage from '@/components/CharacterSheet';
import {
  getBuilderProfessions,
  getBuilderOrigins,
  getBuilderFeats,
  getBuilderSpells,
} from '@/lib/builderData';

export default function CharacterPage({ params }: { params: { id: string } }) {
  const professions = getBuilderProfessions();
  const origins = getBuilderOrigins();
  const { professionFeats, originFeats } = getBuilderFeats();
  const spells = getBuilderSpells();

  return (
    <CharacterSheetPage
      id={params.id}
      professions={professions}
      origins={origins}
      professionFeats={professionFeats}
      originFeats={originFeats}
      spells={spells}
    />
  );
}
