<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor;

use Drupal\Core\Form\FormInterface;

/**
 * Represents a paragraphs ckeditor bundle selector plugin.
 *
 * Bundle Selector plugins are forms that allow the user to select which
 * paragraph bundle they would like to insert into the editor. We leave this as
 * a plugin based system so that it is easy to swap out different forms.
 *
 * For the purposes of making type hinting as explicit as possible, we define an
 * interface for this even though it matches the existing form interface.
 */
interface BundleSelectorInterface extends FormInterface {
}
