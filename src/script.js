const axios = require('axios');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs').promises;
const chalk = require('chalk');

// Main function
async function main() {
    const argv = parseCLIArguments();
    try {
        const pathsData = await fetchPathsData(argv);
        const endpoints = extractEndpointsWithMethods(pathsData);

        if (argv.saveTree) {
            await saveEndpointsToFile(endpoints);
        }

        if (argv.checkAll) {
            displayInternalOverlaps(endpoints);
        } else {
            displaySpecificOverlap(argv.path, argv.method, endpoints);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Parse command line arguments
function parseCLIArguments() {
    return yargs(hideBin(process.argv))
    .option('url', {
        alias: 'u',
        describe: 'URL of the Swagger file',
        type: 'string'
    })
    .option('file', {
        alias: 'f',
        describe: 'Path to the file containing existing paths',
        type: 'string'
    })
    .option('path', {
        alias: 'p',
        describe: 'Path to check for overlap',
        demandOption: true,
        type: 'string'
    })
    .option('method', {
        alias: 'm',
        describe: 'Method to check for overlap',
        demandOption: true,
        type: 'string'
    })
    .option('download', {
        alias: 'd',
        describe: 'Download Swagger file from URL',
        type: 'boolean'
    })
    .option('saveTree', {
        alias: 's',
        describe: 'Save the endpoint tree to a file',
        type: 'boolean'
    })
    .option('checkAll', {
        alias: 'c',
        describe: 'Check all endpoints for overlap within the Swagger file',
        type: 'boolean'
    })
    .help()
    .alias('help', 'h')
    .argv;
}

// Fetch paths data from URL or file
async function fetchPathsData(argv) {
    if (argv.url) {
        return await handleSwaggerURL(argv.url, argv.download);
    } else if (argv.file) {
        return await readJsonFile(argv.file);
    }
    throw new Error('URL or file path is required.');
}

// Handle Swagger URL
async function handleSwaggerURL(url, download) {
    const swaggerData = await downloadSwaggerFile(url);
    if (download) {
        await saveSwaggerFile(swaggerData);
    }
    return swaggerData;
}

// Read JSON file
async function readJsonFile(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
}

// Save endpoints to file
async function saveEndpointsToFile(endpoints) {
    await ensureDirectory('./output');
    await fs.writeFile('./output/endpoints.json', JSON.stringify(endpoints, null, 2));
}

// Ensure directory exists
async function ensureDirectory(directory) {
    try {
        await fs.access(directory);
    } catch {
        await fs.mkdir(directory);
    }
}

// Display internal overlaps
function displayInternalOverlaps(endpoints) {
    const overlaps = findOverlappingEndpoints(endpoints);
    if (overlaps.length > 0) {
        console.log(chalk.red('Overlapping endpoints found:'));
        overlaps.forEach(overlap => console.log(chalk.yellow(`- ${overlap.path1} overlaps with ${overlap.path2}`)));
    } else {
        console.log(chalk.green('No internal overlapping endpoints found.'));
    }
}

// Display specific overlap
function displaySpecificOverlap(path, method, endpoints) {
    const overlappingPath = isPathOverlapping(path, method, endpoints);
    if (overlappingPath) {
        console.log(chalk.red(`Path '${path}' with method '${method}' overlaps with '${overlappingPath}'`));
    } else {
        console.log(chalk.green(`Path '${path}' with method '${method}' does not overlap.`));
    }
}


// Function to download Swagger file from a URL
async function downloadSwaggerFile(url) {
    const response = await axios.get(url);
    return response.data;
}

// Function to extract endpoints with methods
function extractEndpointsWithMethods(swaggerObject) {
    const paths = swaggerObject.paths;
    const endpointTree = {};

    for (const path in paths) {
        if (paths.hasOwnProperty(path)) {
            endpointTree[path] = Object.keys(paths[path]);
        }
    }

    return endpointTree;
}

// Function to check if a given path and method overlaps with existing paths and their methods
function isPathOverlapping(givenPath, givenMethod, existingPaths) {
    // Normalize paths for comparison (e.g., remove trailing slashes)
    const normalizePath = path => path.replace(/\/$/, '');

    givenPath = normalizePath(givenPath);
    const normalizedGivenMethod = givenMethod ? givenMethod.toLowerCase() : null;

    for (const entry of Object.entries(existingPaths)) {
        const [path, methods] = entry;
        const normalizedPath = normalizePath(path);

        // Check for exact match or segment overlap
        // Also check if methods are the same if given
        if ((givenPath === normalizedPath || pathIncludesSegments(givenPath, normalizedPath)) &&
            (!normalizedGivenMethod || methods.includes(normalizedGivenMethod))) {
            return normalizedPath;
        }
    }
    return false;
}

// save the retrieved swagger file to a local file
async function saveSwaggerFile(swaggerObject) {
    const swaggerFile = JSON.stringify(swaggerObject, null, 2);
    try {
        await fs.access('./download');
    } catch (error) {
        await fs.mkdir('./download');
    }
    await fs.writeFile('./download/swagger.json', swaggerFile);
}


// Function to determine if path segments potentially overlap
function pathIncludesSegments(givenPath, existingPath) {
    const givenSegments = givenPath.split('/');
    const existingSegments = existingPath.split('/');

    if (givenSegments.length !== existingSegments.length) {
        return false;
    }

    for (let i = 0; i < givenSegments.length; i++) {
        if (givenSegments[i] !== existingSegments[i] && !existingSegments[i].startsWith('{')) {
            return false;
        }
    }

    return true;
}

function findOverlappingEndpoints(endpointsWithMethods) {
    const overlaps = [];
    const paths = Object.keys(endpointsWithMethods);

    paths.forEach((path, index) => {
        for (let i = index + 1; i < paths.length; i++) {
            if (isPathOverlapping(path, null, {[paths[i]]: endpointsWithMethods[paths[i]]})) {
                overlaps.push({path1: path, path2: paths[i]});
            }
        }
    });

    return overlaps;
}

main().catch(console.error);
