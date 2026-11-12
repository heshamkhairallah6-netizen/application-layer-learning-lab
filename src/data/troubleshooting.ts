export type ScenarioCommand = {
  id: string;
  cmd: string;
  output: string;
  finding: string;
};

export type Hypothesis = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type Scenario = {
  id: string;
  title: string;
  ticket: string;
  protocol: string;
  difficulty: 'Foundation' | 'Intermediate' | 'Advanced';
  symptom: string;
  briefing: string[];
  alert: string;
  commands: ScenarioCommand[];
  hypotheses: Hypothesis[];
  rootCause: string;
  resolution: string[];
  verification: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'website-unreachable',
    title: 'Website unreachable from the office',
    ticket: 'INC-4471',
    protocol: 'HTTP / DNS',
    difficulty: 'Foundation',
    symptom: 'shopfront.example.com times out in every browser on the office VLAN, while the status page says the service is healthy.',
    briefing: [
      'You are on the 10.10.4.0/24 office VLAN. Other HTTPS sites load normally.',
      'The platform team confirms the load balancer is serving traffic on 203.0.113.10.',
      'Users say the failure started after a maintenance window yesterday evening.',
    ],
    alert: 'curl: (7) Failed to connect to shopfront.example.com port 443: Connection timed out',
    commands: [
      {
        id: 'c1',
        cmd: 'dig +short shopfront.example.com',
        output: '203.0.113.10',
        finding: 'Public DNS returns the correct load balancer address, so the zone data is healthy.',
      },
      {
        id: 'c2',
        cmd: 'getent hosts shopfront.example.com',
        output: '198.51.100.7    shopfront.example.com',
        finding: 'The operating system resolves a different address than DNS. That points at a local override such as /etc/hosts.',
      },
      {
        id: 'c3',
        cmd: 'grep shopfront /etc/hosts',
        output: '198.51.100.7  shopfront.example.com  # old staging LB - do not remove',
        finding: 'A stale hosts entry pins the name to a decommissioned staging load balancer.',
      },
      {
        id: 'c4',
        cmd: 'curl -I --resolve shopfront.example.com:443:203.0.113.10 https://shopfront.example.com',
        output: 'HTTP/2 200\nserver: nginx\ncontent-type: text/html; charset=utf-8\nstrict-transport-security: max-age=31536000',
        finding: 'Forcing the correct address returns 200, proving the application and certificate are fine.',
      },
      {
        id: 'c5',
        cmd: 'nc -vz 198.51.100.7 443',
        output: 'nc: connect to 198.51.100.7 port 443 (tcp) failed: Connection timed out',
        finding: 'The stale address does not answer on 443, which explains the browser timeout.',
      },
    ],
    hypotheses: [
      {
        id: 'h1',
        label: 'The TLS certificate on the load balancer has expired',
        correct: false,
        feedback: 'A certificate problem produces a certificate error after TCP connects, not a connection timeout. curl --resolve returned 200 with a valid TLS session.',
      },
      {
        id: 'h2',
        label: 'A stale /etc/hosts entry overrides DNS with a decommissioned address',
        correct: true,
        feedback: 'Exactly. dig returns 203.0.113.10, but the OS resolver returns 198.51.100.7 from /etc/hosts, which no longer answers.',
      },
      {
        id: 'h3',
        label: 'The public DNS zone is missing the A record',
        correct: false,
        feedback: 'dig resolves the name to the correct address, so the zone is not the problem. The override happens locally.',
      },
      {
        id: 'h4',
        label: 'Port 443 is blocked by the office firewall',
        correct: false,
        feedback: 'Other HTTPS sites load from the same VLAN, and the forced request to the correct address succeeded.',
      },
    ],
    rootCause: 'A stale /etc/hosts entry mapped the production hostname to a decommissioned staging load balancer (198.51.100.7), which no longer accepts connections on 443.',
    resolution: [
      'Remove the stale entry from /etc/hosts (or the equivalent override in the endpoint management profile).',
      'Flush the OS DNS cache so the corrected lookup takes effect immediately.',
      'Add the hosts-file check to the standard "site unreachable" runbook: compare getent hosts with dig.',
    ],
    verification: 'getent hosts now returns 203.0.113.10 and curl -I https://shopfront.example.com returns HTTP/2 200.',
  },
  {
    id: 'dns-resolution-failure',
    title: 'Internal application name does not resolve',
    ticket: 'INC-4512',
    protocol: 'DNS',
    difficulty: 'Intermediate',
    symptom: 'Staff cannot reach app.corp.internal. Browsers report "server IP address could not be found" from the office network.',
    briefing: [
      'The application is served by an internal address, 10.20.5.30, on the corporate zone corp.internal.',
      'Public websites resolve and load without problems.',
      'The laptop in question was re-imaged last week and uses DHCP.',
    ],
    alert: 'nslookup app.corp.internal → Server: 1.1.1.1  Address: 1.1.1.1  *** 1.1.1.1 can\'t find app.corp.internal: NXDOMAIN',
    commands: [
      {
        id: 'c1',
        cmd: 'ipconfig /all | findstr /i "DNS Servers"',
        output: 'DNS Servers . . . . . . . . . . . : 1.1.1.1\n                                      8.8.8.8',
        finding: 'The client is using public resolvers, which cannot see the private corp.internal zone.',
      },
      {
        id: 'c2',
        cmd: 'nslookup app.corp.internal 10.20.0.53',
        output: 'Server:  dc1.corp.internal\nAddress:  10.20.0.53\n\nName:    app.corp.internal\nAddress:  10.20.5.30',
        finding: 'The internal DNS server answers correctly, so the zone and record are healthy.',
      },
      {
        id: 'c3',
        cmd: 'nslookup corp.internal 1.1.1.1',
        output: '*** 1.1.1.1 can\'t find corp.internal: NXDOMAIN',
        finding: 'A public resolver returns NXDOMAIN for the private zone — expected for split-horizon DNS.',
      },
      {
        id: 'c4',
        cmd: 'ipconfig /renew',
        output: 'Windows IP Configuration\n\nEthernet adapter Ethernet:\n   IPv4 Address. . . . . . . . . . . : 10.10.4.87\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 10.10.4.1',
        finding: 'The lease renews, but the DNS servers still come from the wrong DHCP scope options.',
      },
    ],
    hypotheses: [
      {
        id: 'h1',
        label: 'The internal A record for app.corp.internal was deleted',
        correct: false,
        feedback: 'Querying the internal server directly returns 10.20.5.30, so the record exists.',
      },
      {
        id: 'h2',
        label: 'The DHCP scope hands out public resolvers instead of the internal DNS servers',
        correct: true,
        feedback: 'Correct. Public resolvers cannot answer for the private corp.internal zone, so the client receives NXDOMAIN.',
      },
      {
        id: 'h3',
        label: 'The application server is down',
        correct: false,
        feedback: 'The failure is at name resolution: the client never receives an IP to connect to.',
      },
      {
        id: 'h4',
        label: 'The client needs a longer DNS cache TTL',
        correct: false,
        feedback: 'NXDOMAIN here is authoritative from a resolver with no knowledge of the private zone — caching is not involved.',
      },
    ],
    rootCause: 'The DHCP scope (option 6) was configured with public DNS servers. The internal zone only exists on the corporate resolvers, so lookups for app.corp.internal return NXDOMAIN.',
    resolution: [
      'Update the DHCP scope DNS option to the internal resolvers (10.20.0.53, 10.20.0.54) and renew the lease.',
      'If a public resolver must stay for resilience, configure conditional forwarding for corp.internal on that resolver.',
      'Add a monitor that queries internal names through the DHCP-provided resolver, not through a hard-coded one.',
    ],
    verification: 'After ipconfig /renew, ipconfig /all shows the internal resolvers and app.corp.internal resolves to 10.20.5.30.',
  },
  {
    id: 'http-errors',
    title: 'Checkout returns HTTP 500 after a release',
    ticket: 'INC-4588',
    protocol: 'HTTP',
    difficulty: 'Intermediate',
    symptom: 'Customers can browse the catalogue, but every checkout attempt shows "Something went wrong" and support sees 500 responses.',
    briefing: [
      'A release was deployed to production two hours ago.',
      'The catalogue (GET /catalog) returns 200, so the web tier and TLS are healthy.',
      'The checkout service was also included in the release.',
    ],
    alert: 'POST /api/checkout → 500 Internal Server Error (47 occurrences in 15 min)',
    commands: [
      {
        id: 'c1',
        cmd: 'curl -I https://shop.example.com/catalog',
        output: 'HTTP/2 200\ncontent-type: text/html; charset=utf-8\nx-cache: HIT',
        finding: 'Static and cached paths are fine, so DNS, TCP and TLS can be ruled out.',
      },
      {
        id: 'c2',
        cmd: 'curl -s -o /dev/null -w "%{http_code}\\n" -X POST https://shop.example.com/api/checkout -H "Content-Type: application/json" -d \'{"cart":"c-991"}\'',
        output: '500',
        finding: 'The failure is reproducible and specific to the checkout handler.',
      },
      {
        id: 'c3',
        cmd: 'kubectl logs deploy/checkout --tail=6',
        output: 'ERROR handler/checkout.go:88 order insert failed: relation "orders_v2" does not exist\nERROR http: panic serving 10.20.9.14: runtime error: invalid memory address\nWARN retry budget exhausted for orders-db',
        finding: 'The handler fails on a missing database relation, so this is a server-side state problem, not a client problem.',
      },
      {
        id: 'c4',
        cmd: 'kubectl exec deploy/checkout -- migrate status',
        output: 'Applied: 20240912_add_index\nPending: 20241003_create_orders_v2  <-- required by release 4.8.0',
        finding: 'The release expects a migration that was never applied to the production database.',
      },
    ],
    hypotheses: [
      {
        id: 'h1',
        label: 'Customers are sending malformed JSON',
        correct: false,
        feedback: 'Malformed payloads produce 400/422, not 500. The logs show a database relation error.',
      },
      {
        id: 'h2',
        label: 'A required database migration was not applied during the release',
        correct: true,
        feedback: 'Correct. The new code queries orders_v2, but the migration that creates it is still pending, so the handler throws and returns 500.',
      },
      {
        id: 'h3',
        label: 'The TLS certificate is invalid',
        correct: false,
        feedback: 'curl completes the TLS handshake and receives an HTTP status, so TLS is not the failure.',
      },
      {
        id: 'h4',
        label: 'The CDN is caching an error page',
        correct: false,
        feedback: 'The POST is not cacheable and the 500 is generated by the checkout service, as the logs show.',
      },
    ],
    rootCause: 'Release 4.8.0 introduced code that reads the orders_v2 table, but migration 20241003_create_orders_v2 was never executed in production. Every checkout request raises a database error and returns 500.',
    resolution: [
      'Run the pending migration in a controlled window and confirm with migrate status.',
      'Restart or roll the checkout deployment so prepared statements are rebuilt.',
      'Add a release gate that blocks deployment when migrations are pending, and an alert on 5xx rate per route.',
    ],
    verification: 'POST /api/checkout returns 201 with an order id, and the 5xx rate returns to baseline.',
  },
  {
    id: 'dhcp-failure',
    title: 'New laptop gets a 169.254 address',
    ticket: 'INC-4620',
    protocol: 'DHCP',
    difficulty: 'Foundation',
    symptom: 'A newly imaged laptop on the second-floor VLAN cannot reach any server. It shows "No internet, secured" on Wi-Fi.',
    briefing: [
      'The VLAN is 192.168.20.0/24, gateway 192.168.20.1, DHCP server 192.168.20.5.',
      'Other users on the same floor work normally.',
      'The DHCP scope was sized for the original 40 desks; the floor now has 96 seats.',
    ],
    alert: 'IPv4 Address. . . . . . . . . . . : 169.254.118.34 (Preferred)  [APIPA]',
    commands: [
      {
        id: 'c1',
        cmd: 'ipconfig /all',
        output: 'Autoconfiguration Enabled . . . . : Yes\nAutoconfiguration IPv4 Address. . : 169.254.118.34(Preferred)\nSubnet Mask . . . . . . . . . . . : 255.255.0.0\nDefault Gateway . . . . . . . . . :\nDNS Servers . . . . . . . . . . . :',
        finding: 'The 169.254.x.x APIPA address means the client never received a DHCP lease.',
      },
      {
        id: 'c2',
        cmd: 'ipconfig /release && ipconfig /renew',
        output: 'Windows IP Configuration\n\nAn error occurred while renewing interface Wi-Fi : unable to contact your DHCP server. Request has timed out.',
        finding: 'The client broadcasts but no server answers — the problem is server-side or path-side.',
      },
      {
        id: 'c3',
        cmd: 'ssh dhcp1 "dhcp-lease-list --lease | wc -l"',
        output: '100',
        finding: 'All 100 addresses in the scope are leased.',
      },
      {
        id: 'c4',
        cmd: 'ssh dhcp1 "grep -E \'range|max-lease-time\' /etc/dhcp/dhcpd.conf"',
        output: 'range 192.168.20.100 192.168.20.199;\nmax-lease-time 604800;\ndefault-lease-time 604800;',
        finding: 'A /24 with a 100-address pool and 7-day leases cannot serve 96 seats plus phones and guests.',
      },
    ],
    hypotheses: [
      {
        id: 'h1',
        label: 'The Wi-Fi access point is broadcasting the wrong SSID',
        correct: false,
        feedback: 'The client associates successfully; the failure is address assignment, not association.',
      },
      {
        id: 'h2',
        label: 'The DHCP scope is exhausted because the pool is too small for the number of devices',
        correct: true,
        feedback: 'Correct. 100 addresses are all leased, and the 7-day lease keeps them occupied, so new clients fall back to APIPA.',
      },
      {
        id: 'h3',
        label: 'The client has a static IP configured',
        correct: false,
        feedback: 'ipconfig shows autoconfiguration enabled and an APIPA address, which only happens when DHCP fails.',
      },
      {
        id: 'h4',
        label: 'DNS is misconfigured on the laptop',
        correct: false,
        feedback: 'The laptop has no IP configuration at all, so DNS never comes into play.',
      },
    ],
    rootCause: 'The DHCP scope has only 100 addresses with 7-day leases. With 96 seats plus phones, tablets and guest devices the pool is fully leased, so new clients receive no offer and self-assign an APIPA address.',
    resolution: [
      'Expand the scope (for example 192.168.20.50–192.168.20.250) or move guest devices to a dedicated VLAN/scope.',
      'Reduce the lease time for high-churn networks (for example 8–12 hours) so addresses recycle.',
      'Alert on scope utilisation above 80% and monitor DHCPDISCOVER without a matching OFFER.',
    ],
    verification: 'A new client renews, receives an address inside the expanded range with gateway and DNS options, and reaches the file server.',
  },
  {
    id: 'email-delivery',
    title: 'Outbound mail bounces with 550 5.7.1',
    ticket: 'INC-4655',
    protocol: 'SMTP / DNS',
    difficulty: 'Advanced',
    symptom: 'Invoices sent to customers are bouncing. Internal mail is fine, and the recipient domains are different.',
    briefing: [
      'The company moved outbound mail to a new relay, smtp-gw2.example.com (198.51.100.45), last Friday.',
      'The old relay was smtp-gw1.example.com (198.51.100.20).',
      'Bounces arrive within seconds, so this is a policy rejection rather than a timeout.',
    ],
    alert: '550 5.7.1 <billing@customer.example>: Sender address rejected: SPF check failed',
    commands: [
      {
        id: 'c1',
        cmd: 'dig +short TXT example.com | grep spf',
        output: '"v=spf1 ip4:198.51.100.20 include:_spf.mailprovider.example -all"',
        finding: 'SPF authorises only the old relay; the new gateway IP is missing and the policy ends with -all.',
      },
      {
        id: 'c2',
        cmd: 'swaks --to billing@customer.example --from ar@example.com --server smtp-gw2.example.com --tls',
        output: '-> EHLO relay.example.com\n<- 250-STARTTLS\n-> STARTTLS\n<- 220 Ready to start TLS\n-> MAIL FROM:<ar@example.com>\n<- 550 5.7.1 Sender address rejected: SPF check failed',
        finding: 'The rejection happens at MAIL FROM on the new gateway, matching an SPF failure.',
      },
      {
        id: 'c3',
        cmd: 'dig +short TXT _dmarc.example.com',
        output: '"v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; adkim=s; aspf=s"',
        finding: 'DMARC is enforcing quarantine with strict SPF alignment, so an SPF failure cannot be absorbed.',
      },
      {
        id: 'c4',
        cmd: 'dig +short MX customer.example',
        output: '10 inbound.customer.example.',
        finding: 'The recipient uses a hosted filter that evaluates SPF strictly — typical for business mail.',
      },
    ],
    hypotheses: [
      {
        id: 'h1',
        label: 'The recipient server is greylisting the new relay',
        correct: false,
        feedback: 'Greylisting returns a temporary 4xx deferral. A 550 with "SPF check failed" is a permanent policy decision.',
      },
      {
        id: 'h2',
        label: 'The domain’s SPF record does not authorise the new outbound relay IP',
        correct: true,
        feedback: 'Correct. SPF lists 198.51.100.20 only, while mail now leaves from 198.51.100.45, and -all makes the failure authoritative.',
      },
      {
        id: 'h3',
        label: 'IMAP is blocking message submission',
        correct: false,
        feedback: 'IMAP is a retrieval protocol. Outbound submission uses SMTP; the transcript shows the SMTP rejection.',
      },
      {
        id: 'h4',
        label: 'The customer’s mailbox is full',
        correct: false,
        feedback: 'A full mailbox returns 452/552 at RCPT or DATA, not a 5.7.1 sender policy rejection.',
      },
    ],
    rootCause: 'The SPF TXT record for example.com authorises only the retired relay (198.51.100.20). Messages sent through the new gateway (198.51.100.45) fail SPF, and DMARC p=quarantine with strict alignment means receivers reject them.',
    resolution: [
      'Update the SPF record to include the new relay and keep it within the 10-DNS-lookup limit, for example v=spf1 ip4:198.51.100.45 include:_spf.mailprovider.example -all.',
      'Wait for the record TTL to expire, then re-test with swaks or an external deliverability checker.',
      'Confirm DKIM signing on the new gateway and keep DMARC reporting enabled before tightening policy.',
    ],
    verification: 'swaks submission returns 250 queued, SPF passes for the new IP, and the DMARC aggregate report shows pass for both SPF and DKIM.',
  },
  {
    id: 'ssh-failure',
    title: 'SSH public key authentication fails on a rebuilt host',
    ticket: 'INC-4699',
    protocol: 'SSH',
    difficulty: 'Advanced',
    symptom: 'The deployment pipeline cannot SSH to deploy@app.internal. Password login also fails; the host answers on port 22.',
    briefing: [
      'The server was rebuilt from an image yesterday; the same key worked before.',
      'The pipeline runs as user deploy with an ed25519 key.',
      'Network reachability is confirmed: nc -vz app.internal 22 succeeds.',
    ],
    alert: 'deploy@app.internal: Permission denied (publickey).',
    commands: [
      {
        id: 'c1',
        cmd: 'ssh -vvv -i ~/.ssh/id_ed25519 deploy@app.internal 2>&1 | tail -6',
        output: 'debug1: Offering public key: /home/ci/.ssh/id_ed25519 ED25519 SHA256:9pQ...\ndebug1: Authentications that can continue: publickey\ndebug3: send_pubkey_test\ndebug1: Authentications that can continue: publickey\ndebug1: No more authentication methods to try.\ndeploy@app.internal: Permission denied (publickey).',
        finding: 'The key is offered and rejected by the server, so the client is not the problem.',
      },
      {
        id: 'c2',
        cmd: 'ssh deploy@app.internal "ls -ld /home/deploy /home/deploy/.ssh; ls -l /home/deploy/.ssh/authorized_keys"',
        output: 'drwxrwxr-x 4 deploy deploy 4096 Nov 11 09:14 /home/deploy\ndrwx------ 2 deploy deploy 4096 Nov 11 09:14 /home/deploy/.ssh\n-rw------- 1 deploy deploy  102 Nov 11 09:14 /home/deploy/.ssh/authorized_keys',
        finding: 'authorized_keys permissions are correct, but the home directory is group-writable (775).',
      },
      {
        id: 'c3',
        cmd: 'ssh deploy@app.internal "sudo tail -2 /var/log/auth.log"',
        output: 'sshd[2211]: Authentication refused: bad ownership or modes for directory /home/deploy\nsshd[2211]: Connection closed by authenticating user deploy 10.10.4.87 port 51422 [preauth]',
        finding: 'sshd StrictModes refuses to use the key because the home directory is writable by the group.',
      },
      {
        id: 'c4',
        cmd: 'ssh deploy@app.internal "grep -E \'StrictModes|PubkeyAuthentication\' /etc/ssh/sshd_config"',
        output: 'PubkeyAuthentication yes\nStrictModes yes',
        finding: 'StrictModes is enabled, so insecure ownership/modes block public key auth.',
      },
    ],
    hypotheses: [
      {
        id: 'h1',
        label: 'The SSH port is blocked by a firewall',
        correct: false,
        feedback: 'nc -vz app.internal 22 succeeds and sshd logs the authentication attempt, so the port is reachable.',
      },
      {
        id: 'h2',
        label: 'The home directory is group-writable, so sshd StrictModes rejects the key',
        correct: true,
        feedback: 'Correct. /home/deploy is 775; sshd refuses key authentication when the path is writable by others.',
      },
      {
        id: 'h3',
        label: 'The client private key has the wrong permissions',
        correct: false,
        feedback: 'A bad client key permission produces a local warning before connecting. Here the key is offered and rejected by the server.',
      },
      {
        id: 'h4',
        label: 'The server host key changed',
        correct: false,
        feedback: 'A host key mismatch blocks the connection earlier with a loud warning. This failure is at user authentication.',
      },
    ],
    rootCause: 'The rebuilt image created /home/deploy with mode 775. sshd StrictModes refuses public key authentication when the user’s home directory is writable by group or others, so every key is rejected.',
    resolution: [
      'Fix ownership and modes: chown deploy:deploy /home/deploy && chmod 755 /home/deploy.',
      'Keep ~/.ssh at 700 and authorized_keys at 600; verify with ls -ld.',
      'Bake the correct permissions into the base image and add an SSH smoke test to the image pipeline.',
    ],
    verification: 'ssh -i ~/.ssh/id_ed25519 deploy@app.internal succeeds and the pipeline deploy step completes.',
  },
];
