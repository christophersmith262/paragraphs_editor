<?php

namespace Drupal\paragraphs_editor\Annotation;

use Drupal\Component\Annotation\Plugin;

/**
 * Defines a paragraphs ckeditor bundle selector plugin annotation.
 *
 * Plugin Namespace: Plugin\ParagraphsEditor\bundle_selector.
 *
 * @Annotation
 */
class ParagraphsEditorBundleSelector extends Plugin {

  /**
   * The plugin ID.
   *
   * @var string
   */
  public $id;

  /**
   * The human-readable name of the plugin.
   *
   * @var \Drupal\Core\Annotation\Translation
   *
   * @ingroup plugin_translatable
   */
  public $title;

  /**
   * The description of the plugin.
   *
   * @var \Drupal\Core\Annotation\Translation
   *
   * @ingroup plugin_translatable
   */
  public $description;

}
