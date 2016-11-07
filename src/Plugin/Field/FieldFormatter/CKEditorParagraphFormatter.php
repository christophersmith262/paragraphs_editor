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
}
