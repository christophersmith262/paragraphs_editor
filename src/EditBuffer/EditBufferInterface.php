<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

use Drupal\Core\Account\AccountInterface;
use Drupal\paragraphs\ParagraphInterface;

interface EditBufferInterface {
  public function setUser(AccountInterface $user);
  public function getUser();
  public function getContextString();
  public function getItem($paragraph_uuid);
  public function createItem(ParagraphInterface $paragraph);
}
