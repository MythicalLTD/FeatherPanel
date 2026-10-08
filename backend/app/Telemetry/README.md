# Aggregate telemetry

When the administrator enables telemetry, the cron worker sends `telemetry.daily`
to `https://dynhost.mythical.systems/api/send`, using website ID
`71281b01-8c95-4fac-9f58-6d68aac179d7`. Successful reports run once every 24 hours;
failed attempts retry after one hour. A database lease prevents concurrent workers
from sending the same scheduled report.

The event data is a fixed allowlist of nonnegative integer counts. SQL computes
aggregates without retrieving individual activity records or their metadata.

| Category | Counts |
| --- | --- |
| Resources | Users, servers, backups, nodes, database agents, web nodes, webspaces, VM nodes, VMs, installed extensions |
| Adoption | Users with 2FA or client API keys; servers with backups, schedules, databases or subusers; webspaces with mailboxes |
| Features | Schedules and active schedules; backup, power and command schedule tasks; databases; client API keys; SSH keys; server, VM and webspace subusers; mounts; tickets; mailboxes; webspace schedules |
| Backup health | Successful, failed, pending and stale server backups; completed and failed VM and webspace backups |
| Last 30 days | New users and tickets; backups created and failed; schedules used; file operations; executed server schedules; VM backup, restore and failed tasks |

`*_30d` uses a rolling 30-day UTC window over retained database records. A schedule
used means its last execution falls inside that window; it is not a count of all
executions. `schedule_runs_30d` counts recorded executions, excluding manual queue
requests so a queued execution is not counted twice. `file_operations_30d` counts
only predefined file-operation event types, without paths, names or metadata.
VM task counts use the task creation time. A pending server backup becomes stale
after 24 hours. Current server-backup health and adoption exclude soft-deleted
backups; recent creation and failure counts include their retained history.
Resource totals count retained rows, including soft-deleted rows where present.
Hard-deleted records and expired activity history cannot contribute to these
counts. Missing feature tables or columns omit the corresponding metric group;
supported features with no records report zero.

No installation ID, account IDs, names, email addresses, credentials, file paths,
commands, error messages, software versions, uptime, visitor IPs or user agents
are placed in the report. Event hostname, URL, language and transport user agent
are fixed values. The receiving service still sees the server connection IP;
aggregate reporting does not make the network connection anonymous. Counts may
also distinguish small installations, so administrators can disable reporting.

Browser pageviews, interaction events, heatmaps, session recordings and external
Sentry error reporting are disabled. Old browser consent cookies are expired;
acceptance cannot enable a browser tracker or recorder. Local error logging remains
available.

Disable the administrator telemetry setting, set `UMAMI_ENABLED=false`, or disable
the application `TELEMETRY` flag to stop collection and transmission. The host and
website ID are shared constants, not administrator-configurable destinations.
`UmamiTelemetry::preview()` returns the same allowlisted counts without sending
them. Tests in `tests/Telemetry` cover payload filtering, feature counts, time
windows, opt-out behavior, disabled Sentry and report scheduling.
