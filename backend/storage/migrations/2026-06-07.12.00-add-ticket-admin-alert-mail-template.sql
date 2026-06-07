DELETE FROM featherpanel_mail_templates
WHERE `featherpanel_mail_templates`.`name` = 'ticket_admin_alert';

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
		'ticket_admin_alert',
		'[{app_name}] {event_label}',
		'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Support ticket alert</title></head><body style="background-color:#f4f4f4;color:#333;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;line-height:1.6;margin:0;padding:20px"><div style="background-color:#fff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);margin:0 auto;max-width:600px;overflow:hidden"><div style="background:linear-gradient(135deg,#e53e3e 0,#fc8181 100%);color:#fff;padding:40px 30px;text-align:center"><h1 style="font-size:28px;font-weight:600;margin:0 0 10px 0">Support ticket needs attention</h1><p style="font-size:16px;opacity:.9;margin:0">{event_label}</p></div><div style="padding:40px 30px"><div style="margin-bottom:30px;text-align:center"><h2 style="color:#2d3748;font-size:24px;margin:0 0 15px 0">Hello, {first_name} {last_name}</h2><p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0">Ticket <b>{ticket_title}</b> from <b>{ticket_owner}</b> requires staff attention. There are currently <b>{open_tickets_count}</b> open ticket(s) on {app_name}.</p></div><div style="background-color:#fff5f5;border:2px solid #feb2b2;border-radius:8px;margin:30px 0;padding:30px;text-align:center"><a href="{ticket_url}" style="background:linear-gradient(135deg,#e53e3e 0,#fc8181 100%);border-radius:6px;color:#fff;display:inline-block;font-size:16px;font-weight:600;padding:12px 30px;text-decoration:none">View ticket in admin panel</a></div></div><div style="background-color:#f7fafc;border-top:1px solid #e2e8f0;padding:30px;text-align:center"><p style="color:#718096;font-size:14px;margin:0 0 10px 0">This email was sent to <b>{email}</b></p><p style="color:#718096;font-size:14px;margin:0 0 10px 0">© 2024-2026 {app_name}. All rights reserved.</p><p style="color:#718096;font-size:14px;margin:0"><a href="{support_url}" style="color:#667eea;text-decoration:none">Support</a></p></div></div></body></html>',
		'false',
		'false'
	);
