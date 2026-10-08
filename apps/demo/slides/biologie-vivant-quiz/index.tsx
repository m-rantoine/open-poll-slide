import {
  ClassResults,
  type DesignSystem,
  Lobby,
  MultipleChoice,
  type MultipleChoiceQuestion,
  type Page,
  type SlideMeta,
} from '@open-slide/core';

export const meta: SlideMeta = {
  title: 'Quiz de biologie : classification du vivant',
  createdAt: '2026-10-08T16:31:50.985Z',
  theme: 'bright-sans',
};

export const design: DesignSystem = {
  palette: { bg: '#ffffff', text: '#202124', accent: '#1a73e8' },
  fonts: {
    display: "'Inter Tight', 'Inter', -apple-system, system-ui, sans-serif",
    body: "'Inter', -apple-system, system-ui, sans-serif",
  },
  typeScale: { hero: 132, body: 32 },
  radius: 24,
};

export const questions = {
  q01: {
    id: 'q01',
    type: 'multiple_choice',
    question: 'Quel domaine comprend les organismes ayant un noyau véritable ?',
    options: [
      { id: 'bacteries', label: 'Bactéries' },
      { id: 'archeobacteries', label: 'Archéobactéries' },
      { id: 'eucaryotes', label: 'Eucaryotes' },
    ],
    correct: ['eucaryotes'],
    startLocked: true,
    showResults: true,
  },
  q02: {
    id: 'q02',
    type: 'multiple_choice',
    question: 'Quel type de cellule aurait une mitochondrie?',
    options: [
      { id: 'cellule-procaryote', label: 'Cellule procaryote' },
      { id: 'cellule-eucaryote', label: 'Cellule eucaryote' },
    ],
    correct: ['cellule-eucaryote'],
    startLocked: true,
    showResults: true,
  },
  q03: {
    id: 'q03',
    type: 'multiple_choice',
    question: "Laquelle n'est pas un règne du vivant ?",
    options: [
      { id: 'archeobacterie', label: 'Archéobactérie' },
      { id: 'eucaryote', label: 'Eucaryote' },
      { id: 'mycete', label: 'Mycète' },
      { id: 'protiste', label: 'Protiste' },
      { id: 'vegetal', label: 'Végétal' },
    ],
    correct: ['eucaryote'],
    startLocked: true,
    showResults: true,
  },
  q04: {
    id: 'q04',
    type: 'multiple_choice',
    question: 'Ordre hiérarchique des groupes biologiques',
    options: [
      { id: 'regne-ordre-famille-espece', label: 'Règne, Ordre, Famille, Espèce' },
      { id: 'regne-ordre-genre-embranchement', label: 'Règne, Ordre, Genre, Embranchement' },
      {
        id: 'regne-classe-ordre-genre-embranchement',
        label: 'Règne, Classe, Ordre, Genre, Embranchement',
      },
      {
        id: 'regne-embranchement-famille-ordre-espece',
        label: 'Règne, Embranchement, Famille, Ordre, Espèce',
      },
    ],
    correct: ['regne-ordre-famille-espece'],
    startLocked: true,
    showResults: true,
  },
  q05: {
    id: 'q05',
    type: 'multiple_choice',
    question:
      "Quel concept décrit la capacité de se reproduire entre individus et d'obtenir des descendants viables et fertiles ?",
    options: [
      { id: 'morphologie', label: 'Morphologie' },
      { id: 'interfecondite', label: 'Interfécondité' },
      { id: 'phylogenie', label: 'Phylogénie' },
    ],
    correct: ['interfecondite'],
    startLocked: true,
    showResults: true,
  },
  q06: {
    id: 'q06',
    type: 'multiple_choice',
    question: "À l'ordi, laquelle des options suivantes est bien écrit ?",
    options: [
      { id: 'puma-concolor', label: '𝑃𝑢𝑚𝑎 𝐶𝑜𝑛𝑐𝑜𝑙𝑜𝑟' },
      { id: 'puma-concolor-2', label: 'puma concolor' },
      { id: 'puma-concolor-3', label: '𝑃𝑢𝑚𝑎 𝑐𝑜𝑛𝑐𝑜𝑙𝑜𝑟' },
      { id: 'puma-concolor-4', label: 'Puma concolor' },
    ],
    correct: ['puma-concolor-3'],
    startLocked: true,
    showResults: true,
  },
  q07: {
    id: 'q07',
    type: 'multiple_choice',
    question: 'Quelle étape du dogme central est illustrée par la "copie d\'une recette" ?',
    options: [
      { id: 'transcription-de-l-adn-en-arnm', label: "Transcription de l'ADN en ARNm" },
      { id: 'traduction-de-l-arnm-en-proteine', label: "Traduction de l'ARNm en protéine" },
      { id: 'replication-de-l-adn', label: "Réplication de l'ADN" },
      { id: 'synthese-proteique', label: 'Synthèse protéique' },
    ],
    correct: ['transcription-de-l-adn-en-arnm'],
    startLocked: true,
    showResults: true,
  },
  q08: {
    id: 'q08',
    type: 'multiple_choice',
    question: "Quel élément constitue la couche externe protéique d'un virus ?",
    options: [
      { id: 'la-capside', label: 'La capside' },
      { id: 'l-enveloppe-lipidique', label: "L'enveloppe lipidique" },
      { id: 'le-noyau', label: 'Le noyau' },
      { id: 'le-ribosome', label: 'Le ribosome' },
    ],
    correct: ['la-capside'],
    startLocked: true,
    showResults: true,
  },
  q09: {
    id: 'q09',
    type: 'multiple_choice',
    question: "Laquelle fait partie de l'immunité adaptative ?",
    options: [
      { id: 'la-peau', label: 'La peau' },
      { id: 'lymphocyte-t', label: 'Lymphocyte T' },
      { id: 'macrophage', label: 'Macrophage' },
      { id: 'cellule-nk', label: 'Cellule NK' },
    ],
    correct: ['lymphocyte-t'],
    startLocked: true,
    showResults: true,
  },
  q10: {
    id: 'q10',
    type: 'multiple_choice',
    question:
      "Quel type d'immunité fournit une réponse spécifique après première exposition à un pathogène ?",
    options: [
      { id: 'immunite-innee', label: 'Immunité innée' },
      { id: 'immunite-adaptative', label: 'Immunité adaptative' },
      { id: 'les-deux', label: 'Les deux' },
      { id: 'aucun', label: 'Aucun' },
    ],
    correct: ['immunite-adaptative'],
    startLocked: true,
    showResults: true,
  },
  q11: {
    id: 'q11',
    type: 'multiple_choice',
    question: "Quel est le rôle principal d'un vaccin dans le système immunitaire ?",
    options: [
      {
        id: 'traiter-les-symptomes-d-une-infection',
        label: "Traiter les symptômes d'une infection",
      },
      {
        id: 'remplacer-definitivement-les-anticorps-n',
        label: 'Remplacer définitivement les anticorps naturels',
      },
      {
        id: 'detruire-directement-tous-les-pathogenes',
        label: 'Détruire directement tous les pathogènes',
      },
      {
        id: 'stimuler-la-production-de-lymphocytes-me',
        label: 'Stimuler la production de lymphocytes mémoires',
      },
    ],
    correct: ['stimuler-la-production-de-lymphocytes-me'],
    startLocked: true,
    showResults: true,
  },
  q12: {
    id: 'q12',
    type: 'multiple_choice',
    question: 'Quel type de virus utilise la transcriptase inverse pour convertir son ARN en ADN ?',
    options: [
      { id: 'tous-les-virus-a-adn', label: 'Tous les virus à ADN' },
      { id: 'tous-les-virus-a-arn', label: 'Tous les virus à ARN' },
      { id: 'retrovirus', label: 'Rétrovirus' },
      { id: 'bacterie', label: 'Bactérie' },
    ],
    correct: ['retrovirus'],
    startLocked: true,
    showResults: true,
  },
  q13: {
    id: 'q13',
    type: 'multiple_choice',
    question: 'Quelle étape distingue le cycle lysogénique du cycle lytique ?',
    options: [
      {
        id: 'integration-du-materiel-viral-comme-prov',
        label: 'Intégration du matériel viral comme provirus',
      },
      { id: 'lyse-immediate-de-la-cellule-hote', label: 'Lyse immédiate de la cellule hôte' },
      { id: 'assemblage-rapide-de-nouveaux-virus', label: 'Assemblage rapide de nouveaux virus' },
      {
        id: 'injection-du-materiel-genetique-seulemen',
        label: 'Injection du matériel génétique seulement',
      },
    ],
    correct: ['integration-du-materiel-viral-comme-prov'],
    startLocked: true,
    showResults: true,
  },
  q15: {
    id: 'q15',
    type: 'multiple_choice',
    question: "Qu'est-ce qui caractérise la paroi d'une bactérie Gram négative ?",
    options: [
      { id: 'couleur-finale-bleu-violet', label: 'Couleur finale bleu violet' },
      { id: 'composee-d-huile', label: "Composée d'huile" },
      { id: 'plus-complexe', label: 'Plus complexe' },
      { id: 'l-absence-d-organites-cellulaires', label: "L'absence d'organites cellulaires" },
    ],
    correct: ['plus-complexe'],
    startLocked: true,
    showResults: true,
  },
  q16: {
    id: 'q16',
    type: 'multiple_choice',
    question: 'Le Streptococcus pyogenes qui cause un mal de gorge a quelle forme ?',
    options: [
      { id: 'spheres-simples', label: 'sphères simples' },
      { id: 'batonnets-simples', label: 'bâtonnets simples' },
      { id: 'ensemble-de-batonnets', label: 'ensemble de bâtonnets' },
      { id: 'chaine-de-spheres', label: 'chaîne de sphères' },
    ],
    correct: ['chaine-de-spheres'],
    startLocked: true,
    showResults: true,
  },
  q17: {
    id: 'q17',
    type: 'multiple_choice',
    question:
      "Quel processus décrit le transfert d'ADN d'une bactérie à une autre par l'intermédiaire d'un virus ?",
    options: [
      { id: 'conjugaison', label: 'Conjugaison' },
      { id: 'transformation', label: 'Transformation' },
      { id: 'transduction', label: 'Transduction' },
      { id: 'scission-binaire', label: 'Scission binaire' },
    ],
    correct: ['transduction'],
    startLocked: true,
    showResults: true,
  },
  q18: {
    id: 'q18',
    type: 'multiple_choice',
    question: "Pourquoi la formation d'une endospore est-elle avantageuse pour une bactérie ?",
    options: [
      { id: 'reproduction-rapide', label: 'reproduction rapide' },
      { id: 'survivre-aux-milieux-defavorables', label: 'survivre aux milieux défavorables' },
      { id: 'accelere-la-synthese-de-proteines', label: 'accélère la synthèse de protéines' },
      { id: 'methode-de-transfert-genetique', label: 'méthode de transfert génétique' },
    ],
    correct: ['survivre-aux-milieux-defavorables'],
    startLocked: true,
    showResults: true,
  },
  q19: {
    id: 'q19',
    type: 'multiple_choice',
    question: 'Quel est le rôle principal des cils chez un cilié comme la paramécie ?',
    options: [
      { id: 'realiser-la-respiration-cellulaire', label: 'réaliser la respiration cellulaire' },
      {
        id: 'capter-la-lumiere-pour-la-photosynthese',
        label: 'capter la lumière pour la photosynthèse',
      },
      { id: 'fixer-l-organisme-a-un-support', label: "fixer l'organisme à un support" },
      {
        id: 'se-deplacer-et-creer-un-courant-vers-la-',
        label: 'Se déplacer et créer un courant vers la gouttière buccale',
      },
    ],
    correct: ['se-deplacer-et-creer-un-courant-vers-la-'],
    startLocked: true,
    showResults: true,
  },
  q20: {
    id: 'q20',
    type: 'multiple_choice',
    question:
      "L'euglène possède à la fois des chloroplastes et un flagelle. Quelle fonction lui confère le chloroplaste ?",
    options: [
      { id: 'deplacement-par-fouettage', label: 'Déplacement par fouettage' },
      { id: 'photosynthese', label: 'photosynthèse' },
      { id: 'parasitage', label: 'parasitage' },
      { id: 'absorption-de-nutriments', label: 'absorption de nutriments' },
    ],
    correct: ['photosynthese'],
    startLocked: true,
    showResults: true,
  },
  q21: {
    id: 'q21',
    type: 'multiple_choice',
    question: 'Les sporozoaires sont classifiés comme des protozoaires et non les algues car',
    options: [
      { id: 'ils-ont-des-pseudopodes', label: 'Ils ont des pseudopodes' },
      { id: 'ils-sont-heterotrophes', label: 'Ils sont hétérotrophes' },
      { id: 'ils-sont-immobiles', label: 'Ils sont immobiles' },
    ],
    correct: ['ils-sont-heterotrophes'],
    startLocked: true,
    showResults: true,
  },
  q22: {
    id: 'q22',
    type: 'multiple_choice',
    question: 'Quel mode de nutrition implique la décomposition de matière morte ?',
    options: [
      { id: 'saprophytie', label: 'Saprophytie' },
      { id: 'parasitisme', label: 'Parasitisme' },
      { id: 'mutualisme', label: 'Mutualisme' },
      { id: 'predation', label: 'Prédation' },
    ],
    correct: ['saprophytie'],
    startLocked: true,
    showResults: true,
  },
  q23: {
    id: 'q23',
    type: 'multiple_choice',
    question: 'Dans quelles conditions les champignons déclenchent-ils la reproduction sexuée ?',
    options: [
      { id: 'en-presence-d-eau-abondante', label: "En présence d'eau abondante" },
      { id: 'dans-des-conditions-defavorables', label: 'Dans des conditions défavorables' },
      { id: 'durant-la-division-asexuee', label: 'Durant la division asexuée' },
      { id: 'dans-un-sol-perturbe', label: 'Dans un sol perturbé' },
    ],
    correct: ['dans-des-conditions-defavorables'],
    startLocked: true,
    showResults: true,
  },
  q24: {
    id: 'q24',
    type: 'multiple_choice',
    question: 'Quel groupe comprend les moisissures du pain ?',
    options: [
      { id: 'ascomycetes', label: 'Ascomycètes' },
      { id: 'deuteromycetes', label: 'Déutéromycètes' },
      { id: 'basidiomycetes', label: 'Basidiomycètes' },
      { id: 'zygomycetes', label: 'Zygomycètes' },
    ],
    correct: ['zygomycetes'],
    startLocked: true,
    showResults: true,
  },
  q25: {
    id: 'q25',
    type: 'multiple_choice',
    question: 'Quel groupe diversifié se reproduit uniquement par voie asexuée ?',
    options: [
      { id: 'ascomycetes', label: 'Ascomycètes' },
      { id: 'deuteromycetes', label: 'Déutéromycètes' },
      { id: 'basidiomycetes', label: 'Basidiomycètes' },
      { id: 'zygomycetes', label: 'Zygomycètes' },
    ],
    correct: ['deuteromycetes'],
    startLocked: true,
    showResults: true,
  },
} satisfies Record<string, MultipleChoiceQuestion>;

