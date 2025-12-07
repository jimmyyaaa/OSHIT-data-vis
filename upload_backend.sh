#!/bin/bash

# OSHIT Backend Upload Script
# This script uploads the backend to the server

set -e  # Exit on any error

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helper functions for colored output
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
step() { echo -e "${PURPLE}$1${NC}"; }
highlight() { echo -e "${CYAN}$1${NC}"; }
header() { echo -e "${WHITE}${BOLD}$1${NC}"; }

# Configuration
SERVER_USER="admin"
SERVER_HOST="13.212.7.223"
SERVER_KEY="/Users/fupenglin/Desktop/Oshit/ServerKey/aws-testnet-key/aws-quickpea.pem"
SERVER_BASE_PATH="/data/dist/oshit"
SERVER_PROJECT_PATH="/data/dist/oshit/oshit-data-vis"
SERVER_BACKEND_PATH="/data/dist/oshit/oshit-data-vis/backend"
SERVER_CREDENTIALS_PATH="/data/dist/oshit/oshit-data-vis/credentials"
LOCAL_BACKEND_PATH="/Users/fupenglin/Desktop/Oshit/Official_Job/OSHIT_Data_Vis/backend"
CREDENTIALS_LOCAL="/Users/fupenglin/Desktop/Oshit/Official_Job/OSHIT_Data_Vis/credentials/oshit-data-visualization-dd0ed1145527.json"
CREDENTIALS_REMOTE="/data/dist/oshit/oshit-data-vis/credentials/oshit-data-visualization.json"

header "🚀 Starting OSHIT Backend Upload..."
header "================================================"

# Check if SSH key exists
if [ ! -f "$SERVER_KEY" ]; then
    error "SSH key not found at $SERVER_KEY"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$LOCAL_BACKEND_PATH" ]; then
    error "Backend directory not found at $LOCAL_BACKEND_PATH"
    exit 1
fi

# Check if credentials file exists
if [ ! -f "$CREDENTIALS_LOCAL" ]; then
    error "Google credentials file not found at $CREDENTIALS_LOCAL"
    exit 1
fi

info "Local backend path: $LOCAL_BACKEND_PATH"
info "Server: $SERVER_USER@$SERVER_HOST"
highlight "Remote backend path: $SERVER_BACKEND_PATH"
highlight "Remote credentials path: $SERVER_CREDENTIALS_PATH"

# Step 1: Upload backend files (excluding sensitive files)
echo ""
step "1️⃣  Uploading backend files..."
rsync -avz -e "ssh -i $SERVER_KEY" \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.DS_Store' \
    --exclude='*.json' \
    --exclude='*.sh' \
    --exclude='*.service' \
    "$LOCAL_BACKEND_PATH/" "$SERVER_USER@$SERVER_HOST:$SERVER_BACKEND_PATH/"

success "Backend files uploaded"

# Step 2: Upload Google credentials
echo ""
step "2️⃣  Uploading Google credentials..."
# First ensure the credentials directory exists with proper permissions
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "
    sudo mkdir -p $SERVER_CREDENTIALS_PATH
    sudo chown -R $SERVER_USER:$SERVER_USER $SERVER_CREDENTIALS_PATH
    
    # If file exists, temporarily make it writable for update
    if [ -f $CREDENTIALS_REMOTE ]; then
        chmod 644 $CREDENTIALS_REMOTE
        echo 'Made existing credentials file writable for update'
    fi
    echo 'Credentials directory prepared'
"
# Then upload the file
scp -i "$SERVER_KEY" "$CREDENTIALS_LOCAL" "$SERVER_USER@$SERVER_HOST:$CREDENTIALS_REMOTE"
success "Credentials uploaded"

# Step 3: Set up permissions
echo ""
step "3️⃣  Setting up permissions..."
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "
    # Set proper permissions for credentials (read-only for owner)
    chmod 400 $SERVER_CREDENTIALS_PATH/*.json 2>/dev/null || true
    
    echo 'Permissions set'
"
success "Permissions configured"

# Step 4: Update dependencies in conda environment
echo ""
step "4️⃣  Updating Python dependencies in conda environment..."
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "
    cd $SERVER_BACKEND_PATH
    
    # Initialize conda for bash
    source ~/miniconda3/etc/profile.d/conda.sh
    
    # Activate conda environment
    conda activate oshit-data-vis
    
    # Install/update dependencies
    echo 'Installing dependencies with conda environment...'
    pip install -r requirements.txt
"
success "Dependencies installed/updated"

echo ""
success "🎉 Backend files and dependencies updated successfully!"
header "================================================"
echo ""
info "📋 Next steps:"
echo ""
warning "🆕 If systemd service NOT configured yet (first time setup):"
highlight "   1. SSH to server: ssh -i $SERVER_KEY $SERVER_USER@$SERVER_HOST"
highlight "   2. Go to backend directory: cd $SERVER_BACKEND_PATH"
highlight "   3. Copy systemd service: sudo cp oshit-data-vis.service /etc/systemd/system/"
highlight "   4. Reload systemd: sudo systemctl daemon-reload"
highlight "   5. Start service: sudo systemctl start oshit-data-vis"
highlight "   6. Enable auto-start: sudo systemctl enable oshit-data-vis"
echo ""
warning "🔄 If systemd service ALREADY configured (code update):"
highlight "   1. SSH to server: ssh -i $SERVER_KEY $SERVER_USER@$SERVER_HOST"
highlight "   2. Restart service: sudo systemctl restart oshit-data-vis"
highlight "   3. Check status: sudo systemctl status oshit-data-vis"
echo ""
warning "🔧 Useful commands:"
info "   • Check status: sudo systemctl status oshit-data-vis"
info "   • View logs: sudo journalctl -u oshit-data-vis -f"
info "   • Restart service: sudo systemctl restart oshit-data-vis"
info "   • Edit .env if needed: nano .env.production"
echo ""
header "🚀 Deployment completed! 🚀"