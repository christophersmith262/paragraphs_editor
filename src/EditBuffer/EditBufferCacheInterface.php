<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\Core\Entity\EntityInterface;

/**
 * Represents a persistent storage mechanism for storing edit buffers.
 */
interface EditBufferCacheInterface {

  /**
   * Gets an edit buffer by context id.
   *
   * @param string $context_string
   *   The id of the context the buffer is associated with.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferCacheInterface
   *   The retrieved cache.
   */
  public function get($context_string);

  /**
   * Removes an edit buffer from the cache.
   *
   * @param string $context_string
   *   The id of the context the buffer to be destroyed is associated with.
   */
  public function delete($context_string);

  /**
   * Saves an edit buffer in the cache.
   *
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferInterface $buffer
   *   The buffer to be saved.
   */
  public function save(EditBufferInterface $buffer);

  /**
   * Deletes all buffers from the cache that are related to an entity.
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   *   The entity to delete all related buffers for.
   */
  public function processDeletionQueue(EntityInterface $entity);

  /**
   * Relates an edit buffer with an entity.
   *
   * If the entity is deleted or saved during the page request, any edit buffers
   * that were assocaited with it will be deleted.
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   *   The entity to associate the edit buffer with.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferInterface $buffer
   *   The buffer to associate.
   */
  public function queueDeletion(EntityInterface $entity, EditBufferInterface $buffer);

}
