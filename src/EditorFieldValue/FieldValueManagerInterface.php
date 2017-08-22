<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;

/**
 *
 */
interface FieldValueManagerInterface {

  /**
   *
   */
  public function getReferencedEntities(FieldItemListInterface $items);

  /**
   *
   */
  public function wrapItems(FieldItemListInterface $items);

  /**
   *
   */
  public function updateItems(FieldItemListInterface $items, array $entities, $new_revision, $langcode);

  /**
   *
   */
  public function getTextBundles(array $allowed_bundles = []);

  /**
   *
   */
  public function isParagraphsField(FieldDefinitionInterface $field_definition);

  /**
   *
   */
  public function isParagraphsEditorField(FieldDefinitionInterface $field_definition);

  /**
   *
   */
  public function getElement($element_name);

  /**
   *
   */
  public function getAttributeName($element_name, $attribute_name);

  /**
   *
   */
  public function getSelector($element_name);

}
