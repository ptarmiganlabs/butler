#!/bin/bash

# jjsontree Upgrade Script for Butler
# This script automates the upgrade process for JsonTree.js

set -e

# Configuration
REPO_URL="https://api.github.com/repos/williamtroup/JsonTree.js"
RELEASE_URL="https://github.com/williamtroup/JsonTree.js/releases/download"
STATIC_DIR="static/configvis"
BACKUP_DIR="backup/$(date +%Y%m%d_%H%M%S)"
CURRENT_VERSION="2.9.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if we're in the right directory
check_directory() {
    if [[ ! -f "package.json" ]] || [[ ! -d "$STATIC_DIR" ]]; then
        error "Please run this script from the Butler project root directory"
        exit 1
    fi
}

# Get current version from jsontree.js
get_current_version() {
    if [[ -f "$STATIC_DIR/jsontree.js" ]]; then
        CURRENT_VERSION=$(grep -o "getVersion[^}]*return\s*['\"\`]\([0-9.]*\)['\"\`]" "$STATIC_DIR/jsontree.js" | grep -o "[0-9]\+\.[0-9]\+\.[0-9]\+" | head -1)
        log "Current jjsontree version: $CURRENT_VERSION"
    else
        warn "Could not determine current version"
    fi
}

# Get latest version from GitHub
get_latest_version() {
    log "Checking for latest jjsontree version..."
    
    if command -v curl >/dev/null 2>&1; then
        LATEST_VERSION=$(curl -s "$REPO_URL/releases/latest" | grep -o '"tag_name": "v[^"]*"' | grep -o 'v[0-9.]*' | sed 's/v//')
    elif command -v wget >/dev/null 2>&1; then
        LATEST_VERSION=$(wget -qO- "$REPO_URL/releases/latest" | grep -o '"tag_name": "v[^"]*"' | grep -o 'v[0-9.]*' | sed 's/v//')
    else
        error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi
    
    if [[ -z "$LATEST_VERSION" ]]; then
        error "Could not determine latest version"
        exit 1
    fi
    
    log "Latest jjsontree version: $LATEST_VERSION"
}

# Compare versions
compare_versions() {
    if [[ "$CURRENT_VERSION" == "$LATEST_VERSION" ]]; then
        success "jjsontree is already up to date (v$CURRENT_VERSION)"
        exit 0
    fi
    
    log "Upgrade available: v$CURRENT_VERSION → v$LATEST_VERSION"
}

# Create backup
create_backup() {
    log "Creating backup in $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    
    cp "$STATIC_DIR"/jsontree.* "$BACKUP_DIR/" 2>/dev/null || warn "Some jsontree files not found for backup"
    
    success "Backup created"
}

