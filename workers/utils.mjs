import { readdirSync, promises } from 'fs';
import { join } from 'path';

// Calculate the total combinations possible
function calculateTotalCombinations(config) {
    return config.traitFolders.reduce((acc, folder) => {
        const traitPath = join(config.traitsFolder, folder); // Use path.join() instead of join()
        const traitChoices = readdirSync(traitPath);
        return acc * traitChoices.length;
    }, 1);
}

async function readDir(path) {
    try {
        const files = await promises.readdir(path);
        return files;
    } catch (err) {
        console.error(`❌ \x1b[41m\x1b[1m\x1b[37m ERROR \x1b[0m\x1b[31m Error reading directory: ${err.message} \x1b[0m`);
        return [];
    }
}

export {calculateTotalCombinations, readDir}

