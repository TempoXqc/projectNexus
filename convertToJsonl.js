import * as fs from 'fs/promises';
import * as path from 'path';

async function convertJsonToJsonl(inputFile, outputFile) {
  const jsonData = JSON.parse(await fs.readFile(inputFile, 'utf8'));
  const jsonlData = jsonData.map(item => JSON.stringify(item)).join('\n');
  await fs.writeFile(outputFile, jsonlData);
}

async function main() {
  try {
    // Convertir cards.json
    await convertJsonToJsonl(
      path.join('server', 'public', 'cards.json'),
      path.join('server', 'public', 'cards.jsonl')
    );

    // Convertir deckLists.json
    const deckLists = JSON.parse(await fs.readFile(path.join('server', 'public', 'deckLists.json'), 'utf8'));
    const deckListsJsonl = Object.entries(deckLists)
      .map(([key, value]) => JSON.stringify({ _id: key, cardIds: value }))
      .join('\n');
    await fs.writeFile(path.join('server', 'public', 'deckLists.jsonl'), deckListsJsonl);

    // Convertir randomizers.json
    await convertJsonToJsonl(
      path.join('server', 'public', 'randomizers.json'),
      path.join('server', 'public', 'randomizers.jsonl')
    );

    console.log('Conversion en JSONL terminée.');
  } catch (error) {
    console.error('Erreur lors de la conversion en JSONL:', error);
    process.exit(1);
  }
}

main();