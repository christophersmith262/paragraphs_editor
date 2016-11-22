<?php

namespace Drupal\paragraphs_ckeditor\Plugin\CKEditorPlugin;

use Drupal\ckeditor\CKEditorPluginBase;
use Drupal\editor\Entity\Editor;
use Drupal\ckeditor\CKEditorPluginCssInterface;

/**
 * Defines the "paragraphsinsert" plugin.
 *
 * @CKEditorPlugin(
 *   id = "paragraphsinsert",
 *   label = @Translation("Insert Component"),
 *   module = "paragraphs_ckeditor"
 * )
 */
class ParagraphsInsert extends CKEditorPluginBase implements CKEditorPluginCssInterface {

  public function getCssFiles(Editor $editor) {
    return array(
      drupal_get_path('module', 'paragraphs_ckeditor') . '/css/widget.css',
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getFile() {
    return drupal_get_path('module', 'paragraphs_ckeditor') . '/js/plugins/paragraphsinsert/plugin.js';
  }

  /**
   * {@inheritdoc}
   */
  public function getConfig(Editor $editor) {
    return array(
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getButtons() {
    return array(
      'ParagraphsInsert' => array(
        'label' => t('Insert Paragraph'),
        'image' => drupal_get_path('module', 'paragraphs_ckeditor') . '/js/plugins/paragraphsinsert/icons/paragraphsinsert.png',
      ),
    );
  }
}
