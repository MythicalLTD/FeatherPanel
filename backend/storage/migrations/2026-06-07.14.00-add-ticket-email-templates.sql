DELETE FROM featherpanel_mail_templates
WHERE
	`featherpanel_mail_templates`.`name` IN ('ticket_replied', 'ticket_closed', 'ticket_reopened');

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
		'ticket_replied',
		'New reply on your ticket: {ticket_title}',
		'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticket Reply</title></head><body style="background-color:#f4f4f4;color:#333;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;line-height:1.6;margin:0;padding:20px"><div style="background-color:#fff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);margin:0 auto;max-width:600px;overflow:hidden"><div style="background:linear-gradient(135deg,#667eea 0,#764ba2 100%);color:#fff;padding:40px 30px;text-align:center"><h1 style="font-size:28px;font-weight:600;margin:0 0 10px 0">New Ticket Reply</h1><p style="font-size:16px;opacity:.9;margin:0">Support has replied to your ticket</p></div><div style="padding:40px 30px"><div style="margin-bottom:30px;text-align:center"><h2 style="color:#2d3748;font-size:24px;margin:0 0 15px 0">Hello, {first_name} {last_name}</h2><p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0"><b>{replier_name}</b> replied to your ticket <b>{ticket_title}</b>.</p></div><div style="background-color:#f7fafc;border:2px solid #e2e8f0;border-radius:8px;margin:30px 0;padding:24px"><h3 style="color:#2d3748;font-size:18px;margin:0 0 12px 0">Reply preview</h3><div style="color:#4a5568;font-size:15px;line-height:1.6">{reply_preview}</div></div><div style="text-align:center;margin:30px 0"><a href="{ticket_url}" style="background:linear-gradient(135deg,#667eea 0,#764ba2 100%);border-radius:6px;color:#fff;display:inline-block;font-size:16px;font-weight:600;padding:12px 30px;text-decoration:none">View Ticket</a></div></div><div style="background-color:#f7fafc;border-top:1px solid #e2e8f0;padding:30px;text-align:center"><p style="color:#718096;font-size:14px;margin:0 0 10px 0">This email was sent to <b>{email}</b></p><p style="color:#718096;font-size:14px;margin:0 0 10px 0">© 2024-2026 {app_name}. All rights reserved.</p><p style="color:#718096;font-size:14px;margin:0"><a href="{support_url}" style="color:#667eea;text-decoration:none">Support</a></p></div></div></body></html>',
		'false',
		'false'
	),
	(
		'ticket_closed',
		'Your ticket has been closed: {ticket_title}',
		'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticket Closed</title></head><body style="background-color:#f4f4f4;color:#333;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;line-height:1.6;margin:0;padding:20px"><div style="background-color:#fff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);margin:0 auto;max-width:600px;overflow:hidden"><div style="background:linear-gradient(135deg,#718096 0,#4a5568 100%);color:#fff;padding:40px 30px;text-align:center"><h1 style="font-size:28px;font-weight:600;margin:0 0 10px 0">Ticket Closed</h1><p style="font-size:16px;opacity:.9;margin:0">Your support ticket has been marked as closed</p></div><div style="padding:40px 30px"><div style="margin-bottom:30px;text-align:center"><h2 style="color:#2d3748;font-size:24px;margin:0 0 15px 0">Hello, {first_name} {last_name}</h2><p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0">Your ticket <b>{ticket_title}</b> has been closed by our support team.</p><p style="color:#4a5568;font-size:15px;line-height:1.6;margin:16px 0 0 0">If you still need help, you can reopen the ticket from your dashboard or create a new one.</p></div><div style="text-align:center;margin:30px 0"><a href="{ticket_url}" style="background:linear-gradient(135deg,#718096 0,#4a5568 100%);border-radius:6px;color:#fff;display:inline-block;font-size:16px;font-weight:600;padding:12px 30px;text-decoration:none">View Ticket</a></div></div><div style="background-color:#f7fafc;border-top:1px solid #e2e8f0;padding:30px;text-align:center"><p style="color:#718096;font-size:14px;margin:0 0 10px 0">This email was sent to <b>{email}</b></p><p style="color:#718096;font-size:14px;margin:0 0 10px 0">© 2024-2026 {app_name}. All rights reserved.</p><p style="color:#718096;font-size:14px;margin:0"><a href="{support_url}" style="color:#667eea;text-decoration:none">Support</a></p></div></div></body></html>',
		'false',
		'false'
	),
	(
		'ticket_reopened',
		'Your ticket has been reopened: {ticket_title}',
		'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticket Reopened</title></head><body style="background-color:#f4f4f4;color:#333;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;line-height:1.6;margin:0;padding:20px"><div style="background-color:#fff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);margin:0 auto;max-width:600px;overflow:hidden"><div style="background:linear-gradient(135deg,#38a169 0,#48bb78 100%);color:#fff;padding:40px 30px;text-align:center"><h1 style="font-size:28px;font-weight:600;margin:0 0 10px 0">Ticket Reopened</h1><p style="font-size:16px;opacity:.9;margin:0">Your support ticket is open again</p></div><div style="padding:40px 30px"><div style="margin-bottom:30px;text-align:center"><h2 style="color:#2d3748;font-size:24px;margin:0 0 15px 0">Hello, {first_name} {last_name}</h2><p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0">Your ticket <b>{ticket_title}</b> has been reopened. You can continue the conversation from your dashboard.</p></div><div style="text-align:center;margin:30px 0"><a href="{ticket_url}" style="background:linear-gradient(135deg,#38a169 0,#48bb78 100%);border-radius:6px;color:#fff;display:inline-block;font-size:16px;font-weight:600;padding:12px 30px;text-decoration:none">View Ticket</a></div></div><div style="background-color:#f7fafc;border-top:1px solid #e2e8f0;padding:30px;text-align:center"><p style="color:#718096;font-size:14px;margin:0 0 10px 0">This email was sent to <b>{email}</b></p><p style="color:#718096;font-size:14px;margin:0 0 10px 0">© 2024-2026 {app_name}. All rights reserved.</p><p style="color:#718096;font-size:14px;margin:0"><a href="{support_url}" style="color:#667eea;text-decoration:none">Support</a></p></div></div></body></html>',
		'false',
		'false'
	);
