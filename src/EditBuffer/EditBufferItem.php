<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs\ParagraphInterface;

class EditBufferItem implements EditBufferItemInterface {

  protected $entity;
  protected $bufferCache;
  protected $buffer;
  protected $nestedContexts = array();
  protected $contextMap = array();

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

  public function setParagraphContexts(array $edits) {
    $this->nestedContexts = $edits;
  }

  public function getParagraphContexts() {
    return $this->nestedContexts;
  }

  public function resetContextMap() {
    $this->contextMap = array();
  }

  public function mapContext($from, $to) {
    $this->contextMap[$from] = $to;
  }

  public function getContextMap() {
    return $this->contextMap;
  }

  public function save() {
    $this->buffer->setItem($this);
    $this->bufferCache->save($this->buffer);
  }
}
