# Mail hosting smoke checklist (docker-mailserver)

Operator runbook for built-in mail on FeatherQuilld web nodes. Complete on a staging node before production.

## Prerequisites

- [ ] FeatherQuilld web node online and healthy (Admin → Web nodes → Diagnostics)
- [ ] Docker installed on the web node (Package manager → Docker, or host package)
- [ ] Reverse proxy and site hosting already working on the node
- [ ] (Recommended) PowerDNS installed and DNS host linked for auto MX/SPF/DKIM

## 1. Install mailserver package

- [ ] Open **Admin → Web nodes → {node} → Package manager**
- [ ] Install **Mail server (docker-mailserver)**
- [ ] Confirm terminal shows image pull and `docker compose up` success
- [ ] Confirm toast or API response includes `mail_host_id` (auto-created MailHost in node mode)
- [ ] On the node: `docker ps` shows `featherquilld-mailserver` running

## 2. Firewall / ports

Open on the web node (and any edge firewall):

| Port | Service        |
|------|----------------|
| 25   | SMTP (inbound) |
| 587  | Submission     |
| 993  | IMAPS          |

Optional: 465 (SMTPS) if you enable it in docker-mailserver config later.

- [ ] `ss -lntp | egrep ':25|:587|:993'` shows listeners on the host
- [ ] External port check from another host succeeds (or documented as blocked by provider)
- [ ] Diagnostics show `mail.port.*` ok and `mail.deliverability` ok/warn appropriately

## 3. Mail host (panel)

- [ ] **Admin → Mail hosts** lists the auto-created host (provision mode: **Built-in (web node)**)
- [ ] IMAP/SMTP hosts match the web node FQDN; ports 993 / 587
- [ ] Mail host is scoped to the correct web node

## 4. WebSpace mailbox

- [ ] Create or use a WebSpace on the same node with `mailbox_limit > 0`
- [ ] **WebSpace → Email** → create mailbox (`local@domain` on a WebSpace domain)
- [ ] Daemon provision succeeds (no 502 from `/api/mail/provision`)
- [ ] IMAP login works (`openssl s_client -connect FQDN:993` then test client, or Roundcube)

## 5. DNS (when zone linked)

- [ ] WebSpace has a linked PowerDNS zone (Admin → DNS / WebSpace DNS)
- [ ] After mailbox create, MX points to node mail hostname (priority 10)
- [ ] SPF TXT present (`v=spf1 mx a:… -all`)
- [ ] DKIM TXT present when docker-mailserver generated keys (`mail._domainkey` or configured selector)
- [ ] If DKIM shows **pending**, use **Retry DNS provision** on the Email DNS checklist
- [ ] Mailbox **Email → DNS checklist** shows records as **provisioned** (not manual)

## 6. Autorespond (vacation)

- [ ] Enable autorespond on a mailbox from the panel (subject + body)
- [ ] Confirm `{root}/mail/config/{email}.dovecot.sieve` exists on the node
- [ ] Send a message to the mailbox from another address
- [ ] Receive a vacation reply (at most once per day per sender — delete `.dovecot.lda-dupes` under the maildir when retesting)

## 7. Webmail

- [ ] Panel Roundcube (or configured webmail) login with the new mailbox
- [ ] Send test message to an external address (deliverability may depend on rDNS/reputation — operator responsibility)

## 8. Readiness / diagnostics

- [ ] Web node diagnostics: `mail.stack` = ok when container running
- [ ] Port warnings (`mail.port.25`, etc.) cleared after firewall opens
- [ ] WebSpace create readiness: if node-mode mail host exists, `daemon_mailserver` must be ok (blocks create when container down)

## 9. Deliverability (operator — not automated)

Outbound mail that “works in the panel” can still land in spam without provider setup. Complete these on the public IP that sends mail:

- [ ] **PTR / rDNS** — ask the VPS/cloud provider to set reverse DNS for the node public IPv4 to the mail hostname (same FQDN used in MX / compose `hostname`)
- [ ] **Forward DNS** — mail hostname A/AAAA points at that same public IP
- [ ] **SPF** — zone TXT matches `v=spf1 mx a:{mail-hostname} -all` (auto-written when PowerDNS zone is linked)
- [ ] **DKIM** — TXT published; `GET /api/mail/dns-hints/{domain}` returns `dkim_ready: true`
- [ ] **Postmaster** — mailbox `postmaster@{domain}` or accept mail for the compose `POSTMASTER_ADDRESS`
- [ ] **Port 25 outbound** — many clouds block outbound 25; open a support ticket if submission works but external delivery fails
- [ ] Optional score: send from the mailbox to [mail-tester.com](https://www.mail-tester.com/) and aim for ≥8/10

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Package install blocked | Install Docker first |
| Container not running | `{root}/mail/docker-compose.yml`, `docker compose logs` in mail dir |
| Provision 502 | FeatherQuilld logs; `docker exec featherquilld-mailserver setup email list` |
| No DKIM in DNS hints | Wait for DKIM key generation; **Retry DNS provision** or `GET /api/mail/dns-hints/{domain}` |
| Autorespond not firing | Confirm sieve file exists; clear `.dovecot.lda-dupes`; wait ≥1 day between same-sender tests |
| Mail blocked at create | Diagnostics → mail.stack; install/start container |
| External delivery fails | PTR/rDNS, outbound 25 block, SPF/DKIM (section 9) |

## Out of scope (v1)

- Node-hosted Roundcube (use panel webmail)
- Automated PTR/rDNS with cloud providers
- Secondary MX / redundancy
