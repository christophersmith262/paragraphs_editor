<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\KeyValueStore\KeyValueExpirableFactoryInterface;
use Drupal\Core\Session\AccountInterface;

/**
 *
 */
class EditBufferCache implements EditBufferCacheInterface {

  protected $storage;
  protected $expiry;
  protected $user;
  protected $deleteQueue = [];

  /**
   *
   */
  public function __construct(KeyValueExpirableFactoryInterface $keyvalue_factory, $expiry, AccountInterface $user) {
    $this->storage = $keyvalue_factory->get('paragraphs_editor.edit_buffer');
    $this->expiry = $expiry;
    $this->user = $user;
  }

  /**
   * {@inheritdoc}
   */
  public function get($context_string) {

    // If there is an existing buffer that doesn't have the correct context or
    // the buffer was created by a different user, we don't allow the caller to
    // access it.
    $buffer = $this->storage->get($context_string);
    if ($buffer) {
      if ($buffer->getContextString() != $context_string || $buffer->getUser() != $this->user->id()) {
        $buffer = NULL;
      }
    }

    // If we couldn't find a "good" buffer, we create a new one.
    if (!$buffer) {
      $buffer = new EditBuffer($context_string, $this->user->id());
    }

    // Tell the buffer about the cache so it can perform CRUD operations.
    $buffer->setCache($this);

    return $buffer;
  }

  /**
   * {@inheritdoc}
   */
  public function delete($context_string) {
    $buffer = $this->get($context_string);
    foreach ($buffer->getChildBufferTags() as $child_cache_key) {
      $this->delete($child_cache_key);
    }
    $this->storage->delete($context_string);
  }

  /**
   *
   */
  public function save(EditBufferInterface $buffer) {
    $this->storage->set($buffer->getContextString(), $buffer, $this->expiry);

    $parent_cache_key = $buffer->getParentBufferTag();
    if ($parent_cache_key) {
      $parent_buffer = $this->get($parent_cache_key);
      $parent_buffer->addChildBufferTag($buffer->getContextString());
      $this->save($parent_buffer);
    }
  }

  public function processDeletionQueue(EntityInterface $entity) {
    $key = $this->deletionQueueKey($entity);
    if (!empty($this->deleteQueue[$key])) {
      $this->delete($this->deleteQueue[$key]);
    }
  }

  public function queueDeletion(EntityInterface $entity, EditBufferInterface $buffer) {
    $this->deleteQueue[$this->deletionQueueKey($entity)] = $buffer->getContextString();
  }

  protected function deletionQueueKey(EntityInterface $entity) {
    return $entity->getEntityTypeId() . ':' . $entity->uuid();
  }

}
