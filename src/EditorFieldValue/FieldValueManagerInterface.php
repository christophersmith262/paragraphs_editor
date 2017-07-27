<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferInterface;

interface FieldValueManagerInterface {
  public function wrapItems(FieldItemListInterface $items);
  public function updateItems(FieldItemListInterface $items, array $entities, $new_revision, $langcode);
  public function getTextBundles(array $allowed_bundles = []);
  public function validateTextBundle($bundle_name, $field_name);
  public function isParagraphsField(FieldDefinitionInterface $field_definition);
  public function isParagraphsEditorField(FieldDefinitionInterface $field_definition);
}
