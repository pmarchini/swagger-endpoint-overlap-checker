const axios = require('axios');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs').promises;
const chalk = require('chalk');

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

async function main() {
    const argv = yargs(hideBin(process.argv))
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

    const { 
        url,
        file,
        path: pathToCheck,
        method,
        checkAll
    } = argv;

    try {
        let givenPaths;

        if (url) {
            const swaggerObject = await downloadSwaggerFile(url);
            givenPaths = swaggerObject;
            if (argv.download) {
                await saveSwaggerFile(swaggerObject);
            }
        } else if (file) {
            const fileContent = await fs.readFile(file, 'utf8');
            givenPaths = JSON.parse(fileContent);
        } else {
            throw new Error('Please provide either a URL or a file path.');
        }
        const extractedEndpointsWithMethods = extractEndpointsWithMethods(givenPaths);
        if (argv.saveTree) {
            try {
                await fs.access('./output');
            } catch (error) {
                await fs.mkdir('./output');
            }
            await fs.writeFile('./output/endpoints.json', JSON.stringify(extractedEndpointsWithMethods, null, 2));
        }
        if (checkAll) {
            // Check for internal overlaps
            const internalOverlaps = findOverlappingEndpoints(extractedEndpointsWithMethods);
            if (internalOverlaps.length > 0) {
                console.log(chalk.red('Overlapping endpoints found:'));
                internalOverlaps.forEach(overlap => {
                    console.log(chalk.yellow(`- ${overlap.path1} overlaps with ${overlap.path2}`));
                });
            } else {
                console.log(chalk.green('No internal overlapping endpoints found.'));
            }
        } else {
            // Check the specified path and method for overlap
            const overlappingPath = isPathOverlapping(pathToCheck, method, extractedEndpointsWithMethods);
            if (overlappingPath) {
                console.log(chalk.red(`The path '${pathToCheck}' with method '${method}' overlaps with existing overlapping path: '${overlappingPath}'`));
            } else {
                console.log(chalk.green(`The path '${pathToCheck}' with method '${method}' does not overlap with existing paths.`));
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}


main();
