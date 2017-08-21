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
   *
   */
  public function __construct(ParagraphInterface $entity, EditBufferInterface $buffer) {
    $this->entity = $entity;
    $this->buffer = $buffer;
  }

  /**
   *
   */
  public function getEntity() {
    return $this->entity;
  }

  /**
   *
   */
  public function overwrite(ParagraphInterface $entity) {
    $this->entity = $entity;
  }

  /**
   *
   */
  public function save() {
    $this->buffer->setItem($this)->save();
  }

}
