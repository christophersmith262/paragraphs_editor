<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs\ParagraphInterface;

/**
 * Stores edits made in the editor.
 */
class EditBuffer implements EditBufferInterface {

  /**
   * The id of the context this buffer belongs to.
   *
   * @var string
   */
  protected $contextString;

  /**
   * The id of the user who owns this edit buffer.
   *
   * @var int
   */
  protected $uid;

  /**
   * The id of the context this buffer's context is nested inside.
   *
   * @var string
   */
  protected $parentBufferTag = NULL;

  /**
   * The cache service for saving the edit buffer.
   *
   * @var \Drupal\paragraphs_editor\EditBuffer\EditBufferCacheInterface
   */
  protected $bufferCache = NULL;

  /**
   * A list of entities in this buffer.
   *
   * @var \Drupal\paragraphs\ParagraphInterface[]
   */
  protected $paragraphs = [];

  /**
   * A list of context ids for contexts nested inside this buffer's context.
   *
   * @var string[]
   */
  protected $childBufferTags = [];

  /**
   * Creates an edit buffer object.
   *
   * @param string $context_string
   *   The id of the context this edit buffer belongs to.
   * @param int $uid
   *   The user entity id that owns this buffer.
   */
  public function __construct($context_string, $uid) {
    $this->contextString = $context_string;
    $this->uid = $uid;
  }

  /**
   * {@inheritdoc}
   */
  public function getUser() {
    return $this->uid;
  }

  /**
   * {@inheritdoc}
   */
  public function getContextString() {
    return $this->contextString;
  }

  /**
   * {@inheritdoc}
   */
  public function setItem(EditBufferItemInterface $item) {
    $uuid = $item->getEntity()->uuid();
    $this->paragraphs[$uuid] = $item->getEntity();
    return $this;
  }

  /**
   * {@inheritdoc}
   */
  public function getItem($paragraph_uuid) {
    $paragraph = isset($this->paragraphs[$paragraph_uuid]) ? $this->paragraphs[$paragraph_uuid] : NULL;
    if ($paragraph) {
      $item = $this->createEditBufferItem($paragraph);
    }
    else {
      $item = NULL;
    }
    return $item;
  }

  /**
   * {@inheritdoc}
   */
  public function getItems($bundle_name = NULL) {
    if ($bundle_name) {
      $paragraphs = [];
      foreach ($this->paragraphs as $paragraph) {
        if ($paragraph->bundle() == $bundle_name) {
          $paragraphs[$paragraph->uuid()] = $paragraph;
        }
      }
    }
    else {
      $paragraphs = $this->paragraphs;
    }

    $items = [];
    foreach ($paragraphs as $paragraph) {
      $items[$paragraph->uuid()] = $this->createEditBufferItem($paragraph);
    }

    return $items;
  }

  /**
   * {@inheritdoc}
   */
  public function createItem(ParagraphInterface $paragraph) {
    $item = new EditBufferItem($paragraph, $this);
    $this->paragraphs[$paragraph->uuid()] = $paragraph;
    return $item;
  }

  /**
   * {@inheritdoc}
   */
  public function setCache(EditBufferCacheInterface $buffer_cache) {
    $this->bufferCache = $buffer_cache;
  }

  /**
   * {@inheritdoc}
   */
  public function save() {
    $this->bufferCache->save($this);
  }

  /**
   * {@inheritdoc}
   */
  public function tagParentBuffer($context_string) {
    $this->parentBufferTag = $context_string;
  }

  /**
   * {@inheritdoc}
   */
  public function getParentBufferTag() {
    return $this->parentBufferTag;
  }

  /**
   * {@inheritdoc}
   */
  public function addChildBufferTag($context_string) {
    $this->childBufferTags[$context_string] = TRUE;
  }

  /**
   * {@inheritdoc}
   */
  public function getChildBufferTags() {
    return array_flip($this->childBufferTags);
  }

  /**
   * {@inheritdoc}
   */
  public function createCopy($context_string) {
    $copy = clone $this;
    $copy->contextString = $context_string;
    return $copy;
  }

  /**
   * {@inheritdoc}
   */
  public function toArray() {
    $properties = get_object_vars($this);
    unset($properties['bufferCache']);
    unset($properties['parentBufferTag']);
    return $properties;
  }

  /**
   * Gets the array keys to be serialized.
   *
   * @return array
   *   The keys to be serialized.
   */
  public function __sleep() {
    return array_keys($this->toArray());
  }

  /**
   * Restores the object when it is unserialized.
   */
  public function __wakeup() {
    $this->bufferCache = \Drupal::service('paragraphs_editor.edit_buffer.cache');
  }

  /**
   * Creates an edit buffer item object.
   *
   * @param \Drupal\paragraphs\ParagraphInterface $paragraph
   *   The paragraph to be wrapped in the item.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface
   *   The created edit buffer item.
   */
  protected function createEditBufferItem(ParagraphInterface $paragraph) {
    return new EditBufferItem($paragraph, $this);
  }

}
