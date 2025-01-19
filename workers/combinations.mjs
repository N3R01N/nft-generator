import { promises as fs } from 'fs';
import { join } from 'path';
import { readDir } from './utils.mjs';

const generatedCombinations = new Set();

// Returns a random trait from each folder
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Checks to make sure the trait is unique
async function generateUniqueTraits(traitFolders, config) {
  let uniqueCombination = false;
  let chosenTraits = [];

  while (!uniqueCombination) {
    chosenTraits = [];

    for (const traitFolder of traitFolders) {
      const traitPath = join(config.traitsFolder, traitFolder);
      const traitChoices = await readDir(traitPath);
      const chosenTrait = randomChoice(traitChoices);
      chosenTraits.push(chosenTrait);
    }

    const key = chosenTraits.join(";");

    if (!generatedCombinations.has(key) && !hasTooManyTraitsAlready(chosenTraits, config.numImages)) {
      uniqueCombination = true;
      generatedCombinations.add(key);
    }
  }

  return chosenTraits;
}

function hasTooManyTraitsAlready(newTraits, totalNumImages){
  const maxImages = getPercentages(newTraits).map(p=> p*totalNumImages/100);
  const traitKeyArray = Array.from(generatedCombinations).map(combo => combo.split(';'))

  for(let i = 0 ; i < newTraits.length; i++){
    console.log(traitKeyArray)
    const count = traitKeyArray.length 
      ? traitKeyArray.map(traits => traits[i])
        .filter(key => key === newTraits[i]).length 
      : 0;
    if(count >= maxImages[i]){
      console.log('zu viel ' + newTraits[i] + ' count:' + count + ' max: ' + maxImages[i])
      return true;
    }
  }
  return false;
}

function getPercentages(chosenTraits){
  return chosenTraits
    .map(str => str.split('#'))
    .map(traitArray => traitArray[1] ? +traitArray[1].split('.')[0] : 100);
}

export { generateUniqueTraits }
