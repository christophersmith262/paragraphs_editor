<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemDuplicatorInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;

class EditBufferItemFactory implements EditBufferItemFactoryInterface {

  /**
   * The entity storage handler for the paragraph entity type.
   *
   * @var \Drupal\Core\Entity\EntityStorageInterface
   */
  protected $storage;

  public function __construct(EntityTypeManagerInterface $entity_type_manager) {
    $this->storage = $entity_type_manager->getStorage('paragraph');
  }

  /**
   * Creates a buffer item within a context.
   *
   * This should never be called inside an access check. Only call this after
   * context validation has completed successfully.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $bundle_name
   *   The bundle name for the paragraph to be created.
   *
   * @return \Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface
   *   The newly created edit buffer item.
   */
  public function createBufferItem(CommandContextInterface $context, $bundle_name) {
    // We don't have to verify that getBuffer doesn't return NULL here since
    // this should never be called until after context validation is complete.
    return $context->getEditBuffer()->createItem($this->createParagraph($bundle_name));
  }

  /**
   * Retrieves a paragraph item from within a context buffer.
   *
   * This is safe to call within access checks since we verify that the buffer
   * is set before using it. This will create the paragraph item in the buffer
   * it does not already exist.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $bundle_name
   *   The bundle name for the paragraph to be created.
   *
   * @return \Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface
   *   The newly created edit buffer item.
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
      if (!$item) {
        $paragraph = $this->getParagraph($paragraph_uuid);
        if ($paragraph) {
          if ($paragraph->getParentEntity() != $context->getEntity()) {
            $paragraph = NULL;
          }
          else {
            $item = $buffer->createItem($paragraph);
          }
        }
      }
    }
    else {
      $item = NULL;
    }
    return $item;
  }

  public function duplicateBufferItem(CommandContextInterface $context, EditBufferItemInterface $item) {
    return $context->getEditBuffer()->createItem($item->getEntity()->createDuplicate());
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
    $paragraph = $this->storage->create(array(
      'type' => $bundle_name,
    ));
    return $paragraph;
  }

  /**
   * Retrieves a paragraph by uuid.
   *
   * @param string $paragraph_uuid
   *   The uuid of the paragraph to be retrieved.
   *
   * @return \Drupal\paragraphs\ParagraphInterface
   *   The retrieved paragraph, or NULL if no such paragraph could be found.
   */
  protected function getParagraph($paragraph_uuid) {
    $entities = $this->storage->loadByProperties(array('uuid' => $paragraph_uuid));
    if($entities) {
      return reset($entities);
    }
    else {
      return NULL;
    }
  }
}
