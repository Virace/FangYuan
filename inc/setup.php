<?php
/**
 * FangYuan Theme Asset Loading Setup
 * Based on WordPress official build tutorial
 * @link https://developer.wordpress.org/themes/advanced-topics/build-process/
 *
 * @package FangYuan
 * @since 0.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enqueue frontend styles and scripts
 * 
 * @since 0.1.0
 */
function fangyuan_enqueue_assets() {
    // Load frontend styles
    $screen_asset = include get_theme_file_path('public/css/screen.asset.php');
    
    wp_enqueue_style(
        'fangyuan-screen-style',
        get_theme_file_uri('public/css/screen.css'),
        $screen_asset['dependencies'],
        $screen_asset['version']
    );
    
    // Load frontend scripts
    $frontend_asset = include get_theme_file_path('public/js/frontend.asset.php');
    
    wp_enqueue_script(
        'fangyuan-frontend-script',
        get_theme_file_uri('public/js/frontend.js'),
        $frontend_asset['dependencies'],
        $frontend_asset['version'],
        true // Load in footer
    );
    
    // Uncomment below for RTL support
    // wp_style_add_data('fangyuan-screen-style', 'rtl', 'replace');
}
add_action('wp_enqueue_scripts', 'fangyuan_enqueue_assets');

/**
 * Enqueue editor styles
 * 
 * @since 0.1.0
 */
function fangyuan_editor_styles() {
    // Add editor styles
    add_editor_style([
        get_theme_file_uri('public/css/screen.css'),
        get_theme_file_uri('public/css/editor.css')
    ]);
}
add_action('after_setup_theme', 'fangyuan_editor_styles');

/**
 * Enqueue editor scripts and styles
 * 
 * @since 0.1.0
 */
function fangyuan_editor_assets() {
    // Load editor JavaScript
    $script_asset = include get_theme_file_path('public/js/editor.asset.php');
    
    wp_enqueue_script(
        'fangyuan-editor-script',
        get_theme_file_uri('public/js/editor.js'),
        $script_asset['dependencies'],
        $script_asset['version'],
        true // Load in footer
    );
    
    // Load editor-specific styles
    $style_asset = include get_theme_file_path('public/css/editor.asset.php');
    
    wp_enqueue_style(
        'fangyuan-editor-style',
        get_theme_file_uri('public/css/editor.css'),
        $style_asset['dependencies'],
        $style_asset['version']
    );
}
add_action('enqueue_block_editor_assets', 'fangyuan_editor_assets');

/**
 * Optional: Load styles for admin backend
 * Uncomment below if you want to apply styles in WordPress admin
 */
// function fangyuan_admin_styles() {
//     $screen_asset = include get_theme_file_path('public/css/screen.asset.php');
//     
//     wp_enqueue_style(
//         'fangyuan-admin-style',
//         get_theme_file_uri('public/css/screen.css'),
//         $screen_asset['dependencies'],
//         $screen_asset['version']
//     );
// }
// add_action('admin_enqueue_scripts', 'fangyuan_admin_styles');
