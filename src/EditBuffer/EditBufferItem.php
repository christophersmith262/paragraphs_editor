<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

use Drupal\paragraphs\ParagraphInterface;

class EditBufferItem implements EditBufferItemInterface {

  protected $entity;
  protected $bufferCache;
  protected $buffer;

  public function __construct(ParagraphInterface $entity, EditBufferCacheInterface $buffer_cache, EditBufferInterface $buffer) {
    $this->entity = $entity;
    $this->bufferCache = $buffer_cache;
    $this->buffer = $buffer;
  }

  public function getEntity() {
    return $this->entity;
  }

  public function overwrite(ParagraphInterface $entity) {
    $this->entity = $entity;
  }

  public function save() {
    $this->buffer->setItem($this);
    $this->bufferCache->save($this->buffer);
  }
}
