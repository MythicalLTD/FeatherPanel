#!/usr/bin/env bash



TMPFILE=$(mktemp --suffix=.php)



cat > "$TMPFILE"



php ./storage/packages/bin/php-cs-fixer fix \

    --config=.php-cs-fixer.dist.php \

    --using-cache=no \

    --quiet \

    "$TMPFILE" >/dev/null 2>&1



cat "$TMPFILE"



rm "$TMPFILE"