export default [
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <Lobby language="fr" title="Quiz de biologie : classification du vivant" />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q01.question}
      </h1>
      <MultipleChoice
        language="fr"
        question={questions.q01}
        style={{
          minWidth: '0px',
          minHeight: '0px',
          maxWidth: 'none',
          maxHeight: 'none',
          flexShrink: '0',
          flexGrow: '0',
          flexBasis: 'auto',
          width: '1664px',
          height: '731.22px',
          translate: '0px 0px',
        }}
      />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q02.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q02} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q03.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q03} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q04.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q04} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q05.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q05} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q06.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q06} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q07.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q07} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q08.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q08} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q09.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q09} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q10.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q10} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q11.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q11} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q12.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q12} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q13.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q13} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q15.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q15} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q16.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q16} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q17.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q17} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q18.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q18} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q19.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q19} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q20.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q20} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q21.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q21} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q22.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q22} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q23.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q23} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q24.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q24} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        gap: 48,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-display)',
          fontSize: 64,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {questions.q25.question}
      </h1>
      <MultipleChoice language="fr" question={questions.q25} />
    </div>
  ),
  () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--osd-bg)',
        color: 'var(--osd-text)',
        fontFamily: 'var(--osd-font-body)',
      }}
    >
      <ClassResults language="fr" />
    </div>
  ),
] satisfies Page[];
