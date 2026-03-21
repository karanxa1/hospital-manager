#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting PostgreSQL...${NC}"
brew services start postgresql@16

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
until pg_isready -h localhost -p 5432 > /dev/null 2>&1; do
    sleep 1
done

echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Use Python 3.12
PYTHON=/opt/homebrew/opt/python@3.12/bin/python3.12

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    $PYTHON -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if [ ! -d "venv/lib/python3.*/site-packages/fastapi" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pip install -r requirements.txt
fi

echo -e "${GREEN}Starting backend server...${NC}"

# Trap to handle script termination
cleanup() {
    echo -e "\n${YELLOW}Stopping PostgreSQL...${NC}"
    brew services stop postgresql@16
    echo -e "${GREEN}PostgreSQL stopped.${NC}"
    deactivate
    exit 0
}

trap cleanup SIGINT SIGTERM

# Run uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
