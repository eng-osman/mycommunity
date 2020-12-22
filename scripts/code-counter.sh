#!/bin/bash


ds() {
  date --date="$1 days ago" +%Y-%m-%d
}

BRANCH=stage-8 # your branch here
echo "+------------------------------+"
echo "| Date       | Added | Deleted |"
echo "+------------------------------+"
for day in $(seq 1 3)
do
  lines=$(git --no-pager log --after=$(ds $day) --before=$(ds $(($day - 1))) --format=format: --numstat $BRANCH | awk '/([0-9]+).*([0-9]+).*/{s+=$1; t+=$2}
  END {
      printf "\033[0;32m+"; printf s; printf "\\e[0m";
      printf " | \033[0;31m-"; printf t; printf "\\e[0m";
      
      }')
  if [[ $(echo -e $lines) != "+ | -" ]]; then
      echo -e "| \033[0;33m$(ds $day)\e[0m | $lines      |"
  else
      echo -e "| $(ds $day) | +NULL | -NULL   |"
  fi
done
echo "|                              |"
echo "+------------------------------+"