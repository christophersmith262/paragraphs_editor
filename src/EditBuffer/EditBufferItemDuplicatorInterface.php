<?php

namespace Drupal\paragraphs_ckeditor\EditBuffer;

use Drupal\paragaphs_ckeditor\EditorCommand\CommandContextInterface;

interface EditBufferItemDuplicatorInterface {
  public function duplicate(CommandContextInterface $context, EditBufferItemInterface $item);
}
