
<?php
/**
 * Plugin main class file.
 *
 * @package StandaloneTech
 */


class WPHubPro_Bridge {
		/**
		 * Add admin menu for WPHubPro Bridge
		 */
		public function add_admin_menu() {
			add_menu_page('WPHubPro Bridge', 'WPHubPro Bridge', 'manage_options', 'wphubpro-bridge', function () {
				$current_key = get_option('wphubpro_api_key');
				echo '<div class="wrap"><h1>WPHubPro Bridge</h1><p>Verbind deze site met uw dashboard.</p>';
				echo '<button id="wphubpro-btn" class="button button-primary">Nu Koppelen</button>';
				if ($current_key) echo '<p><strong>Actieve Key:</strong> <code>' . esc_html($current_key) . '</code></p>';
				echo '<script>document.getElementById("wphubpro-btn").onclick = function() { fetch("' . get_rest_url(null, "wphubpro/v1/connect") . '", { headers: { "X-WP-Nonce": "' . wp_create_nonce("wp_rest") . '" } }).then(r => r.json()).then(d => { if(d.redirect) window.location.href = d.redirect; }); };</script></div>';
			});
		}
	private static $instance = null;

	public static function instance() {
		if (self::$instance === null) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action('rest_api_init', [$this, 'register_routes']);
		add_action('admin_menu', [$this, 'add_admin_menu']);
	}

	// --- Appwrite action log ---
	private function log_action($site_url, $action, $endpoint, $request, $response) {
		$appwrite_endpoint = getenv('APPWRITE_ENDPOINT');
		$appwrite_project = getenv('APPWRITE_PROJECT_ID');
		$appwrite_key = getenv('APPWRITE_API_KEY');
		if (!$appwrite_endpoint || !$appwrite_project || !$appwrite_key) return;

		$site_id = null;
		$sites_url = $appwrite_endpoint . "/v1/databases/platform_db/collections/sites/documents?queries[]=equal('site_url','" . urlencode($site_url) . "')";
		$opts = [
			'http' => [
				'method' => 'GET',
				'header' => "X-Appwrite-Project: $appwrite_project\r\nX-Appwrite-Key: $appwrite_key\r\nContent-Type: application/json\r\n"
			]
		];
		$context = stream_context_create($opts);
		$result = @file_get_contents($sites_url, false, $context);
		if ($result) {
			$data = json_decode($result, true);
			if (!empty($data['documents'][0]['$id'])) {
				$site_id = $data['documents'][0]['$id'];
			}
		}
		if (!$site_id) return;

		$doc_url = $appwrite_endpoint . "/v1/databases/platform_db/collections/sites/documents/$site_id";
		$opts['http']['method'] = 'GET';
		$context = stream_context_create($opts);
		$doc = @file_get_contents($doc_url, false, $context);
		$action_log = [];
		if ($doc) {
			$doc_data = json_decode($doc, true);
			if (!empty($doc_data['action_log']) && is_array($doc_data['action_log'])) {
				$action_log = $doc_data['action_log'];
			}
		}

		$entry = [
			'timestamp' => date('c'),
			'action' => $action,
			'endpoint' => $endpoint,
			'request' => $request,
			'response' => $response
		];
		$action_log[] = $entry;

		$opts['http']['method'] = 'PATCH';
		$opts['http']['content'] = json_encode(['action_log' => $action_log]);
		$context = stream_context_create($opts);
		@file_get_contents($doc_url, false, $context);
	}

	public function register_routes() {
		$namespace = 'wphubpro/v1';

		// Connect endpoint
		register_rest_route($namespace, '/connect', [
			'methods'  => 'GET',
			'callback' => [$this, 'handle_connect'],
			'permission_callback' => function () {
				return current_user_can('manage_options');
			}
		]);

		// Plugin Management
		register_rest_route($namespace, '/plugins', [
			'methods'  => 'GET',
			'callback' => [$this, 'get_plugins_list'],
			'permission_callback' => [$this, 'validate_api_key']
		]);
		register_rest_route($namespace, '/plugins/manage', [
			'methods'  => 'POST',
			'callback' => [$this, 'manage_plugin'],
			'permission_callback' => [$this, 'validate_api_key']
		]);

		// Theme Management
		register_rest_route($namespace, '/themes', [
			'methods'  => 'GET',
			'callback' => [$this, 'get_themes_list'],
			'permission_callback' => [$this, 'validate_api_key']
		]);
		register_rest_route($namespace, '/themes/manage', [
			'methods'  => 'POST',
			'callback' => [$this, 'manage_theme'],
			'permission_callback' => [$this, 'validate_api_key']
		]);
	}

	public function validate_api_key() {
		$stored_key = get_option('wphubpro_api_key');
		$provided_key = isset($_SERVER['HTTP_X_WPHUB_KEY']) ? $_SERVER['HTTP_X_WPHUB_KEY'] : '';
		if (empty($stored_key) || empty($provided_key)) return false;
		return hash_equals($stored_key, $provided_key);
	}

	public function handle_connect() {
		$api_key = wp_generate_password(32, false);
		update_option('wphubpro_api_key', $api_key);
		$platform_url = 'https://wphubpro.netlify.app/connect-success';
		$params = [
			'site_url'   => get_site_url(),
			'user_login' => wp_get_current_user()->user_login,
			'api_key'    => $api_key,
		];
		return ['redirect' => add_query_arg($params, $platform_url)];
	}

