# PowerDNS zone hosting — manual smoke checklist

Run on `testingpanel.mythical.systems` with web node `vhost.mythical.systems`.

DNS and SSL are separate jobs: DNS points the name at the node; SSL is HTTP-01 on FeatherQuilld using the **site owner's account email**, or DNS-01 for wildcard certs via PowerDNS.

## Automated coverage (CI / unit tests)

- [x] MX priority formatting — `FeatherQuilld.Tests/Dns/PowerDnsManagerTests.cs`
- [x] NS nameserver defaults + glue seeding API — `PowerDnsManager.CreateZone(name, nodeIp)`
- [x] DNS host / WebSpace web-node match — `featherpanel/backend/tests/DnsProvisionerTest.php`
- [x] Delegation hint payload — `DnsProvisioner::delegationHint()`

## Operator runbook (live node)

Run manually on `vhost.mythical.systems` when staging/production is available. Code paths below are implemented; checkboxes track operator verification only.

## Prerequisites

- [ ] Migrations `2026-08-29.23.00-dns-hosts-zones.sql`, `2026-08-30.20.00-dns-hosts-web-node.sql`, and `2026-08-30.21.00-dns-powerdns-only.sql` applied
- [ ] Panel backend + frontendv2 deployed/restarted

## PowerDNS on web node

1. [ ] Open web node **Package manager** and install **powerdns**
2. [ ] Confirm daemon diagnostics report `dns.powerdns` ok (or `GET /api/dns/probe` on the node)
3. [ ] Confirm install message reminds operator to open port 53/tcp+udp

## Admin DNS hosts

4. [ ] Open `/admin/dns-hosts`
5. [ ] Create DNS host with a name and linked web node
6. [ ] Click **Test** — zones listed and delegation hint shown

## WebSpace zone link + editor

7. [ ] Open a WebSpace settings page (user) or admin edit page
8. [ ] Link apex zone (e.g. `example.com`) to the DNS host on the **same** web node
9. [ ] Confirm delegation card appears after link (nameservers + glue IP)
10. [ ] Add TXT record via editor; verify via PowerDNS API or `pdnsutil`
11. [ ] Add MX record via editor; verify priority is stored correctly

## Auto-provision

12. [ ] Click **Provision DNS records** — primary + alias domains get A records
13. [ ] Confirm provision uses linked primary zone (check API response `source: dns_host`)

## Wildcard SSL (DNS-01)

14. [ ] Request wildcard SSL on a WebSpace with a linked DNS zone
15. [ ] Confirm `_acme-challenge` TXT records appear in PowerDNS during issuance

## Permissions

16. [ ] Subuser without `dns.manage` cannot create/edit/delete records
17. [ ] Subuser with `dns.read` only can view zones/records

## Readiness gating

18. [ ] Web node with a DNS host configured blocks create when PowerDNS is missing (inspection shows `daemon_powerdns` fail/warn)

## SSL after DNS

19. [ ] Enable SSL — certs issue via HTTP-01 using the owner's account email (node `acmeEmail` is fallback only)

## Operator notes

- Delegate domain NS to `ns1.{apex}` (glue A → web node IP when required)
- Open port 53/tcp+udp on the node firewall for authoritative serving
