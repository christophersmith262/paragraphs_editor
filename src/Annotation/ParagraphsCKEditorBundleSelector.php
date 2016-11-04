<?php

namespace Drupal\paragraphs_ckeditor\Annotation;

use Drupal\Component\Annotation\Plugin;

/**
 * Defines a paragraphs ckeditor bundle selector plugin annotation.
 *
 * Plugin Namespace: Plugin\ParagraphsCKEditor\bundle_selector
 *
 * @Annotation
 */
class ParagraphsCKEditorBundleSelector extends Plugin {

  /**
   * The plugin ID.
   *
   * @var string
   */
  public $id;

  /**
   * The human-readable name of the plugin.
   *
   * @ingroup plugin_translatable
   *
   * @var \Drupal\Core\Annotation\Translation
   */
  public $title;

  /**
   * The description of the plugin.
   *
   * @ingroup plugin_translatable
   *
   * @var \Drupal\Core\Annotation\Translation
   */
  public $description;
}
