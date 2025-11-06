#!/bin/bash

source .venv/bin/activate

# Load environment variables from .env file
# Using set -a to automatically export all variables
set -a
source .env
set +a

uvicorn main:app --reload 
