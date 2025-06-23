#!/bin/bash

# build_test_data_dirs.sh: A tool to generate a deep directory structure
# with a hidden file for testing filesystem performance.

set -e

show_help() {
    cat << EOF
Usage: ./build_test_data_dirs.sh [OPTIONS]
Builds a nested directory structure for testing filesystem performance.

Options:
  --root_dir         The name of the root directory to create. (Default: "haystack")
  --max_depth        The number of levels of directories to create. (Default: 3)
  --num_files        The number of files to create in each directory. (Default: 10)
  --num_dirs         The number of subdirectories to create in each directory. (Default: 10)
  --hidden_filename  The name of the file to hide in one of the deepest directories. (Default: "needle.txt")
  --help             Display this help message and exit.
EOF
}

# --- Argument Parsing with Defaults ---
ROOT_DIR="haystack"
MAX_DEPTH=3
NUM_FILES=10
NUM_DIRS=10
HIDDEN_FILENAME="needle.txt"

while [ "$#" -gt 0 ]; do
    case "$1" in
        --root_dir)
            ROOT_DIR="$2"
            shift 2
            ;;
        --max_depth)
            MAX_DEPTH="$2"
            shift 2
            ;;
        --num_files)
            NUM_FILES="$2"
            shift 2
            ;;
        --num_dirs)
            NUM_DIRS="$2"
            shift 2
            ;;
        --hidden_filename)
            HIDDEN_FILENAME="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# --- Global Counters for Progress ---
TOTAL_DIRS=0
TOTAL_FILES=0
ITEMS_CREATED=0
TOTAL_ITEMS=0
START_TIME=0

# --- Function Definitions ---

# Generates a random alphanumeric string between 8 and 12 characters long,
# always starting with a letter.
generate_random_name() {
    # 1. Get a random length between 8 and 12
    local length=$((RANDOM % 5 + 8))

    # 2. Start with a random letter (a-z)
    local name
    name=$(LC_ALL=C tr -dc 'a-z' < /dev/urandom | head -c 1)

    # 3. Append random alphanumeric characters (a-z, 0-9) for the rest of the length
    name+=$(LC_ALL=C tr -dc 'a-z0-9' < /dev/urandom | head -c $((length - 1)))

    echo "$name"
}

# Calculates the total number of directories and files to be created.
calculate_totals() {
    local current_dirs=1
    for (( i=0; i<MAX_DEPTH; i++ )); do
        TOTAL_DIRS=$((TOTAL_DIRS + current_dirs))
        TOTAL_FILES=$((TOTAL_FILES + current_dirs * NUM_FILES))
        current_dirs=$((current_dirs * NUM_DIRS))
    done
    # Add counts for the deepest level
    TOTAL_DIRS=$((TOTAL_DIRS + current_dirs))
    TOTAL_FILES=$((TOTAL_FILES + current_dirs * NUM_FILES))
    TOTAL_ITEMS=$((TOTAL_DIRS + TOTAL_FILES))
}

# Prints a single, updating line of progress.
update_progress() {
    local items_so_far=$1
    if [ "$TOTAL_ITEMS" -eq 0 ]; then return; fi

    # Only update progress periodically to avoid performance overhead
    if [ $((items_so_far % 100)) -ne 0 ] && [ "$items_so_far" -ne "$TOTAL_ITEMS" ]; then
        return
    fi

    local current_time
    current_time=$(date +%s)
    local elapsed_seconds=$((current_time - START_TIME))
    local percentage=$((items_so_far * 100 / TOTAL_ITEMS))
    local eta="N/A"

    if [ "$elapsed_seconds" -gt 0 ] && [ "$items_so_far" -gt 0 ]; then
        local items_per_second=$((items_so_far / elapsed_seconds))
        if [ "$items_per_second" -gt 0 ]; then
            local remaining_items=$((TOTAL_ITEMS - items_so_far))
            local remaining_seconds=$((remaining_items / items_per_second))
            eta=$(printf "%02d:%02d:%02d" $((remaining_seconds/3600)) $((remaining_seconds%3600/60)) $((remaining_seconds%60)))
        fi
    fi

    printf "\rProgress: %3d%% | Created: %d/%d | Elapsed: %ds | ETA: %s" "$percentage" "$items_so_far" "$TOTAL_ITEMS" "$elapsed_seconds" "$eta"
}

