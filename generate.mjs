import fs, { stat } from 'fs';
import path from 'path';
import { loadImage, createCanvas } from 'canvas';
import GIFEncoder from 'gifencoder';
import inquirer from 'inquirer';
import config from './config.mjs';
import { execSync } from 'child_process';
import pLimit from 'p-limit';

import printHeader from './workers/bankkroll.mjs';
import { calculateTotalCombinations } from './workers/utils.mjs';
import printCollectionInfo from "./workers/collectionInfoPrinter.mjs";
import { logSuccess, logError, logRegular } from "./workers/consoleLogger.mjs";
import { extractFrames } from './workers/extractFrames.mjs';
import { generateUniqueTraits } from './workers/combinations.mjs';
import ora from 'ora';
import chalk from 'chalk';

// Create a delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}



//#########################################//
//#                                       #//
//#           Main Function               #//
//#                                       #//
//#########################################//

async function main() {
  try {
    // Create the output folder if it does not already exist
    fs.mkdirSync(config.outputFolder, { recursive: true });

    // Print the header and collection info to the console
    printHeader();
    await delay(1500);
 
    // Prompt the user to enter the desired processing intensity
    const { machineStrength } = await inquirer.prompt({
      type: 'list',
      name: 'machineStrength',
      message: chalk.cyan('What level of processing intensity do you want to run this task with? (Choose a lower level for weaker machines)'),
      choices: [
        { name: 'Low (2 - Suitable for low-end machines)', value: 2 },
        { name: 'Medium (4 - Suitable for average hardware)', value: 4 },
        { name: 'High (6 - Suitable for high-end machines)', value: 6 },
        { name: 'Very High (8 - Suitable for very high-end machines)', value: 8 },
        { name: 'Ultra (10 - Suitable for top-tier hardware specs)', value: 10 },
        { name: 'Insane (12 - Only for the most powerful machines)', value: 12 }
      ]
    });

    const limit = pLimit(machineStrength);
    
    // Prompt the user to choose between generating GIFs or images
    const answer = await inquirer.prompt({
      type: 'list',
      name: 'choice',
      message: chalk.cyan('Do you want to generate GIFs or Images?'),
      choices: ['GIFs', 'Images']
    });
    
    const choice = answer.choice.charAt(0);
    const fileType = choice.toUpperCase() === 'G' ? 'GIFs' : 'Images';



    // Calculate the total number of possible combinations of traits
    const totalCombinations = calculateTotalCombinations(config);
    console.log(config.numImages + ' > ' + totalCombinations)

    if (config.numImages > totalCombinations) {
      logError(`Requested number of files (${config.numImages}) exceeds the total possible combinations (${totalCombinations}). Please lower the number of files to generate.`);
      return;
    }

    const loadingSpinner = ora({
      text: `Reading ${fileType}.`,
      color: 'cyan',
      spinner: 'dots6'
    }).start();
    await delay(2000);
    loadingSpinner.succeed(chalk.green(`Verified ${fileType}.`));

    await delay(500);
    printCollectionInfo(config);

    const loadingSpinner1 = ora({
      text: `Confirming Details.`,
      color: 'cyan',
      spinner: 'dots6'
    }).start();
    await delay(2000);
    loadingSpinner1.succeed(chalk.green(`Confimred config.js.`));

    const loadingSpinner2 = ora({
      text: `Thinking please wait....`,
      color: 'cyan',
      spinner: 'dots6'
    }).start();
    await delay(2000);
    loadingSpinner2.succeed(chalk.green(`Loading traits....`));


    const tasks = Array.from({ length: config.numImages }, (_, i) =>
      limit(async () => {
        if (choice.toUpperCase() === 'G') {
          await generateGif(i, config);
        } else {
          await generateImage(i, config);
        }
        logSuccess(`Generated ${fileType} #${i + config.startAt}`);
      })
    );

    await Promise.all(tasks);

    logSuccess(`All ${fileType} generated successfully!`);

    await delay(1000);
  
    // Prompt the user to choose whether to upload to IPFS or not
    const ipfsAnswer = await inquirer.prompt({
      type: 'list',
      name: 'choice',
      message: chalk.cyan('Do you want to upload the generated files to IPFS?'),
      choices: ['Yes', 'No'],
    });

    if (ipfsAnswer.choice === 'Yes') {
      const folderPath = config.outputFolder;
      const cmd = `npx thirdweb@latest upload ${folderPath}`;
      execSync(cmd, { stdio: 'inherit' });
    } else {
 
      const loadingSpinner = ora({
        text: `Skipping IPFS upload.`,
        color: 'cyan',
        spinner: 'dots6'
      }).start();
      await delay(1000);
      loadingSpinner.succeed(`IPFS upload skipped.`);
  }
   

    printHeader();

  } catch (err) {
      logError(`Failed to generate files: ${err.message}`);
  }
}





//#########################################//
//#                                       #//
//#           Generate Image              #//
//#                                       #//
//#########################################//