	// --- PLUGIN ACTIONS ---
	public function get_plugins_list() {
		if (!function_exists('get_plugins')) require_once ABSPATH . 'wp-admin/includes/plugin.php';
		$all_plugins = get_plugins();
		$active_plugins = get_option('active_plugins');
		$updates = get_site_transient('update_plugins');
		$response = [];

		foreach ($all_plugins as $file => $data) {
			$response[] = [
				'file'    => $file,
				'name'    => $data['Name'],
				'version' => $data['Version'],
				'active'  => in_array($file, $active_plugins),
				'update'  => isset($updates->response[$file]) ? $updates->response[$file]->new_version : null
			];
		}
		return rest_ensure_response($response);
	}

	public function manage_plugin($request) {
		$site_url = get_site_url();
		$endpoint = 'plugins/manage';
		$req_data = [
			'action' => $request->get_param('action'),
			'plugin' => $request->get_param('plugin'),
			'slug' => $request->get_param('slug'),
		];
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

		$action = $req_data['action'];
		$plugin = $req_data['plugin'];
		$slug   = $req_data['slug'];

		do_action('wphub_plugin_action_pre', $action, $plugin, $slug, $req_data);

		if (in_array($action, ['activate', 'deactivate', 'delete', 'update']) && (empty($plugin) || strpos($plugin, '/') === false)) {
			$this->log_action($site_url, $action, $endpoint, $req_data, 'Invalid or missing plugin param');
			return new WP_Error('invalid_plugin', 'Invalid or missing plugin param: expected plugin file path (e.g. akismet/akismet.php)');
		}

		switch ($action) {
			case 'activate':
				$resp = apply_filters('wphub_plugin_activate', activate_plugin($plugin), $plugin, $slug, $req_data);
				$this->log_action($site_url, $action, $endpoint, $req_data, $resp);
				return $resp;
			case 'deactivate':
				$resp = apply_filters('wphub_plugin_deactivate', deactivate_plugins($plugin), $plugin, $slug, $req_data);
				$this->log_action($site_url, $action, $endpoint, $req_data, $resp);
				return true;
			case 'delete':
				$resp = apply_filters('wphub_plugin_delete', delete_plugins([$plugin]), $plugin, $slug, $req_data);
				$this->log_action($site_url, $action, $endpoint, $req_data, $resp);
				return $resp;
			case 'update':
				$upgrader = new Plugin_Upgrader(new Quiet_Skin());
				$resp = apply_filters('wphub_plugin_update', $upgrader->update($plugin), $plugin, $slug, $req_data);
				$this->log_action($site_url, $action, $endpoint, $req_data, $resp);
				return $resp;
			case 'install':
				$upgrader = new Plugin_Upgrader(new Quiet_Skin());
				$api = plugins_api('plugin_information', ['slug' => $slug, 'fields' => ['sections' => false]]);
				$resp = apply_filters('wphub_plugin_install', $upgrader->install($api->download_link), $plugin, $slug, $req_data);
				$this->log_action($site_url, $action, $endpoint, $req_data, $resp);
				return $resp;
			default:
				$this->log_action($site_url, $action, $endpoint, $req_data, 'Action not supported');
				return new WP_Error('invalid_action', 'Action not supported');
		}
	}

	// --- THEME ACTIONS ---
	public function get_themes_list() {
		$all_themes = wp_get_themes();
		$current = get_stylesheet();
		$updates = get_site_transient('update_themes');
		$response = [];

		foreach ($all_themes as $slug => $theme) {
			$response[] = [
				'slug'    => $slug,
				'name'    => $theme->get('Name'),
				'version' => $theme->get('Version'),
				'active'  => ($slug === $current),
				'update'  => isset($updates->response[$slug]) ? $updates->response[$slug]['new_version'] : null
			];
		}
		return rest_ensure_response($response);
	}

	public function manage_theme($request) {
		$site_url = get_site_url();
		$endpoint = 'themes/manage';
		$req_data = [
			'action' => $request->get_param('action'),
			'slug' => $request->get_param('slug'),
		];
		require_once ABSPATH . 'wp-admin/includes/theme.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

		$action = $req_data['action'];
		$slug   = $req_data['slug'];

		do_action('wphub_theme_action_pre', $action, $slug, $req_data);

		switch ($action) {
			case 'activate':
				$resp = apply_filters('wphub_theme_activate', switch_theme($slug), $slug, $req_data);
				$this->log_action($site_url, $action, $endpoint, $req_data, $resp);
				return true;
			case 'delete':
				$resp = apply_filters('wphub_theme_delete', delete_theme($slug), $slug, $req_data);
				$this->log_action($site_url, $action, $endpoint, $req_data, $resp);
				return $resp;
			case 'update':
				$upgrader = new Theme_Upgrader(new Quiet_Skin());
				$resp = apply_filters('wphub_theme_update', $upgrader->update($slug), $slug, $req_data);
				$this->log_action($site_url, $action, $endpoint, $req_data, $resp);
				return $resp;
			case 'install':
				$upgrader = new Theme_Upgrader(new Quiet_Skin());
				$api = themes_api('theme_information', ['slug' => $slug, 'fields' => ['sections' => false]]);
				$resp = apply_filters('wphub_theme_install', $upgrader->install($api->download_link), $slug, $req_data);
				$this->log_action($site_url, $action, $endpoint, $req_data, $resp);
				return $resp;
			default:
				$this->log_action($site_url, $action, $endpoint, $req_data, 'Action not supported');
				return new WP_Error('invalid_action', 'Action not supported');
		}
	}

	// --- Quiet Skin for Upgrader ---
	// This class suppresses output during plugin/theme upgrades
}
