// Where smoking is banned in Singapore, mapped to OpenStreetMap features.
// Source of the rules: https://www.nea.gov.sg/our-services/smoking-prohibition/overview
//
// Each rule:
//   inside        verdict when the point is inside the shape ('red' | 'amber')
//   bufferM       extra distance around the shape that the law also covers
//   bufferVerdict verdict inside that buffer (defaults to `inside`)
//   nearM         band beyond the buffer that returns amber; null = max(10 m, GPS accuracy); 0 = none
//   pointRadiusM  size used when OSM only has a point for the place
//   geom          'line' for walkways; otherwise shapes come from the OSM element
//   query         Overpass selectors; fetch-data.js appends (area.sg)
//   avoid         not a ban: never affects the verdict, only flags `onRoad`
//   tiled         fetched in map tiles (too big for one query) and clipped to Singapore
//   bufferFor     per-element buffer from its OSM tags, stored on the zone as `bufferM`

export const NEA_SOURCE = 'https://www.nea.gov.sg/our-services/smoking-prohibition/overview'
export const FINE_NOTE = 'Fines up to $1,000'
export const DISCLAIMER = 'Guidance only. Follow signs on site and NEA rules.'

export const RULES = [
  {
    id: 'bus_stop',
    label: 'Bus stop',
    reason: 'Smoking is banned at bus stops and shelters, and within 5 m of them.',
    inside: 'red', bufferM: 5, pointRadiusM: 7,
    query: [
      'node["highway"="bus_stop"]',
      'nwr["amenity"="shelter"]["shelter_type"="public_transport"]',
    ],
  },
  {
    id: 'bus_interchange',
    label: 'Bus interchange',
    reason: 'Smoking is banned in bus interchanges and terminals, including shops in the compound.',
    inside: 'red', bufferM: 0, pointRadiusM: 40,
    query: ['nwr["amenity"="bus_station"]'],
  },
  {
    id: 'education',
    label: 'School or campus',
    reason: 'Smoking is banned in school compounds and within 5 m of them. Universities may have designated smoking areas inside.',
    inside: 'red', bufferM: 5, pointRadiusM: 30,
    query: ['nwr["amenity"~"^(school|college|university|kindergarten|childcare)$"]'],
  },
  {
    id: 'hospital',
    label: 'Hospital',
    reason: 'Smoking is banned everywhere in hospital compounds.',
    inside: 'red', bufferM: 0, pointRadiusM: 40,
    query: ['nwr["amenity"="hospital"]'],
  },
  {
    id: 'community_club',
    label: 'Community centre',
    reason: 'Smoking is banned at community centres and clubs, including their shops and facilities.',
    inside: 'red', bufferM: 0, pointRadiusM: 20,
    query: ['nwr["amenity"="community_centre"]'],
  },
  {
    id: 'stadium',
    label: 'Stadium',
    reason: 'Smoking is banned in sports stadiums and their compounds.',
    inside: 'red', bufferM: 0, pointRadiusM: 50,
    query: ['nwr["leisure"="stadium"]'],
  },
  {
    id: 'park',
    label: 'Park or garden',
    reason: 'Smoking is banned in parks, gardens and nature reserves, including HDB estate and JTC parks.',
    inside: 'red', bufferM: 0, pointRadiusM: 20,
    query: ['nwr["leisure"~"^(park|garden|nature_reserve)$"]'],
  },
  {
    id: 'playground_exercise',
    label: 'Playground or exercise area',
    reason: 'Smoking is banned at playgrounds, fitness corners and sports courts.',
    inside: 'red', bufferM: 0, pointRadiusM: 10,
    query: ['nwr["leisure"~"^(playground|fitness_station|pitch|track)$"]'],
  },
  {
    id: 'swimming_pool',
    label: 'Swimming pool',
    reason: 'Smoking is banned at swimming pools and within 5 m of them.',
    inside: 'red', bufferM: 5, pointRadiusM: 15,
    query: ['nwr["leisure"~"^(swimming_pool|water_park)$"]'],
  },
  {
    id: 'reservoir',
    label: 'Reservoir',
    reason: 'Smoking is banned at reservoirs and ABC Waters sites.',
    inside: 'red', bufferM: 0, pointRadiusM: 50,
    query: ['nwr["water"="reservoir"]', 'nwr["landuse"="reservoir"]'],
  },
  {
    id: 'beach',
    label: 'Beach',
    reason: 'Smoking is banned at recreational beaches such as East Coast, Changi and Sentosa.',
    inside: 'red', bufferM: 0, pointRadiusM: 30,
    query: ['nwr["natural"="beach"]'],
  },
  {
    id: 'covered_walkway',
    label: 'Covered walkway or overhead bridge',
    reason: 'Smoking is banned on covered linkways, overhead bridges and underground walkways.',
    inside: 'red', bufferM: 2, geom: 'line',
    query: [
      'way["highway"~"^(footway|path|pedestrian|steps|corridor)$"]["covered"~"^(yes|arcade)$"]',
      'way["highway"~"^(footway|path|pedestrian|steps)$"]["bridge"]',
      'way["highway"~"^(footway|path|pedestrian|steps)$"]["tunnel"]',
    ],
  },
  {
    id: 'ferry_terminal',
    label: 'Ferry terminal',
    reason: 'Smoking is banned at ferry and cruise terminals.',
    inside: 'red', bufferM: 0, pointRadiusM: 40,
    query: ['nwr["amenity"="ferry_terminal"]'],
  },
  {
    id: 'toilets',
    label: 'Public toilet',
    reason: 'Smoking is banned in washrooms, including mobile toilets.',
    inside: 'red', bufferM: 0, pointRadiusM: 6,
    query: ['nwr["amenity"="toilets"]'],
  },
  {
    id: 'hawker_centre',
    label: 'Hawker centre or food court',
    reason: 'Smoking is banned in hawker centres and coffee shops, except at approved smoking corners.',
    inside: 'red', bufferM: 0, pointRadiusM: 25,
    query: ['nwr["amenity"~"^(food_court|marketplace)$"]'],
  },

  // Buildings are fetched separately (by tile) and sorted into these three rules.
  {
    id: 'building',
    label: 'Indoors or under a block',
    reason: 'Smoking is banned inside buildings, including void decks, lobbies, corridors and stairwells. Within 5 m of entrances, exits, windows and vents is also banned.',
    inside: 'red', bufferM: 5, bufferVerdict: 'amber', nearM: 0,
  },
  {
    id: 'shelter',
    label: 'Under a roof or shelter',
    reason: 'Many sheltered structures, such as covered linkways and pavilions, are smoke-free. Check the signs.',
    inside: 'amber', bufferM: 0, nearM: 0,
  },
  {
    id: 'carpark_building',
    label: 'Multi-storey carpark',
    reason: 'Smoking is banned inside multi-storey and basement carparks. Only the uncovered top deck is allowed.',
    inside: 'amber', bufferM: 0, nearM: 0,
  },

  // Not a no-smoking place: roads never change a verdict. They only keep
  // suggested open spots off the carriageway (see nearby.js). Fetched by tile.
  {
    id: 'road',
    label: 'Road',
    reason: 'On or next to a road.',
    avoid: true, geom: 'line', bufferM: 4, tiled: true,
    bufferFor: (tags) => ROAD_HALF_WIDTH_M[tags?.highway] ?? 4,
    query: ['way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street)(_link)?$"]'],
  },

  // Built from the NEA designated smoking areas; NEA does not publish the boundary as open data.
  {
    id: 'orchard_nsz',
    label: 'Orchard Road No Smoking Zone',
    reason: 'In the Orchard Road No Smoking Zone, smoking is only allowed at designated smoking areas. Boundary is approximate.',
    inside: 'red', bufferM: 0, nearM: 150,
  },
]

// Half the carriageway width plus a little kerb, by OSM highway type.
const ROAD_HALF_WIDTH_M = {
  motorway: 14, trunk: 12, primary: 10, secondary: 8, tertiary: 6,
  motorway_link: 6, trunk_link: 6, primary_link: 6, secondary_link: 5, tertiary_link: 5,
  unclassified: 4, residential: 4, living_street: 3,
}

export const RULES_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r]))

const PRIVATE_HOMES = new Set([
  'house', 'detached', 'semidetached_house', 'terrace', 'bungalow',
  'garage', 'garages', 'shed', 'hut', 'cabin', 'ruins', 'construction',
])

// Landed homes are skipped: smoking at home is allowed and the 5 m entrance
// rule covers commercial, industrial, recreational and public buildings.
export function buildingRuleFor(tags = {}) {
  const b = tags.building
  if (!b || b === 'no' || PRIVATE_HOMES.has(b)) return null
  if (b === 'roof' || b === 'canopy' || b === 'carport') return 'shelter'
  if (b === 'parking' || tags.parking === 'multi-storey') return 'carpark_building'
  return 'building'
}