async function generateImage(i, config) {
  try {
    // Generate unique traits
    const chosenTraits = await generateUniqueTraits(config.traitFolders, config);

    const traits = [];
    const canvases = [];

    // Loop over all trait folders and use the chosen unique traits
    for (let j = 0; j < config.traitFolders.length; j++) {
      const traitFolder = config.traitFolders[j];
      const traitPath = path.join(config.traitsFolder, traitFolder);
      const chosenTrait = chosenTraits[j];
      const chosenTraitPath = path.join(traitPath, chosenTrait);

      // Load the image
      const img = await loadImage(chosenTraitPath);

      // Add the trait to the traits array
      traits.push({
        trait_type: traitFolder,
        value: path.basename(chosenTrait, path.extname(chosenTrait)),
      });

      // Add the image to the canvases array
      canvases.push(img);
    }

    // Combine images from each trait into a single image
    const canvas = createCanvas(config.imageWidth, config.imageHeight, 'sRGB');
    const ctx = canvas.getContext("2d");

    for (let j = 0; j < config.layersNumber; j++) {
      const image = canvases[j];
      ctx.drawImage(image, 0, 0, config.imageWidth, config.imageHeight);
    }

    // Save the combined image
    const outputPath = path.join(config.outputFolder, `${i + config.startAt}.png`);
    const outputBuffer = canvas.toBuffer("image/png");
    fs.writeFileSync(outputPath, outputBuffer);

    // Create metadata for this generated image and write it to a JSON file
    const metadata = {
      name: `${config.collectionName} #${i + config.startAt}`,
      description: `${config.collectionDescription}`,
      image: `${i + config.startAt}.png`,
      external_url: `${config.collectionExternal_url}`,
      attributes: traits,
    };

    const outputJsonPath = path.join(config.outputFolder, `${i + config.startAt}.json`);
    fs.writeFileSync(outputJsonPath, JSON.stringify(metadata, null, 2));

    logRegular(`JSON metadata: ${outputJsonPath}`);
    logRegular(`Image file: ${outputPath}`);
  } catch (err) {
    logError(`Failed to generate image ${i + config.startAt}: ${err.message}`);
  }
}





//#########################################//
//#                                       #//
//#             Generate Gif              #//
//#                                       #//
//#########################################//

async function generateGif(i, config) {
  try {
    // Generate unique traits
    const chosenTraits = await generateUniqueTraits(config.traitFolders, config);

    const traits = [];
    const traitFrames = [];


    // Loop over all trait folders and use the chosen unique traits
    for (let j = 0; j < config.traitFolders.length; j++) {
      const traitFolder = config.traitFolders[j];
      const traitPath = path.join(config.traitsFolder, traitFolder);
      const chosenTrait = chosenTraits[j];
      const chosenTraitPath = path.join(traitPath, chosenTrait);

      // Extract frames from the chosen trait
      const frames = await extractFrames(chosenTraitPath);
      if (!frames) {
          console.error(`Failed to extract frames from file at path: ${chosenTraitPath}`);
          return;
      }

      // Add the trait to the traits array
      traits.push({
        trait_type: traitFolder,
        value: path.basename(chosenTrait, path.extname(chosenTrait)),
      });

      // Add the frames to the traitFrames array
      traitFrames.push(frames);
    }

    // Calculate max frames for looping
    const maxFrames = Math.max(...traitFrames.map(x => x.length));

    // Combine frames from each trait into a single image
    const frames = [];
    for (let frameIndex = 0; frameIndex < maxFrames; frameIndex++) {
      const canvas = createCanvas(config.imageWidth, config.imageHeight, 'sRGB');
      const ctx = canvas.getContext("2d");

      for (let j = 0; j < config.layersNumber; j++) {
        const frame = traitFrames[j][frameIndex % traitFrames[j].length];
        ctx.drawImage(frame, 0, 0, config.imageWidth, config.imageHeight);
      }

      frames.push(canvas);
    }

    // Encode the frames into a GIF
    const encoder = new GIFEncoder(config.imageWidth, config.imageHeight);
    const outputGifPath = path.join(config.outputFolder, `${i + config.startAt}.gif`);

    // Create a write stream to write the GIF file to disk
    const outputStream = fs.createWriteStream(outputGifPath);
    encoder.createReadStream().pipe(outputStream);

    encoder.setRepeat(0);
    encoder.setDelay(100);
    encoder.setQuality(40);
    encoder.start();

    // Add each frame to the GIF encoder
    for (const frame of frames) {
      encoder.addFrame(frame.getContext("2d"));
    }

    encoder.finish();

    // Create metadata for this generated image and write it to a JSON file
    const metadata = {
      name: `${config.collectionName} #${i + config.startAt}`,
      description: `${config.collectionDescription}`,
      image: `${i + config.startAt}.gif`,
      external_url: `${config.collectionExternal_url}`,
      attributes: traits,
    };

    const outputJsonPath = path.join(config.outputFolder, `${i + config.startAt}.json`);
    fs.writeFileSync(outputJsonPath, JSON.stringify(metadata, null, 2));

    logRegular(`JSON metadata: ${outputJsonPath}`);
    logRegular(`GIF file: ${outputGifPath}`);
   
  } catch (err) {
    logError(`Failed to generate GIF ${i + config.startAt}: ${err.message}`);
  }
}

main();
