// import { v2 as cloudinary } from 'cloudinary';
// import fs from 'fs';
//
// cloudinary.config({
//   cloud_name: 'dsqxexeam',
//   api_key: '914128549249552',
//   api_secret: 'GdC59meSbeBhc4roSoZlIt4SIXY'
// });
//
// const prefixes = [
//   "assassin_", "celestial_", "dragon_", "wizard_",
//   "vampire_", "viking_", "engine_", "samurai_"
// ];
//
// const imageMap = {};
//
// async function fetchImagesForPrefix(prefix) {
//   try {
//     let nextCursor = undefined;
//
//     do {
//       const res = await cloudinary.search
//         .expression(`public_id:${prefix}*`)
//         .sort_by('public_id', 'asc')
//         .max_results(100)
//         .next_cursor(nextCursor)
//         .execute();
//
//       for (const resource of res.resources) {
//         const idMatch = resource.public_id.match(/(assassin|celestial|dragon|wizard|vampire|viking|engine|samurai)_\d+/);
//         if (idMatch) {
//           const cardId = idMatch[0];
//           imageMap[cardId] = resource.secure_url;
//         }
//       }
//
//       nextCursor = res.next_cursor;
//     } while (nextCursor);
//   } catch (err) {
//     console.error(`Erreur pour le préfixe ${prefix}`, err);
//   }
// }
//
// (async () => {
//   for (const prefix of prefixes) {
//     await fetchImagesForPrefix(prefix);
//   }
//
//   fs.writeFileSync('cardImageMap.json', JSON.stringify(imageMap, null, 2));
//   console.log('✅ Fichier cardImageMap.json généré avec succès.');
// })();

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: 'dsqxexeam',
  api_key: '914128549249552',
  api_secret: 'GdC59meSbeBhc4roSoZlIt4SIXY'
});

const ids = [
  'assassin', 'celestial', 'dragon', 'wizard',
  'vampire', 'viking', 'engine', 'samurai'
];

const randomizers = {};
const randomizersInfos = {};

const main = async () => {
  try {
    const res = await cloudinary.search
      .expression('resource_type:image')
      .sort_by('public_id', 'asc')
      .max_results(500)
      .execute();

    for (const id of ids) {
      const matches = res.resources.filter(r => {
        const publicId = r.public_id.toLowerCase();
        return (
          publicId.includes(id) &&
          !publicId.includes('_') &&
          !publicId.includes('-info')
        );
      });

      const infoMatches = res.resources.filter(r => {
        const publicId = r.public_id.toLowerCase();
        return publicId.includes(`${id}-info`);
      });

      if (matches.length > 0) {
        randomizers[id] = matches[0].secure_url;
      }
      if (infoMatches.length > 0) {
        randomizersInfos[id] = infoMatches[0].secure_url;
      }
    }

    fs.writeFileSync(
      'randomizerImageMap.json',
      JSON.stringify({ randomizers, randomizersInfos }, null, 2)
    );

    console.log('✅ Fichier randomizerImageMap.json mis à jour.');
  } catch (err) {
    console.error('❌ Erreur API Cloudinary :', err);
  }
};

main();
