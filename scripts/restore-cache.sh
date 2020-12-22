#!/bin/bash
TOKEN=""
UPPER_LIMIT=134
BUTTOM_LIMIT=1

BACKEND_URL="http://139.59.137.132:3000"
ENDPOINT="$BACKEND_URL/api/v1/user/view/status"
METHOD=GET
echo "Starting.."
for ((i = $BUTTOM_LIMIT; i <= $UPPER_LIMIT; i++))
do
    curl -X $METHOD "$ENDPOINT?id=$i" \
    -H "accept: application/json" \
    -H "Authorization: Bearer $TOKEN" &> /dev/null
done

echo "Done!";
