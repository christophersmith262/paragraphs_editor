<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor;

use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;

/**
 * Provides a basic plugin base for creating paragraphs_ckeditor plugins.
 *
 * This base class gives you a simple starting point for writing plugins that
 * deal with editor command contexts. If you extend from this base you can
 * simply access the context as a protected member variable.
 *
 * @code
 * $this->context->getContextString()
 * @endcode
 */
abstract class PluginBase {

  /**
   * The plugin id for this plugin.
   *
   * @var string
   */
  protected $pluginId;

  /**
   * The plugin definition for this plugin.
   *
   * @var object
   */
  protected $pluginDefinition;

  /**
   * The command context the plugin is executing within.
   *
   * @var Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface
   */
  protected $context;

  /**
   * Creates a plugin object.
   *
   * @param string $plugin_id
   *   The drupal plugin id as defined in the annotation.
   * @param object $plugin_definition
   *   The plugin definition object.
   * @param Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The command context which the plugin will be executed within.
   */
  public function __construct($plugin_id, $plugin_definition, CommandContextInterface $context) {
    $this->pluginId = $plugin_id;
    $this->pluginDefinition = $plugin_definition;
    $this->context = $context;
  }
}
