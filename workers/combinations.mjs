import { promises as fs } from 'fs';
import { join } from 'path';
import { readDir } from './utils.mjs';

const generatedCombinations = new Set();
let usedupTraits = [];

// Returns a random trait from each folder
function randomChoice(array) {
  const percentages = getPercentages(array);
  const normalizedPercentages = normalizeArray(percentages);
  return weightedRandomPick(array, normalizedPercentages);
}

// Checks to make sure the trait is unique
async function generateUniqueTraits(traitFolders, config) {
  let uniqueCombination = false;
  let chosenTraits = [];

  while (!uniqueCombination) {
    chosenTraits = [];
    let counter = 0;
    for (const traitFolder of traitFolders) {   
        const traitPath = join(config.traitsFolder, traitFolder);
        const traitChoices = await readDir(traitPath);
        const filteredChoices = traitChoices.filter(c => usedupTraits[counter] ? !usedupTraits[counter].has(c) : true);
        const chosenTrait = randomChoice(filteredChoices);
        chosenTraits.push(chosenTrait);
        counter++;
    }

    const key = chosenTraits.join(";");
    const uniqueConstraint = generatedCombinations.has(key);
    const traitsConstraint = hasTooManyTraitsAlready(chosenTraits, config.numImages);
    if(uniqueConstraint){
      console.log("already have combination: " + key);
    }

    if (!uniqueConstraint && !traitsConstraint) {
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
    const count = traitKeyArray.length 
      ? traitKeyArray.map(traits => traits[i])
        .filter(key => key === newTraits[i]).length 
      : 0;
    if(count >= maxImages[i]){
      console.log('zu viel ' + newTraits[i] + ' count:' + count + ' max: ' + maxImages[i])
      usedupTraits[i] = usedupTraits[i] ? usedupTraits[i] : new Set();
      usedupTraits[i].add(newTraits[i]) 
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

function weightedRandomPick(choices, percentages){
  const rand = Math.random() * 100;

    // Calculate the cumulative probability
    let cumulativeProbability = 0;
    for (let i = 0; i < choices.length; i++) {
        cumulativeProbability += percentages[i];
        if (rand <= cumulativeProbability) {
            return choices[i];
        }
    }
}

function normalizeArray(arr) {
  const sum = arr.reduce((a, b) => a + b, 0);
  return arr.map(x => Math.ceil((x / sum) * 100));
}

export { generateUniqueTraits }
