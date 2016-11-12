<?php

namespace Drupal\paragraphs_ckeditor\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Field\FieldItemListInterface;

/**
 * Implementation of the 'entity_reference_paragraphs_ckeditor' formatter.
 *
 * @FieldFormatter(
 *   id = "entity_reference_paragraphs_ckeditor",
 *   label = @Translation("Paragraphs (CKEditor)"),
 *   field_types = {
 *     "entity_reference_revisions"
 *   }
 * )
 */
class CKEditorParagraphFormatter extends FormatterBase {
  use ParagraphsCKEditorFieldPluginTrait;

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $elements = array();

    $field_value_wrapper = $this->fieldValueManager->wrap($items, $this->getSettings());
    $elements[$delta] = array(
      '#type' => 'processed_text',
      '#text' => $field_value_wrapper->getMarkup(),
      '#format' => $field_value_wrapper->getFormat(),
      '#langcode' => $langcode,
    );

    return $elements;
  }

}
