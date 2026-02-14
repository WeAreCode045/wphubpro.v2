<?php
/**
 * Plugin Name: WPHub Pro Bridge
 * Description: Uitgebreide beheer-bridge voor WPHub Pro. Maakt volledig beheer van plugins, thema's en site-status mogelijk.
 * Version: 1.3.0
 * Author: Maurice
 */

if (!defined('ABSPATH')) exit;

class WPHub_Pro_Bridge {
    /**
     * Log an action to Appwrite sites collection (action_log array)
     */
    private function log_action($site_url, $action, $endpoint, $request, $response) {
        // Appwrite REST API endpoint and key from env
        $appwrite_endpoint = getenv('APPWRITE_ENDPOINT');
        $appwrite_project = getenv('APPWRITE_PROJECT_ID');
        $appwrite_key = getenv('APPWRITE_API_KEY');
        if (!$appwrite_endpoint || !$appwrite_project || !$appwrite_key) return;

        $site_id = null;
        // Try to extract site_id from site_url (assuming site_url is unique in collection)
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

        // Fetch current action_log
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

        // Patch document
        $opts['http']['method'] = 'PATCH';
        $opts['http']['content'] = json_encode(['action_log' => $action_log]);
        $context = stream_context_create($opts);
        @file_get_contents($doc_url, false, $context);
    }

    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
        add_action('admin_menu', [$this, 'add_admin_menu']);
    }

    public function register_routes() {
        $namespace = 'wphub/v1';

        // Connectie
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
        $stored_key = get_option('wphub_pro_api_key');
        $provided_key = isset($_SERVER['HTTP_X_WPHUB_KEY']) ? $_SERVER['HTTP_X_WPHUB_KEY'] : '';
        if (empty($stored_key) || empty($provided_key)) return false;
        return hash_equals($stored_key, $provided_key);
    }

    public function handle_connect() {
        $api_key = wp_generate_password(32, false);
        update_option('wphub_pro_api_key', $api_key);
        $platform_url = "https://wphubpro.netlify.app/connect-success";
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
        

        $action = $request->get_param('action');
        $plugin = $request->get_param('plugin'); // bijv: "akismet/akismet.php"
        $slug   = $request->get_param('slug');   // bijv: "akismet"

        // Validate plugin param for all actions except install
        if (in_array($action, ['activate', 'deactivate', 'delete', 'update']) && (empty($plugin) || strpos($plugin, '/') === false)) {
            $this->log_action($site_url, $action, $endpoint, $req_data, 'Invalid or missing plugin param');
            return new WP_Error('invalid_plugin', 'Invalid or missing plugin param: expected plugin file path (e.g. akismet/akismet.php)');
        }

        switch ($action) {
            case 'activate':
                $resp = activate_plugin($plugin);
                $this->log_action($site_url, $action, $endpoint, $req_data, $resp);
                return $resp;
            case 'deactivate':
                $resp = deactivate_plugins($plugin);
                $this->log_action($site_url, $action, $endpoint, $req_data, $resp);
                return true;
            case 'delete':
                $resp = delete_plugins([$plugin]);
                $this->log_action($site_url, $action, $endpoint, $req_data, $resp);
                return $resp;
            case 'update':
                $upgrader = new Plugin_Upgrader(new Quiet_Skin());
                $resp = $upgrader->update($plugin);
                $this->log_action($site_url, $action, $endpoint, $req_data, $resp);
                return $resp;
            case 'install':
                $upgrader = new Plugin_Upgrader(new Quiet_Skin());
                $api = plugins_api('plugin_information', ['slug' => $slug, 'fields' => ['sections' => false]]);
                $resp = $upgrader->install($api->download_link);
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
            error_log('[WPHub Bridge] manage_theme called: action=' . print_r($request->get_param('action'), true) . ' slug=' . print_r($request->get_param('slug'), true));
        require_once ABSPATH . 'wp-admin/includes/theme.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

        $action = $request->get_param('action');
        $slug   = $request->get_param('slug');

        switch ($action) {
            case 'activate':
                $resp = switch_theme($slug);
                $this->log_action($site_url, $action, $endpoint, $req_data, $resp);
                return true;
            case 'delete':
                $resp = delete_theme($slug);
                $this->log_action($site_url, $action, $endpoint, $req_data, $resp);
                return $resp;
            case 'update':
                $upgrader = new Theme_Upgrader(new Quiet_Skin());
                $resp = $upgrader->update($slug);
                $this->log_action($site_url, $action, $endpoint, $req_data, $resp);
                return $resp;
            case 'install':
                $upgrader = new Theme_Upgrader(new Quiet_Skin());
                $api = themes_api('theme_information', ['slug' => $slug, 'fields' => ['sections' => false]]);
                $resp = $upgrader->install($api->download_link);
                $this->log_action($site_url, $action, $endpoint, $req_data, $resp);
                return $resp;
            default:
                $this->log_action($site_url, $action, $endpoint, $req_data, 'Action not supported');
                return new WP_Error('invalid_action', 'Action not supported');
        }
    }

    public function add_admin_menu() {
        add_menu_page('WPHub Connect', 'WPHub Connect', 'manage_options', 'wphub-connect', function () {
            $current_key = get_option('wphub_pro_api_key');
            echo '<div class="wrap"><h1>WPHub Pro Bridge</h1><p>Verbind deze site met uw dashboard.</p>';
            echo '<button id="wphub-btn" class="button button-primary">Nu Koppelen</button>';
            if ($current_key) echo '<p><strong>Actieve Key:</strong> <code>' . esc_html($current_key) . '</code></p>';
            echo '<script>document.getElementById("wphub-btn").onclick = function() { fetch("' . get_rest_url(null, "wphub/v1/connect") . '", { headers: { "X-WP-Nonce": "' . wp_create_nonce("wp_rest") . '" } }).then(r => r.json()).then(d => { if(d.redirect) window.location.href = d.redirect; }); };</script></div>';
        });
    }
}

/**
 * Hulpklasse voor stille upgrades zonder HTML output.
 */
if (class_exists('WP_Upgrader_Skin')) {
    class Quiet_Skin extends WP_Upgrader_Skin {
        public function feedback($string, ...$args) {}
        public function header() {}
        public function footer() {}
    }
}

new WPHub_Pro_Bridge();