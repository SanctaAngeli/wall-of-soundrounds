#!/bin/bash
# Convert WOS NEW SONGS WAV stems to MP3 for web deployment.
#
# Usage:
#   ./convert-new-songs.sh                       # process all folders
#   DRY_RUN=1 ./convert-new-songs.sh             # list actions only
#   ONLY="Toxic" ./convert-new-songs.sh          # process one folder
#
# Output: wall-of-sound-multi/public/audio/songs/{kebab-id}/{STEM}.mp3

set -u

SRC="/Users/harrylee/Offline Desktop/WALL OF SOUND WEBSITE CLAUDE copy/WOS NEW SONGS"
DST="/Users/harrylee/Offline Desktop/WALL OF SOUND WEBSITE CLAUDE copy/wall-of-sound-multi/public/audio/songs"

DRY_RUN="${DRY_RUN:-0}"
ONLY="${ONLY:-}"

kebab() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed "s/'//g" \
    | sed 's/[^a-z0-9]/-/g' \
    | sed -E 's/-+/-/g' \
    | sed 's/^-//;s/-$//'
}

find_one() {
  find "$1" -maxdepth 1 -iname "$2" -not -name "*.asd" 2>/dev/null | head -1
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

  # Stem pattern → output name
  local tries=(
    "*1_2 Drums*.wav|DRUMS.mp3"
    "*3_4 Percussion*.wav|PERC.mp3"
    "*5_6 Bass*.wav|BASS.mp3"
    "*7_8 Keys*.wav|KEYS.mp3"
    "*9_10 Guitar*.wav|GUITAR.mp3"
    "*11_12 Horns*.wav|HORNS.mp3"
    "*13_14 BVs*.wav|BVS.mp3"
    "*13_14 Overheads*.wav|OVERHEADS.mp3"
    "*15 Clue*.wav|CLUE.mp3"
    "*16 Gav LV*.wav|LV_GAV.mp3"
    "*17 Cairo LV*.wav|LV_CAIRO.mp3"
    "*18 Rose LV*.wav|LV_ROSE.mp3"
    "*19 Sara LV*.wav|LV_SARA.mp3"
  )

  local t pat outn src
  for t in "${tries[@]}"; do
    pat="${t%|*}"; outn="${t#*|}"
    src=$(find_one "$folder" "$pat")
    if [ -n "$src" ]; then
      to_mp3 "$src" "$out/$outn" && echo "  ✓ $outn"
    fi
  done

  # Full mix (Print Master or PO)
  local fullSrc; fullSrc=$(find_one "$folder" "*21_22*.wav")
  if [ -n "$fullSrc" ]; then
    to_mp3 "$fullSrc" "$out/FULL.mp3" && echo "  ✓ FULL.mp3"
  fi

  # Mixed VOCAL.mp3 = 4 LVs + BVs blended (source from original WAVs for quality)
  local vocalWavs=()
  local vp w
  for vp in "*16 Gav LV*.wav" "*17 Cairo LV*.wav" "*18 Rose LV*.wav" "*19 Sara LV*.wav" "*13_14 BVs*.wav"; do
    w=$(find_one "$folder" "$vp")
    [ -n "$w" ] && vocalWavs+=("$w")
  done
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
