<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs\ParagraphInterface;

interface EditBufferItemInterface {
  public function getEntity();
  public function overwrite(ParagraphInterface $entity);
  public function save();
}
