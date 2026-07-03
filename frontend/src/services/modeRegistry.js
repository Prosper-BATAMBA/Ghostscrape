export var MODE_CARDS = [
  {
    id: 'full-page',
    name: 'Page complète',
    description: 'Extraction complète de la page : titres, paragraphes, liens, images',
    icon: '\u{1F4C4}',
    badge: 'Automatique',
    type: 'full_page_extraction',
    capabilities: { autoExtract: true },
  },
  {
    id: 'data-types',
    name: 'Extraction ciblée',
    description: 'Choisissez les types de données à extraire : images, titres, liens, tableaux...',
    icon: '\u{1F3AF}',
    badge: 'Configurable',
    type: 'data_types_extraction',
    capabilities: { autoExtract: false },
  },
  {
    id: 'css-selector',
    name: 'Sélecteur CSS',
    description: 'Extrayez des éléments avec vos propres sélecteurs CSS',
    icon: '#\uFE0F\u20E3',
    badge: 'Personnalisé',
    type: 'css_selector_extraction',
    capabilities: { autoExtract: false },
  },
]
