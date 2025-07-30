<?php

namespace App\Services\Wings\Exceptions;

use Exception;

/**
 * Exception thrown when Wings authentication fails
 */
class WingsAuthenticationException extends Exception
{
	public function __construct(string $message = "", int $code = 0, ?Exception $previous = null)
	{
		parent::__construct($message, $code, $previous);
	}
}