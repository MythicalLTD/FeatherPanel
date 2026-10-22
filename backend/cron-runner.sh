#!/bin/bash

echo "$(date): Starting cron runner for www-data user..."

# Ensure we have sudo access
if ! sudo -n true 2>/dev/null; then
    echo "$(date): Warning: sudo access may not be available, trying alternative approach..."
fi

# Function to run PHP cron job
run_php_cron() {
    echo "$(date): Running PHP cron job..."
    cd /var/www/html
    
    # Try with sudo first, fallback to direct execution
    # One run at a time (flock), never longer than CRON_TIMEOUT, and never
    # started a second time when the first run exits non-zero: the old
    # fallback ran every job twice after any failure.
    if sudo -n -u www-data true 2>/dev/null; then
        _runner=(sudo -u www-data)
    else
        _runner=()
    fi
    flock -n /tmp/featherpanel-cron.lock timeout "${CRON_TIMEOUT:-900}" "${_runner[@]}" php storage/cron/runner.php >> /var/log/cron.log 2>&1
    echo "$(date): PHP cron job finished (exit $?)"
}

# Function to run bash cron job
run_bash_cron() {
    echo "$(date): Running bash cron job..."
    cd /var/www/html
    
    # Try with sudo first, fallback to direct execution
    if sudo -u www-data bash storage/cron/runner.bash >> /var/log/cron.log 2>&1; then
        echo "$(date): Bash cron job completed with sudo"
    else
        echo "$(date): Trying bash cron job without sudo..."
        bash storage/cron/runner.bash >> /var/log/cron.log 2>&1
        echo "$(date): Bash cron job completed without sudo"
    fi
}

# Create log file if it doesn't exist
touch /var/log/cron.log
chown www-data:www-data /var/log/cron.log

# Main loop - run every minute
while true; do
    echo "$(date): Starting cron cycle..."
    
    # Run both cron jobs
    run_php_cron
    run_bash_cron
    
    echo "$(date): Cron cycle completed, waiting 60 seconds..."
    sleep 60
done