<?php

namespace Drupal\paragraphs_editor\Utility;

use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Field\FieldConfigInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList;
use Drupal\paragraphs\ParagraphInterface;

/**
 * Contains helpers for strict type validation.
 */
class TypeUtility {

  /**
   * Enforces that an entity is a paragraph entity.
   *
   * @return \Drupal\paragraphs\ParagraphInterface|null
   *   The filtered entity.
   */
  public static function ensureParagraph(EntityInterface $entity = NULL) {
    if (!$entity instanceof ParagraphInterface) {
      throw new \Exception('Not a paragraph.');
    }
    return $entity;
  }

  /**
   * Enforces that an entity is a field config entity.
   *
   * @param \Drupal\Core\Field\FieldDefinitionInterface|null $field_definition
   *   The field definition to ensure is a field config instance.
   *
   * @return \Drupal\Core\Field\FieldConfigInterface|null
   *   The config object.
   */
  public static function ensureFieldConfig(FieldDefinitionInterface $field_definition = NULL) {
    if (!$field_definition instanceof FieldConfigInterface) {
      throw new \Exception('Not a field config.');
    }
    return $field_definition;
  }

  /**
   * Enforces that a field item list is an entity reference revisions instance.
   *
   * @param \Drupal\Core\Field\FieldItemListInterface $items
   *   The items to validate.
   *
   * @return \Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList
   *   The entity reference revisions object.
   */
  public static function ensureEntityReferenceRevisions(FieldItemListInterface $items) {
    if (!$items instanceof EntityReferenceRevisionsFieldItemList) {
      throw new \Exception('Not an entity reference revisions field.');
    }
    return $items;
  }

}
