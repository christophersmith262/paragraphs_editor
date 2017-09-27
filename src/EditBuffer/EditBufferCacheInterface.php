<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\Core\Entity\EntityInterface;

/**
 *
 */
interface EditBufferCacheInterface {

  /**
   *
   */
  public function get($context_string);

  /**
   *
   */
  public function delete($context_string);

  /**
   *
   */
  public function save(EditBufferInterface $buffer);

  public function processDeletionQueue(EntityInterface $entity);

  public function queueDeletion(EntityInterface $entity, EditBufferInterface $buffer);

}
