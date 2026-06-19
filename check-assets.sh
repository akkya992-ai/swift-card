#!/usr/bin/env bash

# check-assets.sh - Android Asset Integrity and Relative Resolution Validator
# Checks if the bundled assets are complete, correctly compiled, and resolved using correct relative prefixes.

# ANSI Color Codes for beautiful console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0;m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}      DAILY MART ANDROID LOCAL ASSET VALIDATOR                 ${NC}"
echo -e "${CYAN}================================================================${NC}"

# Absolute paths within workspace (using relative paths from root)
TARGET_INDEX="android/app/src/main/assets/public/index.html"
TARGET_ASSETS_DIR="android/app/src/main/assets/public/assets"

echo -e "${BLUE}[INFO] Checking asset paths structure...${NC}"
echo -e "Target index.html:   ${YELLOW}$TARGET_INDEX${NC}"
echo -e "Target assets dir:   ${YELLOW}$TARGET_ASSETS_DIR${NC}"
echo ""

# 1. Check if files and directories exist
if [ ! -f "$TARGET_INDEX" ]; then
    echo -e "${RED}[ERROR] Target index.html was not found! Run 'npm run build' followed by 'npx cap sync'.${NC}"
    exit 1
else
    echo -e "${GREEN}[OK] Native Android bundle index.html exists.${NC}"
fi

if [ ! -d "$TARGET_ASSETS_DIR" ]; then
    echo -e "${RED}[ERROR] Target assets directory is missing: $TARGET_ASSETS_DIR${NC}"
    exit 1
else
    echo -e "${GREEN}[OK] Native Android assets folder exists.${NC}"
fi

# 2. Check for absolute root path prefixes in index.html (highly detrimental to native Android file: schemas)
echo -e "\n${BLUE}[DIAGNOSTIC 1] checking for absolute links (root '/' prefixes)...${NC}"
BAD_PRE_SRC=$(grep -E 'src="/assets/' "$TARGET_INDEX")
BAD_PRE_HREF=$(grep -E 'href="/assets/' "$TARGET_INDEX")
BAD_PRE_LINK=$(grep -E 'href="/manifest.json"' "$TARGET_INDEX")

HAS_ABSOLUTE_ERRORS=0

if [ ! -z "$BAD_PRE_SRC" ] || [ ! -z "$BAD_PRE_HREF" ] || [ ! -z "$BAD_PRE_LINK" ]; then
    echo -e "${RED}[WARN] Found absolute path references pointing to the root root '/' which will fail on Android WebView!${NC}"
    if [ ! -z "$BAD_PRE_SRC" ]; then echo -e "  - ${YELLOW}Source line: $BAD_PRE_SRC${NC}"; fi
    if [ ! -z "$BAD_PRE_HREF" ]; then echo -e "  - ${YELLOW}Href line: $BAD_PRE_HREF${NC}"; fi
    if [ ! -z "$BAD_PRE_LINK" ]; then echo -e "  - ${YELLOW}Link line: $BAD_PRE_LINK${NC}"; fi
    HAS_ABSOLUTE_ERRORS=1
else
    echo -e "${GREEN}[SUCCESS] All assets are prefixed correctly! No root-level '/' absolute references detected.${NC}"
fi

# 3. Check for correct './' or relative asset prefixes
echo -e "\n${BLUE}[DIAGNOSTIC 2] Inspecting asset links in index.html...${NC}"
# Extract values matching src="..." or href="..."
ASSET_REFS=$(grep -o -E '(src|href)="[^"]+"' "$TARGET_INDEX" | cut -d'"' -f2)

if [ -z "$ASSET_REFS" ]; then
    echo -e "${YELLOW}[WARN] Could not parse any asset source paths or links. Please verify index.html parsing manually.${NC}"
else
    echo -e "Parsed references:"
    echo "$ASSET_REFS" | while read -r ref; do
        # We only care about assets or manifest references (ignoring protocols like http, data: or external links)
        if [[ "$ref" =~ ^\./assets/|^assets/|^\./manifest\.json|^\./sw\.js ]]; then
            echo -e "  - Found relative ref: ${GREEN}$ref${NC}"
        elif [[ "$ref" =~ ^data:|^https?:|^http: ]]; then
            echo -e "  - Found external/data ref (ignored): ${CYAN}$ref${NC}"
        else
            echo -e "  - Found suspicious/absolute ref: ${RED}$ref${NC}"
            HAS_ABSOLUTE_ERRORS=1
        fi
    done
fi

# 4. Integrity check: Do files referenced in index.html actually exist on disk in the asset folder?
echo -e "\n${BLUE}[DIAGNOSTIC 3] Matching reference bundle availability on disk...${NC}"
MISSING_FILES=0
CHECKED_FILES=0

if [ ! -z "$ASSET_REFS" ]; then
    while read -r ref; do
        # Filter local assets inside /assets/ or /manifest.json etc.
        if [[ "$ref" =~ ^\./assets/ ]] || [[ "$ref" =~ ^assets/ ]]; then
            # Strip './' if present to resolve real disk path
            clean_path=$(echo "$ref" | sed 's|^\./||')
            disk_path="android/app/src/main/assets/public/$clean_path"
            
            ((CHECKED_FILES++))
            if [ -f "$disk_path" ]; then
                echo -e "  - File exists: ${GREEN}$clean_path${NC} (${YELLOW}$(stat -c%s "$disk_path" 2>/dev/null || echo "unknown") bytes${NC})"
            else
                echo -e "  - File MISSING: ${RED}$clean_path${NC} (Check: $disk_path)"
                ((MISSING_FILES++))
            fi
        fi
    done <<< "$ASSET_REFS"
fi

echo -e "\n${BLUE}===================== SUMMARY =====================${NC}"
echo -e "Checked references:       ${YELLOW}$CHECKED_FILES${NC}"
echo -e "Missing references:       $( [ "$MISSING_FILES" -eq 0 ] && echo -e "${GREEN}$MISSING_FILES${NC}" || echo -e "${RED}$MISSING_FILES (CRITICAL)${NC}" )"
echo -e "Relative prefixed check:  $( [ "$HAS_ABSOLUTE_ERRORS" -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}" )"

if [ "$MISSING_FILES" -gt 0 ] || [ "$HAS_ABSOLUTE_ERRORS" -gt 0 ]; then
    echo -e "\n${RED}⚠️  Android initialization warning: Build diagnostics caught issues which could result in a white screen!${NC}"
    exit 1
else
    echo -e "\n${GREEN}🎉 Android bundle integrity checks PASSED successfully! All assets are fully bundled and locally linkable via the relative file protocol tree. No white screen causes detected on compilation scope.${NC}"
    exit 0
fi
