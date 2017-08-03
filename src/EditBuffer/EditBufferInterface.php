<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\Core\Account\AccountInterface;
use Drupal\paragraphs\ParagraphInterface;

interface EditBufferInterface {
  public function getUser();
  public function getContextString();
  public function setItem(EditBufferItemInterface $item);
  public function getItem($paragraph_uuid);
  public function createItem(ParagraphInterface $paragraph);
  public function setCache(EditBufferCacheInterface $buffer_cache);
}
