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
FIRST_TIME=false
if [[ "$*" == *"--first-time"* ]]; then
    FIRST_TIME=true
fi

SERVER_USER="admin"
SERVER_HOST="18.138.240.223"
SERVER_KEY="/Users/fupenglin/Desktop/Oshit/ServerKey/aws-testnet-key/aws-quickpea.pem"
SERVER_BASE_PATH="/data/dist/oshit"
SERVER_PROJECT_PATH="/data/dist/oshit/oshit-data-vis"
SERVER_BACKEND_PATH="/data/dist/oshit/oshit-data-vis/backend"
SERVER_CREDENTIALS_PATH="/data/dist/oshit/oshit-data-vis/credentials"
LOCAL_BACKEND_PATH="/Users/fupenglin/Desktop/Oshit/Official_Job/OSHIT_Data_Vis/backend"
CREDENTIALS_LOCAL="/Users/fupenglin/Desktop/Oshit/Official_Job/OSHIT_Data_Vis/credentials/oshit-data-visualization-dd0ed1145527.json"
CREDENTIALS_REMOTE="/data/dist/oshit/oshit-data-vis/credentials/oshit-data-visualization.json"
PEM_LOCAL="/Users/fupenglin/Desktop/Oshit/Official_Job/OSHIT_Data_Vis/credentials/global-bundle.pem"
PEM_REMOTE="/data/dist/oshit/oshit-data-vis/credentials/global-bundle.pem"

header "🚀 Starting OSHIT Backend Upload..."
if [ "$FIRST_TIME" = true ]; then
    highlight "🌟 Mode: FIRST TIME SETUP"
else
    highlight "🔄 Mode: CODE UPDATE"
fi
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

# Check if PEM file exists
if [ ! -f "$PEM_LOCAL" ]; then
    warning "RDS SSL CA file not found at $PEM_LOCAL. SSL connections may fail."
fi

info "Local backend path: $LOCAL_BACKEND_PATH"
info "Server: $SERVER_USER@$SERVER_HOST"
highlight "Remote backend path: $SERVER_BACKEND_PATH"
highlight "Remote credentials path: $SERVER_CREDENTIALS_PATH"

# Step 0: Ensure remote directories exist
echo ""
step "0️⃣  Preparing remote directories..."
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "
    # 强制创建父级目录（需要 sudo）
    sudo mkdir -p $SERVER_BACKEND_PATH
    sudo mkdir -p $SERVER_CREDENTIALS_PATH
    # 将 root 创建的文件夹所有权交给 admin 用户
    sudo chown -R $SERVER_USER:$SERVER_USER $SERVER_BASE_PATH
    # 确保有读写权限
    sudo chmod -R 755 $SERVER_BASE_PATH
    echo 'Remote directories prepared and permissions granted to $SERVER_USER'
"
success "Remote directories ready"

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

# Step 1.5: Upload service file (First time only)
if [ "$FIRST_TIME" = true ]; then
    echo ""
    step "1️⃣.5️⃣ Uploading systemd service file..."
    scp -i "$SERVER_KEY" "$LOCAL_BACKEND_PATH/oshit-data-vis.service" "$SERVER_USER@$SERVER_HOST:$SERVER_BACKEND_PATH/"
    success "Service file uploaded"
fi

# Step 2: Upload Google credentials
echo ""
step "2️⃣  Uploading Google credentials..."
# Prepare existing file for update if it exists
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "
    # If file exists, temporarily make it writable for update
    if [ -f $CREDENTIALS_REMOTE ]; then
        chmod 644 $CREDENTIALS_REMOTE
        echo 'Made existing credentials file writable for update'
    fi
"
# Then upload the file
scp -i "$SERVER_KEY" "$CREDENTIALS_LOCAL" "$SERVER_USER@$SERVER_HOST:$CREDENTIALS_REMOTE"
success "Credentials uploaded"

# Upload PEM file if it exists
if [ -f "$PEM_LOCAL" ]; then
    scp -i "$SERVER_KEY" "$PEM_LOCAL" "$SERVER_USER@$SERVER_HOST:$PEM_REMOTE"
    success "RDS SSL PEM uploaded"
fi

# Step 3: Set up permissions
echo ""
step "3️⃣  Setting up permissions..."
ssh -i "$SERVER_KEY" "$SERVER_USER@$SERVER_HOST" "
    # Set proper permissions for credentials (read-only for owner)
    chmod 400 $SERVER_CREDENTIALS_PATH/*.json 2>/dev/null || true
    chmod 400 $SERVER_CREDENTIALS_PATH/*.pem 2>/dev/null || true
    
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

if [ "$FIRST_TIME" = true ]; then
    warning "🆕 First time setup instructions:"
    highlight "   1. SSH to server: ssh -i $SERVER_KEY $SERVER_USER@$SERVER_HOST"
    highlight "   2. Go to backend directory: cd $SERVER_BACKEND_PATH"
    highlight "   3. Copy systemd service: sudo cp oshit-data-vis.service /etc/systemd/system/"
    highlight "   4. Reload systemd: sudo systemctl daemon-reload"
    highlight "   5. Start service: sudo systemctl start oshit-data-vis"
    highlight "   6. Enable auto-start: sudo systemctl enable oshit-data-vis"
else
    warning "🔄 Code update instructions:"
    highlight "   1. SSH to server: ssh -i $SERVER_KEY $SERVER_USER@$SERVER_HOST"
    highlight "   2. Restart service: sudo systemctl restart oshit-data-vis"
    highlight "   3. Check status: sudo systemctl status oshit-data-vis"
fi
echo ""
warning "🔧 Useful commands:"
info "   • Check status: sudo systemctl status oshit-data-vis"
info "   • View logs: sudo journalctl -u oshit-data-vis -f"
info "   • Restart service: sudo systemctl restart oshit-data-vis"
info "   • Edit .env if needed: nano .env.production"
echo ""
header "🚀 Deployment completed! 🚀"