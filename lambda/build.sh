#!/bin/bash
# build.sh — Package the Lambda function and its dependencies into lambda.zip
# Usage: ./build.sh
# The resulting lambda.zip is ready for deployment via Terraform or AWS CLI.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🧹 Cleaning previous build artifacts..."
rm -rf ./package lambda.zip

echo "📦 Installing Python dependencies into ./package..."
pip install -r requirements.txt -t ./package --quiet

echo "🗜  Zipping dependencies..."
cd package
zip -r ../lambda.zip . -q
cd ..

echo "➕ Adding handler.py to the archive..."
zip lambda.zip handler.py -q

echo "✅ Build complete: $(du -sh lambda.zip | cut -f1) → lambda.zip"
echo "   Deploy with: terraform apply -var='lambda_zip_path=../lambda/lambda.zip'"
