<?php

namespace Drupal\paragraphs_ckeditor\EditorFieldValue;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferInterface;

interface FieldValueManagerInterface {
  public function wrap(FieldItemListInterface $items, array $settings);
  public function update(FieldValueWrapperInterface $field_value_wrapper, EditBufferInterface $edit_buffer, $markup, $format);
}
