<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\Core\Session\AccountInterface;
use Drupal\Core\KeyValueStore\KeyValueExpirableFactoryInterface;

class EditBufferCache implements EditBufferCacheInterface {

  protected $storage;
  protected $expiry;
  protected $user;

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
      if ($buffer->getContextString() != $context_string || $buffer->getOwner() != $this->user->id()) {
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
    $this->storage->delete($context_string);
  }

  public function save(EditBufferInterface $buffer) {
    $this->storage->set($buffer->getContextString(), $buffer, $this->expiry);
  }
}
