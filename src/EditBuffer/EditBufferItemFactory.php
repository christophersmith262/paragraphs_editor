<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\Component\Uuid\UuidInterface;
use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_editor\ParagraphsMarkupInterface;
use Drupal\paragraphs_editor\Utility\TypeUtility;

/**
 * A factory for creating edit buffer items.
 */
class EditBufferItemFactory implements EditBufferItemFactoryInterface {

  /**
   * The entity storage handler for the paragraph entity type.
   *
   * @var \Drupal\Core\Entity\EntityStorageInterface
   */
  protected $storage;

  /**
   * The uuid generator service.
   *
   * @var \Drupal\Component\Uuid\UuidGeneratorInterface
   */
  protected $uuidGenerator;

  /**
   * Creates an edit buffer item factory.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager service.
   * @param \Drupal\Component\Uuid\UuidInterface $uuid_generator
   *   The uudid generator service.
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager, UuidInterface $uuid_generator) {
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->uuidGenerator = $uuid_generator;
  }

  /**
   * {@inheritdoc}
   */
  public function createBufferItem(CommandContextInterface $context, $bundle_name) {
    // We don't have to verify that getBuffer doesn't return NULL here since
    // this should never be called until after context validation is complete.
    return $context->getEditBuffer()->createItem($this->createParagraph($bundle_name));
  }

  /**
   * {@inheritdoc}
   */
  public function getBufferItem(CommandContextInterface $context, $paragraph_uuid) {
    // Since this could be called before the context is validated, we need to
    // account for the buffer being invalid.
    $buffer = $context->getEditBuffer();
    if ($buffer) {
      $item = $buffer->getItem($paragraph_uuid);

      // If the paragraph didn't already exist in the buffer we attempt to load
      // it from the database. After loading it, we also have to verify that it
      // belonged to the entity the the editor context belongs to. If that
      // succeeds, we add it to the buffer.
      if (empty($item)) {
        $paragraph = $this->getParagraph($context, $paragraph_uuid);
        if ($paragraph) {
          $item = $buffer->createItem($paragraph);
        }
      }
    }
    else {
      $item = NULL;
    }
    return $item;
  }

  /**
   * {@inheritdoc}
   */
  public function duplicateBufferItem(CommandContextInterface $context, EditBufferItemInterface $item) {
    $new_item = $context->getEditBuffer()->createItem($this->duplicateEntity($item->getEntity()));

    $entity_map = [];
    $this->createEntityMap($item->getEntity(), $new_item->getEntity(), $entity_map);
    $context->addAdditionalContext('entityMap', $entity_map);
    return $new_item;
  }

  /**
   * Maps all entities in a duplicated content tree to their originals.
   *
   * @param \Drupal\Core\Entity\ContentEntityInterface $entity1
   *   The original entity.
   * @param \Drupal\Core\Entity\ContentEntityInterface $entity2
   *   The duplicate entity.
   * @param array &$map
   *   The map to be built.
   */
  protected function createEntityMap(ContentEntityInterface $entity1, ContentEntityInterface $entity2, array &$map) {
    $map[$entity1->uuid()] = $entity2->uuid();

    if ($entity1->bundle() != $entity2->bundle()) {
      throw new \Exception('mismatch');
    }
    foreach ($entity1->getFields() as $field) {
      $field_definition = $field->getFieldDefinition();
      $field_name = $field_definition->getName();
      if (!isset($entity2->{$field_name})) {
        throw new \Exception('mismatch');
      }

      if (TypeUtility::isParagraphsField($field_definition) || TypeUtility::isParagraphsEditorField($field_definition)) {
        $items1 = $entity1->{$field_name};
        $items2 = $entity2->{$field_name};

        if (count($items1) != count($items2)) {
          throw new \Exception('mismatch');
        }

        foreach ($items1 as $delta => $item) {
          $cmp_entity1 = $items1[$delta]->entity;
          $cmp_entity2 = $items2[$delta]->entity;
          $this->createEntityMap($cmp_entity1, $cmp_entity2, $map);
        }
      }
    }
  }

  /**
   * Creates a new paragraph entity.
   *
   * @param string $bundle_name
   *   The bundle name of the paragraph entity to be created.
   *
   * @return \Drupal\paragraphs\ParagraphInterface
   *   The newly created paragraph.
   */
  protected function createParagraph($bundle_name) {
    $paragraph = $this->storage->create([
      'type' => $bundle_name,
    ]);
    return $paragraph;
  }

  /**
   * Retrieves a paragraph by uuid.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $paragraph_uuid
   *   The uuid of the paragraph to be retrieved.
   *
   * @return \Drupal\paragraphs\ParagraphInterface|null
   *   The retrieved paragraph, or NULL if no such paragraph could be found.
   */
  protected function getParagraph(CommandContextInterface $context, $paragraph_uuid) {
    $form_state_entities = $context->getAdditionalContext('formStateEntities');

    $entity = !empty($form_state_entities[$paragraph_uuid]) ? $form_state_entities[$paragraph_uuid] : NULL;
    if (empty($entity)) {
      $entities = $this->storage->loadByProperties(['uuid' => $paragraph_uuid]);
      $entity = reset($entities);
    }

    return $entity ? $entity : NULL;
  }

  /**
   * Creates a duplicate entity where all composite entities are duplicated.
   *
   * @param \Drupal\Core\Entity\ContentEntityInterface $entity
   *   The entity to be duplicated.
   *
   * @return \Drupal\Core\Entity\ContentEntityInterface
   *   The duplicate entity.
   */
  protected function duplicateEntity(ContentEntityInterface $entity) {
    $entity_type = $entity->getEntityType();

    $duplicate = clone $entity;
    $duplicate->{$entity_type->getKey('id')}->value = NULL;
    $duplicate->enforceIsNew();

    // Check if the entity type supports UUIDs and generate a new one if so.
    if ($entity_type->hasKey('uuid')) {
      $duplicate->{$entity_type->getKey('uuid')}->value = $this->uuidGenerator->generate();
    }

    // Check whether the entity type supports revisions and initialize it if so.
    if ($entity_type->isRevisionable()) {
      $duplicate->{$entity_type->getKey('revision')}->value = NULL;
    }

    foreach ($duplicate->getFields() as $field) {
      if ($field->getFieldDefinition()->getType() == 'entity_reference_revisions') {
        foreach ($field as $item) {
          $item->entity = $this->duplicateEntity($item->entity);
        }
      }
    }

    return $duplicate;
  }

}
