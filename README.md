# Swagger Endpoint Overlap Checker

This Node.js script checks for overlapping endpoints in a Swagger (OpenAPI) specification. It can verify if a specific endpoint (path and method) overlaps with existing paths in the Swagger file, or check for any overlapping endpoints within the file.

## Features

- Download Swagger files from a given URL.
- Check for overlapping endpoints in a local Swagger file.
- Option to check a specific endpoint against the Swagger file.
- Option to check all endpoints within the Swagger file for overlaps.
- Save the downloaded Swagger file and the extracted endpoint tree to local files.

## Usage

The script can be run from the command line with various options:

*   `--url`, `-u`: (Optional) URL of the Swagger file to download and check.
*   `--file`, `-f`: (Optional) Path to a local Swagger file to check.
*   `--path`, `-p`: (Required) Path to check for overlap.
*   `--method`, `-m`: (Required) HTTP method to check for overlap.
*   `--download`, `-d`: (Optional) Download the Swagger file from the provided URL.
*   `--saveTree`, `-s`: (Optional) Save the endpoint tree to a file.
*   `--checkAll`, `-c`: (Optional) Check all endpoints for overlap within the Swagger file.

### Examples

1.  Check a specific endpoint for overlap:

bashCopy code

`node script.js --url [URL] --path [PATH] --method [METHOD]`

2.  Check all endpoints for overlap in a downloaded Swagger file:

bashCopy code

`node script.js --url [URL] --checkAll`

3.  Check a specific endpoint in a local Swagger file:

bashCopy code

`node script.js --file [FILE_PATH] --path [PATH] --method [METHOD]`
