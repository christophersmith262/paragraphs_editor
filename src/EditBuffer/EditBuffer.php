<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

use Drupal\Core\Account\AccountInterface;
use Drupal\paragraphs\ParagraphInterface;

class EditBuffer implements EditBufferInterface {

  protected $contextString;
  protected $uid;
  protected $bufferCache = NULL;
  protected $paragraphs = array();

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
    $this->paragraphs[$item->getEntity()->uuid()] = $item->getEntity();
  }

  public function getItem($paragraph_uuid) {
    $paragraph = isset($this->paragraphs[$paragraph_uuid]) ? $this->paragraphs[$paragraph_uuid] : NULL;
    if ($paragraph) {
      $item = new EditBufferItem($paragraph, $this->bufferCache, $this);
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
      $items[$paragraph->uuid()] = new EditBufferItem($paragraph, $this->bufferCache, $this);
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
}
