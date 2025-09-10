<?php

namespace App\Controllers;

use App\Chat\RedirectLink;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

class RedirectController
{
	public function redirect(Request $request, string $slug): Response
	{
		$redirectLink = RedirectLink::getBySlug($slug);

		if (!$redirectLink) {
			return ApiResponse::error('Redirect link not found', 'REDIRECT_LINK_NOT_FOUND', 404);
		}

		// Return a redirect response
		return new RedirectResponse($redirectLink['url'], 302);
	}
}
