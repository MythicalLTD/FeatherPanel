<?php

namespace App\Controllers\System;

use App\Chat\RedirectLink;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectLinks
{
	public function getAll(Request $request): Response
	{
		try {
			error_log('[REDIRECT DEBUG] getAll() called');
			$redirectLinks = RedirectLink::getAll(1, 1000); // Get all redirect links
			error_log('[REDIRECT DEBUG] Found ' . count($redirectLinks) . ' redirect links');

			// Return only public data (no sensitive information)
			$publicRedirects = array_map(function ($redirect) {
				error_log('[REDIRECT DEBUG] Processing redirect: ' . $redirect['slug'] . ' -> ' . $redirect['url']);
				return [
					'slug' => $redirect['slug'],
					'url' => $redirect['url'],
					'name' => $redirect['name'],
				];
			}, $redirectLinks);

			error_log('[REDIRECT DEBUG] Returning ' . count($publicRedirects) . ' public redirects');
			return ApiResponse::success([
				'redirect_links' => $publicRedirects,
				'count' => count($publicRedirects)
			], 'Redirect links fetched successfully', 200);
		} catch (\Exception $e) {
			error_log('[REDIRECT DEBUG] Error in getAll(): ' . $e->getMessage());
			return ApiResponse::error('Failed to fetch redirect links', 'FETCH_ERROR', 500);
		}
	}

	public function getBySlug(Request $request, string $slug): Response
	{
		try {
			error_log('[REDIRECT DEBUG] getBySlug() called with slug: ' . $slug);
			$redirectLink = RedirectLink::getBySlug($slug);

			if (!$redirectLink) {
				error_log('[REDIRECT DEBUG] No redirect found for slug: ' . $slug);
				return ApiResponse::error('Redirect link not found', 'REDIRECT_LINK_NOT_FOUND', 404);
			}

			error_log('[REDIRECT DEBUG] Found redirect: ' . $redirectLink['slug'] . ' -> ' . $redirectLink['url']);

			// Return only public data
			$publicRedirect = [
				'slug' => $redirectLink['slug'],
				'url' => $redirectLink['url'],
				'name' => $redirectLink['name'],
			];

			error_log('[REDIRECT DEBUG] Returning public redirect data');
			return ApiResponse::success(['redirect_link' => $publicRedirect], 'Redirect link fetched successfully', 200);
		} catch (\Exception $e) {
			error_log('[REDIRECT DEBUG] Error in getBySlug(): ' . $e->getMessage());
			return ApiResponse::error('Failed to fetch redirect link', 'FETCH_ERROR', 500);
		}
	}
}
