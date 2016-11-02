<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

use Drupal\Core\Account\AccountInterface;
use Drupal\paragraphs\ParagraphInterface;

interface EditBufferInterface {
  public function getOwner();
  public function getContextString();
  public function setItem(EditBufferItemInterface $item);
  public function getItem($paragraph_uuid);
  public function createItem(ParagraphInterface $paragraph);
  public function setCache(EditBufferCacheInterface $buffer_cache);
}