# Recursively builds the directory and file structure.
build_haystack_recursive() {
    local current_dir="$1"
    local current_depth="$2"

    # Create files in the current directory
    for i in $(seq 1 "$NUM_FILES"); do
        local filename
        filename=$(generate_random_name)
        touch "$current_dir/$filename.txt"
        ITEMS_CREATED=$((ITEMS_CREATED + 1))
        update_progress "$ITEMS_CREATED"
    done

    # If not at max depth, create subdirectories and recurse
    if [ "$current_depth" -lt "$MAX_DEPTH" ]; then
        for i in $(seq 1 "$NUM_DIRS"); do
            local dirname
            dirname=$(generate_random_name)
            local new_dir="$current_dir/$dirname"
            mkdir "$new_dir"
            ITEMS_CREATED=$((ITEMS_CREATED + 1))
            update_progress "$ITEMS_CREATED"
            build_haystack_recursive "$new_dir" "$((current_depth + 1))"
        done
    fi
}

# Main function to build the "haystack".
build_haystack() {
    echo "Building haystack in '$ROOT_DIR'..."
    START_TIME=$(date +%s)
    
    # Clean up previous runs
    if [ -d "$ROOT_DIR" ]; then
        echo "Removing existing '$ROOT_DIR' directory..."
        rm -rf "$ROOT_DIR"
    fi
    
    mkdir -p "$ROOT_DIR"
    ITEMS_CREATED=$((ITEMS_CREATED + 1))
    
    build_haystack_recursive "$ROOT_DIR" 0
    
    # Final progress update to show 100%
    update_progress "$TOTAL_ITEMS"
    echo # Newline after progress bar
    echo "Haystack built successfully."
}

# Finds a random directory at the max depth and places the "needle" file in it.
hide_needle() {
    echo "Hiding needle ('$HIDDEN_FILENAME')..."
    
    # Find all directories at the maximum depth
    local deep_dirs=()
    while IFS= read -r line; do
        deep_dirs+=("$line")
    done < <(find "$ROOT_DIR" -mindepth "$MAX_DEPTH" -maxdepth "$MAX_DEPTH" -type d)
    
    local num_deep_dirs=${#deep_dirs[@]}
    if [ "$num_deep_dirs" -eq 0 ]; then
        echo "Error: No directories found at depth $MAX_DEPTH."
        # If no directories at max_depth, place it in the root.
        local needle_path="$ROOT_DIR/$HIDDEN_FILENAME"
        touch "$needle_path"
        echo "Warning: Placed needle in root directory as no directories at max depth were found."
        echo "Needle hidden at: $(pwd)/$needle_path"
        return
    fi
    
    # Select a random directory
    local random_index=$((RANDOM % num_deep_dirs))
    local needle_dir="${deep_dirs[$random_index]}"
    local needle_path="$needle_dir/$HIDDEN_FILENAME"
    
    # Create the needle file
    touch "$needle_path"
    
    echo "Needle hidden at: $(pwd)/$needle_path"
}

# --- Main Execution ---

echo "--- Filesystem Test Data Generator ---"
calculate_totals
echo
echo "Configuration:"
echo "  - Root Directory:    $(pwd)/$ROOT_DIR"
echo "  - Max Depth:         $MAX_DEPTH"
echo "  - Files per Dir:     $NUM_FILES"
echo "  - Dirs per Dir:      $NUM_DIRS"
echo "  - Hidden Filename:   $HIDDEN_FILENAME"
echo
echo "Calculated Totals:"
echo "  - Directories to create: $TOTAL_DIRS"
echo "  - Files to create:       $TOTAL_FILES"
echo "  - Total items:           $TOTAL_ITEMS"
echo

# Check if running in a non-interactive shell
if [ -t 1 ]; then
    read -p "Proceed? (y/N) " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Aborted by user."
        exit 1
    fi
else
    echo "Running in non-interactive mode. Proceeding automatically."
fi


build_haystack
hide_needle

echo
echo "--- Generation Complete ---"
