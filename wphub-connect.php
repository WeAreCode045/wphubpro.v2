<?php
/**
 * Plugin Name: WPHub Pro Bridge
 * Description: Lightweight helper voor veilige verbinding met WPHub Pro.
 * Version: 1.0.0
 * Author: Maurice
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('wphub/v1', '/connect', [
        'methods' => 'GET',
        'callback' => 'wphub_handle_connect',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ]);
});

function wphub_handle_connect() {
    // Genereer een unieke API Key voor dit platform
    $api_key = wp_generate_password(32, false);
    update_option('wphub_pro_api_key', $api_key);

    $current_user = wp_get_current_user();
    
    // De URL van jouw platform — gebruik de SPA hash route so the HashRouter can parse query params
    $platform_url = "https://wphubpro.netlify.app/#/dashboard/connect-success"; // Pas aan naar jouw daadwerkelijke callback URL
    
    $params = [
        'site_url'   => get_site_url(),
        'user_login' => $current_user->user_login,
        'api_key'    => $api_key, // We sturen de API Key i.p.v. het wachtwoord
    ];

    $redirect_url = add_query_arg($params, $platform_url);
    
    return [
        'redirect' => $redirect_url
    ];
}

// Voeg een simpele knop toe in het WordPress menu
add_action('admin_menu', function () {
    add_menu_page('WPHub Connect', 'WPHub Connect', 'manage_options', 'wphub-connect', function () {
        echo '<div class="wrap"><h1>WPHub Pro Connection</h1>';
        echo '<p>Klik op de knop hieronder om deze site veilig te koppelen aan je dashboard.</p>';
        echo '<button id="wphub-conn-btn" class="button button-primary">Verbind met WPHub Pro</button>';
        echo '<script>
            document.getElementById("wphub-conn-btn").onclick = function() {
                fetch("/wp-json/wphub/v1/connect", {
                    headers: { "X-WP-Nonce": "' . wp_create_nonce('wp_rest') . '" }
                })
                .then(r => r.json())
                .then(data => { if(data.redirect) window.location.href = data.redirect; });
            };
        </script></div>';
    });
});