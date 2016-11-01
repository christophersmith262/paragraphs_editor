<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor;

use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;

class PluginBase {

  protected $pluginId;
  protected $pluginDefinition;
  protected $context;

  public function __construct($plugin_id, $plugin_definition, CommandContextInterface $context) {
    $this->pluginId = $plugin_id;
    $this->pluginDefinition = $plugin_definition;
    $this->context = $context;
  }
}
