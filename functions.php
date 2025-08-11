<?php
/**
 * 方圆主题 functions and definitions.
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package FangYuan
 * @subpackage FangYuan_Theme
 * @since FangYuan 1.0
 */

// 引入 inc 目录中的设置文件
require_once get_theme_file_path('inc/setup.php');

// Adds theme support for post formats.
if ( ! function_exists( 'fangyuan_post_format_setup' ) ) :
	/**
	 * Adds theme support for post formats.
	 *
	 * @since FangYuan 0.1.0
	 *
	 * @return void
	 */
	function fangyuan_post_format_setup() {
		add_theme_support( 'post-formats', array( 'aside', 'audio', 'chat', 'gallery', 'image', 'link', 'quote', 'status', 'video' ) );
	}
endif;
add_action( 'after_setup_theme', 'fangyuan_post_format_setup' );

// Enqueues editor-style.css in the editors.
if ( ! function_exists( 'fangyuan_editor_style' ) ) :
	/**
	 * Enqueues editor-style.css in the editors.
	 *
	 * @since FangYuan 0.1.0
	 *
	 * @return void
	 */
	function fangyuan_editor_style() {
		add_editor_style( 'assets/css/editor-style.css' );
	}
endif;
add_action( 'after_setup_theme', 'fangyuan_editor_style' );

// Enqueues style.css on the front.
if ( ! function_exists( 'fangyuan_enqueue_styles' ) ) :
	/**
	 * Enqueues style.css on the front.
	 *
	 * @since FangYuan 0.1.0
	 *
	 * @return void
	 */
	function fangyuan_enqueue_styles() {
		wp_enqueue_style(
			'fangyuan-style',
			get_parent_theme_file_uri( 'style.css' ),
			array(),
			wp_get_theme()->get( 'Version' )
		);
	}
endif;
add_action( 'wp_enqueue_scripts', 'fangyuan_enqueue_styles' );

// Registers custom block styles.
if ( ! function_exists( 'fangyuan_block_styles' ) ) :
	/**
	 * Registers custom block styles.
	 *
	 * @since FangYuan 0.1.0
	 *
	 * @return void
	 */
	function fangyuan_block_styles() {
		register_block_style(
			'core/list',
			array(
				'name'         => 'checkmark-list',
				'label'        => __( 'Checkmark', 'fangyuan' ),
				'inline_style' => '
				ul.is-style-checkmark-list {
					list-style-type: "\2713";
				}

				ul.is-style-checkmark-list li {
					padding-inline-start: 1ch;
				}',
			)
		);
	}
endif;
add_action( 'init', 'fangyuan_block_styles' );

// Registers pattern categories.
if ( ! function_exists( 'fangyuan_pattern_categories' ) ) :
	/**
	 * Registers pattern categories.
	 *
	 * @since FangYuan 0.1.0
	 *
	 * @return void
	 */
	function fangyuan_pattern_categories() {

		register_block_pattern_category(
			'fangyuan_page',
			array(
				'label'       => __( 'Pages', 'fangyuan' ),
				'description' => __( 'A collection of full page layouts.', 'fangyuan' ),
			)
		);

		register_block_pattern_category(
			'fangyuan_post-format',
			array(
				'label'       => __( 'Post formats', 'fangyuan' ),
				'description' => __( 'A collection of post format patterns.', 'fangyuan' ),
			)
		);
	}
endif;
add_action( 'init', 'fangyuan_pattern_categories' );

// Registers block binding sources.
if ( ! function_exists( 'fangyuan_register_block_bindings' ) ) :
	/**
	 * Registers the post format block binding source.
	 *
	 * @since FangYuan 0.1.0
	 *
	 * @return void
	 */
	function fangyuan_register_block_bindings() {
		register_block_bindings_source(
			'fangyuan/format',
			array(
				'label'              => _x( 'Post format name', 'Label for the block binding placeholder in the editor', 'fangyuan' ),
				'get_value_callback' => 'fangyuan_format_binding',
			)
		);
	}
endif;
add_action( 'init', 'fangyuan_register_block_bindings' );

// Registers block binding callback function for the post format name.
if ( ! function_exists( 'fangyuan_format_binding' ) ) :
	/**
	 * Callback function for the post format name block binding source.
	 *
	 * @since FangYuan 0.1.0
	 *
	 * @return string|void Post format name, or nothing if the format is 'standard'.
	 */
	function fangyuan_format_binding() {
		$post_format_slug = get_post_format();

		if ( $post_format_slug && 'standard' !== $post_format_slug ) {
			return get_post_format_string( $post_format_slug );
		}
	}
endif;
