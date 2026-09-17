#!/usr/bin/env bash
# PreToolUse(Bash) guard: auto-allow only simple `rm` calls on relative paths
# (no -r/-f/--recursive/--force, no absolute paths, no ".." traversal, no
# command chaining). Anything else falls through to the normal permission
# prompt.
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')

if [[ "$cmd" =~ [\;\&\|\`] || "$cmd" == *'$('* ]]; then
  exit 0
fi

if [[ ! "$cmd" =~ ^[[:space:]]*rm([[:space:]]|$) ]]; then
  exit 0
fi

args="${cmd#*rm}"

if echo "$args" | grep -qE -- '(^|[[:space:]])(-[a-zA-Z]*[rRf][a-zA-Z]*|--recursive|--force|--no-preserve-root)([[:space:]]|$)'; then
  exit 0
fi

for tok in $args; do
  [[ "$tok" == -* ]] && continue
  if [[ "$tok" == /* || "$tok" == "~"* || "$tok" == *".."* ]]; then
    exit 0
  fi
done

echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Simple rm on a relative path within the project directory, auto-allowed by .claude/hooks/rm-guard.sh"}}'
