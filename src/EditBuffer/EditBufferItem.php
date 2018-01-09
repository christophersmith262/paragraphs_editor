<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs\ParagraphInterface;

/**
 * Wraps paragraph edits with the buffer that will store those edits.
 */
class EditBufferItem implements EditBufferItemInterface {

  /**
   * The wrapped entity, containing any edits.
   *
   * @var \Drupal\paragraphs\ParagraphInterface
   */
  protected $entity;

  /**
   * The buffer that will be used to store the edits.
   *
   * @var \Drupal\paragraphs_editor\EditBuffer\EditBufferInterface
   */
  protected $buffer;

  /**
   * Creates an edit buffer item.
   *
   * @param \Drupal\paragraphs\ParagraphInterface $entity
   *   The entity to wrap.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferInterface $buffer
   *   The buffer that will store edits.
   */
  public function __construct(ParagraphInterface $entity, EditBufferInterface $buffer) {
    $this->entity = $entity;
    $this->buffer = $buffer;
  }

  /**
   * {@inheritdoc}
   */
  public function getEntity() {
    return $this->entity;
  }

  /**
   * {@inheritdoc}
   */
  public function overwrite(ParagraphInterface $entity) {
    $this->entity = $entity;
  }

  /**
   * {@inheritdoc}
   */
  public function save() {
    $this->buffer->setItem($this)->save();
  }

}
