<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\Core\Account\AccountInterface;
use Drupal\paragraphs\ParagraphInterface;

class EditBuffer implements EditBufferInterface {

  protected $contextString;
  protected $uid;
  protected $bufferCache = NULL;
  protected $paragraphs = array();
  protected $inlineEdits = array();

  public function __construct($context_string, $uid) {
    $this->contextString = $context_string;
    $this->uid = $uid;
  }

  public function getOwner() {
    return $this->uid;
  }

  public function getContextString() {
    return $this->contextString;
  }

  public function setItem(EditBufferItemInterface $item) {
    $uuid = $item->getEntity()->uuid();
    $this->paragraphs[$uuid] = $item->getEntity();
    $this->inlineEdits[$uuid] = $item->getInlineEdits();
  }

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

  public function getItems($bundle_name = NULL) {
    if ($bundle_name) {
      $paragraphs = array();
      foreach ($this->paragraphs as $paragraph) {
        if ($paragraph->bundle() == $bundle_name) {
          $paragraphs[$paragraph->uuid()] = $paragraph;
        }
      }
    }
    else {
      $paragraphs = $this->paragraphs;
    }

    $items = array();
    foreach ($paragraphs as $paragraph) {
      $items[$paragraph->uuid()] = $this->createEditBufferItem($paragraph);
    }

    return $items;
  }

  public function createItem(ParagraphInterface $paragraph) {
    $item = new EditBufferItem($paragraph, $this->bufferCache, $this);
    $this->paragraphs[$paragraph->uuid()] = $paragraph;
    return $item;
  }

  public function setCache(EditBufferCacheInterface $buffer_cache) {
    $this->bufferCache = $buffer_cache;
  }

  public function save() {
    $this->bufferCache->save($this);
  }

  public function __sleep() {
    $properties = get_object_vars($this);
    unset($properties['bufferCache']);
    return array_keys($properties);
  }

  protected function createEditBufferItem(ParagraphInterface $paragraph) {
    $item = new EditBufferItem($paragraph, $this->bufferCache, $this);
    if (isset($this->inlineEdits[$paragraph->uuid()])) {
      $item->setInlineEdits($this->inlineEdits[$paragraph->uuid()]);
    }
    return $item;
  }
}
