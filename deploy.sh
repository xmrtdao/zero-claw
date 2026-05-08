#!/bin/bash
# deploy.sh — Deploy ZeroClaw edge functions to Supabase from Termux/Android
# Usage: ./deploy.sh

set -e

PROJECT_REF="vawouugtzwmejxqkeqqj"
FUNCTIONS=(
  "propose-action"
  "submit-vote"
  "tally-votes"
  "check-vote"
  "eliza-direct"
)

echo "🦑 ZeroClaw Supabase Deploy"
echo "Project: $PROJECT_REF"
echo ""

# Check for SUPABASE_ACCESS_TOKEN
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN not set."
    echo "Get it from: https://supabase.com/dashboard/account/tokens"
    echo "Then run: export SUPABASE_ACCESS_TOKEN=your_token"
    exit 1
fi

# Install supabase CLI if missing
if ! command -v supabase &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    npm install -g supabase
fi

# Login
supabase login --token "$SUPABASE_ACCESS_TOKEN"

# Link project
supabase link --project-ref "$PROJECT_REF"

# Deploy each function
for func in "${FUNCTIONS[@]}"; do
    echo "🚀 Deploying $func..."
    supabase functions deploy "$func" --project-ref "$PROJECT_REF"
done

# Apply schema
echo "🗄️  Applying database schema..."
supabase db push --project-ref "$PROJECT_REF"

echo ""
echo "✅ All deployed!"
echo ""
echo "Endpoints:"
for func in "${FUNCTIONS[@]}"; do
    echo "  https://$PROJECT_REF.supabase.co/functions/v1/$func"
done
