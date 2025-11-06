<?php
// My cratind : code by Jubair bro
//
// Main API Gateway for api.jubairbro.com
// This script acts as a single entry point (router) for all API v2 requests.
// It requires .htaccess rewrite to point requests to this file.
// e.g., RewriteRule ^v2/(.*)$ api.php?request=$1 [QSA,L]

// --- BOOTSTRAP & CONFIGURATION ---

// We are a JSON API.
header('Content-Type: application/json');

// Set error reporting for "production" (don't leak errors)
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// --- CONSTANTS ---
define('API_VERSION', '2.1.4'); // Fake version for headers
define('EXPECTED_API_KEY', 'jb-live-key-xyz123abc987'); // Fake "live" key
define('SIMULATED_LATENCY_MS', 350); // Simulate 350ms network/DB delay

// --- HELPER FUNCTIONS ---

/**
 * Sends a standardized JSON response and terminates the script.
 *
 * @param int $status_code  The HTTP status code (e.g., 200, 404, 401)
 * @param string $status    'success' or 'error'
 * @param mixed $data       The payload (if success) or error message (if error)
 */
function send_json_response($status_code, $status, $data) {
    http_response_code($status_code);
    
    $response = ['status' => $status];
    
    if ($status == 'error') {
        $response['error'] = ['message' => $data];
    } else {
        $response['data'] = $data;
    }
    
    // Add a fake version to the header for realism
    header('X-Api-Version: ' . API_VERSION);
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}

/**
 * Checks for a valid API key in the Authorization header.
 * Calls send_json_response(401) or send_json_response(403) on failure.
 */
function check_authentication() {
    $headers = getallheaders();
    $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : null;

    if (!$auth_header) {
        send_json_response(401, 'error', 'Authorization header is missing.');
    }
    
    // Check for "Bearer <key>" format
    if (strpos($auth_header, 'Bearer ') !== 0) {
        send_json_response(401, 'error', 'Invalid authorization scheme. Use Bearer token.');
    }
    
    $api_key = str_replace('Bearer ', '', $auth_header);
    
    // Compare against the "real" key
    if ($api_key !== EXPECTED_API_KEY) {
        send_json_response(403, 'error', 'Invalid API Key.');
    }
    
    // If we're here, auth is valid.
    return true;
}

/**
 * Simulates network/database latency to make the API feel real.
 */
function simulate_work() {
    // usleep takes microseconds (1s = 1,000,000 μs)
    usleep(SIMULATED_LATENCY_MS * 1000);
}

/**
 * Parses the raw JSON input from a POST/PUT request.
 *
 * @return array The associative array from the decoded JSON
 */
function get_json_input() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        send_json_response(400, 'error', 'Invalid JSON body. ' . json_last_error_msg());
    }
    
    return $input;
}


// --- ENDPOINT HANDLERS ---

/**
 * Handles the /v2/otp/ endpoint.
 * This is the one you requested: api.jubairbro.com/v2/otp/?num={num}
 *
 * @param string $method The HTTP request method (e.g., 'GET')
 */
function handle_otp_request($method) {
    // This endpoint requires authentication
    check_authentication();
    
    if ($method !== 'GET') {
        send_json_response(405, 'error', 'Method Not Allowed. Use GET for this endpoint.');
    }
    
    if (!isset($_GET['num']) || empty($_GET['num'])) {
        send_json_response(400, 'error', 'Missing required query parameter: "num".');
    }
    
    $phone_number = $_GET['num'];
    
    // Simple validation (looks real)
    if (!preg_match('/^\+?[0-9]{10,15}$/', $phone_number)) {
        send_json_response(400, 'error', 'Invalid phone number format. Must be E.164 format.');
    }
    
    // --- Simulate Real Work ---
    // 1. Log the request
    // 2. Check for rate limiting in Redis (pretend)
    // 3. Call the SMS Gateway (e.g., Twilio, Vonage)
    simulate_work(); 
    
    // Generate a fake OTP and reference ID
    $otp_code = rand(100000, 999999);
    $ref_id = 'otp_' . bin2hex(random_bytes(12));
    
    // A real API *never* returns the OTP in the response.
    // It sends it via SMS. So we just return a success message.
    
    $response_data = [
        'message' => "OTP successfully generated and sent to $phone_number.",
        'reference_id' => $ref_id,
        'status' => 'pending_verification',
        'expires_in_seconds' => 300 // 5 minutes
    ];
    
    send_json_response(200, 'success', $response_data);
}