# Download new files
download_files() {
    log "Downloading jjsontree v$LATEST_VERSION..."
    
    local temp_dir="/tmp/jsontree_upgrade_$$"
    mkdir -p "$temp_dir"
    
    # Download main files
    local files=(
        "jsontree.min.js:jsontree.js"
        "jsontree.min.css:jsontree.js.css"
        "jsontree.min.js.map:jsontree.js.map"
        "jsontree.min.css.map:jsontree.js.css.map"
    )
    
    for file_mapping in "${files[@]}"; do
        local remote_file="${file_mapping%%:*}"
        local local_file="${file_mapping##*:}"
        local url="$RELEASE_URL/v$LATEST_VERSION/dist/$remote_file"
        
        log "Downloading $remote_file..."
        
        if command -v curl >/dev/null 2>&1; then
            curl -L -o "$temp_dir/$local_file" "$url" || {
                error "Failed to download $remote_file"
                rm -rf "$temp_dir"
                exit 1
            }
        else
            wget -O "$temp_dir/$local_file" "$url" || {
                error "Failed to download $remote_file"
                rm -rf "$temp_dir"
                exit 1
            }
        fi
    done
    
    success "Downloaded all files"
    
    # Move files to destination
    log "Installing new files..."
    cp "$temp_dir"/* "$STATIC_DIR/"
    rm -rf "$temp_dir"
    
    success "Files installed"
}

# Verify installation
verify_installation() {
    log "Verifying installation..."
    
    # Check if files exist
    local required_files=("jsontree.js" "jsontree.js.css")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$STATIC_DIR/$file" ]]; then
            error "Required file missing: $file"
            return 1
        fi
    done
    
    # Check version in new file
    local new_version=$(grep -o "getVersion[^}]*return\s*['\"\`]\([0-9.]*\)['\"\`]" "$STATIC_DIR/jsontree.js" | grep -o "[0-9]\+\.[0-9]\+\.[0-9]\+" | head -1)
    
    if [[ "$new_version" == "$LATEST_VERSION" ]]; then
        success "Version verification passed: v$new_version"
    else
        warn "Version verification uncertain. Expected: v$LATEST_VERSION, Found: v$new_version"
    fi
}

# Run tests
run_tests() {
    log "Running validation tests..."
    
    if npm test -- src/test/jsontree-upgrade.test.js; then
        success "Validation tests passed"
    else
        error "Validation tests failed"
        return 1
    fi
}

# Update documentation
update_docs() {
    log "Updating documentation..."
    
    # Update version in upgrade guide
    if [[ -f "docs/jjsontree-upgrade-guide.md" ]]; then
        sed -i.bak "s/Current Version.*: [0-9.]*$/Current Version**: $LATEST_VERSION/" docs/jjsontree-upgrade-guide.md
        rm docs/jjsontree-upgrade-guide.md.bak 2>/dev/null || true
    fi
    
    success "Documentation updated"
}

# Rollback function
rollback() {
    error "Rolling back to previous version..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        cp "$BACKUP_DIR"/jsontree.* "$STATIC_DIR/" 2>/dev/null
        success "Rollback completed"
    else
        error "No backup found for rollback"
    fi
}

# Main execution
main() {
    log "Starting jjsontree upgrade process..."
    
    check_directory
    get_current_version
    get_latest_version
    compare_versions
    
    # Ask for confirmation
    echo
    read -p "Do you want to upgrade jjsontree from v$CURRENT_VERSION to v$LATEST_VERSION? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Upgrade cancelled"
        exit 0
    fi
    
    create_backup
    
    # Attempt upgrade
    if download_files && verify_installation; then
        log "Running validation tests..."
        
        if run_tests; then
            update_docs
            success "jjsontree successfully upgraded to v$LATEST_VERSION!"
            log "Backup available at: $BACKUP_DIR"
            echo
            log "Next steps:"
            log "1. Test the config visualization manually: node src/butler.js -c ./src/config/config-gen-api-docs.yaml --no-qs-connection"
            log "2. Visit http://localhost:3100/ and test JSON tree view"
            log "3. Run full test suite: npm run test"
            log "4. Commit changes if everything works"
        else
            error "Tests failed after upgrade"
            rollback
            exit 1
        fi
    else
        error "Upgrade failed"
        rollback
        exit 1
    fi
}

# Help function
show_help() {
    echo "jjsontree Upgrade Script for Butler"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -c, --check    Check for updates without upgrading"
    echo "  -f, --force    Force upgrade even if versions match"
    echo
    echo "Examples:"
    echo "  $0              # Interactive upgrade"
    echo "  $0 --check     # Check for updates only"
    echo "  $0 --force     # Force upgrade"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -c|--check)
        check_directory
        get_current_version
        get_latest_version
        exit 0
        ;;
    -f|--force)
        check_directory
        get_current_version
        get_latest_version
        log "Forcing upgrade from v$CURRENT_VERSION to v$LATEST_VERSION"
        create_backup
        download_files
        verify_installation
        run_tests
        update_docs
        success "Forced upgrade completed"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac