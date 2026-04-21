#!/bin/bash
# Convert WOS NEW SONGS WAV stems to MP3 for web deployment.
#
# Usage:
#   ./convert-new-songs.sh                       # process all folders at default SRC
#   DRY_RUN=1 ./convert-new-songs.sh             # list actions only
#   ONLY="Toxic" ./convert-new-songs.sh          # process one folder
#   SRC="/path/to/other/batch" ./convert-new-songs.sh   # run against a different source dir
#
# Supports both stem-naming conventions we've seen from the A band's Pro Tools exports:
#   - "16 Gav LV" / "17 Cairo LV" / "18 Rose LV" / "19 Sara LV"        (original WOS NEW SONGS)
#   - "18 Gav Safety" / "19 Cairo Safety" / "20 Rose Safety" / "21 Sara Safety"  (A BAND batch)
# Either pattern is picked up; whichever exists wins.
#
# Output: wall-of-sound-multi/public/audio/songs/{kebab-id}/{STEM}.mp3

set -u

SRC="${SRC:-/Users/harrylee/Offline Desktop/WALL OF SOUND WEBSITE CLAUDE copy/WOS NEW SONGS}"
DST="${DST:-/Users/harrylee/Offline Desktop/WALL OF SOUND WEBSITE CLAUDE copy/wall-of-sound-multi/public/audio/songs}"

DRY_RUN="${DRY_RUN:-0}"
ONLY="${ONLY:-}"

kebab() {
  # Strip common export suffixes the band adds to folder names (bpm tags, "R1"/"REMIX" revision
  # markers) BEFORE kebab-casing. Keeps IDs stable across re-exports and readable in URLs.
  echo "$1" \
    | sed -E 's/[ -]+[0-9]+ ?bpm *//gi' \
    | sed -E 's/ *-+ *(R1|R2|R3|REMIX|V[0-9]+) *$//i' \
    | tr '[:upper:]' '[:lower:]' \
    | sed "s/'//g" \
    | sed 's/[^a-z0-9]/-/g' \
    | sed -E 's/-+/-/g' \
    | sed 's/^-//;s/-$//'
}

find_one() {
  # Search up to 3 levels deep so we find stems whether they're at the folder root (WOS NEW SONGS)
  # or nested under an "Audit Stems" subfolder (A BAND export).
  find "$1" -maxdepth 3 -iname "$2" -not -name "*.asd" -not -path "*/Pro Tools Session/*" 2>/dev/null | head -1
}

# Try multiple patterns in order, return the first match. Used for stems that have different
# naming between export batches (Gav LV vs Gav Safety, etc).
find_first() {
  local dir="$1"; shift
  local p hit
  for p in "$@"; do
    hit=$(find_one "$dir" "$p")
    if [ -n "$hit" ]; then echo "$hit"; return 0; fi
  done
  return 1
}

to_mp3() {
  local src="$1" dst="$2"
  [ -f "$src" ] || return 1
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [dry]  $(basename "$src")  ->  $(basename "$dst")"
    return 0
  fi
  ffmpeg -y -loglevel error -i "$src" -b:a 192k -ar 48000 -ac 2 "$dst" </dev/null
}

mix_to_mp3() {
  local dst="$1"; shift
  local args=()
  for f in "$@"; do args+=("-i" "$f"); done
  local n=$#
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [dry]  mix $n sources  ->  $(basename "$dst")"
    return 0
  fi
  ffmpeg -y -loglevel error "${args[@]}" \
    -filter_complex "amix=inputs=$n:duration=longest:normalize=1" \
    -b:a 192k -ar 48000 -ac 2 "$dst" </dev/null
}

process() {
  local folder="$1"
  local name; name=$(basename "$folder")

  # Skip non-song entries
  case "$name" in
    "PO EXPORTS FOR WOS"|wetransfer_*) return 0;;
  esac

  local id; id=$(kebab "$name")
  local out="$DST/$id"
  echo "→ $name  →  $id"

  if [ "$DRY_RUN" != "1" ]; then
    # Wipe target folder to guarantee clean uppercase naming on case-insensitive FS.
    # WAV source of truth lives in WOS NEW SONGS, so removing local WAVs is safe.
    rm -rf "$out"
    mkdir -p "$out"
  fi

  # Stem output name → list of patterns to try. First match wins.
  # Supports both naming conventions: original WOS NEW SONGS (16-19 = LVs) and the
  # A BAND Pro Tools export (18-21 = Safety, with 16-17 repurposed as Vox Backup).
  declare -a STEM_MAP=(
    "DRUMS.mp3    |*1_2 Drums*.wav"
    "PERC.mp3     |*3_4 Percussion*.wav"
    "BASS.mp3     |*5_6 Bass*.wav"
    "KEYS.mp3     |*7_8 Keys*.wav"
    "GUITAR.mp3   |*9_10 Guitar*.wav"
    "HORNS.mp3    |*11_12 Horns*.wav"
    "BVS.mp3      |*13_14 BVs*.wav"
    "OVERHEADS.mp3|*13_14 Overheads*.wav"
    "CLUE.mp3     |*15 Clue*.wav"
    "LV_GAV.mp3   |*16 Gav LV*.wav|*18 Gav Safety*.wav"
    "LV_CAIRO.mp3 |*17 Cairo LV*.wav|*19 Cairo Safety*.wav"
    "LV_ROSE.mp3  |*18 Rose LV*.wav|*20 Rose Safety*.wav"
    "LV_SARA.mp3  |*19 Sara LV*.wav|*21 Sara Safety*.wav"
  )

  local row outn patterns IFS_OLD src
  for row in "${STEM_MAP[@]}"; do
    # Split on | but keep the field order: first field = output filename, rest = patterns
    outn=$(echo "$row" | cut -d'|' -f1 | xargs)
    patterns=$(echo "$row" | cut -d'|' -f2-)
    # Turn the remaining |-delimited string into positional args for find_first
    IFS_OLD="$IFS"; IFS='|'; read -r -a pats <<< "$patterns"; IFS="$IFS_OLD"
    src=$(find_first "$folder" "${pats[@]}")
    if [ -n "$src" ]; then
      to_mp3 "$src" "$out/$outn" && echo "  ✓ $outn  (from $(basename "$src"))"
    fi
  done

  # Full mix (Print Master or PO)
  local fullSrc; fullSrc=$(find_one "$folder" "*21_22*.wav")
  if [ -n "$fullSrc" ]; then
    to_mp3 "$fullSrc" "$out/FULL.mp3" && echo "  ✓ FULL.mp3"
  fi

  # Mixed VOCAL.mp3 = 4 LVs + BVs blended (source from original WAVs for quality).
  # Try both naming conventions for each LV; BVs is consistent across batches.
  local vocalWavs=()
  local w
  w=$(find_first "$folder" "*16 Gav LV*.wav" "*18 Gav Safety*.wav");     [ -n "$w" ] && vocalWavs+=("$w")
  w=$(find_first "$folder" "*17 Cairo LV*.wav" "*19 Cairo Safety*.wav"); [ -n "$w" ] && vocalWavs+=("$w")
  w=$(find_first "$folder" "*18 Rose LV*.wav" "*20 Rose Safety*.wav");   [ -n "$w" ] && vocalWavs+=("$w")
  w=$(find_first "$folder" "*19 Sara LV*.wav" "*21 Sara Safety*.wav");   [ -n "$w" ] && vocalWavs+=("$w")
  w=$(find_one "$folder" "*13_14 BVs*.wav");                              [ -n "$w" ] && vocalWavs+=("$w")
  if [ "${#vocalWavs[@]}" -gt 0 ]; then
    mix_to_mp3 "$out/VOCAL.mp3" "${vocalWavs[@]}" \
      && echo "  ✓ VOCAL.mp3 (${#vocalWavs[@]} srcs)"
  fi
}

shopt -s nullglob
for folder in "$SRC"/*/; do
  folder="${folder%/}"
  name=$(basename "$folder")
  if [ -n "$ONLY" ] && [ "$name" != "$ONLY" ]; then continue; fi
  process "$folder"
done
