#!/bin/bash

# Path to the bash directory
bash_dir="./bash"
# Set the working directory to the directory where the script is located
cd "$(dirname "$0")"
echo "Running all bash files in $bash_dir"

# Check if the bash directory exists
if [[ ! -d "$bash_dir" ]]; then
    # Echo an error message and exit
    echo "Error: $bash_dir does not exist"
    exit 1
fi
# Iterate over all .bash files in the directory
for file in "$bash_dir"/*.bash; do
    # Check if the file is a regular file
    if [[ -f "$file" ]]; then
        # Echo the name of the file being executed
        echo "Executing $file"
        # Execute the bash file
        bash "$file"
        # Echo a message after execution
        echo "Finished executing $file"
    fi
done