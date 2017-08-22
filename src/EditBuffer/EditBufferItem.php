<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs\ParagraphInterface;

/**
 *
 */
class EditBufferItem implements EditBufferItemInterface {

  protected $entity;
  protected $buffer;

  /**
   * {@inheritdoc}
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
