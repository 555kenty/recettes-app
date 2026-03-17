#!/bin/bash
# Run scraping for all cuisine URL files
set -e

log() { echo "[$(date +%H:%M:%S)] $1"; }

run_file() {
  local file=$1
  local cuisine=$2
  log "Scraping $file (cuisine: $cuisine)..."
  node scripts/scrape-gemini.js --file="$file" --cuisine="$cuisine" 2>&1 || true
  sleep 5
}

# French
run_file scripts/urls-750g-francaise.txt "Française"

# Mediterranean
run_file scripts/urls-750g-italienne.txt "Italienne"
run_file scripts/urls-750g-espagnole.txt "Espagnole"
run_file scripts/urls-750g-grecque.txt "Grecque"
run_file scripts/urls-750g-israelienne.txt "Israélienne"

# Middle East / North Africa
run_file scripts/urls-750g-marocaine.txt "Marocaine"
run_file scripts/urls-750g-tunisienne.txt "Tunisienne"
run_file scripts/urls-750g-libanaise.txt "Libanaise"
run_file scripts/urls-196flavors-morocco.txt "Marocaine"
run_file scripts/urls-196flavors-algeria-tunisia.txt "Algérienne"
run_file scripts/urls-196flavors-lebanon.txt "Libanaise"
run_file scripts/urls-196flavors-turkey-iran.txt "Turque"

# West Africa / Sub-Saharan
run_file scripts/urls-750g-africaine.txt "Africaine"
run_file scripts/urls-africaine.txt "Africaine de l'Ouest"
run_file scripts/urls-196flavors-nigeria.txt "Nigériane"
run_file scripts/urls-196flavors-central-africa.txt "Africaine centrale"
run_file scripts/urls-196flavors-ethiopia.txt "Éthiopienne"

# Caribbean / DOM-TOM
run_file scripts/urls-750g-antillaise.txt "Antillaise"
run_file scripts/urls-antillaise.txt "Antillaise"
run_file scripts/urls-antillaise-750g.txt "Antillaise"
run_file scripts/urls-guadeloupe.txt "Guadeloupéenne"
run_file scripts/urls-haitienne.txt "Haïtienne"
run_file scripts/urls-jamaique.txt "Jamaïcaine"
run_file scripts/urls-caribbean-extra.txt "Caribéenne"
run_file scripts/urls-750g-reunionnaise.txt "Réunionnaise"

# Latin America
run_file scripts/urls-750g-mexicaine.txt "Mexicaine"
run_file scripts/urls-750g-bresilienne.txt "Brésilienne"
run_file scripts/urls-196flavors-mexico.txt "Mexicaine"
run_file scripts/urls-196flavors-peru.txt "Péruvienne"
run_file scripts/urls-196flavors-argentina.txt "Argentine"

# Asia
run_file scripts/urls-750g-japonaise.txt "Japonaise"
run_file scripts/urls-750g-chinoise.txt "Chinoise"
run_file scripts/urls-750g-thai.txt "Thaïlandaise"
run_file scripts/urls-750g-vietnamienne.txt "Vietnamienne"
run_file scripts/urls-750g-asiatique.txt "Asiatique"
run_file scripts/urls-750g-indienne.txt "Indienne"
run_file scripts/urls-196flavors-japan.txt "Japonaise"
run_file scripts/urls-196flavors-korea.txt "Coréenne"
run_file scripts/urls-196flavors-india.txt "Indienne"
run_file scripts/urls-196flavors-philippines.txt "Philippinne"

log "All scraping complete!"
