DELETE FROM featherpanel_mail_templates
WHERE
	`featherpanel_mail_templates`.`name` = "verify_email";

INSERT INTO
	`featherpanel_mail_templates` (
		`name`,
		`subject`,
		`body`,
		`deleted`,
		`locked`,
		`created_at`,
		`updated_at`
	)
VALUES
	(
		'verify_email',
		'Verify your email for {app_name}',
		'<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Verify Your Email</title></head><body style=\"background-color:#f4f4f4;color:#333;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;line-height:1.6;margin:0;padding:20px\"><div style=\"background-color:#fff;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);margin:0 auto;max-width:600px;overflow:hidden\"><div style=\"background:linear-gradient(135deg,#667eea 0,#764ba2 100%);color:#fff;padding:40px 30px;text-align:center\"><h1 style=\"font-size:28px;font-weight:600;margin:0 0 10px 0\">Verify your email</h1><p style=\"font-size:16px;opacity:.9;margin:0\">One quick step to activate your account</p></div><div style=\"padding:40px 30px\"><div style=\"margin-bottom:30px;text-align:center\"><h2 style=\"color:#2d3748;font-size:24px;margin:0 0 15px 0\">Hello, {first_name} {last_name}</h2><p style=\"color:#4a5568;font-size:16px;line-height:1.6;margin:0\">Thanks for joining {app_name}. Please verify your email address to finish activating your account.</p></div><div style=\"background-color:#f7fafc;border:2px solid #e2e8f0;border-radius:8px;margin:30px 0;padding:30px;text-align:center\"><h3 style=\"color:#2d3748;font-size:20px;margin:0 0 15px 0\">Activate your account</h3><p style=\"color:#4a5568;margin:0 0 25px 0\">Click the button below to verify your email address.</p><a href=\"{verify_url}\" style=\"background:linear-gradient(135deg,#667eea 0,#764ba2 100%);border-radius:6px;color:#fff;display:inline-block;font-size:16px;font-weight:600;margin:10px 0;padding:18px 40px;text-decoration:none\">Verify Email</a></div><div style=\"background-color:#fff5f5;border:1px solid #fed7d7;border-radius:6px;margin:30px 0;padding:20px\"><h4 style=\"color:#c53030;font-size:16px;margin:0 0 10px 0\">Did not sign up?</h4><p style=\"color:#4a5568;font-size:14px;line-height:1.5;margin:0\">If you did not create this account, you can safely ignore this email.</p></div></div><div style=\"background-color:#f7fafc;border-top:1px solid #e2e8f0;padding:30px;text-align:center\"><p style=\"color:#718096;font-size:14px;margin:0 0 10px 0\">This email was sent to <b>{email}</b></p><p style=\"color:#718096;font-size:14px;margin:0 0 10px 0\">© 2024-2026 {app_name}. All rights reserved.</p><p style=\"color:#718096;font-size:14px;margin:0\"><a href=\"{support_url}\" style=\"color:#667eea;text-decoration:none\">Support</a></p></div></div></body></html>',
		'false',
		'false',
		'2026-04-16 12:30:00',
		'2026-04-16 12:30:00'
	);