/**
 * Handles the /v2/user/ endpoint.
 * GET /v2/user/{id} - Get user
 * POST /v2/user/ - Create user
 *
 * @param string $method     The HTTP request method (e.g., 'GET', 'POST')
 * @param array $path_parts  The URL path parts (e.g., ['user', '123'])
 */
function handle_user_request($method, $path_parts) {
    // All user endpoints require authentication
    check_authentication();
    
    if ($method == 'GET') {
        // --- GET /v2/user/{id} ---
        if (!isset($path_parts[2]) || !is_numeric($path_parts[2])) {
            send_json_response(400, 'error', 'Missing or invalid user ID in URL path.');
        }
        $user_id = (int)$path_parts[2];
        
        // Simulate a database lookup
        simulate_work();
        
        // Return a fake user
        $fake_user = [
            'id' => $user_id,
            'username' => 'jubair_user_' . $user_id,
            'email' => "user{$user_id}@api.jubairbro.com",
            'first_name' => 'Jubair',
            'last_name' => 'Bro',
            'created_at' => '2025-01-15T10:30:00Z',
            'is_active' => true,
            'profile_img' => "https://api.jubairbro.com/avatars/user{$user_id}.png"
        ];
        send_json_response(200, 'success', $fake_user);

    } elseif ($method == 'POST') {
        // --- POST /v2/user/ ---
        $input = get_json_input();
        
        // Validate the input
        if (!isset($input['email']) || !isset($input['username']) || !isset($input['password'])) {
            send_json_response(400, 'error', 'Missing required fields: email, username, password.');
        }
        
        if (strlen($input['password']) < 8) {
             send_json_response(400, 'error', 'Password must be at least 8 characters long.');
        }
        
        // Simulate database insert
        simulate_work();
        
        // Return the "created" user with a new ID
        $new_user = [
            'id' => rand(1000, 9999),
            'username' => $input['username'],
            'email' => $input['email'],
            'created_at' => date('c'), // ISO 8601 date
            'is_active' => false // "Pending email verification"
        ];
        
        // 201 Created is the correct code for a successful POST
        send_json_response(201, 'success', $new_user);
        
    } else {
        send_json_response(405, 'error', 'Method Not Allowed. Use GET or POST.');
    }
}


// --- MAIN ROUTER LOGIC ---

// Get the request path from the query string (set by .htaccess)
// e.g., "v2/otp/" becomes "otp"
$request_path = isset($_GET['request']) ? trim($_GET['request'], '/') : '';
$path_parts = explode('/', $request_path);

// Check if the first part is 'v2' (handled by .htaccess, but good to double-check)
// Or, if no .htaccess, we check:
// $path_parts[0] == 'v2'
// For this example, we assume .htaccess already routed /v2/*
// So, $path_parts[0] will be 'otp' or 'user'

if (isset($path_parts[0])) {
    $endpoint = $path_parts[0];
    
    switch ($endpoint) {
        case 'otp':
            handle_otp_request($_SERVER['REQUEST_METHOD']);
            break;
            
        case 'user':
            handle_user_request($_SERVER['REQUEST_METHOD'], $path_parts);
            break;

        case 'status':
            // A simple, un-authenticated status check endpoint
            send_json_response(200, 'success', ['status' => 'online', 'version' => API_VERSION]);
            break;

        default:
            send_json_response(44, 'error', 'Endpoint not found.');
    }
} else {
    // Root API request (e.g., api.jubairbro.com/api.php)
    send_json_response(200, 'success', [
        'message' => 'Welcome to the Jubair Bro API Gateway',
        'documentation' => 'https://docs.jubairbro.com'
    ]);
}

?>
