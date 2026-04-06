-- Mail template: notify user when an API key with IP restrictions is used from a non-allowed address
INSERT INTO
	`featherpanel_mail_templates` (
		`name`,
		`subject`,
		`body`,
		`deleted`,
		`locked`
	)
VALUES
	(
		'api_client_ip_blocked',
		'[{app_name}] API key blocked — unknown IP address',
		'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>API Key Security Notice</title></head><body style="background-color:#f4f4f4;color:#333;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;line-height:1.6;margin:0;padding:20px"><div style="background-color:#fff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);margin:0 auto;max-width:600px;overflow:hidden"><div style="background:linear-gradient(135deg,#dd6b20 0,#ed8936 100%);color:#fff;padding:40px 30px;text-align:center"><h1 style="font-size:28px;font-weight:600;margin:0 0 10px 0">API Key Security Notice</h1><p style="font-size:16px;opacity:.9;margin:0">Someone tried to use your API key from an address that is <b>not</b> on the allowed list.</p></div><div style="padding:40px 30px"><div style="margin-bottom:30px;text-align:center"><h2 style="color:#2d3748;font-size:24px;margin:0 0 15px 0">Hello, {first_name} {last_name}</h2><p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0">A request using your API key <b>{api_client_name}</b> (ID <b>{api_client_id}</b>) was <b>rejected</b> because it came from IP address <b>{blocked_ip}</b>, which is not allowed for this key.</p></div><div style="background-color:#fffaf0;border:2px solid #fbd38d;border-radius:8px;margin:30px 0;padding:30px;text-align:center"><h3 style="color:#2d3748;font-size:20px;margin:0 0 15px 0">What you should do</h3><p style="color:#4a5568;margin:0 0 25px 0">If you expected this request, add the IP or CIDR to your key\'s allowed list in the account API Keys settings. If you did <b>not</b> expect it, revoke or regenerate the key immediately.</p><a href="{dashboard_url}" style="background:linear-gradient(135deg,#dd6b20 0,#ed8936 100%);border-radius:6px;color:#fff;display:inline-block;font-size:16px;font-weight:600;padding:12px 30px;text-decoration:none">Open dashboard</a></div><div style="background-color:#fff5f5;border:1px solid #fed7d7;border-radius:6px;margin:30px 0;padding:20px"><h4 style="color:#c53030;font-size:16px;margin:0 0 10px 0">Security reminder</h4><p style="color:#4a5568;font-size:14px;line-height:1.5;margin:0">Never share your private API key. This email is only sent when you have enabled notifications for your key and outgoing mail (SMTP) is configured on this panel.</p></div></div><div style="background-color:#f7fafc;border-top:1px solid #e2e8f0;padding:30px;text-align:center"><p style="color:#718096;font-size:14px;margin:0 0 10px 0">This email was sent to <b>{email}</b></p><p style="color:#718096;font-size:14px;margin:0 0 10px 0">© 2024-2026 {app_name}. All rights reserved.</p><p style="color:#718096;font-size:14px;margin:0"><a href="{support_url}" style="color:#667eea;text-decoration:none">Support</a></p></div></div></body></html>',
		'false',
		'false'
	);
