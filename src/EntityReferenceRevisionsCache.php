<?php

namespace Drupal\paragraphs_editor;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList;

/**
 * Provides a static cache for loading entity reference revisions content.
 */
class EntityReferenceRevisionsCache {

  /**
   * The entity type manager plugin for getting entity storage instances.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * A static cache of paragraph revisions.
   *
   * @var \Drupal\paragraphs\ParagraphInterface[]
   */
  protected $revisionCache = [];

  /**
   * Creates a entity reference revisions cache object.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager service.
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager) {
    $this->entityTypeManager = $entity_type_manager;
  }

  /**
   * Gets a list of referenced entities in a paragraphs field.
   *
   * This function static caches loaded revisions. While calling
   * referencedEntities directly on the items works, it leads to performance
   * problems in certain editor use cases.
   *
   * Drupal core currently does not static cache loaded entitiy revisions. This
   * function should be deprecated when https://www.drupal.org/node/2620980
   * is released.
   *
   * @param \Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList $items
   *   The paragraph field items to iterate over.
   *
   * @return \Drupal\Core\Entity\EntityInterface[]
   *   An array of referenced paragraphs in the field.
   */
  public function getReferencedEntities(EntityReferenceRevisionsFieldItemList $items) {
    $field_definition = $items->getFieldDefinition();
    $target_type = $field_definition->getFieldStorageDefinition()->getSetting('target_type');

    $entities = [];
    foreach ($items as $item) {
      $value = $item->getValue();
      if (!empty($value['entity'])) {
        $entities[] = $item->entity;
      }
      elseif ($item->target_revision_id !== NULL) {
        if (!empty($this->revisionCache[$target_type][$item->target_revision_id])) {
          $entities[] = $this->revisionCache[$target_type][$item->target_revision_id];
        }
        else {
          $storage = $this->entityTypeManager->getStorage($target_type);
          $entity = $storage->loadRevision($item->target_revision_id);
          $this->revisionCache[$target_type][$item->target_revision_id] = $entity;
          $entities[] = $entity;
        }
      }
    }

    return $entities;
  }

}
